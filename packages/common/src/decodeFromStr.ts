import { isRight } from "fp-ts/lib/Either";
import * as t from "io-ts";

export const decodeFromStr = <T extends t.Any>(
  type: T,
  input: string
): t.TypeOf<T> => {
  try {
    const result = type.decode(JSON.parse(input));
    if (isRight(result)) return result.right;
    else throw new Error(JSON.stringify(result.left));
  } catch (e) {
    console.error(typeof input, input);
    throw e;
  }
};
