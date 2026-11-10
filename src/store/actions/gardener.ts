import { nowISO } from '../../domain/clock';
import type { FuelEntry, MowingLog } from '../../domain/types';
import { ActionError } from '../errors';
import { nextId } from '../ids';
import { notify } from '../notify';
import type { Action } from '../store';

export const checkIn: Action<{ gardenerId: string; selfiePhotoId: string }> = (d, p) => {
  if (d.attendance.some((a) => a.gardenerId === p.gardenerId && a.date === d.today)) return;
  d.attendance.push({ id: nextId(d, 'ATT'), gardenerId: p.gardenerId, date: d.today, at: nowISO(d.today), selfiePhotoId: p.selfiePhotoId });
};

export const logMowing: Action<Omit<MowingLog, 'id' | 'status'>> = (d, p) => {
  const zone = d.zones.find((z) => z.id === p.zoneId);
  if (!zone) throw new ActionError('error.notFound');
  d.mowingLogs.push({ ...p, id: nextId(d, 'LOG'), status: 'pending' });
  zone.lastCut = p.date;
  notify(d, `admin:${zone.projectId}`, 'notif.admin.mowingLogged', { zone: zone.name }, '/dashboard/finance');
};

/** Buying fuel also records the cost in cluster finance. */
export const addFuelEntry: Action<Omit<FuelEntry, 'id' | 'at'>> = (d, p) => {
  if (!(p.liters > 0)) throw new ActionError('error.generic');
  d.fuel.push({ ...p, id: nextId(d, 'FUEL'), at: nowISO(d.today) });
  if (p.kind === 'buy' && p.amount) {
    d.expenses.push({ id: nextId(d, 'EXP'), projectId: p.projectId, category: 'tukangTaman', date: d.today, amount: p.amount, note: `BBM mesin potong · ${p.liters} L`, receiptPhotoId: p.receiptPhotoId, recurring: false, source: 'fuel' });
  }
};

export const reviewMowingLog: Action<{ id: string; decision: 'approved' | 'rephoto'; note?: string }> = (d, p) => {
  const log = d.mowingLogs.find((l) => l.id === p.id);
  if (!log) throw new ActionError('error.notFound');
  log.status = p.decision;
  log.note = p.note;
  if (p.decision === 'rephoto') notify(d, `staff:${log.gardenerId}`, 'notif.gardener.rephoto', { date: log.date }, '/staff/garden/history');
};
