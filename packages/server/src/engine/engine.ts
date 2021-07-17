import { UUID } from "io-ts-types";
import {
  ClientToServerPayloadType,
  ClientToServerTopic,
  createLogger,
  oppositeDirection,
  ServerToClientPayloadType,
  ServerToClientTopic,
} from "kuramud-common";
import { mapObj } from "kuramud-common/lib/fns";
import { getPlayerByUuid } from "../players";
import { RoomFn, Room, UseState, SpyState, OnStateChange } from "../rooms/room";
import * as StartWorld from "../rooms/StartWorld";
import { ServerEventDistributor } from "./ServerEventDistributor";
import WalkLimiter from "./WalkLimiter";

const logger = createLogger("engine.ts");

const createStateName = (
  roomId: StartWorld.ValidRoomId,
  currentStateIndex: number,
  stateRef: symbol | undefined
) =>
  `${roomId}` + //
  `#${currentStateIndex}` + //
  `${stateRef ? `[${stateRef.toString()}]` : ""}`;

export type EventSender = <T extends ServerToClientTopic>(
  topic: T,
  playerUuids: string[],
  payload: ServerToClientPayloadType<T>
) => void;

type User = {
  uuid: string;
  username: string;
};

type PlayerUuid = string; // just to document the intent

const PLAYER_WALK_COOLDOWN_MS = 1000;

const describeRoomToPlayer = (
  eventSender: EventSender,
  playerUuid: UUID,
  roomOfPlayer: Room
) =>
  eventSender("DESCRIBE_ROOM", [playerUuid], {
    description: roomOfPlayer.description,
    exits: roomOfPlayer.exits.map((exit) => exit.direction),
    items: Object.values(roomOfPlayer.items ?? {})
      .filter((item) => !item.hidden)
      .map((item) => ({
        name: item.name,
      })),
  });

type StateEntry = { value: unknown; stateRef?: symbol };

class Engine {
  private rooms: Record<StartWorld.ValidRoomId, Room>;
  private roomStates: Partial<Record<StartWorld.ValidRoomId, StateEntry[]>> =
    {};
  private dirtyRooms: Partial<Record<StartWorld.ValidRoomId, true>> = {};
  private spyRooms: Partial<
    Record<
      StartWorld.ValidRoomId,
      Array<{ stateRef: symbol; onChange: OnStateChange<unknown> }>
    >
  > = {};
  private refreshTimeout: NodeJS.Timeout | undefined = undefined;
  private users: Record<string, User> = {};
  private roomsWithUsers: Record<StartWorld.ValidRoomId, PlayerUuid[]> = mapObj(
    StartWorld.Rooms,
    () => []
  );
  private usersCurrentRoom: Record<PlayerUuid, StartWorld.ValidRoomId> = {};
  private eventDistributor = new ServerEventDistributor();
  private walkLimiter = new WalkLimiter({
    walkCooldownMs: PLAYER_WALK_COOLDOWN_MS,
  });

