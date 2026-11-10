import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../i18n';
import { LangToggle } from '../../ui/LangToggle';
import { Segmented } from '../../ui/Segmented';
import { DemoToolbar } from './DemoToolbar';

/** Phone (resident or staff) next to the live dashboard. Same origin, so both share the store. */
export function Demo() {
  const t = useT();
  const [left, setLeft] = useState<'resident' | 'staff'>('resident');
  return (
    <div className="flex h-screen flex-col bg-[#E9E4DA]">
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-white px-4 py-2.5">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-semibold text-ink/60 hover:text-ink">
          <ArrowLeft className="h-4 w-4" />
          VHome
        </Link>
        <span className="text-xs font-semibold text-ink/45">{t('demo.left')}</span>
        <Segmented size="sm" value={left} onChange={setLeft} items={[{ value: 'resident', label: t('demo.resident') }, { value: 'staff', label: t('demo.staff') }]} />
        <DemoToolbar compact className="ml-auto" />
        <LangToggle />
      </header>
      <div className="flex min-h-0 flex-1 gap-4 p-4">
        <div className="flex shrink-0 items-start justify-center">
          <div className="h-[min(844px,calc(100vh-90px))] w-[390px] overflow-hidden rounded-[40px] border-[10px] border-[#1A1D24] bg-paper shadow-[0_30px_60px_-30px_rgba(17,24,39,0.5)]">
            <iframe key={left} title="phone" src={left === 'resident' ? '/app' : '/staff'} className="h-full w-full" />
          </div>
        </div>
        <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          <iframe title="dashboard" src="/dashboard" className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
