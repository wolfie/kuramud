/** player "Database" */
export const Players = [
  {
    username: "dev",
    password: "dev",
    uuid: "206a9b9f-bb88-4862-8c39-aab6a95d1a09",
  },
  {
    username: "player",
    password: "player",
    uuid: "b788659b-49d4-4de8-9dd9-dfd5853a3395",
  },
];

export const getPlayerByUuid = (uuid: string) =>
  Players.find((player) => player.uuid === uuid);
