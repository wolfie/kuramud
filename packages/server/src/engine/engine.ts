import { UUID } from "io-ts-types";
import {
  ClientToServerPayloadType,
  ClientToServerTopic,
  mapObj,
  oppositeDirection,
  ServerToClientPayloadType,
  ServerToClientTopic,
} from "kuramud-common";
import * as StartWorld from "../rooms/StartWorld";
import { ServerEventDistributor } from "./ServerEventDistributor";

export type EventSender = <T extends ServerToClientTopic>(
  topic: T,
  playerUuids: string[],
  payload: ServerToClientPayloadType<T>
) => void;

type User = {
  uuid: string;
  username: string;
};

type UserUUID = string;

class Engine {
  private rooms = StartWorld.Rooms;
  private users: Record<string, User> = {};
  private roomsWithUsers: Record<StartWorld.ValidRoomId, UserUUID[]> = mapObj(
    StartWorld.Rooms,
    () => []
  );
  private usersCurrentRoom: Record<UserUUID, StartWorld.ValidRoomId> = {};
  private eventDistributor = new ServerEventDistributor();

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
      const oldRoomId = this.usersCurrentRoom[playerUuid];
      const roomOfPlayer = this.rooms[oldRoomId];
      const nextRoomId = roomOfPlayer.exits.find(
        (exit) => exit.direction === direction
      )?.roomUuid;
      if (!nextRoomId) {
        console.error(
          `Can't go ${direction} from ${oldRoomId} (player ${playerUuid})`
        );
        return;
      }
      const nextRoom = this.rooms[nextRoomId];

      this.removeUserFromRoom(playerUuid);
      this.addUserToRoom(playerUuid, nextRoomId);

      options.eventSender("WALK", this.roomsWithUsers[oldRoomId], {
        playerUuid,
        goingOrComing: "goingAway",
        direction,
      });
      options.eventSender("WALK", this.roomsWithUsers[nextRoomId], {
        playerUuid,
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
    console.log(`addUserToRoom(${userUuid}, ${roomId})`);
    const currentUsersInRoom = this.roomsWithUsers[roomId] ?? [];
    this.roomsWithUsers[roomId] = [...currentUsersInRoom, userUuid];
    this.usersCurrentRoom[userUuid] = roomId;
  };

  private removeUserFromRoom = (userUuid: string) => {
    console.log(`removeUserFromRoom(${userUuid})`);
    const currentRoomUuid = this.usersCurrentRoom[userUuid];
    delete this.usersCurrentRoom[userUuid];
    this.roomsWithUsers[currentRoomUuid] = (
      this.roomsWithUsers[currentRoomUuid] ?? []
    ).filter((existingUserUuid) => existingUserUuid !== userUuid);
  };

  loginPlayer = (playerUuid: UUID) => {
    if (this.users[playerUuid]) {
      console.error("User is already logged in");
      return;
    }

    this.users[playerUuid] = {
      uuid: playerUuid,
      username: playerUuid,
    };
    this.addUserToRoom(playerUuid, "TOWNSQUARE");
    this.options.eventSender("LOGIN", this.roomsWithUsers["TOWNSQUARE"], {
      playerUuid,
    });
  };

  logoutPlayer = (playerUuid: UUID) => {
    if (!this.users[playerUuid]) {
      console.error("User is not logged in");
      return;
    }

    const playerCurrentRoom = this.usersCurrentRoom[playerUuid];
    this.removeUserFromRoom(playerUuid);
    this.options.eventSender("LOGOUT", this.roomsWithUsers[playerCurrentRoom], {
      playerUuid,
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
