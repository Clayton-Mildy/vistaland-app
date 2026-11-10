import { describe, expect, test } from 'vitest';
import { addDays, addMonths, addMonthsToDate, dayOfMonth, diffDays, formatDate, monthOf, monthStart } from './clock';

describe('clock', () => {
  test('addDays crosses month and year boundaries', () => {
    expect(addDays('2026-10-26', 100)).toBe('2027-02-03');
    expect(addDays('2026-11-10', -1)).toBe('2026-11-09');
  });
  test('diffDays counts days from a to b', () => {
    expect(diffDays('2026-11-10', '2026-12-21')).toBe(41);
    expect(diffDays('2026-12-21', '2026-11-10')).toBe(-41);
  });
  test('month helpers', () => {
    expect(addMonths('2026-11', 3)).toBe('2027-02');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(monthOf('2026-03-05')).toBe('2026-03');
    expect(monthStart('2026-09')).toBe('2026-09-01');
    expect(dayOfMonth('2026-09', 10)).toBe('2026-09-10');
  });
  test('addMonthsToDate keeps the day and clamps short months', () => {
    expect(addMonthsToDate('2026-11-10', 1)).toBe('2026-12-10');
    expect(addMonthsToDate('2027-01-31', 1)).toBe('2027-02-28');
  });
  test('formatDate uses id-ID style in both languages', () => {
    expect(formatDate('2026-11-10', 'id', 'long')).toBe('10 Nov 2026');
    expect(formatDate('2026-11-10', 'en', 'long')).toBe('10 Nov 2026');
    expect(formatDate('2026-08-10', 'id', 'long')).toBe('10 Agu 2026');
    expect(formatDate('2026-08-10', 'en', 'long')).toBe('10 Aug 2026');
    expect(formatDate('2026-11-10', 'id', 'month')).toBe('Nov 2026');
    expect(formatDate('2026-11-10', 'id', 'short')).toBe('10 Nov');
  });
});