  constructor(private options: { eventSender: EventSender }) {
    this.rooms = mapObj(StartWorld.Rooms, this.generateRoom);

    this.eventDistributor.register("LOOK_ROOM", (_, playerUuid) => {
      const roomIdOfPlayer = this.usersCurrentRoom[playerUuid];
      const roomOfPlayer = this.rooms[roomIdOfPlayer];

      describeRoomToPlayer(options.eventSender, playerUuid, roomOfPlayer);
    });

    this.eventDistributor.register(
      "LOOK_ITEM",
      ({ lookKeyword }, playerUuid) => {
        const roomIdOfPlayer = this.usersCurrentRoom[playerUuid];
        const roomOfPlayer = this.rooms[roomIdOfPlayer];
        const matchingItem = Object.values(roomOfPlayer.items ?? {}).find(
          (item) => item.tags.includes(lookKeyword.toLowerCase())
        );

        options.eventSender(
          "DESCRIBE_ITEM",
          [playerUuid],
          matchingItem
            ? {
                keyword: lookKeyword,
                found: true,
                description: matchingItem.description,
              }
            : { keyword: lookKeyword, found: false }
        );
      }
    );

    this.eventDistributor.register(
      "PUSH_ITEM",
      ({ pushKeyword }, playerUuid) => {
        const roomIdOfPlayer = this.usersCurrentRoom[playerUuid];
        const roomOfPlayer = this.rooms[roomIdOfPlayer];
        const matchingItem = Object.values(roomOfPlayer.items ?? {}).find(
          (item) => item.tags.includes(pushKeyword.toLowerCase())
        );

        if (!matchingItem) {
          options.eventSender("ECHO_MESSAGE", [playerUuid], {
            message: `You can't find a ${pushKeyword} to push`,
          });
          return;
        }

        if (!matchingItem.onPush) {
          options.eventSender("ECHO_MESSAGE", [playerUuid], {
            message: `You can't push on ${pushKeyword}`,
          });
          return;
        }

        const pushResult = matchingItem.onPush({
          playerUuid,
          currentRoom: roomIdOfPlayer,
          getPlayersInRoom: (id) => this.roomsWithUsers[id],
        });
        if (
          !pushResult ||
          (Array.isArray(pushResult) && pushResult.length === 0)
        ) {
          options.eventSender("ECHO_MESSAGE", [playerUuid], {
            message: "Alright. Nothing seems to happen.",
          });
        }

        const arrayPushResult = Array.isArray(pushResult)
          ? pushResult
          : [pushResult];

        arrayPushResult.forEach((result) =>
          options.eventSender("ECHO_MESSAGE", result.affectedPlayers, {
            message: result.eventMessage,
          })
        );
      }
    );

    this.eventDistributor.register("WALK", ({ direction }, playerUuid) => {
      if (!this.walkLimiter.isAllowed(playerUuid)) return;

      const oldRoomId = this.usersCurrentRoom[playerUuid];
      const roomOfPlayer = this.rooms[oldRoomId];
      const nextRoomId = roomOfPlayer.exits.find(
        (exit) => exit.direction === direction
      )?.roomUuid;
      if (!nextRoomId) {
        logger.error(
          `Can't go ${direction} from ${oldRoomId} (player ${playerUuid})`
        );
        return;
      }
      const nextRoom = this.rooms[nextRoomId];

      this.removeUserFromRoom(playerUuid);
      this.addUserToRoom(playerUuid, nextRoomId);

      const playerName =
        getPlayerByUuid(playerUuid)?.username ?? "[playernotfound]";

      options.eventSender("WALK_STATE", [playerUuid], { onCooldown: true });
      options.eventSender("WALK", this.roomsWithUsers[oldRoomId], {
        playerUuid,
        playerName,
        goingOrComing: "goingAway",
        direction,
      });
      options.eventSender("WALK", this.roomsWithUsers[nextRoomId], {
        playerUuid,
        playerName,
        goingOrComing: "comingFrom",
        direction: oppositeDirection[direction],
      });
      describeRoomToPlayer(options.eventSender, playerUuid, nextRoom);
    });

    this.walkLimiter.onCooldownEnds((playerUuid) =>
      options.eventSender("WALK_STATE", [playerUuid], { onCooldown: false })
    );
  }

  private createState = (roomId: StartWorld.ValidRoomId) => {
    let stateIndex = 0;

    const useState: UseState = <T>(a?: T | symbol, b?: symbol) => {
      let initialValue: unknown;
      let stateRef: symbol | undefined;

      if (typeof a === "symbol" && typeof b === "undefined") {
        initialValue = undefined;
        stateRef = a;
      } else {
        initialValue = a;
        stateRef = b;
      }

      const currentStateIndex = stateIndex;
      const stateName = createStateName(roomId, currentStateIndex, stateRef);

      if (!this.roomStates[roomId]) this.roomStates[roomId] = [];
      const thisRoomStates = this.roomStates[roomId]!;
      if (!thisRoomStates.hasOwnProperty(currentStateIndex)) {
        logger.log(
          `Initializing state ${stateName} as ${JSON.stringify(initialValue)}`
        );
        thisRoomStates[currentStateIndex] = {
          stateRef,
          value: initialValue,
        };
      }

      stateIndex++;
      return [
        thisRoomStates[currentStateIndex].value,
        this.createSetState(
          thisRoomStates[currentStateIndex],
          stateName,
          roomId
        ),
      ];
    };

    return useState;
  };

  private createSpyState = (roomId: StartWorld.ValidRoomId) => {
    this.spyRooms[roomId] = [];
    const spies = this.spyRooms[roomId]!;
    const spyState: SpyState = (stateRef, onChange) => {
      const stateDoesExist = Object.values(this.roomStates).some(
        (statesOfRoom) =>
          statesOfRoom.some((entry) => entry.stateRef === stateRef)
      );
      if (!stateDoesExist) {
        logger.error(`No state ref ${stateRef.toString()} found`);
        return;
      }
      logger.log(`Adding listener for ${stateRef.toString()}`);
      spies.push({ stateRef, onChange: onChange as OnStateChange<any> });
    };

    return spyState;
  };

