import { assert, describe, it } from "vitest";

import { orderCompare } from "../../../src/common/string/compare";

describe("orderCompare", () => {
  it("sorts known IDs by the supplied order", () => {
    const compare = orderCompare(["area-b", "area-a", "area-c"]);

    assert.deepStrictEqual(["area-c", "area-a", "area-b"].sort(compare), [
      "area-b",
      "area-a",
      "area-c",
    ]);
  });

  it("places unknown IDs after known IDs and preserves ties", () => {
    const input = ["unknown-b", "area-a", "unknown-a", "area-b"];

    assert.deepStrictEqual(input.sort(orderCompare(["area-a", "area-b"])), [
      "area-a",
      "area-b",
      "unknown-b",
      "unknown-a",
    ]);
  });

  it("uses the first position when the order contains duplicate IDs", () => {
    const compare = orderCompare(["area-a", "area-b", "area-c", "area-a"]);

    assert.deepStrictEqual(["area-c", "area-a", "area-b"].sort(compare), [
      "area-a",
      "area-b",
      "area-c",
    ]);
  });

  it("returns equality for identical and unknown IDs", () => {
    const compare = orderCompare(["area-a"]);

    assert.strictEqual(compare("area-a", "area-a"), 0);
    assert.strictEqual(compare("unknown-a", "unknown-b"), 0);
  });

  it("places every ID after an empty order with stable ties", () => {
    const input = ["area-b", "area-a"];

    assert.deepStrictEqual(input.sort(orderCompare([])), ["area-b", "area-a"]);
  });
});
