import { v4 as uuid } from "uuid";
import { Room } from "../room";

const TownSquare: Room = {
  uuid: uuid(),
  description: "This is the town square",
  exits: [],
};

export default TownSquare;