  private generateRoom = (room: RoomFn, roomId: StartWorld.ValidRoomId) => {
    logger.log(`Generating room ${roomId}`);
    return room({
      useState: this.createState(roomId),
      spyState: this.createSpyState(roomId),
    });
  };

  private runSpies = (stateRef: symbol | undefined, newValue: unknown) => {
    if (!stateRef) return;
    Object.values(this.spyRooms)
      .flat()
      .filter((entry) => entry.stateRef === stateRef)
      .forEach((entry) => entry.onChange(newValue));
  };

  private createSetState =
    (
      stateEntry: StateEntry,
      stateName: string,
      roomId: StartWorld.ValidRoomId
    ) =>
    (newValueOrSetter: unknown) => {
      let getNewValue =
        typeof newValueOrSetter === "function"
          ? newValueOrSetter
          : () => newValueOrSetter;

      const oldValue = stateEntry.value;
      const newValue = getNewValue(oldValue);
      if (newValue === oldValue) {
        logger.log(
          `Not changing state ${stateName} from ${JSON.stringify(oldValue)}`
        );
        return;
      }

      logger.log(`Changing state ${stateName} from ${oldValue} to ${newValue}`);
      stateEntry.value = newValue;
      this.runSpies(stateEntry.stateRef, newValue);
      this.dirtyRooms[roomId] = true;
      this.scheduleDirtyRoomsRun();
    };

  private scheduleDirtyRoomsRun = () => {
    if (this.refreshTimeout) return;
    logger.log("Scheduling dirty rooms");
    this.refreshTimeout = setTimeout(() => {
      this.rooms = {
        ...this.rooms,
        ...mapObj(this.dirtyRooms, (_, dirtyRoom) =>
          this.generateRoom(
            StartWorld.Rooms[dirtyRoom as StartWorld.ValidRoomId],
            dirtyRoom
          )
        ),
      };
      this.dirtyRooms = {};
      this.refreshTimeout = undefined;
    }, 0);
  };

  private addUserToRoom = (userUuid: UUID, roomId: StartWorld.ValidRoomId) => {
    logger.log(`addUserToRoom(${userUuid}, ${roomId})`);
    const currentUsersInRoom = this.roomsWithUsers[roomId] ?? [];
    this.roomsWithUsers[roomId] = [...currentUsersInRoom, userUuid];
    this.usersCurrentRoom[userUuid] = roomId;
  };

  private removeUserFromRoom = (userUuid: string) => {
    logger.log(`removeUserFromRoom(${userUuid})`);
    const currentRoomUuid = this.usersCurrentRoom[userUuid];
    delete this.usersCurrentRoom[userUuid];
    this.roomsWithUsers[currentRoomUuid] = (
      this.roomsWithUsers[currentRoomUuid] ?? []
    ).filter((existingUserUuid) => existingUserUuid !== userUuid);
  };

  loginPlayer = (playerUuid: UUID) => {
    if (this.users[playerUuid]) {
      logger.error("User is already logged in");
      return;
    }

    this.users[playerUuid] = {
      uuid: playerUuid,
      username: playerUuid,
    };
    this.addUserToRoom(playerUuid, "TOWNSQUARE");
    this.options.eventSender("LOGIN", this.roomsWithUsers["TOWNSQUARE"], {
      playerUuid,
      playerName: getPlayerByUuid(playerUuid)?.username ?? "[playernotfound]",
    });
  };

  logoutPlayer = (playerUuid: UUID) => {
    if (!this.users[playerUuid]) {
      logger.error("User is not logged in");
      return;
    }

    const playerCurrentRoom = this.usersCurrentRoom[playerUuid];
    this.removeUserFromRoom(playerUuid);
    this.options.eventSender("LOGOUT", this.roomsWithUsers[playerCurrentRoom], {
      playerUuid,
      playerName: getPlayerByUuid(playerUuid)?.username ?? "[playernotfound]",
    });
  };

  onMessage = <T extends ClientToServerTopic>(
    topic: T,
    payload: ClientToServerPayloadType<T>,
    sourcePlayerUuid: UUID
  ) => {
    this.eventDistributor.dispatch(topic, payload, sourcePlayerUuid);
  };
}

export default Engine;
