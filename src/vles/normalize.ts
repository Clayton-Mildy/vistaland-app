// Matching rules from the VLES customer-search spec: spaces, dots and dashes are
// ignored; phone prefixes 0 / 62 / +62 are equal; a 15-digit NPWP equals the
// 16-digit form with a leading 0.
export const normalizePhone = (s: string): string => {
  const digits = s.replace(/\D/g, '');
  if (digits.startsWith('620')) return `62${digits.slice(3)}`; // "+62 0812…": country code typed before the local 0
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return `62${digits}`;
};
export const normalizeKtp = (s: string): string => s.replace(/[\s.\-]/g, '').toUpperCase();
export const normalizeNpwp = (s: string): string => {
  const digits = s.replace(/\D/g, '');
  return digits.length === 15 ? `0${digits}` : digits;
};
