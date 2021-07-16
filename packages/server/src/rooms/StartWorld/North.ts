import { RoomFn } from "../room";
import { generateExits } from "../room.util";

const North: RoomFn = () => ({
  description: "You are north of the town square",
  exits: generateExits(["S", "TOWNSQUARE"]),
});

export default North;
