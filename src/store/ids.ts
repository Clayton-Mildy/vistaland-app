import type { AppData } from '../domain/types';

export type IdPrefix = 'KMP' | 'REN' | 'REG' | 'PAY' | 'ORD' | 'MOV' | 'FB' | 'PNC' | 'LST' | 'LEAD' | 'GRP' | 'EXP' | 'LOG' | 'N' | 'CLM' | 'FUEL' | 'ATT' | 'ACT' | 'CNS' | 'BIZ' | 'ANN' | 'r';

/** Next sequential id for a prefix: KMP-0148 style. Renters use r-<n>. */
export function nextId(d: AppData, prefix: IdPrefix): string {
  const n = (d.seq[prefix] = (d.seq[prefix] ?? 0) + 1);
  if (prefix === 'r') return `r-${n}`;
  return `${prefix}-${String(n).padStart(4, '0')}`;
}
