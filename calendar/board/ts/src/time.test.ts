// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { resolveInitialTimeGridScrollTime } from './time';

describe('resolveInitialTimeGridScrollTime', () => {
  it('uses the earliest visible event inside the range', () => {
    expect(
      resolveInitialTimeGridScrollTime({
        events: [
          { start: new Date(2099, 3, 5, 14, 0, 0) },
          { start: new Date(2099, 3, 5, 9, 30, 0) },
          { start: new Date(2099, 3, 6, 8, 0, 0) },
        ],
        rangeStart: new Date(2099, 3, 5, 0, 0, 0),
        rangeEnd: new Date(2099, 3, 6, 0, 0, 0),
      }),
    ).toBe('09:30:00');
  });

  it('falls back to the provided hour when there are no visible events', () => {
    expect(
      resolveInitialTimeGridScrollTime({
        events: [{ start: 'invalid-date' }],
        rangeStart: new Date('2099-04-05T00:00:00Z'),
        rangeEnd: new Date('2099-04-06T00:00:00Z'),
        fallbackHour: 7,
      }),
    ).toBe('07:00:00');
  });
});
