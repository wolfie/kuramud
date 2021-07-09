import { Room } from "../room";
import { generateExits } from "../room.util";

const East: Room = {
  description: "You are east of the town square",
  exits: generateExits(["W", "TOWNSQUARE"]),
};

export default East;
