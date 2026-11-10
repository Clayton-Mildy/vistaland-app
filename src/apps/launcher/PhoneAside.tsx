import { Columns2, House } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useT } from '../../i18n';
import { DemoToolbar } from './DemoToolbar';

/** Demo controls shown beside the phone on wide screens when an app is opened on its own. */
export function PhoneAside() {
  const t = useT();
  return (
    <div className="space-y-4 rounded-3xl border border-line/80 bg-white/80 p-5 shadow-card backdrop-blur">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink/45">{t('demo.asideTitle')}</p>
        <p className="mt-1 text-sm text-ink/65">{t('demo.asideBody')}</p>
      </div>
      <DemoToolbar />
      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        <Link to="/demo" className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 hover:border-ink/30"><Columns2 className="h-3.5 w-3.5" />{t('demo.openSideBySide')}</Link>
        <Link to="/" className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 hover:border-ink/30"><House className="h-3.5 w-3.5" />{t('demo.back')}</Link>
      </div>
    </div>
  );
}
