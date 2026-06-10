import { startOfWeek, endOfWeek, addWeeks, subWeeks, format, eachDayOfInterval } from "date-fns";

export function getMondayOfWeek(d: Date): Date {
  return startOfWeek(d, { weekStartsOn: 1 });
}

export function getWeekDates(monday: Date): Date[] {
  return eachDayOfInterval({ start: monday, end: addWeeks(monday, 1) }).slice(0, 7);
}

export function formatWeekRange(monday: Date): string {
  const sunday = endOfWeek(monday, { weekStartsOn: 1 });
  return `${format(monday, "MMM d")} – ${format(sunday, "MMM d, yyyy")}`;
}

export function toISODate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function nextWeek(monday: Date): Date {
  return addWeeks(monday, 1);
}

export function prevWeek(monday: Date): Date {
  return subWeeks(monday, 1);
}
