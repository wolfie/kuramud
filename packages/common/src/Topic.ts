import * as t from "io-ts";
import * as tt from "io-ts-types";

const PlayerUuidInfo = t.type({ playerUuid: tt.UUID });

export const TopicTypeMap = {
  LOGIN: PlayerUuidInfo,
  LOGOUT: PlayerUuidInfo,
  NOOP: t.void,
};

export const Topic = t.keyof(TopicTypeMap);
export type Topic = t.TypeOf<typeof Topic>;
