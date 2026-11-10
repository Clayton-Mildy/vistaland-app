import { Timer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '../../../i18n';
import { logMowing } from '../../../store/actions';
import { useData, useRun } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { cx } from '../../../ui/cx';
import { Field, Input, Select } from '../../../ui/Field';
import { Photo } from '../../../ui/Photo';
import { PhotoPicker } from '../../../ui/PhotoPicker';
import { Stepper } from '../../../ui/Stepper';
import { useToast } from '../../../ui/Toast';
import { useStaff } from '../hooks';
import { StaffHeader } from '../StaffShell';
import { estLiters, estMinutes, useGarden } from './useGarden';

const LAYOUT: Record<string, { x: number; y: number; w: number; h: number }> = {
  'zone-2': { x: 0, y: 0, w: 32, h: 60 }, 'zone-3': { x: 34, y: 0, w: 32, h: 46 }, 'zone-4': { x: 68, y: 0, w: 32, h: 46 },
  'zone-1': { x: 0, y: 62, w: 32, h: 38 }, 'zone-5': { x: 34, y: 48, w: 32, h: 52 }, 'zone-6': { x: 68, y: 48, w: 32, h: 52 },
};
const hm = (d = new Date()) => `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
const addMin = (t: string, m: number) => {
  const [h, mm] = t.split('.').map(Number);
  const total = h * 60 + mm + m;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}.${String(total % 60).padStart(2, '0')}`;
};

export default function MowLog() {
  const t = useT();
  const run = useRun();
  const toast = useToast();
  const staff = useStaff()!;
  const project = useData((d) => d.projects.find((p) => p.id === staff.projectIds[0])!);
  const g = useGarden(staff.id, project.id);
  const [step, setStep] = useState(0);
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [machineId, setMachineId] = useState(g.machines[0]?.id ?? '');
  const [before, setBefore] = useState<string | null>(null);
  const [after, setAfter] = useState<string | null>(null);
  const [start, setStart] = useState<{ label: string; at: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [fuel, setFuel] = useState('');
  const zone = g.zones.find((z) => z.id === zoneId);
  const per1000 = project.settings.fuel.litersPer1000m2;
  useEffect(() => {
    if (step !== 2 || !start) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start.at) / 1000)), 1000);
    return () => clearInterval(id);
  }, [step, start]);
  const save = () => {
    if (!zone || !before || !after || !start) return;
    const minutes = Math.max(Math.round(elapsed / 60), estMinutes(zone.area));
    run(logMowing, { zoneId: zone.id, gardenerId: staff.id, machineId, date: g.today, start: start.label, end: addMin(start.label, minutes), area: zone.area, beforePhotoId: before, afterPhotoId: after, fuelUsed: Number(fuel.replace(',', '.')) || estLiters(zone.area, per1000) });
    toast.show(t('mow.saved', { zone: zone.name }));
    setStep(0); setZoneId(null); setBefore(null); setAfter(null); setStart(null); setElapsed(0); setFuel('');
  };
  return (
    <div>
      <StaffHeader kicker={t('role.gardener')} title={t('mow.title')}>
        <div className="mt-3 [&_span]:!text-white/80 [&_.bg-brand]:!bg-white">
          <Stepper steps={[t('mow.s.zone'), t('mow.s.start'), t('mow.s.cut'), t('mow.s.finish')]} current={step} />
        </div>
      </StaffHeader>
      <div className="space-y-3 p-4">
        {step === 0 && (
          <>
            <Card>
              <p className="mb-2 text-sm font-semibold">{t('mow.pickZone')}</p>
              <div className="relative aspect-[4/3] w-full">
                {g.zones.map((z) => {
                  const L = LAYOUT[z.id] ?? { x: 0, y: 0, w: 30, h: 30 };
                  return (
                    <button key={z.id} onClick={() => setZoneId(z.id)} style={{ left: `${L.x}%`, top: `${L.y}%`, width: `${L.w}%`, height: `${L.h}%` }} className={cx('absolute flex flex-col items-center justify-center rounded-lg border p-1 text-center text-[10.5px] font-bold', zoneId === z.id ? 'border-brand bg-brand text-white' : 'border-[#9FD4AE] bg-[#D8F0DF] text-[#1B5E36]')}>
                      {z.name.replace('Jalur hijau ', '')}<span className="font-normal opacity-80">{z.area.toLocaleString('id-ID')} m²</span>
                    </button>
                  );
                })}
              </div>
            </Card>
            {zone && (
              <Card className="border-2 border-brand">
                <p className="font-bold">{zone.name}</p>
                <p className="text-sm text-ink/60">{t('mow.zoneInfo', { area: zone.area.toLocaleString('id-ID'), n: zone.perMonth })}</p>
                <p className="text-xs text-ink/50">{t('mow.estimate', { l: estLiters(zone.area, per1000), m: estMinutes(zone.area) })}</p>
              </Card>
            )}
            <Button block size="lg" disabled={!zone} onClick={() => setStep(1)}>{t('common.next')}</Button>
          </>
        )}
        {step === 1 && (
          <>
            <Card className="space-y-3">
              <Field label={t('mow.machine')}><Select value={machineId} onChange={(e) => setMachineId(e.target.value)}>{g.machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></Field>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-ink/70">{t('mow.beforePhoto')}</p>
                {before ? <Photo id={before} className="h-36 rounded-xl" /> : <PhotoPicker samples={['LAWN_BEFORE']} onPicked={(p) => setBefore(p.id)} />}
              </div>
            </Card>
            <Button block size="lg" disabled={!before} onClick={() => { setStart({ label: hm(), at: Date.now() }); setStep(2); }}>{t('mow.startCut')}</Button>
          </>
        )}
        {step === 2 && start && (
          <Card className="flex flex-col items-center py-8 text-center">
            <Timer className="h-10 w-10 text-brand" />
            <p className="mt-2 font-mono text-4xl font-extrabold tabular">{String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}</p>
            <p className="mt-1 text-sm text-ink/55">{t('mow.cutting', { zone: zone?.name ?? '', time: start.label })}</p>
            <Button className="mt-5" block size="lg" onClick={() => setStep(3)}>{t('mow.finishCut')}</Button>
            <p className="mt-2 text-[11px] text-ink/45">{t('mow.demoNote')}</p>
          </Card>
        )}
        {step === 3 && zone && (
          <>
            <Card className="space-y-3">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-ink/70">{t('mow.afterPhoto')}</p>
                {after ? <Photo id={after} className="h-36 rounded-xl" /> : <PhotoPicker samples={['LAWN_AFTER']} onPicked={(p) => setAfter(p.id)} />}
              </div>
              <Field label={t('mow.fuelUsed')} hint={t('mow.fuelHint', { l: estLiters(zone.area, per1000) })}><Input inputMode="decimal" value={fuel} onChange={(e) => setFuel(e.target.value)} placeholder={String(estLiters(zone.area, per1000))} /></Field>
            </Card>
            <Button block size="lg" disabled={!after} onClick={save}>{t('mow.save')}</Button>
          </>
        )}
      </div>
    </div>
  );
}
