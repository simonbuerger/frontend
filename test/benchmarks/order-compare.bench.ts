import { describe, test } from "vitest";
import { orderCompare } from "../../src/common/string/compare";
import { createSeededRandom } from "../fixtures/random";

const buildIds = (count: number): string[] =>
  Array.from({ length: count }, (_, index) => `entity-${index}`);

const shuffle = (ids: string[], seed: number): string[] => {
  const random = createSeededRandom(seed);
  const shuffled = [...ids];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const otherIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[otherIndex]] = [
      shuffled[otherIndex],
      shuffled[index],
    ];
  }
  return shuffled;
};

describe("orderCompare", () => {
  for (const count of [2, 5, 10, 100, 1_000, 10_000]) {
    const order = buildIds(count);
    const reverse = [...order].reverse();
    const shuffled = shuffle(order, count);

    test(`${count} reverse IDs with custom order`, async ({ bench }) => {
      await bench(`${count} reverse IDs with custom order`, () => {
        reverse.slice().sort(orderCompare(order));
      }).run({ iterations: 16, warmupIterations: 2 });
    });

    test(`${count} shuffled IDs with custom order`, async ({ bench }) => {
      await bench(`${count} shuffled IDs with custom order`, () => {
        shuffled.slice().sort(orderCompare(order));
      }).run({ iterations: 16, warmupIterations: 2 });
    });
  }
});
