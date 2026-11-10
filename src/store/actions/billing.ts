import { addMonths, monthOf, nowISO } from '../../domain/clock';
import { overdueBills, prepayPlan, prepayQuote } from '../../domain/ipl';
import { formatRp } from '../../domain/money';
import type { Consequence, ISODate, MonthKey, Payment, Vehicle, WifiSub } from '../../domain/types';
import { ActionError } from '../errors';
import { nextId } from '../ids';
import { logActivity, notify, ownerKey, projectOf, unitOf } from '../notify';
import type { Action } from '../store';
import { resyncUnit } from './billingSync';

const payerKey = (d: Parameters<Action<unknown>>[0], unitId: string) => {
  const u = unitOf(d, unitId);
  const r = d.renters.find((x) => x.unitId === unitId && x.status === 'active' && x.iplPayer === 'renter');
  return r ? `renter:${r.id}` : ownerKey(u.ownerCustomerId);
};

/** Resident payment (simulated VA/QRIS). With a packageId the months come from the pay-ahead plan. */
export const payBills: Action<{ unitId: string; kind: 'ipl' | 'wifi'; months?: MonthKey[]; packageId?: string; method: Payment['method'] }> = (d, p) => {
  const unit = unitOf(d, p.unitId);
  const project = projectOf(d, unit.projectId);
  const s = project.settings;
  const mine = () => d.bills.filter((b) => b.unitId === unit.id && b.kind === p.kind);
  let months = p.months ?? [];
  let amount = 0;
  let discount = 0;
  if (p.packageId) {
    const pkg = s.prepay[p.kind].find((x) => x.id === p.packageId && x.active);
    if (!pkg || s.prepay.validUntil < d.today) throw new ActionError('error.packageUnavailable');
    if (s.prepay.noArrearsOnly && overdueBills(mine(), d.today, s.ipl.dueDay).length) throw new ActionError('error.prepayArrears');
    const type = d.unitTypes.find((t) => t.id === unit.typeId)!;
    const rate = p.kind === 'ipl' ? type.iplRate : s.wifi.packages.find((w) => w.id === d.wifi.find((x) => x.unitId === unit.id)?.packageId)?.price ?? 0;
    if (p.kind === 'ipl') {
      const renter = d.renters.find((r) => r.unitId === unit.id && r.status === 'active');
      months = prepayPlan(unit, type, s, renter, d.bills, d.today, pkg.months);
    } else {
      const start = monthOf(d.today);
      months = Array.from({ length: pkg.months }, (_, i) => addMonths(start, i));
    }
    const q = prepayQuote(pkg, rate);
    amount = q.net;
    discount = q.discount;
  }
  if (!months.length) throw new ActionError('error.generic');
  resyncUnit(d, unit.id, { [p.kind]: months.slice().sort().at(-1) });
  const targets = mine().filter((b) => months.includes(b.month) && !b.paymentId && !b.free);
  if (!p.packageId) amount = targets.reduce((a, b) => a + b.amount, 0);
  const payment: Payment = { id: nextId(d, 'PAY'), unitId: unit.id, kind: p.kind, months: targets.map((b) => b.month), amount, discount, method: p.method, paidAt: nowISO(d.today), recordedBy: 'resident', packageId: p.packageId };
  d.payments.push(payment);
  for (const b of targets) b.paymentId = payment.id;
  notify(d, `admin:${unit.projectId}`, 'notif.admin.paymentReceived', { unit: unit.code, amount: formatRp(amount) }, `/dashboard/ipl/${unit.id}`);
  notify(d, payerKey(d, unit.id), 'notif.paymentReceipt', { amount: formatRp(amount) }, '/app/bills');
};

/** Admin records a payment received outside the app (no fine option exists). */
export const recordPaymentAdmin: Action<{ unitId: string; months: MonthKey[]; method: Payment['method']; date: ISODate }> = (d, p) => {
  const unit = unitOf(d, p.unitId);
  resyncUnit(d, unit.id, { ipl: p.months.slice().sort().at(-1) });
  const targets = d.bills.filter((b) => b.unitId === unit.id && b.kind === 'ipl' && p.months.includes(b.month) && !b.paymentId && !b.free);
  if (!targets.length) throw new ActionError('error.generic');
  const amount = targets.reduce((a, b) => a + b.amount, 0);
  const payment: Payment = { id: nextId(d, 'PAY'), unitId: unit.id, kind: 'ipl', months: targets.map((b) => b.month), amount, discount: 0, method: p.method, paidAt: `${p.date}T12:00:00`, recordedBy: 'admin' };
  d.payments.push(payment);
  for (const b of targets) b.paymentId = payment.id;
  notify(d, payerKey(d, unit.id), 'notif.paymentRecorded', { amount: formatRp(amount) }, '/app/bills');
};

