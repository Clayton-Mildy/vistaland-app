import { Lock, Phone, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '../../../i18n';
import { useResident } from '../../../store/hooks';
import { Card } from '../../../ui/Card';
import { Moni } from '../../../ui/Moni';
import { Sheet } from '../../../ui/Sheet';
import { ScreenBody } from '../ui/ScreenBody';
import { ScreenHeader } from '../ui/ScreenHeader';

const CAMS = ['Gerbang utama', 'Jalan Blok A', 'Jalan Blok B', 'Jalan Blok C', 'Taman bermain', 'Clubhouse'];

function Feed({ name, big, i }: { name: string; big?: boolean; i: number }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className={`relative overflow-hidden rounded-xl bg-[#1d2430] ${big ? 'h-64' : 'h-28'}`}>
      <div className="absolute inset-0 opacity-70" style={{ background: `radial-gradient(circle at ${30 + i * 9}% ${40 + (i % 3) * 12}%, #3a4658 0, #1d2430 60%), linear-gradient(${120 + i * 20}deg, #2b3546, #141a23)` }} />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0d1117] to-transparent" />
      <div className="absolute inset-0 animate-pulse bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_3px)]" />
      <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-white"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ef4444]" />LIVE</span>
      <span className="absolute bottom-1.5 left-2 max-w-[60%] truncate text-xs font-medium text-white/90">{name}</span>
      <span className="absolute bottom-1.5 right-2 text-xs tabular text-white/70">{now.toLocaleTimeString('id-ID')}</span>
    </div>
  );
}

export default function Cctv() {
  const t = useT();
  const ctx = useResident()!;
  const [open, setOpen] = useState<number | null>(null);
  const ownerOfRented = ctx.role === 'owner' && !!ctx.activeRenter;
  return (
    <div>
      <ScreenHeader title={t('cctv.title')} eyebrow={ctx.project.name} />
      <ScreenBody>
        {ownerOfRented ? (
          <Card className="flex flex-col items-center py-8 text-center">
            <Moni pose="crossed" size={80} />
            <p className="mt-3 flex items-center gap-1.5 text-base font-semibold"><Lock className="h-4 w-4 text-ink/40" />{t('cctv.rentedTitle')}</p>
            <p className="mt-1 text-sm text-ink/55">{t('cctv.rentedBody', { name: ctx.activeRenter!.name })}</p>
          </Card>
        ) : (
          <>
            <Card className="grid grid-cols-2 gap-2 p-2">
              {CAMS.map((c, i) => (
                <button key={c} onClick={() => setOpen(i)} className="text-left"><Feed name={c} i={i} /></button>
              ))}
            </Card>
            <p className="px-1 text-xs text-ink/50">{t('cctv.note')}</p>
          </>
        )}
        <Card>
          <p className="flex items-center gap-2 text-base font-semibold"><ShieldCheck className="h-5 w-5 text-[#17703D]" strokeWidth={1.75} />{t('cctv.onDuty')}</p>
          <ul className="mt-2 space-y-2 text-sm">
            {[['Pak Dedi', 'cctv.post'], ['Pak Rahmat', 'cctv.patrol']].map(([n, k]) => (
              <li key={n} className="flex items-center justify-between rounded-xl bg-paper px-3 py-2">
                <span><span className="font-medium">{n}</span> <span className="text-xs text-ink/50">· {t(k)}</span></span>
                <a href="tel:081210002001" className="flex items-center gap-1 text-xs font-medium text-brand"><Phone className="h-3.5 w-3.5" />{t('common.call')}</a>
              </li>
            ))}
          </ul>
        </Card>
      </ScreenBody>
      <Sheet open={open !== null} onClose={() => setOpen(null)} title={open !== null ? CAMS[open] : ''}>
        {open !== null && <Feed name={CAMS[open]} big i={open} />}
      </Sheet>
    </div>
  );
}
