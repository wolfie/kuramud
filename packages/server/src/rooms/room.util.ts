import { Direction, Exit } from "./room";
import { ValidRoomId } from "./StartWorld";

export const generateExits = (...x: [Direction, ValidRoomId][]): Exit[] =>
  x.map(([direction, room]) => ({ direction, roomUuid: room }));
