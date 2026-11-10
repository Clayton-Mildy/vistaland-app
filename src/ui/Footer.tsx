import { useT } from '../i18n';
import { cx } from './cx';
import { useFlavor } from './flavor';

export function DevelopedBy({ className }: { className?: string }) {
  const t = useT();
  const premium = useFlavor() === 'premium';
  return (
    <p className={cx(premium ? 'text-center text-xs text-ink/45' : 'text-center text-[10px] text-ink/40', className)}>
      {t('common.developedBy')} <span className="font-bold text-[#B01222]">Vistaland</span>
    </p>
  );
}
