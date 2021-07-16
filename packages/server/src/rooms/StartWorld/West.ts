import { RoomFn } from "../room";
import { generateExits } from "../room.util";

const West: RoomFn = () => ({
  description: "You are west of the town square",
  exits: generateExits(["E", "TOWNSQUARE"]),
});

export default West;
