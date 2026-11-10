import { getTransactions, searchCustomers } from '../vles/client';
import { normalizeKtp, normalizePhone } from '../vles/normalize';
import type { AppData, ResidentIdentity } from './types';

export type ResolveResult =
  | { ok: true; identity: ResidentIdentity; unitIds: string[] }
  | { ok: false; reason: 'notFound' | 'noActiveUnit' | 'leaseEnded' };

/**
 * Phone + KTP is the resident identity. Owners are matched through the VLES
 * customer search (both fields must match); renters are not VLES customers, so
 * they are matched against VHome's own renter records.
 */
export async function resolveResident(data: AppData, phone: string, ktp: string): Promise<ResolveResult> {
  if (!phone.trim() || !ktp.trim()) return { ok: false, reason: 'notFound' };
  const { data: hits } = await searchCustomers(data, { no_hp: phone, no_ktp: ktp });
  if (hits.length) {
    const customerId = hits[0].customer_id;
    const txs = (await getTransactions(data, { customer_id: customerId })).filter((t) => t.status === 'active');
    const vlesIds = new Set(txs.map((t) => t.unit_id));
    const unitIds = data.units.filter((u) => vlesIds.has(u.vlesUnitId) && u.ownerCustomerId === customerId).map((u) => u.id);
    if (!unitIds.length) return { ok: false, reason: 'noActiveUnit' };
    return { ok: true, identity: { kind: 'owner', customerId }, unitIds };
  }
  const p = normalizePhone(phone);
  const k = normalizeKtp(ktp);
  const renters = data.renters.filter((r) => normalizePhone(r.no_hp) === p && normalizeKtp(r.no_ktp) === k);
  const active = renters.find((r) => r.status === 'active' && r.lease.end >= data.today);
  if (active) return { ok: true, identity: { kind: 'renter', renterId: active.id }, unitIds: [active.unitId] };
  if (renters.length) return { ok: false, reason: 'leaseEnded' };
  return { ok: false, reason: 'notFound' };
}
