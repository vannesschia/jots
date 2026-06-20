import { DateRangeOptions } from "./types";

export function getDateRange({
  centerDate,
  daysBefore,
  daysAfter,
  minDate,
  maxDate,
}: DateRangeOptions) {
  const dates: string[] = [];

  for (let offset = -daysBefore; offset <= daysAfter; offset++) {
    const date = addDaysToLocalDate(centerDate, offset);

    if (minDate && date < minDate) continue;
    if (maxDate && date > maxDate) continue;

    dates.push(date);
  }

  // console.log(dates)
  return dates;
}

export function addDaysToLocalDate(date: string, amount: number) {
  const [year, month, day] = date.split("-").map(Number);

  const localDate = new Date(year, month - 1, day);
  localDate.setDate(localDate.getDate() + amount);

  return toLocalDateString(localDate);
}

export function toLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getTodayLocalDate() {
  return toLocalDateString(new Date());
}

export function getTodayInTimezone(timeZone: string) {
  let parts: Intl.DateTimeFormatPart[];

  try {
    parts = new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "2-digit",
      timeZone,
      year: "numeric",
    }).formatToParts(new Date());
  } catch {
    return getTodayLocalDate();
  }

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export function isValidLocalDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsed = parseLocalDate(date);

  return !Number.isNaN(parsed.getTime()) && toLocalDateString(parsed) === date;
}

export function formatWeekday(date: string) {
  const today = getTodayLocalDate();

  if (date === today) {
    return "Today";
  }

  const parsed = parseLocalDate(date);

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
  }).format(parsed);
}

export function formatDay(date: string) {
  const parsed = parseLocalDate(date);

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
  }).format(parsed);
}

export function formatFullDate(date: string) {
  const parsed = parseLocalDate(date);

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

export function parseLocalDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getValidUrlDate(value: string | null, todayDate = getTodayLocalDate()) {
  return value && isValidLocalDate(value) && value <= todayDate ? value : null;
}