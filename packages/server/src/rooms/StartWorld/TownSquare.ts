import { getPlayerByUuid } from "../../players";
import { Item, Room } from "../room";
import { generateExits } from "../room.util";

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

const Button: Item = {
  name: "button",
  tags: ["button"],
  description:
    "There's a small button under the plaque of the fountain. It looks like you can press it.",
  hidden: true,
  onPush: ({ playerUuid, currentRoom, getPlayersInRoom }) => [
    {
      affectedPlayers: getPlayersInRoom(currentRoom),
      eventMessage: `${
        getPlayerByUuid(playerUuid)?.username
      } pushes a button on the fountain.`,
    },
    {
      affectedPlayers: [playerUuid],
      eventMessage:
        "You push the button. It makes a satisfying click, but nothing further happens.",
    },
  ],
};

const TownSquare: Room = {
  description: "This is the town square",
  exits: generateExits(
    ["E", "EAST"],
    ["N", "NORTH"],
    ["W", "WEST"],
    ["S", "SOUTH"]
  ),
  items: { FOUNTAIN: Fountain, PLAQUE: Plaque, BUTTON: Button },
};

export default TownSquare;
