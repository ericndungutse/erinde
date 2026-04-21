import { logger } from "../logger.js";

export function getKigaliDayStartUTC(dateTime: Date): Date {
  logger.info(`Calculating Kigali day start for ${dateTime.toISOString()}`);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Kigali",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dateTime);

  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;

  logger.info(`Kigali day start calculated for ${year}-${month}-${day}`);

  return new Date(`${year}-${month}-${day}T00:00:00+02:00`);
}

export function getKigaliDayEndUTC(dateTime: Date): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Kigali",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dateTime);

  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;

  return new Date(`${year}-${month}-${day}T23:59:59.999+02:00`);
}

export const startOfKigaliDayFromKigaliDate = (dateStr: string): Date =>
  new Date(`${dateStr}T00:00:00.000+02:00`);

export const endOfKigaliDayFromKigaliDate = (dateStr: string): Date =>
  new Date(`${dateStr}T23:59:59.999+02:00`);
