import { expect, test } from 'vitest';
import { formatRp } from './money';

test('formatRp uses Indonesian thousands separators', () => {
  expect(formatRp(3780000)).toBe('Rp3.780.000');
  expect(formatRp(0)).toBe('Rp0');
  expect(formatRp(-17975000)).toBe('−Rp17.975.000');
});
