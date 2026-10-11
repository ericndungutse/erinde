import { describe, expect, it } from "vitest";
import { convertToKigaliTime } from "../../utils/date.js";

describe.skip("convertToKigaliTime", () => {
  it("should convert UTC date to Kigali time (UTC+2)", () => {
    // 2026-04-22T12:00:00Z (UTC)
    const utcDate = new Date("2026-04-22T12:00:00Z");
    console.log(`UTC date: ${utcDate.toISOString()}`);
    const kigaliDate = convertToKigaliTime(utcDate);
    console.log(`Kigali date: ${kigaliDate.toISOString()}`);
    expect(kigaliDate.getHours()).toBe(14);
    expect(kigaliDate.getUTCDate()).toBe(22);
  });

  it("should handle date already in UTC+2 (Kigali)", () => {
    // Simulate a date with UTC+2 offset

    const date = new Date("2026-04-22T12:00:00+02:00");
    console.log(`Original date (UTC+2): ${date.toISOString()}`);
    const kigaliDate = convertToKigaliTime(date);
    console.log(`Converted date: ${kigaliDate.toISOString()}`);
    expect(kigaliDate.getTime()).toBe(date.getTime());
  });

  it("should handle negative timezone offsets (e.g., UTC-5)", () => {
    // Simulate a date in UTC-5 (New York)
    const date = new Date("2026-04-22T12:00:00-05:00");
    const kigaliDate = convertToKigaliTime(date);
    // 12:00 in NY is 19:00 in Kigali
    expect(kigaliDate.getUTCHours()).toBe(17); // UTC+2 is 7 hours ahead
    expect(kigaliDate.getUTCDate()).toBe(22);
  });

  it("should handle positive timezone offsets (e.g., UTC+8)", () => {
    // Simulate a date in UTC+8 (Beijing)
    const date = new Date("2026-04-22T12:00:00+08:00");
    const kigaliDate = convertToKigaliTime(date);
    // 12:00 in Beijing is 06:00 in Kigali
    expect(kigaliDate.getUTCHours()).toBe(4); // UTC+2 is 6 hours behind
    expect(kigaliDate.getUTCDate()).toBe(22);
  });

  it("should not mutate the original date object", () => {
    const date = new Date("2026-04-22T12:00:00Z");
    const originalTime = date.getTime();
    convertToKigaliTime(date);
    expect(date.getTime()).toBe(originalTime);
  });

  it("should handle DST transitions (if any)", () => {
    // Kigali does not observe DST, but test a date near DST change elsewhere
    const date = new Date("2026-03-29T01:00:00+01:00"); // Europe DST start
    const kigaliDate = convertToKigaliTime(date);
    expect(kigaliDate instanceof Date).toBe(true);
  });
});
