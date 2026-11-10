import type { ISODate, ISODateTime, Lang, MonthKey } from './types';

// All business dates are plain 'YYYY-MM-DD' strings; arithmetic runs in UTC so
// time zones and DST never shift a day.
const toUTC = (d: ISODate) => {
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, day);
};
const fromUTC = (ms: number): ISODate => new Date(ms).toISOString().slice(0, 10);
const DAY = 86_400_000;

export const addDays = (d: ISODate, n: number): ISODate => fromUTC(toUTC(d) + n * DAY);
export const diffDays = (a: ISODate, b: ISODate): number => Math.round((toUTC(b) - toUTC(a)) / DAY);
export const monthOf = (d: ISODate): MonthKey => d.slice(0, 7);
export const addMonths = (m: MonthKey, n: number): MonthKey => {
  const [y, mo] = m.split('-').map(Number);
  const total = y * 12 + (mo - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
};
export const monthStart = (m: MonthKey): ISODate => `${m}-01`;
export const dayOfMonth = (m: MonthKey, day: number): ISODate => `${m}-${String(day).padStart(2, '0')}`;
export const monthsBetween = (a: MonthKey, b: MonthKey): number => {
  const [ya, ma] = a.split('-').map(Number);
  const [yb, mb] = b.split('-').map(Number);
  return (yb * 12 + mb) - (ya * 12 + ma);
};
export const weekday = (d: ISODate): number => new Date(toUTC(d)).getUTCDay();

/** Demo "now": the demo date combined with the real wall-clock time. */
export const nowISO = (today: ISODate): ISODateTime => {
  const t = new Date();
  const hh = String(t.getHours()).padStart(2, '0');
  const mm = String(t.getMinutes()).padStart(2, '0');
  const ss = String(t.getSeconds()).padStart(2, '0');
  return `${today}T${hh}:${mm}:${ss}`;
};

const MONTHS: Record<Lang, string[]> = {
  id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
const DAYS: Record<Lang, string[]> = {
  id: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

export type DateStyle = 'short' | 'long' | 'month' | 'weekday';
export function formatDate(d: ISODate | MonthKey, lang: Lang, style: DateStyle = 'long'): string {
  const [y, m, day] = d.split('-').map(Number);
  const mon = MONTHS[lang][m - 1];
  if (style === 'month' || day === undefined) return `${mon} ${y}`;
  if (style === 'short') return `${day} ${mon}`;
  if (style === 'weekday') return `${DAYS[lang][weekday(d)]}, ${day} ${mon}`;
  return `${day} ${mon} ${y}`;
}
export const formatMonthLong = (m: MonthKey, lang: Lang) => formatDate(m, lang, 'month');
export const dayName = (d: ISODate, lang: Lang) => DAYS[lang][weekday(d)];
export const formatTime = (dt: ISODateTime) => dt.slice(11, 16).replace(':', '.');
export const formatDateTime = (dt: ISODateTime, lang: Lang) => `${formatDate(dt.slice(0, 10), lang, 'long')} · ${formatTime(dt)}`;
