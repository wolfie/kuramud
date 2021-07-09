import East from "./East";
import North from "./North";
import South from "./South";
import TownSquare from "./TownSquare";
import West from "./West";

export const Rooms = {
  TOWNSQUARE: TownSquare,
  EAST: East,
  WEST: West,
  SOUTH: South,
  NORTH: North,
} as const;

export type ValidRoomId = keyof typeof Rooms;
