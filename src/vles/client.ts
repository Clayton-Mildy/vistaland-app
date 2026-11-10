// Mock VLES client. Request/response shapes follow the two OpenAPI specs
// (customer search + integration). To connect the real API later, keep these
// signatures and swap the bodies for fetch calls made from a backend.
import type { AppData, Customer, VlesTransaction, VlesUnit, VlesUnitType } from '../domain/types';
import { normalizeKtp, normalizeNpwp, normalizePhone } from './normalize';

export const vlesConfig = { latencyMs: [150, 300] as [number, number] };

const delay = () => {
  const [min, max] = vlesConfig.latencyMs;
  const ms = min + Math.random() * (max - min);
  return ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();
};

export class VlesError extends Error {
  constructor(public status: number, message: string, public errors?: Record<string, string[]>) {
    super(message);
  }
}

export interface SearchQuery { customer_id?: number; no_ktp?: string; no_npwp?: string; no_hp?: string }
export type SearchHit = Pick<Customer, 'customer_id' | 'no_ktp' | 'no_npwp' | 'no_hp'>;
export interface SearchResponse { data: SearchHit[]; meta: { count: number; limit: 20; has_more: boolean } }

/** POST /api/v1/customers/search — every given field must match exactly. */
export async function searchCustomers(data: AppData, q: SearchQuery): Promise<SearchResponse> {
  await delay();
  const given = Object.entries(q).filter(([, v]) => v !== undefined && v !== '');
  if (!given.length) throw new VlesError(422, 'Input pencarian tidak valid.');
  if (q.no_hp !== undefined && q.no_hp.replace(/\D/g, '').length < 9) {
    throw new VlesError(422, 'Input pencarian tidak valid.', { no_hp: ['No HP minimal 9 digit.'] });
  }
  const hits = data.vles.customers
    .filter((c) => q.customer_id === undefined || c.customer_id === q.customer_id)
    .filter((c) => q.no_ktp === undefined || normalizeKtp(c.no_ktp) === normalizeKtp(q.no_ktp))
    .filter((c) => q.no_hp === undefined || normalizePhone(c.no_hp) === normalizePhone(q.no_hp))
    .filter((c) => q.no_npwp === undefined || (c.no_npwp !== null && normalizeNpwp(c.no_npwp) === normalizeNpwp(q.no_npwp)))
    .sort((a, b) => b.customer_id - a.customer_id);
  const page = hits.slice(0, 20).map(({ customer_id, no_ktp, no_npwp, no_hp }) => ({ customer_id, no_ktp, no_npwp, no_hp }));
  return { data: page, meta: { count: page.length, limit: 20, has_more: hits.length > 20 } };
}

/** GET /transactions?customer_id= */
export async function getTransactions(data: AppData, q: { customer_id: number }): Promise<VlesTransaction[]> {
  await delay();
  return data.vles.transactions.filter((t) => t.customer_id === q.customer_id);
}

/** GET /units/{id} */
export async function getUnit(data: AppData, id: number): Promise<VlesUnit> {
  await delay();
  const u = data.vles.units.find((x) => x.id === id && !x.deleted);
  if (!u) throw new VlesError(404, 'Unit tidak ditemukan');
  return u;
}

/** GET /units?project_id= */
export async function getUnits(data: AppData, q: { project_id: number }): Promise<VlesUnit[]> {
  await delay();
  return data.vles.units.filter((u) => u.project_id === q.project_id && !u.deleted);
}

/** GET /unit-types?project_id= */
export async function getUnitTypes(data: AppData, q: { project_id: number }): Promise<VlesUnitType[]> {
  await delay();
  return data.vles.unitTypes.filter((t) => t.project_id === q.project_id && !t.deleted);
}
