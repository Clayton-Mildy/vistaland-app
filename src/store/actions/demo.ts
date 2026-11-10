import { syncAllBills } from '../../domain/ipl';
import type { AppData, ISODate } from '../../domain/types';
import type { Action } from '../store';

/** Rules that run whenever the demo date changes. Later modules append to this list. */
export const ON_DAY_CHANGE: ((d: AppData) => void)[] = [syncAllBills];

export const setToday: Action<{ date: ISODate }> = (d, p) => {
  d.today = p.date;
  for (const rule of ON_DAY_CHANGE) rule(d);
};
