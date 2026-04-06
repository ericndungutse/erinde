import { describe, it, expect } from "vitest";
import { getKigaliDayEndUTC, getKigaliDayStartUTC } from "../../utils/date.js";

describe("getKigaliDayStartUTC", () => {
  it("12th 05:00 AM UTC → Kigali date is 12th → query start is 2024-05-11T22:00:00Z", () => {
    const result = getKigaliDayStartUTC(new Date("2024-05-12T05:00:00Z"));
    expect(result.toISOString()).toBe("2024-05-11T22:00:00.000Z");
  });

  it("11th 11:58 PM UTC → Kigali date is 12th (01:58 AM) → query start is 2024-05-11T22:00:00Z", () => {
    const result = getKigaliDayStartUTC(new Date("2024-05-11T23:58:00Z"));
    expect(result.toISOString()).toBe("2024-05-11T22:00:00.000Z");
  });

  it("11th 10:00 PM UTC → Kigali date is 12th (00:00 AM, boundary) → query start is 2024-05-11T22:00:00Z", () => {
    const result = getKigaliDayStartUTC(new Date("2024-05-11T22:00:00Z"));
    expect(result.toISOString()).toBe("2024-05-11T22:00:00.000Z");
  });

  it("11th 09:59 PM UTC → Kigali date is 11th (23:59 PM) → query start is 2024-05-10T22:00:00Z", () => {
    const result = getKigaliDayStartUTC(new Date("2024-05-11T21:59:00Z"));
    expect(result.toISOString()).toBe("2024-05-10T22:00:00.000Z");
  });

  it("start of UTC day → Kigali date is same day (02:00 AM) → query start is previous day 22:00 UTC", () => {
    const result = getKigaliDayStartUTC(new Date("2024-05-12T00:00:00Z"));
    expect(result.toISOString()).toBe("2024-05-11T22:00:00.000Z");
  });

  it("end of UTC day 11:59 PM → Kigali date is next day (01:59 AM) → query start is same UTC day 22:00", () => {
    const result = getKigaliDayStartUTC(new Date("2024-05-11T23:59:59Z"));
    expect(result.toISOString()).toBe("2024-05-11T22:00:00.000Z");
  });
});

describe("getKigaliDayEndUTC", () => {
  it("12th 05:00 AM UTC → Kigali date is 12th → end is 2024-05-12T21:59:59.999Z", () => {
    const result = getKigaliDayEndUTC(new Date("2024-05-12T05:00:00Z"));
    expect(result.toISOString()).toBe("2024-05-12T21:59:59.999Z");
  });

  it("11th 11:58 PM UTC → Kigali date is 12th (01:58 AM) → end is 2024-05-12T21:59:59.999Z", () => {
    const result = getKigaliDayEndUTC(new Date("2024-05-11T23:58:00Z"));
    expect(result.toISOString()).toBe("2024-05-12T21:59:59.999Z");
  });

  it("11th 10:00 PM UTC → Kigali date is 12th (00:00 AM, boundary) → end is 2024-05-12T21:59:59.999Z", () => {
    const result = getKigaliDayEndUTC(new Date("2024-05-11T22:00:00Z"));
    expect(result.toISOString()).toBe("2024-05-12T21:59:59.999Z");
  });

  it("11th 09:59 PM UTC → Kigali date is 11th (23:59 PM) → end is 2024-05-11T21:59:59.999Z", () => {
    const result = getKigaliDayEndUTC(new Date("2024-05-11T21:59:00Z"));
    expect(result.toISOString()).toBe("2024-05-11T21:59:59.999Z");
  });

  it("start of UTC day 00:00 → Kigali date is same day (02:00 AM) → end is 2024-05-12T21:59:59.999Z", () => {
    const result = getKigaliDayEndUTC(new Date("2024-05-12T00:00:00Z"));
    expect(result.toISOString()).toBe("2024-05-12T21:59:59.999Z");
  });

  it("11th 09:59 PM UTC → Kigali date is 11th → start and end are on same Kigali day", () => {
    const start = new Date("2024-05-10T22:00:00.000Z"); // getKigaliDayStartUTC result
    const end = getKigaliDayEndUTC(new Date("2024-05-11T21:59:00Z"));
    expect(end.toISOString()).toBe("2024-05-11T21:59:59.999Z");
    expect(end.getTime()).toBeGreaterThan(start.getTime());
  });
});
