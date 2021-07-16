import { createLogger } from "kuramud-common";
import { Item, RoomFn } from "../room";
import { generateExits } from "../room.util";
import { SIGN_STATE_REF } from "./TownSquare";

const logger = createLogger("East.ts");

type SignProps = { on: boolean };
const Sign = ({ on }: SignProps): Item => ({
  name: "a neon sign",
  description: `A neon sign that says. "Toggle me at the fountain" in fancy cursive. It is currently ${
    on ? "lit up" : "dark"
  }.`,
  tags: ["sign", "neon", "neon sign"],
});

const East: RoomFn = ({ useState, spyState }) => {
  const [signIsLit, setSignIsLit] = useState(false);

  spyState<boolean>(SIGN_STATE_REF, (newValue) => setSignIsLit(newValue));
  logger.log({ signIsLit });

  return {
    description: "You are east of the town square",
    exits: generateExits(["W", "TOWNSQUARE"]),
    items: { SIGN: Sign({ on: signIsLit }) },
  };
};

export default East;
