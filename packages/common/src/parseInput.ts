import { ClientToServer, ServerToClient, decode } from "./TopicAndPayload";

export const parseServerToClientInput = (str: string) => {
  const [topic, payload] = str.split(" ", 2);
  return decode(ServerToClient, { topic, payload });
};

export const parseClientToServerInput = (str: string) => {
  const [topic, payload] = str.split(" ", 2);
  return decode(ClientToServer, { topic, payload });
};
