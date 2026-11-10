// Deterministic pseudo-random helpers so the seed is identical on every load.
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export type Rng = ReturnType<typeof mulberry32>;
export const int = (r: Rng, min: number, max: number) => min + Math.floor(r() * (max - min + 1));
export const pick = <T,>(r: Rng, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
export const digits = (r: Rng, n: number) => Array.from({ length: n }, () => int(r, 0, 9)).join('');

const FIRST = ['Agus', 'Bambang', 'Citra', 'Dian', 'Eko', 'Fajar', 'Gita', 'Hendra', 'Indah', 'Joko', 'Kartika', 'Lina', 'Made', 'Nur', 'Oki', 'Putri', 'Rizky', 'Sinta', 'Teguh', 'Umi', 'Vina', 'Wahyu', 'Yanti', 'Zainal', 'Arif', 'Bayu', 'Dewi', 'Fitri', 'Hadi', 'Irwan', 'Mega', 'Nanda', 'Rudi', 'Sari', 'Taufik', 'Wulan'];
const LAST = ['Saputra', 'Wijaya', 'Hidayat', 'Kurniawan', 'Pratama', 'Santoso', 'Lestari', 'Nugroho', 'Purnama', 'Siregar', 'Hasibuan', 'Utami', 'Setiawan', 'Rahman', 'Maharani', 'Gunawan', 'Firmansyah', 'Anggraini', 'Susanto', 'Halim'];
export const personName = (r: Rng) => `${pick(r, FIRST)} ${pick(r, LAST)}`;
