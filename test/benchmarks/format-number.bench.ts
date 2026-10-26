import { describe, test } from "vitest";
import { formatNumber } from "../../src/common/number/format_number";
import {
  DateFormat,
  FirstWeekday,
  NumberFormat,
  TimeFormat,
  TimeZone,
  type FrontendLocaleData,
} from "../../src/data/translation";

const locale: FrontendLocaleData = {
  language: "en",
  number_format: NumberFormat.language,
  time_format: TimeFormat.language,
  date_format: DateFormat.language,
  time_zone: TimeZone.local,
  first_weekday: FirstWeekday.language,
};
const ungroupedLocale = { ...locale, number_format: NumberFormat.none };
const values = Array.from({ length: 1000 }, (_, index) => index * 1.25);
const states = values.map((value) => value.toFixed(2));

describe("formatNumber", () => {
  test("1000 numeric labels", async ({ bench }) => {
    await bench("1000 numeric labels", () => {
      for (const value of values) {
        formatNumber(value, locale);
      }
    }).run();
  });

  test("1000 sensor states with trailing zeros", async ({ bench }) => {
    await bench("1000 sensor states with trailing zeros", () => {
      for (const state of states) {
        formatNumber(state, locale);
      }
    }).run();
  });

  test("1000 labels without grouping", async ({ bench }) => {
    await bench("1000 labels without grouping", () => {
      for (const value of values) {
        formatNumber(value, ungroupedLocale);
      }
    }).run();
  });
});
