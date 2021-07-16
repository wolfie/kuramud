import { createLogger } from "kuramud-common";
import { getPlayerByUuid } from "../../players";
import { Item, RoomFn } from "../room";
import { generateExits } from "../room.util";

const logger = createLogger("TownSquare.ts");

const Fountain: Item = {
  name: "a fountain",
  tags: ["fountain"],
  description:
    "A fountain stands in the middle of the town square. There's a plaque with some writing on it.",
};

const Plaque: Item = {
  name: "plaque",
  tags: ["plaque"],
  description:
    'The plaque on the fountain reads: "This is a fountain". There\'s a small button under the plaque.',
  hidden: true,
};

type ButtonProps = { onPush: () => void };
const Button = ({ onPush }: ButtonProps): Item => ({
  name: "button",
  tags: ["button"],
  description:
    "There's a small button under the plaque of the fountain. It looks like you can press it.",
  hidden: true,
  onPush: ({ playerUuid, currentRoom, getPlayersInRoom }) => {
    onPush();
    return [
      {
        affectedPlayers: getPlayersInRoom(currentRoom).filter(
          (playerInRoomUuid) => playerInRoomUuid !== playerUuid
        ),
        eventMessage: `${
          getPlayerByUuid(playerUuid)?.username
        } pushes a button on the fountain.`,
      },
      {
        affectedPlayers: [playerUuid],
        eventMessage:
          "You push the button. It makes a satisfying click, and you hear something towards the east.",
      },
    ];
  },
});

export const SIGN_STATE_REF = Symbol("SIGN_STATE");

const TownSquare: RoomFn = ({ useState }) => {
  const [signState, setSignState] = useState(false, SIGN_STATE_REF);

  logger.log({ signState });

  return {
    description: "This is the town square",
    exits: generateExits(
      ["E", "EAST"],
      ["N", "NORTH"],
      ["W", "WEST"],
      ["S", "SOUTH"]
    ),
    items: {
      FOUNTAIN: Fountain,
      PLAQUE: Plaque,
      BUTTON: Button({ onPush: () => setSignState((signState) => !signState) }),
    },
  };
};

export default TownSquare;
