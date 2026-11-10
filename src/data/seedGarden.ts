import type { AppData } from '../domain/types';

type Next = (prefix: string) => string;
const at = (d: string, hm = '07:00') => `${d}T${hm}:00`;

/** October numbers mirror the wireframe: 40 L bought, 20.200 m² cut, 2,0 → 2,6 L jerrycan. */
export function seedGarden(d: AppData, next: Next) {
  const g = 'st-garden';
  const logs: [string, string, string, string, string, number, 'approved' | 'pending' | 'rephoto', string?][] = [
    ['zone-3', 'mesin-1', '2026-10-02', '07.20', '08.40', 2500, 'approved'],
    ['zone-5', 'mesin-2', '2026-10-06', '07.30', '08.30', 1800, 'approved'],
    ['zone-2', 'mesin-1', '2026-10-08', '07.30', '08.35', 2000, 'approved'],
    ['zone-4', 'mesin-1', '2026-10-12', '07.30', '08.35', 2000, 'approved'],
    ['zone-1', 'mesin-1', '2026-10-13', '08.05', '08.40', 1500, 'approved'],
    ['zone-6', 'mesin-2', '2026-10-15', '07.40', '08.20', 1200, 'approved'],
    ['zone-2', 'mesin-1', '2026-10-16', '13.10', '14.20', 2000, 'rephoto', 'Foto sesudah tidak menampilkan seluruh area. Foto ulang dari sudut yang sama.'],
    ['zone-4', 'mesin-1', '2026-10-17', '07.30', '08.35', 2000, 'approved'],
    ['zone-1', 'mesin-2', '2026-10-20', '07.30', '08.05', 1500, 'approved'],
    ['zone-3', 'mesin-2', '2026-10-26', '07.20', '07.38', 2500, 'approved'],
    ['zone-6', 'mesin-2', '2026-10-28', '07.40', '08.20', 1200, 'approved'],
    ['zone-2', 'mesin-1', '2026-11-02', '07.30', '08.30', 2000, 'approved'],
    ['zone-4', 'mesin-1', '2026-11-03', '07.30', '08.32', 2000, 'approved'],
    ['zone-1', 'mesin-2', '2026-11-06', '08.05', '08.40', 1500, 'pending'],
    ['zone-6', 'mesin-2', '2026-11-07', '07.40', '08.18', 1200, 'pending'],
  ];
  for (const [zoneId, machineId, date, start, end, area, status, note] of logs) {
    d.mowingLogs.push({ id: next('LOG'), zoneId, gardenerId: g, machineId, date, start, end, area, beforePhotoId: 'sample:LAWN_BEFORE', afterPhotoId: 'sample:LAWN_AFTER', fuelUsed: Math.round(area * 0.0018 * 10) / 10, status, note });
  }
  const fuel = (kind: 'buy' | 'refill' | 'check', date: string, liters: number, machineId?: string) => {
    d.fuel.push({ id: next('FUEL'), projectId: 'vh', gardenerId: g, kind, liters, machineId, at: at(date, kind === 'check' ? '16:30' : '07:10'), amount: kind === 'buy' ? liters * 10000 : undefined, receiptPhotoId: kind === 'buy' ? 'sample:RECEIPT' : undefined, source: kind === 'buy' ? 'kasKecil' : undefined });
    if (kind === 'buy') d.expenses.push({ id: next('EXP'), projectId: 'vh', category: 'tukangTaman', date, amount: liters * 10000, note: `BBM mesin potong · ${liters} L`, receiptPhotoId: 'sample:RECEIPT', recurring: false, source: 'fuel' });
  };
  fuel('check', '2026-09-30', 2.0);
  for (const [date, l] of [['2026-10-02', 5], ['2026-10-05', 5], ['2026-10-08', 5], ['2026-10-12', 5], ['2026-10-15', 5], ['2026-10-17', 5], ['2026-10-20', 5], ['2026-10-26', 3], ['2026-10-29', 2]] as [string, number][]) fuel('buy', date, l);
  for (const [date, l] of [['2026-10-02', 4.5], ['2026-10-08', 3.5], ['2026-10-12', 3.5], ['2026-10-13', 2.5], ['2026-10-16', 3.5], ['2026-10-17', 3.5]] as [string, number][]) fuel('refill', date, l, 'mesin-1');
  for (const [date, l] of [['2026-10-06', 3], ['2026-10-15', 2.5], ['2026-10-20', 3], ['2026-10-21', 5], ['2026-10-26', 3], ['2026-10-28', 2.5]] as [string, number][]) fuel('refill', date, l, 'mesin-2');
  for (const [date, l] of [['2026-10-07', 3.9], ['2026-10-14', 3.4], ['2026-10-21', 5.5], ['2026-10-31', 2.6]] as [string, number][]) fuel('check', date, l);
  fuel('buy', '2026-11-04', 5);
  fuel('refill', '2026-11-02', 3.5, 'mesin-1');
  fuel('refill', '2026-11-03', 3.5, 'mesin-1');
  fuel('check', '2026-11-06', 3.0);
  fuel('refill', '2026-11-06', 2.5, 'mesin-2');
  fuel('refill', '2026-11-07', 2.0, 'mesin-2');
  for (const date of ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-09']) {
    d.attendance.push({ id: next('ATT'), gardenerId: g, date, at: at(date, '06:52'), selfiePhotoId: 'sample:SELFIE' });
  }
}
