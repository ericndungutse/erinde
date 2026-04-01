export function toKigaliTime(dateTime: Date) {
  const KIGALI_OFFSET = 2 * 60 * 60 * 1000;
  return new Date(new Date(dateTime).getTime() + KIGALI_OFFSET);
}

function getKigaliStartOfDay(utcDateTime: Date) {
  const kigaliDate = toKigaliTime(utcDateTime);
  kigaliDate.setUTCHours(0, 0, 0, 0);
  return kigaliDate;
}

// 12th 05:00 AM UTC should give us 12th 12:00 AM Kigali time
console.log(
  getKigaliStartOfDay(new Date("2024-05-12T05:00:00Z")).toISOString(),
);

// 11th 11:58 PM UTC should give us 12th 12:00 AM Kigali time
console.log(
  getKigaliStartOfDay(new Date("2024-05-11T23:58:00Z")).toISOString(),
);

// 11th 10:00 PM UTC should give us 12th 12:00 PM Kigali time
console.log(
  getKigaliStartOfDay(new Date("2024-05-11T22:00:00Z")).toISOString(),
);

// 11th 09:59 PM UTC should give us 11th 12:00 AM Kigali time
console.log(
  getKigaliStartOfDay(new Date("2024-05-11T21:59:00Z")).toISOString(),
);

// The start of date in query should be kigali time, at start of that day in kigali time minus 2 hours to get the correct UTC time for querying
// Product created at 12th 12:01 AM Kigali time, the startDateTime should be 11th 10:00 PM UTC to include this product in the query results, since it exists at 11th 10:01 PM UTC
// Product created at 12th 11:59 PM Kigali time, the startDateTime should be 11th 10:00 PM UTC to include this product in the query results, since it exists at 12th 09:59 PM UTC
export function resolveStartDateTimeBasedOnKigaliTime(dateTime: Date) {
  // Calculate the start of the day in Kigali for the given UTC time
  const kigaliStartOfDay = getKigaliStartOfDay(dateTime);

  // Subtract 2 hours to get the correct UTC time for querying
  const startDateTime = new Date(
    kigaliStartOfDay.getTime() - 2 * 60 * 60 * 1000,
  );

  return startDateTime;
}
