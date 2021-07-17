import * as t from "io-ts";
import * as tt from "io-ts-types";

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
  topicPayload("LOGIN", t.type({ playerUuid: tt.UUID, oneTimeCode: t.string })),
  topicPayload("LOGOUT", t.void),
  topicPayload("LOOK_ROOM", t.void),
  topicPayload("LOOK_ITEM", t.type({ lookKeyword: t.string })),
  topicPayload("PUSH_ITEM", t.type({ pushKeyword: t.string })),
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
  topicPayload("ECHO_MESSAGE", t.type({ message: t.string })),
  topicPayload("LOGIN", t.type({ playerUuid: tt.UUID, playerName: t.string })),
  topicPayload("LOGOUT", t.type({ playerUuid: tt.UUID, playerName: t.string })),
  topicPayload(
    "DESCRIBE_ROOM",
    t.type({
      description: t.string,
      exits: t.array(Direction),
      items: t.array(t.type({ name: t.string })),
    })
  ),
  topicPayload(
    "DESCRIBE_ITEM",
    t.intersection([
      t.type({ keyword: t.string }),
      t.union([
        t.type({ found: t.literal(false) }),
        t.type({ found: t.literal(true), description: t.string }),
      ]),
    ])
  ),
  topicPayload(
    "WALK",
    t.type({
      playerUuid: tt.UUID,
      playerName: t.string,
      goingOrComing: t.union([t.literal("comingFrom"), t.literal("goingAway")]),
      direction: Direction,
    })
  ),
  topicPayload("WALK_STATE", t.type({ onCooldown: t.boolean })),
]);

export type ServerToClientTopic = t.TypeOf<typeof ServerToClient>["topic"];

export const decode = <T extends t.Any>(type: T, obj: unknown): t.TypeOf<T> => {
  const result = type.decode(obj);
  if (result._tag === "Left") throw new Error();
  else return result.right;
};
