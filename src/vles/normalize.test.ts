import { expect, test } from 'vitest';
import { normalizeKtp, normalizeNpwp, normalizePhone } from './normalize';

test('phone numbers with 0, 62 and +62 prefixes normalise to the same value', () => {
  expect(normalizePhone('+62 812-3456-0102')).toBe('6281234560102');
  expect(normalizePhone('081234560102')).toBe('6281234560102');
  expect(normalizePhone('62 812 3456 0102')).toBe('6281234560102');
  expect(normalizePhone('(0812) 3456.0102')).toBe('6281234560102');
});
test('KTP ignores spaces, dots and dashes and is case-insensitive', () => {
  expect(normalizeKtp('3275.0141 0190-0001')).toBe('3275014101900001');
  expect(normalizeKtp('a1234567')).toBe('A1234567');
});
test('15-digit NPWP equals the 16-digit form with a leading 0', () => {
  expect(normalizeNpwp('12.345.678.9-012.000')).toBe('0123456789012000');
  expect(normalizeNpwp('0123456789012000')).toBe('0123456789012000');
});
