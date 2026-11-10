import type { RoomId } from '../domain/types';

export interface PlanRoom { room: RoomId; x: number; y: number; w: number; h: number }

// Simplified floor plans on a 0–100 grid (top = back of the house).
const plan36: PlanRoom[] = [
  { room: 'dapur', x: 0, y: 0, w: 40, h: 26 },
  { room: 'kamarMandi', x: 40, y: 0, w: 22, h: 26 },
  { room: 'kamar2', x: 62, y: 0, w: 38, h: 34 },
  { room: 'ruangTamu', x: 0, y: 26, w: 62, h: 40 },
  { room: 'kamarUtama', x: 62, y: 34, w: 38, h: 32 },
  { room: 'teras', x: 0, y: 66, w: 46, h: 34 },
  { room: 'carport', x: 46, y: 66, w: 54, h: 34 },
];
const plan45: PlanRoom[] = [
  { room: 'dapur', x: 0, y: 0, w: 34, h: 24 },
  { room: 'kamarMandi', x: 34, y: 0, w: 20, h: 24 },
  { room: 'kamar2', x: 54, y: 0, w: 46, h: 30 },
  { room: 'ruangKeluarga', x: 0, y: 24, w: 54, h: 26 },
  { room: 'kamarUtama', x: 54, y: 30, w: 46, h: 34 },
  { room: 'ruangTamu', x: 0, y: 50, w: 54, h: 20 },
  { room: 'teras', x: 0, y: 70, w: 40, h: 30 },
  { room: 'carport', x: 40, y: 64, w: 60, h: 36 },
];
const plan60: PlanRoom[] = [
  { room: 'taman', x: 0, y: 0, w: 100, h: 12 },
  { room: 'dapur', x: 0, y: 12, w: 30, h: 22 },
  { room: 'kamarMandi2', x: 30, y: 12, w: 18, h: 22 },
  { room: 'kamar3', x: 48, y: 12, w: 26, h: 26 },
  { room: 'kamar2', x: 74, y: 12, w: 26, h: 26 },
  { room: 'ruangKeluarga', x: 0, y: 34, w: 48, h: 24 },
  { room: 'kamarMandi', x: 48, y: 38, w: 18, h: 20 },
  { room: 'kamarUtama', x: 66, y: 38, w: 34, h: 30 },
  { room: 'ruangTamu', x: 0, y: 58, w: 66, h: 14 },
  { room: 'teras', x: 0, y: 72, w: 40, h: 28 },
  { room: 'carport', x: 40, y: 68, w: 60, h: 32 },
];
const plan30: PlanRoom[] = [
  { room: 'dapur', x: 0, y: 0, w: 44, h: 28 },
  { room: 'kamarMandi', x: 44, y: 0, w: 22, h: 28 },
  { room: 'kamarUtama', x: 66, y: 0, w: 34, h: 40 },
  { room: 'ruangTamu', x: 0, y: 28, w: 66, h: 40 },
  { room: 'teras', x: 0, y: 68, w: 100, h: 32 },
];
const plan36s: PlanRoom[] = [
  { room: 'dapur', x: 0, y: 0, w: 36, h: 26 },
  { room: 'kamarMandi', x: 36, y: 0, w: 22, h: 26 },
  { room: 'kamar2', x: 58, y: 0, w: 42, h: 34 },
  { room: 'ruangKeluarga', x: 0, y: 26, w: 58, h: 40 },
  { room: 'kamarUtama', x: 58, y: 34, w: 42, h: 32 },
  { room: 'teras', x: 0, y: 66, w: 100, h: 34 },
];

export const FLOORPLANS: Record<string, PlanRoom[]> = {
  'vh-36': plan36,
  'vh-45': plan45,
  'vh-60': plan60,
  'vh-75': plan60,
  'hp-30': plan30,
  'hp-36': plan36s,
};
export const roomsOf = (typeId: string): RoomId[] => FLOORPLANS[typeId].map((r) => r.room);
