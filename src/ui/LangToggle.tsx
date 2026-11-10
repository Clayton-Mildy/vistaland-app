import { useLang } from '../i18n';
import { cx } from './cx';

export function LangToggle({ dark, className }: { dark?: boolean; className?: string }) {
  const [lang, setLang] = useLang();
  return (
    <div className={cx('inline-flex rounded-full p-0.5 text-[11px] font-bold', dark ? 'bg-white/15' : 'border border-line bg-white', className)}>
      {(['id', 'en'] as const).map((l) => (
        <button key={l} onClick={() => setLang(l)} className={cx('rounded-full px-2 py-0.5 uppercase transition', lang === l ? (dark ? 'bg-white text-ink' : 'bg-ink text-white') : dark ? 'text-white/70' : 'text-ink/50')}>
          {l}
        </button>
      ))}
    </div>
  );
}
