export type SchedulingCopyLocale = 'en' | 'es';

export function resolveSchedulingCopyLocale(locale: string | undefined): SchedulingCopyLocale {
  return locale?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}

export function formatSchedulingDateTime(value: string | null | undefined, locale: string | undefined): string {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);
  if (!isValidDate(parsed)) {
    return String(value);
  }

  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

export function formatSchedulingClock(value: string, locale: string | undefined): string {
  const parsed = new Date(value);
  if (!isValidDate(parsed)) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(parsed);
}

export function formatSchedulingCompactClock(value: string, locale: string | undefined): string {
  const parsed = new Date(value);
  if (!isValidDate(parsed)) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsed);
}

export function formatSchedulingWeekdayNarrow(weekday: number, locale: string | undefined): string {
  const date = new Date(Date.UTC(2026, 0, 4 + weekday));
  return new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(date);
}
