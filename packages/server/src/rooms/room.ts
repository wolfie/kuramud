import { UUID } from "io-ts-types";
import { ValidRoomId } from "./StartWorld";

export type Direction = "N" | "S" | "W" | "E";

export type Exit = {
  direction: Direction;
  roomUuid: ValidRoomId;
};

export type GetPlayersInRoom = (roomId: ValidRoomId) => string[];

export type OnPushResult = {
  eventMessage: string;
  affectedPlayers: string[];
};

export type Item = {
  name: string;
  description: string;
  tags: string[];
  hidden?: boolean;
  onPush?: (props: {
    playerUuid: UUID;
    currentRoom: ValidRoomId;
    getPlayersInRoom: GetPlayersInRoom;
  }) => OnPushResult | OnPushResult[];
};

export type RoomResult = {
  description: string;
  exits: readonly Exit[];
  items?: Readonly<Record<string, Item>>;
};

export type Room = () => RoomResult;
