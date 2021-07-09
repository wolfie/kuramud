import { Room } from "../room";
import { generateExits } from "../room.util";

const TownSquare: Room = {
  description: "This is the town square",
  exits: generateExits(
    ["E", "EAST"],
    ["N", "NORTH"],
    ["W", "WEST"],
    ["S", "SOUTH"]
  ),
};

export default TownSquare;
