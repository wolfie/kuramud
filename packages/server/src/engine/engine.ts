import { Room } from "../rooms/room";
import TownSquare from "../rooms/StartWorld/TownSquare";
import TopicValidators, {
  isDecodeError,
  TopicTypeMap,
} from "./topicValidators";
import { format } from "util";

export const Topics = ["LOGIN", "LOGOUT"] as const;
export type Topic = typeof Topics[number];

export const isTopic = (topic: string): topic is Topic =>
  Topics.includes(topic as any);

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

  constructor(private options: { eventSender: EventSender }) {}

  private addUserToRoom = (userUuid: string, roomUuid: string) => {
    console.log(`addUserToRoom(${userUuid}, ${roomUuid})`);
    const currentUsersInRoom = this.roomsWithUsers[roomUuid] ?? [];
    this.roomsWithUsers[roomUuid] = [...currentUsersInRoom, userUuid];
    this.usersCurrentRoom[userUuid] = roomUuid;
  };

  private removeUserFromRoom = (userUuid: string) => {
    console.log(`removeUserFromRoom(${userUuid})`);
    const currentRoomUuid = this.usersCurrentRoom[userUuid];
    delete this.usersCurrentRoom[userUuid];
    this.roomsWithUsers[currentRoomUuid] = (
      this.roomsWithUsers[currentRoomUuid] ?? []
    ).filter((existingUserUuid) => existingUserUuid !== userUuid);
  };

  private TopicHandlers: { [T in Topic]: (arg: TopicTypeMap[T]) => void } = {
    LOGIN: (args) => {
      if (this.users[args.playerUuid]) {
        console.error("User is already logged in");
        return;
      }

      this.users[args.playerUuid] = {
        uuid: args.playerUuid,
        username: args.playerUuid,
      };
      this.addUserToRoom(args.playerUuid, TownSquare.uuid);

      this.options.eventSender(
        "LOGIN",
        [...this.roomsWithUsers[TownSquare.uuid], args.playerUuid],
        { playerUuid: args.playerUuid }
      );
    },

    LOGOUT: (args) => {
      if (!this.users[args.playerUuid]) {
        console.error("User is not logged in");
        return;
      }

      const playerCurrentRoom = this.usersCurrentRoom[args.playerUuid];
      this.removeUserFromRoom(args.playerUuid);
      this.options.eventSender(
        "LOGOUT",
        [...this.roomsWithUsers[playerCurrentRoom], args.playerUuid],
        { playerUuid: args.playerUuid }
      );
    },
  };

  handleMessage = (topic: Topic, dataString: string) => {
    try {
      const argsValidator = TopicValidators[topic];
      const args = argsValidator(dataString);
      this.TopicHandlers[topic](args);
    } catch (e) {
      if (isDecodeError(e)) {
        console.error(dataString);
        console.error("Decode error!");
        console.error(JSON.stringify(e, null, 2));
      } else {
        console.error("Unexpected error: " + format(e));
      }
    }
  };
}

export default Engine;
