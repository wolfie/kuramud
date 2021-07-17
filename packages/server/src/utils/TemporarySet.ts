import TemporaryRecord, { TemporaryRecordArgs } from "./TemporaryRecord";

type CleanupHandler<T extends keyof any> = (value: T) => void;
class TemporarySet<T extends keyof any> {
  private record: TemporaryRecord<T, true>;

  constructor(opts?: TemporaryRecordArgs) {
    this.record = new TemporaryRecord(opts);
  }

  put = (value: T) => this.record.put(value, true);
  consume = (value: T) => this.record.consumeValue((key) => key === value);
  peek = (value: T) => this.record.peek((key) => key === value);
  addCleanupHandler = (handler: CleanupHandler<T>) =>
    this.record.addCleanupHandler((key) => handler(key));
}

export default TemporarySet;
