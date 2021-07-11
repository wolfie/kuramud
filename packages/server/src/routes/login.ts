import { Parser, Response, Route, route, router } from "typera-express";
import { v4 as uuid } from "uuid";
import * as t from "io-ts";
import { Players } from "../players";

const LoginBody = t.type({ username: t.string, password: t.string });

export type OnPlayerLoginFn = (playerUuid: string, oneUseToken: string) => void;

export const generateLoginRoute = (
  onPlayerLogin: OnPlayerLoginFn
): Route<
  | Response.Ok<{ playerUuid: string; oneUseToken: string }>
  | Response.BadRequest<string>
  | Response.Unauthorized
> =>
  route
    .post("/login")
    .use(Parser.body(LoginBody))
    .handler((ctx) => {
      const playerUuid = Players.find(
        (player) =>
          player.username === ctx.body.username &&
          player.password === ctx.body.password
      )?.uuid;

      if (playerUuid) {
        const oneUseToken = uuid();
        onPlayerLogin(playerUuid, oneUseToken);
        return Response.ok({ playerUuid, oneUseToken });
      } else {
        return Response.unauthorized();
      }
    });

export default (options: { onPlayerLogin: OnPlayerLoginFn }) => {
  const loginRoute = generateLoginRoute(options.onPlayerLogin);
  return router(loginRoute).handler();
};
