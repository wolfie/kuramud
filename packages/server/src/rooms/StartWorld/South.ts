import { Room } from "../room";
import { generateExits } from "../room.util";

const South: Room = () => ({
  description: "You are south of the town square",
  exits: generateExits(["N", "TOWNSQUARE"]),
});

export default South;