export const requestWifi: Action<{ unitId: string; packageId: string; date: ISODate; time: string }> = (d, p) => {
  const unit = unitOf(d, p.unitId);
  const sub: WifiSub = { unitId: unit.id, packageId: p.packageId, installSlot: { date: p.date, time: p.time }, status: 'requested' };
  d.wifi = [...d.wifi.filter((w) => w.unitId !== unit.id), sub];
  notify(d, `admin:${unit.projectId}`, 'notif.admin.wifiRequested', { unit: unit.code, date: p.date });
};

export const setWifiStatus: Action<{ unitId: string; status: WifiSub['status'] }> = (d, p) => {
  const sub = d.wifi.find((w) => w.unitId === p.unitId);
  if (!sub) throw new ActionError('error.notFound');
  const unit = unitOf(d, p.unitId);
  const s = projectOf(d, unit.projectId).settings.wifi;
  sub.status = p.status;
  if (p.status === 'installed') {
    sub.installedAt = d.today;
    sub.freeUntil = s.promoEnabled && s.freeMonths > 0 ? addMonths(monthOf(d.today), s.freeMonths - 1) : undefined;
    resyncUnit(d, unit.id);
  }
  notify(d, ownerKey(unit.ownerCustomerId), `notif.wifi.${p.status}`, { unit: unit.code }, '/app/wifi');
};

export const orderCards: Action<{ unitId: string; extraCards: number; extraStickers: number; vehicles: Vehicle[] }> = (d, p) => {
  const unit = unitOf(d, p.unitId);
  const c = projectOf(d, unit.projectId).settings.cards;
  if (p.extraCards > c.maxExtraCards || p.extraCards < 0 || p.extraStickers < 0) throw new ActionError('error.generic');
  const firstOrder = !d.cardOrders.some((o) => o.unitId === unit.id && o.freeCards + o.freeStickers > 0);
  const total = p.extraCards * c.extraCardPrice + p.extraStickers * c.extraStickerPrice;
  d.cardOrders.push({ id: nextId(d, 'ORD'), unitId: unit.id, freeCards: firstOrder ? c.freeCards : 0, freeStickers: firstOrder ? c.freeStickers : 0, extraCards: p.extraCards, extraStickers: p.extraStickers, vehicles: p.vehicles, total, status: total === 0 ? 'toMake' : 'awaitingPayment', createdAt: nowISO(d.today) });
  notify(d, `admin:${unit.projectId}`, 'notif.admin.cardsOrdered', { unit: unit.code });
};

export const payCardOrder: Action<{ orderId: string; method?: Payment['method'] }> = (d, p) => {
  const o = d.cardOrders.find((x) => x.id === p.orderId);
  if (!o || o.status !== 'awaitingPayment') throw new ActionError('error.generic');
  d.payments.push({ id: nextId(d, 'PAY'), unitId: o.unitId, kind: 'cards', amount: o.total, discount: 0, method: p.method ?? 'va', paidAt: nowISO(d.today), recordedBy: 'resident' });
  o.status = 'toMake';
};

export const setCardOrderStatus: Action<{ orderId: string; status: 'toMake' | 'ready' | 'pickedUp' }> = (d, p) => {
  const o = d.cardOrders.find((x) => x.id === p.orderId);
  if (!o) throw new ActionError('error.notFound');
  o.status = p.status;
  const unit = unitOf(d, o.unitId);
  if (p.status === 'ready') notify(d, ownerKey(unit.ownerCustomerId), 'notif.cardsReady', { unit: unit.code }, '/app/cards');
};

/** Manual consequence for arrears. Nothing here runs automatically. */
export const applyConsequence: Action<{ unitId: string; type: Consequence['type']; note?: string; by: string }> = (d, p) => {
  const unit = unitOf(d, p.unitId);
  unit.consequences.push({ id: nextId(d, 'CNS'), type: p.type, startedAt: d.today, by: p.by, note: p.note });
  logActivity(d, unit.projectId, p.by, 'activity.consequenceApplied', { unit: unit.code, type: p.type });
  notify(d, ownerKey(unit.ownerCustomerId), `notif.consequence.${p.type}`, { unit: unit.code }, '/app/bills');
};

export const liftConsequence: Action<{ unitId: string; consequenceId: string; by: string }> = (d, p) => {
  const unit = unitOf(d, p.unitId);
  const c = unit.consequences.find((x) => x.id === p.consequenceId);
  if (!c || c.endedAt) throw new ActionError('error.generic');
  c.endedAt = d.today;
  logActivity(d, unit.projectId, p.by, 'activity.consequenceLifted', { unit: unit.code, type: c.type });
  notify(d, ownerKey(unit.ownerCustomerId), 'notif.consequenceLifted', { unit: unit.code }, '/app/bills');
};
