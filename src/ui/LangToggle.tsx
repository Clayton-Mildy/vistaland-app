import { useLang } from '../i18n';
import { cx } from './cx';
import { useFlavor } from './flavor';

export function LangToggle({ dark, className }: { dark?: boolean; className?: string }) {
  const [lang, setLang] = useLang();
  const premium = useFlavor() === 'premium';
  return (
    <div className={cx('inline-flex rounded-full p-0.5', premium ? 'text-xs font-medium' : 'text-[11px] font-bold', dark ? 'bg-white/15' : 'border border-line bg-white', className)}>
      {(['id', 'en'] as const).map((l) => (
        <button key={l} onClick={() => setLang(l)} className={cx('rounded-full px-2 py-0.5 uppercase transition', lang === l ? (dark ? 'bg-white text-ink' : 'bg-ink text-white') : dark ? 'text-white/70' : 'text-ink/50')}>
          {l}
        </button>
      ))}
    </div>
  );
}
