import "jest";
import { partitionObj } from "./partitionObj";

describe("partitionObj", () => {
  it("partitions an object into two piles", () => {
    const obj = { a: 1, b: 2, c: 3, d: 4 };
    const [evens, odds] = partitionObj(obj, ([, value]) => value % 2 === 0);

    expect(evens).toMatchObject({ b: 2, d: 4 });
    expect(odds).toMatchObject({ a: 1, c: 3 });
  });
});
