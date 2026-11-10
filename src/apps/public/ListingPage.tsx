import { CheckCircle2, MapPin } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PROJECT_SHOWCASE } from '../../data/content';
import type { Lead } from '../../domain/types';
import { useT } from '../../i18n';
import { submitLead } from '../../store/actions';
import { useData, useRun } from '../../store/hooks';
import { HOUSE_PHOTOS } from '../../store/photos';
import { Button } from '../../ui/Button';
import { Checkbox, Field, Input, Select } from '../../ui/Field';
import { DevelopedBy } from '../../ui/Footer';
import { LangToggle } from '../../ui/LangToggle';
import { MONI_ICON } from '../../ui/Moni';
import { Photo } from '../../ui/Photo';
import { SegmentTheme } from '../../ui/SegmentTheme';
import { StatusPill } from '../../ui/StatusPill';
import { useToast } from '../../ui/Toast';
import { priceText } from '../resident/listingMeta';

/** Public page for a resident's "rent / sell my house" listing, with a lead form. */
export default function ListingPage() {
  const t = useT();
  const run = useRun();
  const toast = useToast();
  const { id } = useParams();
  const l = useData((d) => d.listings.find((x) => x.id === id));
  const project = useData((d) => d.projects.find((p) => p.id === l?.projectId));
  const unit = useData((d) => d.units.find((u) => u.id === l?.unitId));
  const [form, setForm] = useState({ name: '', whatsapp: '', domicile: '', plan: 'bulanIni' as Lead['plan'] });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  if (!l || !project) {
    return <div className="flex min-h-screen items-center justify-center p-6 text-center text-sm text-ink/55">{t('public.notFound')}</div>;
  }
  const submit = () => {
    if (!consent) return setError(t('public.consentRequired'));
    const r = run(submitLead, { listingId: l.id, ...form, interest: l.kind === 'rumahDijual' ? 'beli' : 'sewa' });
    if (!r.ok) return setError(t(r.error));
    setSent(true);
    toast.show(t('public.thanksToast'));
  };
  return (
    <SegmentTheme theme={project.segment} className="min-h-screen bg-paper">
      <div className="mx-auto max-w-md pb-8">
        <header className="flex items-center justify-between px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-extrabold"><img src={MONI_ICON} alt="" className="h-7 w-7 rounded-lg" />VHome</span>
          <LangToggle />
        </header>
        <div className="relative">
          {l.photoIds[0] ? <Photo id={l.photoIds[0]} className="h-60 w-full md:rounded-2xl" /> : <div className="h-40 bg-brand-tint" />}
          <StatusPill tone="brand" className="absolute left-3 top-3 !bg-brand !text-white">{t(l.kind === 'rumahDijual' ? 'public.soldBy' : 'public.rentedBy')}</StatusPill>
        </div>
        <div className="space-y-3 px-4 pt-4">
          <div className="rounded-2xl bg-white p-4 shadow-card">
            <h1 className="text-lg font-bold leading-snug">{unit ? `${t('public.house')} ${unit.code} · ${project.name}` : l.title}</h1>
            {l.price !== undefined && <p className="text-xl font-extrabold text-brand">{priceText(l, t)}</p>}
            <p className="mt-1 flex items-center gap-1 text-sm text-ink/55"><MapPin className="h-4 w-4" />{project.location}</p>
            <p className="mt-2 text-sm text-ink/70">{l.title}</p>
            {l.description && <p className="mt-1 text-sm text-ink/65">{l.description}</p>}
          </div>
          <div className="rounded-2xl border-2 border-brand bg-white p-4">
            {sent ? (
              <div className="flex flex-col items-center py-4 text-center">
                <CheckCircle2 className="h-12 w-12 text-[#17703D]" />
                <p className="mt-2 text-lg font-bold">{t('public.thanks')}</p>
                <p className="text-sm text-ink/55">{t('public.thanksBody')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="font-bold">{t('public.interested')}</p>
                  <p className="text-xs text-ink/50">{t('public.interestedBody')}</p>
                </div>
                <Field label={t('wizard.name')}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('public.namePh')} /></Field>
                <Field label={t('public.wa')}><Input inputMode="tel" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="08xx" /></Field>
                <Field label={t('public.domicile')}><Input value={form.domicile} onChange={(e) => setForm({ ...form, domicile: e.target.value })} placeholder={t('public.domicilePh')} /></Field>
                <Field label={t('public.plan')}><Select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value as Lead['plan'] })}>{(['bulanIni', '1-3bulan', '>3bulan'] as const).map((p) => <option key={p} value={p}>{t(`lead.plan.${p}`)}</option>)}</Select></Field>
                <Checkbox checked={consent} onChange={(v) => { setConsent(v); setError(null); }}><span className="text-xs">{t('public.consent')}</span></Checkbox>
                {error && <p className="text-sm font-medium text-[#B4192A]">{error}</p>}
                <Button block size="lg" onClick={submit}>{t('public.submit')}</Button>
              </div>
            )}
          </div>
          <p className="pt-2 text-sm font-bold">{t('public.newHomes')}</p>
          <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4">
            {PROJECT_SHOWCASE.filter((p) => p.name !== project.name).map((p) => (
              <div key={p.name} className="w-40 shrink-0 overflow-hidden rounded-2xl bg-white shadow-card">
                <img src={HOUSE_PHOTOS[p.photo - 1]} alt="" className="h-24 w-full object-cover" />
                <div className="p-2.5"><p className="truncate text-xs font-bold">{p.name}</p><p className="truncate text-[11px] text-ink/50">{p.location}</p></div>
              </div>
            ))}
          </div>
          <DevelopedBy className="pt-4" />
        </div>
      </div>
    </SegmentTheme>
  );
}
