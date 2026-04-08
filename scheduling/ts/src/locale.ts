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

  // Español: fecha numérica día/mes/año (LATAM) + hora; inglés: mes abreviado.
  if (resolveSchedulingCopyLocale(locale) === 'es') {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed);
  }

  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

/** Convierte `YYYY-MM-DD` (valor de input type=date) a fecha local legible (p. ej. dd/mm/yyyy en es-AR). */
export function formatSchedulingDateOnly(ymd: string, locale: string | undefined): string {
  const trimmed = ymd.trim();
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!parts) {
    return trimmed;
  }
  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
    return trimmed;
  }
  const parsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (!isValidDate(parsed)) {
    return trimmed;
  }
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
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
