import { isRight } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import * as t from "io-ts";
import { Topic } from "./engine";

export type LoginArgs = t.TypeOf<typeof LoginArgs>;
const LoginArgs = t.type({ playerUuid: t.string }, "LoginArgs");

export type LogoutArgs = t.TypeOf<typeof LogoutArgs>;
const LogoutArgs = t.type({ playerUuid: t.string }, "LogoutArgs");

type DecodeError = ReturnType<typeof DecodeError>;
const DecodeError = (errors: t.Errors) =>
  ({
    type: "EngineError",
    subType: "DecodeError",
    errors,
  } as const);
type EngineError = DecodeError;

export const isEngineError = (arg: unknown): arg is EngineError =>
  typeof arg === "object" &&
  arg !== null &&
  (arg as any).type === "EngineError";

export const isDecodeError = (arg: unknown): arg is DecodeError =>
  isEngineError(arg) && arg.subType === "DecodeError";

export type TopicTypeMap = { [T in Topic]: t.TypeOf<typeof TopicTypeMap[T]> };
export const TopicTypeMap = {
  LOGIN: LoginArgs,
  LOGOUT: LogoutArgs,
} as const;

const jsonParseOrThrow = (input: string): any => {
  try {
    return JSON.parse(input);
  } catch (e) {
    throw DecodeError(e);
  }
};

const decode = <T extends t.TypeC<any>>(type: T, obj: unknown): t.TypeOf<T> => {
  const result = type.decode(obj);
  if (isRight(result)) return result.right;
  else {
    throw DecodeError(result.left);
  }
};

const decodeC =
  <T extends t.TypeC<any>>(type: T) =>
  (obj: unknown) =>
    decode(type, obj);

const decodeStr = <T extends t.TypeC<any>>(type: T, str: string) =>
  pipe(jsonParseOrThrow(str), decodeC(type));

const TopicValidators = Object.entries(TopicTypeMap).reduce(
  (acc, [key, value]) => ({
    ...acc,
    [key]: (arg: string) => decodeStr(value, arg),
  }),
  {} as {
    [T in Topic]: (arg: string) => TopicTypeMap[T];
  }
);

export default TopicValidators;
