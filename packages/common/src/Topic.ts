import * as t from "io-ts";
import * as tt from "io-ts-types";
import { decodeFromStrC } from "./decodeFromStr";

export type PayloadOfTopic<T extends Topic> = t.TypeOf<typeof TopicTypeMap[T]>;

export type TopicHandler<T extends Topic> = (
  payload: PayloadOfTopic<T>
) => void;

export type TopicHandlerEntry<T extends Topic> = {
  topic: T;
  handler: TopicHandler<T>;
};

export type TopicHandlerRegistrationWithUnregistration = <T extends Topic>(
  topic: T,
  handler: TopicHandler<T>
) => () => void;

const PlayerUuidInfo = t.type({ playerUuid: tt.UUID });

export const TopicTypeMap = {
  LOGIN: PlayerUuidInfo,
  LOGOUT: PlayerUuidInfo,
  NOOP: t.void,
};

export const TopicDecoderMap = Object.fromEntries(
  Object.entries(TopicTypeMap).map(([key, type]) => [key, decodeFromStrC(type)])
) as {
  [K in keyof typeof TopicTypeMap]: (
    str: string
  ) => t.TypeOf<typeof TopicTypeMap[K]>;
};

export const Topic = t.keyof(TopicTypeMap);
export type Topic = t.TypeOf<typeof Topic>;
