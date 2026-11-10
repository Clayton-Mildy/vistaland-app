import { Lock, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { formatDateTime } from '../../../domain/clock';
import { CHECKLIST_BY_CATEGORY } from '../../../domain/complaints';
import { CONSEQUENCE_TYPES, offeredConsequences } from '../../../domain/consequences';
import { formatRp } from '../../../domain/money';
import type { ComplaintCategory, FeatureKey, ProjectSettings, WifiPackage } from '../../../domain/types';
import { useLang, useT } from '../../../i18n';
import { setUnitTypeRate, updateSettings } from '../../../store/actions';
import type { DeepPartial } from '../../../store/actions/settings';
import { useDashboardProject, useDerived, useRun } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { cx } from '../../../ui/cx';
import { Checkbox, Field, Input } from '../../../ui/Field';
import { Toggle } from '../../../ui/Toggle';
import { useToast } from '../../../ui/Toast';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { ADMIN_BY } from '../util';

type SectionKey = 'ipl' | 'wifi' | 'cards' | 'complaints' | 'handover' | 'renovation' | 'overdue' | 'features';
const FEATURES: FeatureKey[] = ['renterRegistration', 'houseListings', 'panic', 'cctv', 'legal', 'projects', 'vouchers', 'marketplace', 'businesses', 'wifi', 'feedback', 'handbook', 'prepay'];
const OWNER_ONLY: FeatureKey[] = ['renterRegistration', 'houseListings'];
const CATEGORIES = Object.keys(CHECKLIST_BY_CATEGORY) as ComplaintCategory[];
const num = (v: string) => (v.trim() === '' ? 0 : Number(v.replace(/\./g, '').replace(',', '.')) || 0);

export default function Settings() {
  const t = useT();
  const project = useDashboardProject();
  const s = project.settings;
  const subsidi = project.segment === 'subsidi';
  return (
    <div>
      <PageHeader title={t('dash.set.title')} subtitle={t('dash.set.sub', { project: project.name })} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Section k="ipl" value={s.ipl} render={(v, set) => (
          <>
            <ToggleRow checked={v.freeEnabled} onChange={(x) => set({ ...v, freeEnabled: x })} label={t('dash.set.ipl.free')} />
            <div className="grid grid-cols-2 gap-2">
              <NumField label={t('dash.set.ipl.freeMonths')} value={v.freeMonths} disabled={!v.freeEnabled} min={0} max={24} onChange={(n) => set({ ...v, freeMonths: n })} />
              <NumField label={t('dash.set.ipl.dueDay')} value={v.dueDay} min={1} max={28} onChange={(n) => set({ ...v, dueDay: n })} />
            </div>
            <p className="text-[11px] text-ink/45">{t('dash.set.ipl.note')}</p>
          </>
        )} extra={<RateTable />} />

        <Section k="wifi" value={s.wifi} render={(v, set) => (
          <>
            <ToggleRow checked={v.promoEnabled} onChange={(x) => set({ ...v, promoEnabled: x })} label={t('dash.set.wifi.promo')} />
            <NumField label={t('dash.set.wifi.freeMonths')} value={v.freeMonths} disabled={!v.promoEnabled} min={0} max={12} onChange={(n) => set({ ...v, freeMonths: n })} />
            <p className="text-xs font-bold">{t('dash.set.wifi.packages')}</p>
            {v.packages.map((p, i) => (
              <div key={p.id} className="grid grid-cols-[1fr_80px_120px] gap-2">
                <Input value={p.name} aria-label={t('dash.set.wifi.name')} onChange={(e) => set({ ...v, packages: v.packages.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                <Input inputMode="numeric" value={String(p.mbps)} aria-label="Mbps" onChange={(e) => set({ ...v, packages: v.packages.map((x, j) => (j === i ? { ...x, mbps: num(e.target.value) } : x)) })} />
                <Input inputMode="numeric" value={String(p.price)} aria-label={t('dash.set.wifi.price')} onChange={(e) => set({ ...v, packages: v.packages.map((x, j) => (j === i ? ({ ...x, price: num(e.target.value) } as WifiPackage) : x)) })} />
              </div>
            ))}
            <p className="text-[11px] text-ink/45">{t('dash.set.wifi.note')}</p>
          </>
        )} />

        <Panel title={t('dash.set.s.prepay')} right={<Live />}>
          <p className="text-sm text-ink/70">{t('dash.set.prepay.body', { n: s.prepay.ipl.filter((p) => p.active).length + s.prepay.wifi.filter((p) => p.active).length })}</p>
          <Link to="/dashboard/prepay" className="mt-2 inline-block text-sm font-bold text-brand hover:underline">{t('dash.set.prepay.link')} →</Link>
          <LastChange k="prepay" />
        </Panel>

        <Section k="cards" value={s.cards} render={(v, set) => (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <NumField label={t('dash.set.cards.freeCards')} value={v.freeCards} min={0} max={10} onChange={(n) => set({ ...v, freeCards: n })} />
            <NumField label={t('dash.set.cards.freeStickers')} value={v.freeStickers} min={0} max={10} onChange={(n) => set({ ...v, freeStickers: n })} />
            <NumField label={t('dash.set.cards.maxExtra')} value={v.maxExtraCards} min={0} max={10} onChange={(n) => set({ ...v, maxExtraCards: n })} />
            <NumField label={t('dash.set.cards.cardPrice')} value={v.extraCardPrice} min={0} money onChange={(n) => set({ ...v, extraCardPrice: n })} />
            <NumField label={t('dash.set.cards.stickerPrice')} value={v.extraStickerPrice} min={0} money onChange={(n) => set({ ...v, extraStickerPrice: n })} />
          </div>
        )} />

        <Section k="complaints" value={s.complaints} render={(v, set) => (
          <>
            <NumField label={t('dash.set.cmp.window')} value={v.windowDays} min={1} max={730} onChange={(n) => set({ ...v, windowDays: n })} />
            <p className="text-xs font-bold">{t('dash.set.cmp.sla')}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CATEGORIES.map((c) => <NumField key={c} label={t(`category.${c}`)} value={v.slaDays[c]} min={1} max={90} onChange={(n) => set({ ...v, slaDays: { ...v.slaDays, [c]: n } })} />)}
            </div>
          </>
        )} />

        <Section k="handover" value={s.handover} render={(v, set) => (
          <>
            <div className="grid grid-cols-2 gap-2">
              <NumField label={t('dash.ho.interval')} value={v.intervalDays} min={1} max={30} onChange={(n) => set({ ...v, intervalDays: n })} />
              <NumField label={t('dash.ho.maxCalls')} value={v.maxCalls} min={1} max={3} onChange={(n) => set({ ...v, maxCalls: n })} />
            </div>
            <ToggleRow checked={v.autoBast} onChange={(x) => set({ ...v, autoBast: x })} label={t('dash.set.ho.auto')} />
          </>
        )} />

        <Section k="renovation" value={s.renovation} render={(v, set) => <RenovationFields v={v} set={set} />} />

        <Section k="overdue" value={{ ...s.overdue, offered: offeredConsequences(s) }} render={(v, set) => (
          <>
            <NumField label={t('dash.set.od.flag')} value={v.flagMonths} min={1} max={12} onChange={(n) => set({ ...v, flagMonths: n })} />
            <p className="text-xs font-bold">{t('dash.set.od.offered')}</p>
            {CONSEQUENCE_TYPES.map((c) => (
              <Checkbox key={c} checked={v.offered.includes(c)} onChange={(x) => set({ ...v, offered: x ? CONSEQUENCE_TYPES.filter((y) => y === c || v.offered.includes(y)) : v.offered.filter((y) => y !== c) })}>{t(`dash.cns.do.${c}`)}</Checkbox>
            ))}
            <p className="text-[11px] text-ink/45">{t('dash.set.od.note')}</p>
          </>
        )} />

        <Section k="features" value={s.features} className="xl:col-span-2" render={(v, set) => (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const locked = subsidi && OWNER_ONLY.includes(f);
              return (
                <div key={f} title={locked ? t('dash.set.f.locked') : undefined} className={cx('flex items-center justify-between gap-2 rounded-xl border px-3 py-2', locked ? 'border-dashed border-line bg-[#FAFAF9]' : 'border-line')}>
                  <span className="min-w-0 text-sm">
                    <span className="flex items-center gap-1.5 font-semibold">{locked && <Lock className="h-3.5 w-3.5 text-ink/40" />}{t(`feature.${f}`)}</span>
                    <span className="block text-[11px] text-ink/45">{locked ? t('dash.set.f.locked') : t(`dash.set.f.${f}`)}</span>
                  </span>
                  <Toggle checked={locked ? false : v[f]} disabled={locked} onChange={(x) => set({ ...v, [f]: x })} label={t(`feature.${f}`)} />
                </div>
              );
            })}
          </div>
        )} />
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[#F7F6F3] px-3 py-2.5">
      <span className="text-sm font-semibold">{label}</span>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

function Live() {
  const t = useT();
  return <span className="rounded-full bg-[#E8F6EC] px-2 py-0.5 text-[11px] font-semibold text-[#17703D]">{t('dash.set.live')}</span>;
}

function LastChange({ k }: { k: string }) {
  const t = useT();
  const [lang] = useLang();
  const project = useDashboardProject();
  const last = useDerived((d) => d.activity.filter((a) => a.projectId === project.id && (a.text.key === `activity.settingsChanged.${k}` || (k === 'ipl' && a.text.key === 'activity.rateChanged'))).at(-1), [project.id, k]);
  return <p className="mt-3 border-t border-line/70 pt-2 text-[11px] text-ink/45">{last ? t('dash.set.last', { at: formatDateTime(last.at, lang), by: last.by }) : t('dash.set.never')}</p>;
}

/** One settings group with its own draft: edits stay local until "Simpan", then go live in the resident app. */
function Section<T>({ k, value, render, extra, className }: { k: SectionKey; value: T; render: (v: T, set: (v: T) => void) => ReactNode; extra?: ReactNode; className?: string }) {
  const t = useT();
  const run = useRun();
  const toast = useToast();
  const project = useDashboardProject();
  const [draft, setDraft] = useState<T>(value);
  const saved = JSON.stringify(value);
  useEffect(() => setDraft(JSON.parse(saved) as T), [saved, project.id]);
  const dirty = JSON.stringify(draft) !== saved;
  const save = () => {
    const r = run(updateSettings, { projectId: project.id, patch: { [k]: draft } as DeepPartial<ProjectSettings>, by: ADMIN_BY });
    toast.show(r.ok ? t('dash.set.saved', { section: t(`dash.set.s.${k}`) }) : t(r.error), r.ok ? 'success' : 'error');
  };
  return (
    <Panel className={className} title={t(`dash.set.s.${k}`)} right={<Live />}>
      <div className="space-y-3">{render(draft, setDraft)}</div>
      <div className="mt-3 flex justify-end gap-2">
        {dirty && <Button variant="ghost" size="sm" onClick={() => setDraft(JSON.parse(saved) as T)}>{t('common.cancel')}</Button>}
        <Button size="sm" disabled={!dirty} onClick={save}>{t('common.save')}</Button>
      </div>
      {extra}
      <LastChange k={k} />
    </Panel>
  );
}

function NumField({ label, value, onChange, min, max, disabled, money }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number; disabled?: boolean; money?: boolean }) {
  const t = useT();
  const bad = (min !== undefined && value < min) || (max !== undefined && value > max);
  return (
    <Field label={label} error={bad ? t('dash.set.range', { min: min ?? 0, max: max ?? '∞' }) : null} hint={money ? formatRp(value) : undefined}>
      <Input inputMode="numeric" disabled={disabled} invalid={bad} value={String(value)} onChange={(e) => onChange(num(e.target.value))} />
    </Field>
  );
}

function RenovationFields({ v, set }: { v: ProjectSettings['renovation']; set: (v: ProjectSettings['renovation']) => void }) {
  const t = useT();
  const [item, setItem] = useState('');
  return (
    <>
      <NumField label={t('dash.set.reno.deposit')} value={v.deposit} min={0} money onChange={(n) => set({ ...v, deposit: n })} />
      <p className="text-xs font-bold">{t('dash.set.reno.checklist')}</p>
      <ul className="space-y-1.5">
        {v.checklist.map((c, i) => (
          <li key={`${c}-${i}`} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-1.5 text-sm">
            {t(c)}
            <button type="button" aria-label={t('common.delete')} onClick={() => set({ ...v, checklist: v.checklist.filter((_, j) => j !== i) })} className="rounded p-1 text-ink/40 hover:bg-[#FFF0F1] hover:text-[#B4192A]"><Trash2 className="h-3.5 w-3.5" /></button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input value={item} onChange={(e) => setItem(e.target.value)} placeholder={t('dash.set.reno.addPh')} className="flex-1" />
        <Button size="sm" variant="secondary" disabled={!item.trim()} icon={<Plus className="h-3.5 w-3.5" />} onClick={() => { set({ ...v, checklist: [...v.checklist, item.trim()] }); setItem(''); }}>{t('common.add')}</Button>
      </div>
    </>
  );
}

function RateTable() {
  const t = useT();
  const run = useRun();
  const toast = useToast();
  const project = useDashboardProject();
  const types = useDerived((d) => d.unitTypes.filter((ty) => ty.projectId === project.id).map((ty) => ({ ty, units: d.units.filter((u) => u.typeId === ty.id && u.handover.bastDate).length })), [project.id]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  useEffect(() => setDraft({}), [project.id]);
  const save = (id: string, name: string) => {
    const rate = num(draft[id] ?? '');
    const r = run(setUnitTypeRate, { typeId: id, rate, by: ADMIN_BY });
    if (!r.ok) return toast.show(t(r.error), 'error');
    toast.show(t('dash.set.rateSaved', { type: name, rate: formatRp(rate) }), 'success');
    setDraft((x) => { const n = { ...x }; delete n[id]; return n; });
  };
  return (
    <div className="mt-4 border-t border-line/70 pt-3">
      <p className="text-xs font-bold">{t('dash.set.ipl.rates')}</p>
      <p className="text-[11px] text-ink/45">{t('dash.set.ipl.ratesNote')}</p>
      <table className="mt-2 w-full text-sm">
        <thead><tr className="text-left text-[11px] uppercase tracking-wide text-ink/45"><th className="py-1">{t('dash.set.ipl.type')}</th><th>{t('dash.set.ipl.units')}</th><th>{t('dash.set.ipl.rate')}</th><th /></tr></thead>
        <tbody>
          {types.map(({ ty, units }) => {
            const val = draft[ty.id] ?? String(ty.iplRate);
            const changed = draft[ty.id] !== undefined && num(draft[ty.id]) !== ty.iplRate;
            return (
              <tr key={ty.id} className="border-t border-line/70">
                <td className="py-1.5"><b>{ty.name}</b><span className="block text-[11px] text-ink/45">{ty.landSize}/{ty.buildingSize} m²</span></td>
                <td className="tabular text-xs">{units}</td>
                <td><Input inputMode="numeric" value={val} aria-label={t('dash.set.ipl.rate')} onChange={(e) => setDraft({ ...draft, [ty.id]: e.target.value })} className="!w-32 !py-1.5" /></td>
                <td className="text-right"><Button size="sm" disabled={!changed || !(num(val) > 0)} onClick={() => save(ty.id, ty.name)}>{t('common.save')}</Button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
