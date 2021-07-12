import { createLogger } from "kuramud-common";
import TemporarySet from "../utils/TemporarySet";

const logger = createLogger("WalkLimiter.ts");

type PlayerUuid = string; // just to document the intent

class WalkLimiter {
  private recentWalkers: TemporarySet<PlayerUuid>;

  constructor(opts: { walkCooldownMs: number }) {
    this.recentWalkers = new TemporarySet({
      ttlMs: opts.walkCooldownMs,
      logger,
    });
  }

  isAllowed = (playerUuid: PlayerUuid) => {
    const entryExists = !!this.recentWalkers.peek(playerUuid);
    if (!entryExists) {
      this.recentWalkers.put(playerUuid);
      return true;
    } else {
      return false;
    }
  };
}

export default WalkLimiter;
