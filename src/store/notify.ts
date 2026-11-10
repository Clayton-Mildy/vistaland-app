import { nowISO } from '../domain/clock';
import type { AppData } from '../domain/types';
import { nextId } from './ids';

type Params = Record<string, string | number>;

/** Recipients: owner:<customerId>, renter:<renterId>, staff:<staffId>, security:<projectId>, admin:<projectId>. */
export function notify(d: AppData, to: string, key: string, params?: Params, link?: string) {
  d.notifications.push({ id: nextId(d, 'N'), to, text: { key, params }, link, createdAt: nowISO(d.today), read: false });
}

export function logActivity(d: AppData, projectId: string, by: string, key: string, params?: Params) {
  d.activity.push({ id: nextId(d, 'ACT'), projectId, at: nowISO(d.today), by, text: { key, params } });
}

export const unitOf = (d: AppData, unitId: string) => {
  const u = d.units.find((x) => x.id === unitId);
  if (!u) throw new Error(`unknown unit ${unitId}`);
  return u;
};
export const projectOf = (d: AppData, projectId: string) => d.projects.find((p) => p.id === projectId)!;
export const ownerKey = (customerId?: number) => (customerId ? `owner:${customerId}` : '');
