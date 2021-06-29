import * as t from "io-ts";

export const encodeToStr = <T extends t.Any>(
  type: T,
  obj: t.TypeOf<T>
): string => JSON.stringify(type.encode(obj));
