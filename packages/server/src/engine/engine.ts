import { option, UUID } from "io-ts-types";
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
import { Room } from "../rooms/room";
import * as StartWorld from "../rooms/StartWorld";
import { ServerEventDistributor } from "./ServerEventDistributor";
import WalkLimiter from "./WalkLimiter";

const logger = createLogger("engine.ts");

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

class Engine {
  private rooms = StartWorld.Rooms;
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
  }

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
