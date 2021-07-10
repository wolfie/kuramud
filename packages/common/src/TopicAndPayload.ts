import * as t from "io-ts";
import * as tt from "io-ts-types";

const PlayerUuidInfo = t.type({ playerUuid: tt.UUID });

export type Direction = t.TypeOf<typeof Direction>;
export const Direction = t.union(
  [t.literal("N"), t.literal("E"), t.literal("S"), t.literal("W")],
  "Direction"
);
export const oppositeDirection: Record<Direction, Direction> = {
  E: "W",
  N: "S",
  S: "N",
  W: "E",
};

const topicPayload = <TOPIC extends string, PAYLOAD extends t.Any>(
  topic: TOPIC,
  payload: PAYLOAD
) => t.type({ topic: t.literal(topic), payload });

export const ClientToServer = t.union([
  topicPayload("LOGIN", PlayerUuidInfo),
  topicPayload("LOGOUT", t.void),
  topicPayload("LOOK_ROOM", t.void),
  topicPayload("DEV_CLEANUP", t.void),
  topicPayload("WALK", t.type({ direction: Direction })),
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
  topicPayload(
    "WALK",
    t.intersection([
      PlayerUuidInfo,
      t.type({
        goingOrComing: t.union([
          t.literal("comingFrom"),
          t.literal("goingAway"),
        ]),
        direction: Direction,
      }),
    ])
  ),
]);

export type ServerToClientTopic = t.TypeOf<typeof ServerToClient>["topic"];

export const decode = <T extends t.Any>(type: T, obj: unknown): t.TypeOf<T> => {
  const result = type.decode(obj);
  if (result._tag === "Left") throw new Error();
  else return result.right;
};
