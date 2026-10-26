import type { Remote } from "comlink";
import { expose, wrap } from "comlink";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { Api } from "../../../src/components/data-table/sort-filter-worker";
import "../../../src/components/data-table/sort-filter-worker";
import {
  filterData as filterRows,
  sortData as sortRows,
} from "../../../src/components/data-table/sort-filter";

vi.mock("comlink", () => ({
  expose: vi.fn(),
  wrap: vi.fn(),
}));

const workerApi = vi.mocked(expose).mock.calls[0][0] as Api;
const filterDataIndexed = vi.fn(
  async (...args: Parameters<Api["filterDataIndexed"]>) =>
    workerApi.filterDataIndexed(...args)
);
const sortDataIndexed = vi.fn(
  async (...args: Parameters<Api["sortDataIndexed"]>) =>
    workerApi.sortDataIndexed(...args)
);
const remoteWorker = {
  filterDataIndexed,
  sortDataIndexed,
} as unknown as Remote<Api>;

const sortableColumns = (columns: Record<string, object>) =>
  columns as Parameters<Api["filterData"]>[1];

beforeAll(() => {
  vi.stubGlobal("Worker", vi.fn());
  vi.mocked(wrap).mockReturnValue(remoteWorker);
});

beforeEach(() => {
  filterDataIndexed
    .mockReset()
    .mockImplementation(async (...args) =>
      workerApi.filterDataIndexed(...args)
    );
  sortDataIndexed
    .mockReset()
    .mockImplementation(async (...args) => workerApi.sortDataIndexed(...args));
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("compact worker data wrappers", () => {
  it("keeps exact-match priority and fuzzy fallback with diacritics", async () => {
    const exactRows = [
      { id: "exact", name: "Battery sensor" },
      { id: "fuzzy", name: "Batteries sensor" },
      { id: "other", name: "Kitchen light" },
    ];
    const columns = sortableColumns({ name: { filterable: true } });

    const originalExactOrder = [...exactRows];
    const exactMatches = await filterRows(exactRows, columns, "battery");
    expect(exactMatches).toEqual(
      workerApi.filterData(exactRows, columns, "battery")
    );
    expect(exactMatches).toEqual([exactRows[0]]);
    expect(exactMatches[0]).toBe(exactRows[0]);
    expect(exactRows).toEqual(originalExactOrder);

    const fuzzyRows = [exactRows[1]];
    const fuzzyMatches = await filterRows(fuzzyRows, columns, "battery");
    expect(fuzzyMatches).toEqual(
      workerApi.filterData(fuzzyRows, columns, "battery")
    );
    expect(fuzzyMatches).toEqual(fuzzyRows);
    expect(fuzzyMatches[0]).toBe(fuzzyRows[0]);

    const diacriticRows = [{ id: "cafe", name: "Café sensor" }];
    const diacriticMatches = await filterRows(diacriticRows, columns, "cafe");
    expect(diacriticMatches).toEqual(
      workerApi.filterData(diacriticRows, columns, "cafe")
    );
    expect(diacriticMatches).toEqual(diacriticRows);
  });

  it("preserves nested valueColumn, filterKey, and array search behavior", async () => {
    const rows = [
      {
        id: "kitchen",
        metadata: { name: "Temperature", aliases: ["Kitchen", "Ambient"] },
      },
      {
        id: "lounge",
        metadata: { name: "Humidity", aliases: ["Lounge"] },
      },
    ];
    const columns = sortableColumns({
      name: {
        filterable: true,
        valueColumn: "metadata",
        filterKey: "name",
      },
      aliases: {
        filterable: true,
        valueColumn: "metadata",
        filterKey: "aliases",
      },
    });

    const matches = await filterRows(rows, columns, "kitchen");
    expect(matches).toEqual(workerApi.filterData(rows, columns, "kitchen"));
    expect(matches).toEqual([rows[0]]);
    expect(matches[0]).toBe(rows[0]);

    const arrayRows = [
      { id: "array", value: ["Kitchen", null, { name: "Hidden" }, 4] },
      { id: "null", value: null },
    ];
    const arrayColumns = sortableColumns({
      value: { filterable: true, filterKey: "ignored_for_arrays" },
    });
    const arrayMatches = await filterRows(arrayRows, arrayColumns, "kitchen");
    expect(arrayMatches).toEqual(
      workerApi.filterData(arrayRows, arrayColumns, "kitchen")
    );
    expect(arrayMatches).toEqual([arrayRows[0]]);
    const objectArrayMatches = await filterRows(
      arrayRows,
      arrayColumns,
      "hidden"
    );
    expect(objectArrayMatches).toEqual(
      workerApi.filterData(arrayRows, arrayColumns, "hidden")
    );
    expect(objectArrayMatches).toEqual([]);
  });

  it("sorts projected values without mutating inputs and preserves occurrences", async () => {
    const repeated = { id: "duplicate", detail: { rank: 2 } };
    const lower = { id: "duplicate", detail: { rank: "1" } };
    const invalid = { id: "duplicate", detail: { rank: "unknown" } };
    const rows = [repeated, lower, repeated, invalid];
    const originalOrder = [...rows];

    const column = {
      valueColumn: "detail",
      filterKey: "rank",
      type: "numeric" as const,
    };
    const expected = workerApi.sortData([...rows], column, "asc", "rank");
    const sorted = await sortRows(rows, column, "asc", "rank");

    expect(sorted).not.toBe(rows);
    expect(sorted).toEqual(expected);
    expect(sorted).toEqual([lower, repeated, repeated, invalid]);
    expect(sorted[1]).toBe(repeated);
    expect(sorted[2]).toBe(repeated);
    expect(rows).toEqual(originalOrder);
    expect(rows[0]).toBe(repeated);
  });

  it("uses IP comparison and keeps equal values stable", async () => {
    const first = { id: "same", address: "192.168.1.2" };
    const second = { id: "same", address: "192.168.1.2" };
    const later = { id: "same", address: "192.168.1.10" };
    const rows = [later, first, second];

    const column = { type: "ip" as const };
    const expected = workerApi.sortData([...rows], column, "asc", "address");
    const sorted = await sortRows(rows, column, "asc", "address");

    expect(sorted).toEqual(expected);
    expect(sorted).toEqual([first, second, later]);
    expect(sorted[0]).toBe(first);
    expect(sorted[1]).toBe(second);
    expect(rows).toEqual([later, first, second]);
  });

  it("maps sort results to the submitted array snapshot", async () => {
    const high = { id: "high", rank: 2 };
    const low = { id: "low", rank: 1 };
    const rows = [high, low];
    let releaseWorker!: () => void;
    const workerGate = new Promise<void>((resolve) => {
      releaseWorker = resolve;
    });
    sortDataIndexed.mockImplementationOnce(async (...args) => {
      const indices = workerApi.sortDataIndexed(...args);
      await workerGate;
      return indices;
    });

    const result = sortRows(rows, { type: "numeric" }, "asc", "rank");
    rows.splice(0, rows.length, { id: "replacement", rank: 0 });
    releaseWorker();

    const sorted = await result;
    expect(sorted).toEqual([low, high]);
    expect(sorted[0]).toBe(low);
    expect(sorted[1]).toBe(high);
  });

  it("maps filter results to the submitted array snapshot", async () => {
    const matching = { id: "matching", name: "Kitchen light" };
    const other = { id: "other", name: "Office light" };
    const rows = [matching, other];
    let releaseWorker!: () => void;
    const workerGate = new Promise<void>((resolve) => {
      releaseWorker = resolve;
    });
    const columns = sortableColumns({ name: { filterable: true } });
    filterDataIndexed.mockImplementationOnce(async (...args) => {
      const indices = workerApi.filterDataIndexed(...args);
      await workerGate;
      return indices;
    });

    const result = filterRows(rows, columns, "kitchen");
    rows.reverse();
    releaseWorker();

    const filtered = await result;
    expect(filtered).toEqual([matching]);
    expect(filtered[0]).toBe(matching);
  });

  it("returns fresh empty and no-filter results", async () => {
    const rows: { id: string; value: string }[] = [];
    const columns = sortableColumns({ value: { filterable: true } });

    const filtered = await filterRows(rows, columns, "value");
    const sorted = await sortRows(rows, { type: "numeric" }, "asc", "value");

    expect(filtered).toEqual([]);
    expect(filtered).not.toBe(rows);
    expect(sorted).toEqual([]);
    expect(sorted).not.toBe(rows);

    const populatedRows = [{ id: "one", value: "one" }];
    const unfiltered = await filterRows(populatedRows, columns, "   ");
    expect(unfiltered).toEqual(populatedRows);
    expect(unfiltered).not.toBe(populatedRows);
    expect(unfiltered[0]).toBe(populatedRows[0]);
  });
});
