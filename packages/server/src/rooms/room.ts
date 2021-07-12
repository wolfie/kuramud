import { ValidRoomId } from "./StartWorld";

export type Direction = "N" | "S" | "W" | "E";

export type Exit = {
  direction: Direction;
  roomUuid: ValidRoomId;
};

export type Item = {
  name: string;
  description: string;
  tags: string[];
  hidden?: boolean;
};

export type Room = {
  description: string;
  exits: readonly Exit[];
  items?: Readonly<Record<string, Item>>;
};
