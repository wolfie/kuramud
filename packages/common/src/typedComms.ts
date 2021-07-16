import * as t from "io-ts";
import { splitBySpace } from "./fns";
import { ClientToServer, ServerToClient, decode } from "./TopicAndPayload";

export const parseServerToClientInput = (str: string) => {
  const [topic, payload] = splitBySpace(str);
  return decode(ServerToClient, { topic, payload });
};

export const parseClientToServerInput = (str: string) => {
  const [topic, payload] = splitBySpace(str);
  return decode(ClientToServer, { topic, payload });
};

export const encodeToStr = <T extends t.Any>(
  type: T,
  obj: t.TypeOf<T>
): string => JSON.stringify(type.encode(obj));
