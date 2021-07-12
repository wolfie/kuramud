import { createLogger } from "kuramud-common";
import TemporaryRecord from "./TemporaryRecord";

const logger = createLogger("LoginSecretBridge.ts");

type PlayerUuid = string; // just to document the intent

const TOKEN_TTL_MS = 10_000;

class LoginSecretBridge {
  private records = new TemporaryRecord<PlayerUuid, string>({
    logger,
    ttlMs: TOKEN_TTL_MS,
  });

  put = (playerUuid: PlayerUuid, oneUseToken: string): void => {
    logger.log(`Adding token ${oneUseToken} for player ${playerUuid}`);
    this.records.put(playerUuid, oneUseToken);
  };

  consume = (oneUseToken: string): PlayerUuid | undefined => {
    const [playerUuid] =
      this.records.consumeValue((uuid, token) => token === oneUseToken) ?? [];
    if (!playerUuid) {
      logger.error(`Cannot find one use token ${oneUseToken}`);
      return;
    }

    logger.log(
      `Consuming one use token ${oneUseToken} for player ${playerUuid}`
    );
    return playerUuid;
  };
}

export default LoginSecretBridge;
