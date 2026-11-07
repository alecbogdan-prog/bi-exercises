import { describe, expect, it } from 'vitest';
import { PL300_DAYS, afterPl300Refund } from './_lib.js';

const DAY = 86_400_000;
const now = Date.UTC(2026, 10, 7);
const iso = (t: number) => new Date(t).toISOString();

describe('afterPl300Refund', () => {
  it('ends access when the only purchase is refunded', () => {
    const r = afterPl300Refund({ status: 'paid', current_period_end: iso(now + (PL300_DAYS - 3) * DAY) }, now);
    expect(r).toEqual({ status: 'refunded', current_period_end: iso(now) });
  });

  it('keeps the earlier purchase when an extension is refunded', () => {
    const r = afterPl300Refund({ status: 'paid', current_period_end: iso(now + (PL300_DAYS + 40) * DAY) }, now);
    expect(r).toEqual({ status: 'paid', current_period_end: iso(now + 40 * DAY) });
  });
});
