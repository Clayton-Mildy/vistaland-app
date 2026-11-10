/** 081234560107 → 0812****107 */
export const maskPhone = (p: string) => {
  const d = p.replace(/\D/g, '').replace(/^62/, '0');
  return d.length > 7 ? `${d.slice(0, 4)}****${d.slice(-3)}` : d;
};

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
