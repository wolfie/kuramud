import { Item, Room } from "../room";
import { generateExits } from "../room.util";

type SignProps = { on: boolean };
const Sign = ({ on }: SignProps): Item => ({
  name: "a neon sign",
  description: `A neon sign that says. "Toggle me at the fountain" in fancy cursive. It is currently ${
    on ? "lit up" : "dark"
  }.`,
  tags: ["sign", "neon", "neon sign"],
});

const East: Room = () => {
  return {
    description: "You are east of the town square",
    exits: generateExits(["W", "TOWNSQUARE"]),
    items: { SIGN: Sign({ on: false }) },
  };
};

export default East;
