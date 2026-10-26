import type { Remote } from "comlink";
import { wrap } from "comlink";
import type { Api } from "./sort-filter-worker";

type FilterDataType = Api["filterData"];
type FilterDataParamTypes = Parameters<FilterDataType>;
type FilterDataIndexedType = Api["filterDataIndexed"];
type FilterDataIndexedParamTypes = Parameters<FilterDataIndexedType>;

type SortDataType = Api["sortData"];
type SortDataParamTypes = Parameters<SortDataType>;
type SortDataIndexedType = Api["sortDataIndexed"];
type SortDataIndexedParamTypes = Parameters<SortDataIndexedType>;

let worker: Remote<Api> | undefined;

const getWorker = () => {
  if (!worker) {
    worker = wrap(
      new Worker(
        /* webpackChunkName: "sort-filter-worker" */
        new URL("./sort-filter-worker", import.meta.url)
      )
    );
  }
  return worker;
};

const projectFilterData = (
  data: FilterDataParamTypes[0],
  columns: FilterDataParamTypes[1]
): [FilterDataIndexedParamTypes[0], FilterDataIndexedParamTypes[1]] => {
  const filterableColumns = Object.entries(columns).filter(
    ([, column]) => column.filterable
  );
  const projectedColumns: FilterDataIndexedParamTypes[1] = {};
  filterableColumns.forEach((_, index) => {
    projectedColumns[`filter_${index}`] = { filterable: true };
  });
  const projectedData = data.map((row) => {
    const projectedRow: FilterDataIndexedParamTypes[0][number] = {};
    filterableColumns.forEach(([columnId, column], index) => {
      const projectionKey = `filter_${index}`;
      const valueColumn = column.valueColumn || columnId;
      let value = row[valueColumn];
      if (
        column.filterKey &&
        value != null &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        value = value[column.filterKey];
      }
      projectedRow[projectionKey] = value;
    });
    return projectedRow;
  });
  return [projectedData, projectedColumns];
};

const SORT_VALUE_KEY = "value";

export const filterData = async (
  data: FilterDataParamTypes[0],
  columns: FilterDataParamTypes[1],
  filter: FilterDataParamTypes[2]
): Promise<ReturnType<FilterDataType>> => {
  const sourceRows = [...data];
  const [projectedData, projectedColumns] = projectFilterData(
    sourceRows,
    columns
  );
  const rowIndices = await getWorker().filterDataIndexed(
    projectedData,
    projectedColumns,
    filter
  );
  return rowIndices.map((index) => sourceRows[index]);
};

export const sortData = async (
  data: SortDataParamTypes[0],
  column: SortDataParamTypes[1],
  direction: SortDataParamTypes[2],
  sortColumn: SortDataParamTypes[3],
  language?: SortDataParamTypes[4]
): Promise<ReturnType<SortDataType>> => {
  const sourceRows = [...data];
  const sourceColumn = column.valueColumn || sortColumn;
  const projectedData = sourceRows.map((row) => {
    const sourceValue = row[sourceColumn];
    const value = column.filterKey
      ? sourceValue[column.filterKey]
      : sourceValue;
    return { [SORT_VALUE_KEY]: value };
  });
  const projectedColumn: SortDataIndexedParamTypes[1] = {
    type: column.type,
  };
  const rowIndices = await getWorker().sortDataIndexed(
    projectedData,
    projectedColumn,
    direction,
    SORT_VALUE_KEY,
    language
  );
  return rowIndices.map((index) => sourceRows[index]);
};
