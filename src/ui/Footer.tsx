import { useT } from '../i18n';
import { cx } from './cx';

export function DevelopedBy({ className }: { className?: string }) {
  const t = useT();
  return (
    <p className={cx('text-center text-[10px] text-ink/40', className)}>
      {t('common.developedBy')} <span className="font-bold text-[#B01222]">Vistaland</span>
    </p>
  );
}
