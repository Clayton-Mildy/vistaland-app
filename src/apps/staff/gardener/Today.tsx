import { Camera, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { formatDate, formatTime } from '../../../domain/clock';
import { useLang, useT } from '../../../i18n';
import { checkIn } from '../../../store/actions';
import { useData, useRun } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { PhotoPicker } from '../../../ui/PhotoPicker';
import { Progress } from '../../../ui/Progress';
import { Sheet } from '../../../ui/Sheet';
import { StatusPill } from '../../../ui/StatusPill';
import { useToast } from '../../../ui/Toast';
import { useStaff } from '../hooks';
import { StaffHeader } from '../StaffShell';
import { estLiters, useGarden } from './useGarden';

export default function Today() {
  const t = useT();
  const [lang] = useLang();
  const run = useRun();
  const toast = useToast();
  const staff = useStaff()!;
  const project = useData((d) => d.projects.find((p) => p.id === staff.projectIds[0])!);
  const g = useGarden(staff.id, project.id);
  const [selfie, setSelfie] = useState(false);
  const dueToday = g.zoneState.filter((z) => z.late >= 0 && (z.due <= g.today || z.doneToday)).slice(0, 3);
  const doneArea = g.logs.filter((l) => l.date === g.today).reduce((a, l) => a + l.area, 0);
  const targetArea = dueToday.reduce((a, z) => a + z.zone.area, 0) || 1;
  return (
    <div>
      <StaffHeader kicker={`${t('role.gardener')} · ${project.name}`} title={t('home.hello', { name: staff.name })} sub={formatDate(g.today, lang, 'weekday') + ' ' + g.today.slice(0, 4)} right={<button onClick={() => toast.show(t('garden.issueSent'))} className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold">{t('garden.issue')}</button>}>
        {g.checkedIn ? (
          <p className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-white/15 py-3 text-sm font-bold"><CheckCircle2 className="h-4 w-4" />{t('garden.checkedIn', { time: formatTime(g.checkedIn.at) })}</p>
        ) : (
          <button onClick={() => setSelfie(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-bold text-brand-dark"><Camera className="h-4 w-4" />{t('garden.checkIn')}</button>
        )}
      </StaffHeader>
      <div className="space-y-3 p-4">
        <Card>
          <div className="flex items-center justify-between"><span className="font-bold">{t('garden.target')}</span><span className="text-xs text-ink/50">{t('garden.zonesDone', { n: dueToday.filter((z) => z.doneToday).length, total: dueToday.length })}</span></div>
          <Progress className="mt-2" tone="success" value={(doneArea / targetArea) * 100} />
          <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
            <div><p className="text-[11px] text-ink/50">{t('garden.areaDone')}</p><p className="font-bold">{doneArea.toLocaleString('id-ID')} m²</p><p className="text-[10px] text-ink/45">{t('garden.of', { n: targetArea.toLocaleString('id-ID') })}</p></div>
            <div><p className="text-[11px] text-ink/50">{t('garden.minutes')}</p><p className="font-bold">{Math.round(targetArea / 32)} {t('garden.min')}</p></div>
            <div><p className="text-[11px] text-ink/50">{t('garden.fuelNeed')}</p><p className="font-bold">±{estLiters(targetArea - doneArea, project.settings.fuel.litersPer1000m2)} L</p></div>
          </div>
        </Card>
        <h3 className="px-1 text-[15px] font-bold">{t('garden.schedule')}</h3>
        {g.zoneState.map((z) => (
          <Card key={z.zone.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-bold">{z.zone.name}</p>
              <p className="text-xs text-ink/50">{z.zone.area.toLocaleString('id-ID')} m² · {t('garden.lastCut', { date: z.zone.lastCut ? formatDate(z.zone.lastCut, lang, 'short') : '—' })}</p>
            </div>
            {z.doneToday ? <StatusPill tone="success">{t('garden.doneToday')}</StatusPill> : z.late > 0 ? <StatusPill tone="danger">{t('garden.late', { n: z.late })}</StatusPill> : z.due === g.today ? <StatusPill tone="warning">{t('garden.dueToday')}</StatusPill> : <StatusPill tone="neutral">{formatDate(z.due, lang, 'short')}</StatusPill>}
          </Card>
        ))}
        <Card className="divide-y divide-line p-0">
          <div className="flex items-center justify-between px-4 py-3"><span><span className="block text-sm font-bold">{t('garden.jerrycan')}</span><span className="text-[11px] text-ink/45">{t('garden.jerrycanHint')}</span></span><b>{g.jerrycan.toLocaleString('id-ID')} L</b></div>
          {g.machines.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3"><span><span className="block text-sm font-bold">{m.name}</span><span className="text-[11px] text-ink/45">{t('garden.hours', { n: m.hours })}</span></span><StatusPill tone={m.status === 'baik' ? 'success' : 'warning'}>{t(`garden.machine.${m.status}`)}</StatusPill></div>
          ))}
        </Card>
        <Card className="border-[#BDE5CB] bg-[#F2FBF5] text-sm"><b className="text-[#17703D]">{t('garden.estateMsg')}</b> {t('garden.estateMsgBody')}</Card>
      </div>
      <Sheet open={selfie} onClose={() => setSelfie(false)} title={t('garden.checkIn')}>
        <p className="mb-3 text-xs text-ink/55">{t('garden.selfieHint')}</p>
        <PhotoPicker samples={['SELFIE']} onPicked={(p) => { run(checkIn, { gardenerId: staff.id, selfiePhotoId: p.id }); setSelfie(false); toast.show(t('garden.checkedInToast')); }} />
        <Button className="mt-3" variant="ghost" block onClick={() => setSelfie(false)}>{t('common.cancel')}</Button>
      </Sheet>
    </div>
  );
}
