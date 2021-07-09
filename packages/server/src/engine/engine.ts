import { UUID } from "io-ts-types";
import {
  ClientToServerPayloadType,
  ClientToServerTopic,
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

const mapObj = <K extends string, V, R>(
  obj: Record<K, V>,
  mapper: (value: V) => R
): Record<K, R> =>
  Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, mapper(v as V)])
  ) as Record<K, R>;

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
    this.eventDistributor.register("LOOK", (_, player) => {
      console.log("LOOK");
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
    sourcePlayerUuid: string
  ) => {
    this.eventDistributor.dispatch(topic, payload, sourcePlayerUuid);
  };
}

export default Engine;
