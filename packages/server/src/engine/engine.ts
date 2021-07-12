import { UUID } from "io-ts-types";
import {
  ClientToServerPayloadType,
  ClientToServerTopic,
  createLogger,
  mapObj,
  oppositeDirection,
  ServerToClientPayloadType,
  ServerToClientTopic,
} from "kuramud-common";
import { getPlayerByUuid } from "../players";
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

      options.eventSender("DESCRIBE_ROOM", [playerUuid], {
        description: roomOfPlayer.description,
        exits: roomOfPlayer.exits.map((exit) => exit.direction),
      });
    });

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
      options.eventSender("DESCRIBE_ROOM", [playerUuid], {
        description: nextRoom.description,
        exits: nextRoom.exits.map((exit) => exit.direction),
      });
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
