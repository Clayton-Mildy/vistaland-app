import { AlertTriangle } from 'lucide-react';
import { useT } from '../i18n';
import { useStorageOk } from '../store/hooks';

/** One-line notice inside the phone screen when browser storage is unavailable (changes last only while the tab is open). */
export function StorageNotice() {
  const t = useT();
  const ok = useStorageOk();
  if (ok) return null;
  return (
    <div role="status" className="pointer-events-none absolute inset-x-3 top-9 z-[60] flex items-center gap-1.5 rounded-xl bg-[#FFF1D6] px-3 py-1.5 text-[11px] font-semibold text-[#9A5B00] shadow-card">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      {t('common.storageOff')}
    </div>
  );
}
