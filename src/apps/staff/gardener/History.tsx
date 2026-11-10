import { useState } from 'react';
import { addDays, formatDate, monthOf } from '../../../domain/clock';
import { useLang, useT } from '../../../i18n';
import { rephotoMowingLog } from '../../../store/actions';
import { useData, useRun } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { PhotoPicker } from '../../../ui/PhotoPicker';
import { Segmented } from '../../../ui/Segmented';
import { Sheet } from '../../../ui/Sheet';
import { StatusPill } from '../../../ui/StatusPill';
import { useToast } from '../../../ui/Toast';
import { useStaff } from '../hooks';
import { StaffHeader } from '../StaffShell';
import { useGarden } from './useGarden';

const mins = (a: string, b: string) => {
  const [ah, am] = a.split('.').map(Number);
  const [bh, bm] = b.split('.').map(Number);
  return bh * 60 + bm - (ah * 60 + am);
};

export default function History() {
  const t = useT();
  const [lang] = useLang();
  const run = useRun();
  const toast = useToast();
  const staff = useStaff()!;
  const project = useData((d) => d.projects.find((p) => p.id === staff.projectIds[0])!);
  const g = useGarden(staff.id, project.id);
  const [period, setPeriod] = useState<'week' | 'month'>('month');
  const [redo, setRedo] = useState<string | null>(null);
  const month = monthOf(addDays(g.today, -10));
  const inPeriod = (date: string) => (period === 'week' ? date > addDays(g.today, -7) : monthOf(date) === month);
  const logs = g.logs.filter((l) => inPeriod(l.date));
  const area = logs.reduce((a, l) => a + l.area, 0);
  const minutes = logs.reduce((a, l) => a + Math.max(0, mins(l.start, l.end)), 0);
  const refills = g.fuel.filter((f) => f.kind === 'refill' && inPeriod(f.at.slice(0, 10))).reduce((a, f) => a + f.liters, 0);
  const per1000 = area ? Math.round((refills / (area / 1000)) * 100) / 100 : 0;
  const std = project.settings.fuel.litersPer1000m2;
  const rephoto = g.logs.filter((l) => l.status === 'rephoto');
  const zoneName = (id: string) => g.zones.find((z) => z.id === id)?.name ?? '';
  const attendance = g.attendance.filter((a) => monthOf(a.date) === monthOf(g.today)).length;
  return (
    <div>
      <StaffHeader kicker={t('role.gardener')} title={t('ghist.title')}>
        <Segmented className="mt-3 w-full !bg-white/15 [&_button]:!text-white [&_.bg-white]:!text-ink" value={period} onChange={setPeriod} items={[{ value: 'week', label: t('ghist.week') }, { value: 'month', label: formatDate(month, lang, 'month') }]} />
      </StaffHeader>
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2">
          <Card className="p-3"><p className="text-[11px] text-ink/50">{t('ghist.area')}</p><p className="text-xl font-extrabold">{area.toLocaleString('id-ID')} m²</p><p className="text-[11px] text-ink/45">{t('ghist.logs', { n: logs.length })}</p></Card>
          <Card className="p-3"><p className="text-[11px] text-ink/50">{t('ghist.time')}</p><p className="text-xl font-extrabold">{Math.floor(minutes / 60)} j {minutes % 60} m</p></Card>
          <Card className="p-3"><p className="text-[11px] text-ink/50">{t('ghist.per1000')}</p><p className="text-xl font-extrabold">{per1000.toLocaleString('id-ID')} L</p><p className={per1000 > std * 1.05 ? 'text-[11px] font-semibold text-[#B4192A]' : 'text-[11px] text-ink/45'}>{t('ghist.std', { n: std.toLocaleString('id-ID') })}</p></Card>
          <Card className="p-3"><p className="text-[11px] text-ink/50">{t('ghist.attendance')}</p><p className="text-xl font-extrabold">{attendance}</p><p className="text-[11px] text-ink/45">{t('ghist.days')}</p></Card>
        </div>
        {rephoto.map((l) => (
          <Card key={l.id} className="border-[#F5C9A8] bg-[#FFF3EA]">
            <p className="font-bold text-[#9A3412]">{t('ghist.fixTitle')}</p>
            <p className="mt-1 text-sm text-[#9A3412]">{zoneName(l.zoneId)} ({formatDate(l.date, lang, 'short')}): {l.note}</p>
            <Button className="mt-3 !bg-[#9A3412] !bg-none" onClick={() => setRedo(l.id)}>{t('ghist.rephoto')}</Button>
          </Card>
        ))}
        <Card className="p-0">
          <p className="px-4 pb-1 pt-3 font-bold">{t('ghist.logList')}</p>
          {logs.map((l) => (
            <div key={l.id} className="flex items-center justify-between border-t border-line px-4 py-2.5">
              <div>
                <p className="text-sm font-semibold">{zoneName(l.zoneId)}</p>
                <p className="text-[11px] text-ink/45">{formatDate(l.date, lang, 'weekday')} · {l.start}–{l.end} · {l.area.toLocaleString('id-ID')} m²</p>
              </div>
              <StatusPill tone={l.status === 'approved' ? 'success' : l.status === 'rephoto' ? 'danger' : 'warning'}>{t(`ghist.s.${l.status}`)}</StatusPill>
            </div>
          ))}
        </Card>
      </div>
      <Sheet open={!!redo} onClose={() => setRedo(null)} title={t('ghist.rephoto')}>
        <PhotoPicker samples={['LAWN_AFTER']} onPicked={(p) => { run(rephotoMowingLog, { id: redo!, afterPhotoId: p.id }); setRedo(null); toast.show(t('ghist.rephotoSent')); }} />
      </Sheet>
    </div>
  );
}
