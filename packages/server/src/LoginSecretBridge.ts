import { createLogger, filterObj } from "kuramud-common";

const logger = createLogger("LoginSecretBridge.ts");

type PlayerUuid = string; // just to document the intent

type Entries = Record<
  PlayerUuid,
  { oneUseToken: string; creationTimestamp: number }
>;

const TOKEN_TTL_MS = 10_000;

class LoginSecretBridge {
  private entries: Entries = {};
  private interval: ReturnType<typeof setInterval> | undefined;

  private cleanup = () => {
    const now = Date.now();
    const beforeEntries = Object.keys(this.entries).length;
    this.entries = filterObj(
      this.entries,
      ([_uuid, info]) => info.creationTimestamp + TOKEN_TTL_MS >= now
    );
    const afterEntries = Object.keys(this.entries).length;
    const entriesRemoved = beforeEntries - afterEntries;

    if (entriesRemoved > 0) {
      logger.log(
        `${entriesRemoved} entries removed during cleanup, ${afterEntries} remain`
      );
    }

    if (afterEntries === 0) this.stopInterval();
  };

  private startInterval = () => {
    if (this.interval) {
      logger.error(
        "Trying to start LoginSecretBridge cleanup interval, but it's already running"
      );
      return;
    }

    logger.log("Starting LoginSecretBridge cleanup");
    this.interval = setInterval(this.cleanup, TOKEN_TTL_MS / 10);
  };

  private stopInterval = () => {
    if (!this.interval) {
      logger.error(
        "Trying to stop LoginSecretBridge interval, but it was already stopped"
      );
      return;
    }

    logger.log("Stopping LoginSecretBridge cleanup");
    clearInterval(this.interval);
    this.interval = undefined;
  };

  put = (playerUuid: PlayerUuid, oneUseToken: string): void => {
    logger.log(`Adding token ${oneUseToken} for player ${playerUuid}`);
    this.entries[playerUuid] = { oneUseToken, creationTimestamp: Date.now() };
    if (!this.interval) this.startInterval();
  };

  consume = (oneUseToken: string): PlayerUuid | undefined => {
    const foundEntry = Object.entries(this.entries).find(
      ([uuid, data]) => data.oneUseToken === oneUseToken
    );
    if (!foundEntry) {
      logger.error(`Cannot find one use token ${oneUseToken}`);
      return;
    }

    logger.log(
      `Consuming one use token ${oneUseToken} for player ${foundEntry[0]}`
    );
    const playerUuid = foundEntry[0];
    delete this.entries[playerUuid];

    if (Object.keys(this.entries).length === 0) this.stopInterval();
    return playerUuid;
  };
}

export default LoginSecretBridge;
