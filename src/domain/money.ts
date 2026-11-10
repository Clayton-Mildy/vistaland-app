const group = (n: number) => Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** Rupiah with dot thousands separators: Rp3.780.000 (negative uses a real minus). */
export const formatRp = (n: number): string => `${n < 0 ? '−' : ''}Rp${group(n)}`;

/** Compact Rupiah for dashboards: Rp18,0 jt / Rp925 rb. */
export const formatRpShort = (n: number): string => {
  const sign = n < 0 ? '−' : '';
  const a = Math.abs(n);
  if (a >= 1_000_000_000) return `${sign}Rp${(a / 1_000_000_000).toFixed(1).replace('.', ',')} M`;
  if (a >= 1_000_000) return `${sign}Rp${(a / 1_000_000).toFixed(1).replace('.', ',')} jt`;
  if (a >= 1_000) return `${sign}Rp${Math.round(a / 1_000)} rb`;
  return `${sign}Rp${a}`;
};
