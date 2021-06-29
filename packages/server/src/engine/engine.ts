import { Room } from "../rooms/room";
import TownSquare from "../rooms/StartWorld/TownSquare";

import { Topic, EventDistributor, parseInput } from "kuramud-common";

export type EventSender = (
  topic: Topic,
  playerUuids: string[],
  data: Record<string, unknown>
) => void;

type User = {
  uuid: string;
  username: string;
};

class Engine {
  private rooms: Record<string, Room> = [TownSquare].reduce(
    (acc, room) => ({ ...acc, [room.uuid]: room }),
    {}
  );
  private users: Record<string, User> = {};
  private roomsWithUsers: Record<string, string[]> = {};
  private usersCurrentRoom: Record<string, string> = {};
  private eventDistributor = new EventDistributor();

  constructor(private options: { eventSender: EventSender }) {
    const addUserToRoom = (userUuid: string, roomUuid: string) => {
      console.log(`addUserToRoom(${userUuid}, ${roomUuid})`);
      const currentUsersInRoom = this.roomsWithUsers[roomUuid] ?? [];
      this.roomsWithUsers[roomUuid] = [...currentUsersInRoom, userUuid];
      this.usersCurrentRoom[userUuid] = roomUuid;
    };

    const removeUserFromRoom = (userUuid: string) => {
      console.log(`removeUserFromRoom(${userUuid})`);
      const currentRoomUuid = this.usersCurrentRoom[userUuid];
      delete this.usersCurrentRoom[userUuid];
      this.roomsWithUsers[currentRoomUuid] = (
        this.roomsWithUsers[currentRoomUuid] ?? []
      ).filter((existingUserUuid) => existingUserUuid !== userUuid);
    };

    this.eventDistributor.register("LOGIN", (args) => {
      if (this.users[args.playerUuid]) {
        console.error("User is already logged in");
        return;
      }

      this.users[args.playerUuid] = {
        uuid: args.playerUuid,
        username: args.playerUuid,
      };
      addUserToRoom(args.playerUuid, TownSquare.uuid);

      this.options.eventSender(
        "LOGIN",
        [...this.roomsWithUsers[TownSquare.uuid], args.playerUuid],
        { playerUuid: args.playerUuid }
      );
    });

    this.eventDistributor.register("LOGOUT", (args) => {
      if (!this.users[args.playerUuid]) {
        console.error("User is not logged in");
        return;
      }

      const playerCurrentRoom = this.usersCurrentRoom[args.playerUuid];
      removeUserFromRoom(args.playerUuid);
      this.options.eventSender(
        "LOGOUT",
        [...this.roomsWithUsers[playerCurrentRoom], args.playerUuid],
        { playerUuid: args.playerUuid }
      );
    });
  }

  onMessage = (message: string) => {
    const input = parseInput(message);
    if (input) this.eventDistributor.dispatch(input.topic, input.payload);
    else console.error(`unparseable message "${message}"`);
  };
}

export default Engine;
