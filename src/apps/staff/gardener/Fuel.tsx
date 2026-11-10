import { useState } from 'react';
import { addDays, formatDateTime } from '../../../domain/clock';
import { formatRp } from '../../../domain/money';
import { useLang, useT } from '../../../i18n';
import { addFuelEntry } from '../../../store/actions';
import { useData, useRun } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Field, Input, Select } from '../../../ui/Field';
import { Photo } from '../../../ui/Photo';
import { PhotoPicker } from '../../../ui/PhotoPicker';
import { Segmented } from '../../../ui/Segmented';
import { StatusPill } from '../../../ui/StatusPill';
import { useToast } from '../../../ui/Toast';
import { useStaff } from '../hooks';
import { StaffHeader } from '../StaffShell';
import { useGarden } from './useGarden';

export default function Fuel() {
  const t = useT();
  const [lang] = useLang();
  const run = useRun();
  const toast = useToast();
  const staff = useStaff()!;
  const project = useData((d) => d.projects.find((p) => p.id === staff.projectIds[0])!);
  const g = useGarden(staff.id, project.id);
  const [tab, setTab] = useState<'buy' | 'refill'>('buy');
  const [liters, setLiters] = useState('');
  const [amount, setAmount] = useState('');
  const [receipt, setReceipt] = useState<string | null>(null);
  const [source, setSource] = useState<'kasKecil' | 'pribadi'>('kasKecil');
  const [machineId, setMachineId] = useState(g.machines[0]?.id ?? '');
  const weekAgo = addDays(g.today, -7);
  const week = g.fuel.filter((f) => f.at.slice(0, 10) > weekAgo).slice().reverse();
  const boughtWeek = week.filter((f) => f.kind === 'buy').reduce((a, f) => a + f.liters, 0);
  const usedWeek = g.logs.filter((l) => l.date > weekAgo).reduce((a, l) => a + l.fuelUsed, 0);
  const l = Number(liters.replace(',', '.'));
  const save = () => {
    if (!(l > 0)) return toast.show(t('fuel.litersRequired'), 'error');
    if (tab === 'buy') {
      if (!receipt) return toast.show(t('fuel.receiptRequired'), 'error');
      run(addFuelEntry, { projectId: project.id, gardenerId: staff.id, kind: 'buy', liters: l, amount: Number(amount.replace(/\D/g, '')) || Math.round(l * 10000), receiptPhotoId: receipt, source });
      toast.show(t('fuel.boughtSaved'));
    } else {
      run(addFuelEntry, { projectId: project.id, gardenerId: staff.id, kind: 'refill', liters: l, machineId });
      toast.show(t('fuel.refillSaved'));
    }
    setLiters(''); setAmount(''); setReceipt(null);
  };
  return (
    <div>
      <StaffHeader kicker={t('role.gardener')} title={t('fuel.title')}>
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-white/12 p-3">
          <div><p className="text-[10px] text-white/75">{t('fuel.jerrycan')}</p><p className="text-lg font-extrabold">{g.jerrycan.toLocaleString('id-ID')} L</p></div>
          <div><p className="text-[10px] text-white/75">{t('fuel.boughtWeek')}</p><p className="text-lg font-extrabold">{boughtWeek.toLocaleString('id-ID')} L</p></div>
          <div><p className="text-[10px] text-white/75">{t('fuel.usedLog')}</p><p className="text-lg font-extrabold">{(Math.round(usedWeek * 10) / 10).toLocaleString('id-ID')} L</p></div>
        </div>
      </StaffHeader>
      <div className="space-y-3 p-4">
        <Segmented className="w-full" value={tab} onChange={setTab} items={[{ value: 'buy', label: t('fuel.tab.buy') }, { value: 'refill', label: t('fuel.tab.refill') }]} />
        <Card className="space-y-3">
          {tab === 'buy' ? (
            <>
              <p className="text-sm font-semibold">{t('fuel.buyIntro')}</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('fuel.liters')}><Input inputMode="decimal" value={liters} onChange={(e) => setLiters(e.target.value)} placeholder="0" /></Field>
                <Field label={t('fuel.totalRp')}><Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} placeholder={l > 0 ? String(Math.round(l * 10000)) : 'Rp'} /></Field>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-ink/70">{t('fuel.receipt')}</p>
                {receipt ? <Photo id={receipt} className="h-28 rounded-xl" /> : <PhotoPicker samples={['RECEIPT']} onPicked={(p) => setReceipt(p.id)} />}
              </div>
              <Field label={t('fuel.source')}><Select value={source} onChange={(e) => setSource(e.target.value as 'kasKecil' | 'pribadi')}><option value="kasKecil">{t('fuel.src.kasKecil')}</option><option value="pribadi">{t('fuel.src.pribadi')}</option></Select></Field>
              <p className="text-[11px] text-ink/45">{t('fuel.financeNote')}</p>
            </>
          ) : (
            <>
              <Field label={t('mow.machine')}><Select value={machineId} onChange={(e) => setMachineId(e.target.value)}>{g.machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></Field>
              <Field label={t('fuel.liters')}><Input inputMode="decimal" value={liters} onChange={(e) => setLiters(e.target.value)} placeholder="0" /></Field>
            </>
          )}
          <Button block size="lg" onClick={save}>{tab === 'buy' ? t('fuel.saveBuy') : t('fuel.saveRefill')}</Button>
        </Card>
        <Card className="p-0">
          <p className="px-4 pb-1 pt-3 font-bold">{t('fuel.week')}</p>
          {week.map((f) => (
            <div key={f.id} className="flex items-center justify-between border-t border-line px-4 py-2.5">
              <div>
                <p className="text-sm font-semibold">{f.kind === 'buy' ? t('fuel.kind.buy') : f.kind === 'refill' ? `${t('fuel.kind.refill')} · ${g.machines.find((m) => m.id === f.machineId)?.name ?? ''}` : t('fuel.kind.check')}</p>
                <p className="text-[11px] text-ink/45">{formatDateTime(f.at, lang)}{f.amount ? ` · ${formatRp(f.amount)}` : ''}</p>
              </div>
              {f.kind === 'check' ? <StatusPill tone="info">{f.liters} L</StatusPill> : <span className={f.kind === 'buy' ? 'font-bold text-[#17703D]' : 'font-bold'}>{f.kind === 'buy' ? '+' : '−'}{f.liters} L</span>}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
