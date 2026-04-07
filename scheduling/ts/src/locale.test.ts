import { describe, expect, it } from 'vitest';
import {
  formatSchedulingClock,
  formatSchedulingCompactClock,
  formatSchedulingDateTime,
  formatSchedulingWeekdayNarrow,
  resolveSchedulingCopyLocale,
} from './locale';

describe('scheduling locale helpers', () => {
  it('resolves regional locales to the supported copy presets', () => {
    expect(resolveSchedulingCopyLocale('es-AR')).toBe('es');
    expect(resolveSchedulingCopyLocale('en-US')).toBe('en');
    expect(resolveSchedulingCopyLocale(undefined)).toBe('en');
  });

  it('formats date and time values with the provided locale', () => {
    expect(formatSchedulingClock('2099-12-01T10:00:00Z', 'es-AR')).not.toBe(formatSchedulingClock('2099-12-01T10:00:00Z', 'en-US'));
    expect(formatSchedulingCompactClock('2099-12-01T10:00:00Z', 'es-AR')).toMatch(/\d{2}:\d{2}/);
    expect(formatSchedulingDateTime('2099-12-01T10:00:00Z', 'es-AR')).toMatch(/dic/i);
    expect(formatSchedulingDateTime('2099-12-01T10:00:00Z', 'en-US')).toMatch(/dec/i);
    expect(formatSchedulingDateTime('invalid-date', 'es-AR')).toBe('invalid-date');
  });

  it('formats weekday picks with the provided locale', () => {
    expect(formatSchedulingWeekdayNarrow(1, 'es-AR')).not.toBe('');
    expect(formatSchedulingWeekdayNarrow(1, 'en-US')).not.toBe('');
  });
});
