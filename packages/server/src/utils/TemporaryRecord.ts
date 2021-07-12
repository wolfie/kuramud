import { createLogger } from "kuramud-common";
import { filterObj } from "kuramud-common/lib/fns";

export type TemporaryRecordArgs = {
  ttlMs?: number;
  logger?: ReturnType<typeof createLogger>;
};

class TemporaryRecord<K extends string, V> {
  private entries: Record<K, { creationTimestamp: number; data: V }> =
    {} as any;
  private interval: ReturnType<typeof setInterval> | undefined;
  private readonly TTL_MS: number;
  private readonly logger: ReturnType<typeof createLogger>;

  constructor(opts: TemporaryRecordArgs = {}) {
    this.TTL_MS = opts.ttlMs ?? 10_000;
    this.logger = opts.logger ?? createLogger("TemporaryRecord.ts");
  }

  private cleanup = () => {
    const now = Date.now();
    const beforeEntries = Object.keys(this.entries).length;
    this.entries = filterObj(
      this.entries,
      ([_key, { creationTimestamp }]) => creationTimestamp + this.TTL_MS >= now
    );
    const afterEntries = Object.keys(this.entries).length;
    const entriesRemoved = beforeEntries - afterEntries;

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
    this.entries[key] = { creationTimestamp: Date.now(), data: value };
    if (!this.interval) this.startInterval();
  };

  consumeValue = (
    finder: (key: K, value: V) => boolean
  ): [K, V] | undefined => {
    const foundEntry = this.peek(finder);
    if (!foundEntry) return undefined;

    const key = foundEntry[0] as K;
    const value = foundEntry[1];
    delete this.entries[key];

    if (Object.keys(this.entries).length === 0) this.stopInterval();
    return [key, value];
  };

  peek = (finder: (key: K, value: V) => boolean): [K, V] | undefined => {
    const foundEntry = Object.entries<{ creationTimestamp: number; data: V }>(
      this.entries
    ).find(([key, value]) => finder(key as K, value.data));
    return foundEntry ? [foundEntry[0] as K, foundEntry[1].data] : undefined;
  };
}

export default TemporaryRecord;
