import { values } from "fp-ts/lib/Map";
import { createLogger } from "kuramud-common";
import { partitionObj } from "../../../common/lib/fns";

export type TemporaryRecordArgs = {
  ttlMs?: number;
  logger?: ReturnType<typeof createLogger>;
};

type CleanupHandler<K, V> = (key: K, value: V) => void;

class TemporaryRecord<K extends keyof any, V> {
  private entries: Record<string, { creationTimestamp: number; data: V }> = {};
  private interval: ReturnType<typeof setInterval> | undefined;
  private cleanupHandlers: CleanupHandler<K, V>[] = [];
  private readonly TTL_MS: number;
  private readonly logger: ReturnType<typeof createLogger>;

  constructor(opts: TemporaryRecordArgs = {}) {
    this.TTL_MS = opts.ttlMs ?? 10_000;
    this.logger = opts.logger ?? createLogger("TemporaryRecord.ts");
  }

  private cleanup = () => {
    const now = Date.now();
    const beforeEntries = Object.keys(this.entries).length;
    const [notExpired, expired] = partitionObj(
      this.entries,
      ([_key, { creationTimestamp }]) => creationTimestamp + this.TTL_MS >= now
    );
    this.entries = notExpired;
    const afterEntries = Object.keys(this.entries).length;
    const entriesRemoved = beforeEntries - afterEntries;

    Object.entries(expired).forEach(([key, entry]) =>
      this.cleanupHandlers.forEach((handler) => handler(key as K, entry.data))
    );

    if (entriesRemoved > 0) {
      this.logger.log(
        `${entriesRemoved} entries removed during cleanup, ${afterEntries} remain`
      );
    }

    if (afterEntries === 0) this.stopInterval();
  };

  private startInterval = () => {
    if (this.interval) {
      this.logger.error(
        "Trying to start cleanup interval, but it's already running"
      );
      return;
    }

    this.logger.log("Starting cleanup");
    this.interval = setInterval(this.cleanup, this.TTL_MS / 10);
  };

  private stopInterval = () => {
    if (!this.interval) {
      this.logger.error(
        "Trying to stop cleanup interval, but it was already stopped"
      );
      return;
    }

    this.logger.log("Stopping cleanup");
    clearInterval(this.interval);
    this.interval = undefined;
  };

  put = (key: K, value: V): void => {
    this.entries[key as string] = {
      creationTimestamp: Date.now(),
      data: value,
    };
    if (!this.interval) this.startInterval();
  };

  consumeValue = (
    finder: (key: K, value: V) => boolean
  ): [K, V] | undefined => {
    const foundEntry = this.peek(finder);
    if (!foundEntry) return undefined;

    const key = foundEntry[0] as K;
    const value = foundEntry[1];
    delete this.entries[key as string];

    if (Object.keys(this.entries).length === 0) this.stopInterval();
    return [key, value];
  };

  peek = (finder: (key: K, value: V) => boolean): [K, V] | undefined => {
    const foundEntry = Object.entries<{ creationTimestamp: number; data: V }>(
      this.entries
    ).find(([key, value]) => finder(key as K, value.data));
    return foundEntry ? [foundEntry[0] as K, foundEntry[1].data] : undefined;
  };

  addCleanupHandler = (handler: CleanupHandler<K, V>) => {
    this.cleanupHandlers.push(handler);
  };
}

export default TemporaryRecord;
