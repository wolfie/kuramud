import { Room } from "../room";
import { generateExits } from "../room.util";

const West: Room = () => ({
  description: "You are west of the town square",
  exits: generateExits(["E", "TOWNSQUARE"]),
});

export default West;
