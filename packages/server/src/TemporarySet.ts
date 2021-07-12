import TemporaryRecord, { TemporaryRecordArgs } from "./TemporaryRecord";

class TemporarySet<T extends string> {
  private record: TemporaryRecord<T, true>;

  constructor(opts?: TemporaryRecordArgs) {
    this.record = new TemporaryRecord(opts);
  }

  put = (value: T) => this.record.put(value, true);
  consume = (value: T) => this.record.consumeValue((key) => key === value);
  peek = (value: T) => this.record.peek((key) => key === value);
}

export default TemporarySet;
