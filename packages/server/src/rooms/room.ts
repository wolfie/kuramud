export type Direction = "N" | "S" | "W" | "E";

export type Exit = {
  direction: Direction;
  roomUuid: string;
};

export type Room = {
  uuid: string;
  description: string;
  exits: Exit[];
};
