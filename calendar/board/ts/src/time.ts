import type { EventInput } from "@fullcalendar/core";

export type CalendarEventLike = {
  start?: EventInput["start"];
};

function toDate(value: EventInput["start"]): Date | null {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export function resolveInitialTimeGridScrollTime({
  events,
  rangeStart,
  rangeEnd,
  fallbackHour = 8,
}: {
  events: readonly CalendarEventLike[];
  rangeStart: Date;
  rangeEnd: Date;
  fallbackHour?: number;
}): string {
  const earliestVisibleEvent = events
    .map((event) => toDate(event.start))
    .filter((date): date is Date => date != null && date >= rangeStart && date < rangeEnd)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const target = earliestVisibleEvent ?? new Date(rangeStart);
  if (!earliestVisibleEvent) {
    target.setHours(fallbackHour, 0, 0, 0);
  }

  const hours = String(target.getHours()).padStart(2, "0");
  const minutes = String(target.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}:00`;
}
