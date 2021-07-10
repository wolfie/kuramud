import * as t from "io-ts";
import * as tt from "io-ts-types";

const PlayerUuidInfo = t.type({ playerUuid: tt.UUID });

export type Direction = t.TypeOf<typeof Direction>;
export const Direction = t.union(
  [t.literal("N"), t.literal("E"), t.literal("S"), t.literal("W")],
  "Direction"
);

const topicPayload = <TOPIC extends string, PAYLOAD extends t.Any>(
  topic: TOPIC,
  payload: PAYLOAD
) => t.type({ topic: t.literal(topic), payload });

export const ClientToServer = t.union([
  topicPayload("LOGIN", PlayerUuidInfo),
  topicPayload("LOGOUT", t.void),
  topicPayload("LOOK_ROOM", t.void),
  topicPayload("DEV_CLEANUP", t.void),
]);

export type ClientToServerTopic = t.TypeOf<typeof ClientToServer>["topic"];

export type ClientToServerPayloadType<T extends ClientToServerTopic> = Extract<
  t.TypeOf<typeof ClientToServer>,
  { topic: T }
>["payload"];

export type ServerToClientPayloadType<T extends ServerToClientTopic> = Extract<
  t.TypeOf<typeof ServerToClient>,
  { topic: T }
>["payload"];
export const ServerToClient = t.union([
  topicPayload("LOGIN", PlayerUuidInfo),
  topicPayload("LOGOUT", PlayerUuidInfo),
  topicPayload(
    "DESCRIBE_ROOM",
    t.type({ description: t.string, exits: t.array(Direction) })
  ),
]);

export type ServerToClientTopic = t.TypeOf<typeof ServerToClient>["topic"];

export const decode = <T extends t.Any>(type: T, obj: unknown): t.TypeOf<T> => {
  const result = type.decode(obj);
  if (result._tag === "Left") throw new Error();
  else return result.right;
};
