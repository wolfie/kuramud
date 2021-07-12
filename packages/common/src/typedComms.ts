import * as t from "io-ts";
import { ClientToServer, ServerToClient, decode } from "./TopicAndPayload";

export const parseServerToClientInput = (str: string) => {
  const [topic, payload] = str.split(" ", 2);
  return decode(ServerToClient, { topic, payload });
};

export const parseClientToServerInput = (str: string) => {
  const [topic, payload] = str.split(" ", 2);
  return decode(ClientToServer, { topic, payload });
};

export const encodeToStr = <T extends t.Any>(
  type: T,
  obj: t.TypeOf<T>
): string => JSON.stringify(type.encode(obj));
