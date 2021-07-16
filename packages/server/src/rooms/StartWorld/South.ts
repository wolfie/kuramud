import { RoomFn } from "../room";
import { generateExits } from "../room.util";

const South: RoomFn = () => ({
  description: "You are south of the town square",
  exits: generateExits(["N", "TOWNSQUARE"]),
});

export default South;
