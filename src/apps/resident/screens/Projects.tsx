import { MapPin } from 'lucide-react';
import { useState } from 'react';
import { PROJECT_SHOWCASE, type ShowcaseProject } from '../../../data/content';
import type { Lead } from '../../../domain/types';
import { useT } from '../../../i18n';
import { submitLead } from '../../../store/actions';
import { useResident, useRun } from '../../../store/hooks';
import { HOUSE_PHOTOS } from '../../../store/photos';
import { AppBar } from '../../../ui/AppBar';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Chip } from '../../../ui/Chip';
import { Field, Input, Select } from '../../../ui/Field';
import { Moni } from '../../../ui/Moni';
import { Sheet } from '../../../ui/Sheet';
import { StatusPill } from '../../../ui/StatusPill';
import { useToast } from '../../../ui/Toast';
import { useLocalized } from '../hooks';

export default function Projects() {
  const t = useT();
  const L = useLocalized();
  const run = useRun();
  const toast = useToast();
  const ctx = useResident()!;
  const [area, setArea] = useState<'all' | ShowcaseProject['area']>('all');
  const [ask, setAsk] = useState<ShowcaseProject | null>(null);
  const [name, setName] = useState(ctx.name);
  const [wa, setWa] = useState(ctx.phone);
  const [plan, setPlan] = useState<Lead['plan']>('1-3bulan');
  const list = PROJECT_SHOWCASE.filter((p) => area === 'all' || p.area === area);
  const send = () => {
    const r = run(submitLead, { projectName: ask!.name, projectId: ctx.project.id, name, whatsapp: wa, domicile: ctx.project.location, plan, interest: 'beli' });
    if (!r.ok) return toast.show(t(r.error), 'error');
    setAsk(null);
    toast.show(t('projects.sent'));
  };
  return (
    <div>
      <AppBar title={t('feature.projects')} />
      <div className="space-y-3 p-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#F97316] to-[#C2410C] p-4 text-white">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">Harmoni Fest 2026</p>
          <p className="mt-1 max-w-[200px] text-xl font-extrabold leading-tight">{t('home.promo.fest')}</p>
          <p className="mt-1 text-[11px] text-white/80">{t('projects.promoTerms')}</p>
          <Moni pose="point" size={80} className="absolute -bottom-2 right-2" />
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {(['all', 'Bekasi', 'Bogor', 'Serang'] as const).map((a) => <Chip key={a} active={area === a} onClick={() => setArea(a)}>{a === 'all' ? t('common.all') : a}</Chip>)}
        </div>
        {list.map((p) => (
          <Card key={p.name} className="overflow-hidden p-0">
            <div className="relative">
              <img src={HOUSE_PHOTOS[p.photo - 1]} alt="" className="h-40 w-full object-cover" />
              {p.name === ctx.project.name ? <StatusPill tone="brand" className="absolute left-3 top-3 !bg-white">{t('projects.yours')}</StatusPill> : p.promo && <StatusPill tone="warning" className="absolute left-3 top-3 !bg-[#F97316] !text-white">Harmoni Fest</StatusPill>}
            </div>
            <div className="p-4">
              <p className="font-bold">{p.name}</p>
              <p className="flex items-center gap-1 text-xs text-ink/55"><MapPin className="h-3.5 w-3.5 text-brand" />{p.location}</p>
              <p className="mt-1 text-xs text-ink/50">{L(p.blurb)}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a href={`https://www.google.com/maps/search/${encodeURIComponent(p.mapsQuery)}`} target="_blank" rel="noreferrer" className="flex h-10 items-center justify-center rounded-xl border border-brand/40 text-sm font-semibold text-brand-dark">{t('projects.location')}</a>
                <Button onClick={() => setAsk(p)}>{t('projects.ask')}</Button>
              </div>
            </div>
          </Card>
        ))}
        <Card className="flex items-center gap-3">
          <Moni pose="thumbs" size={48} />
          <p className="text-sm"><b>{t('projects.referTitle')}</b><br /><span className="text-ink/55">{t('projects.referBody')}</span></p>
        </Card>
      </div>
      <Sheet open={!!ask} onClose={() => setAsk(null)} title={t('projects.askTitle', { name: ask?.name ?? '' })} footer={<Button block onClick={send}>{t('projects.send')}</Button>}>
        <div className="space-y-3">
          <Field label={t('wizard.name')}><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="WhatsApp"><Input value={wa} onChange={(e) => setWa(e.target.value)} /></Field>
          <Field label={t('projects.plan')}><Select value={plan} onChange={(e) => setPlan(e.target.value as Lead['plan'])}>{(['bulanIni', '1-3bulan', '>3bulan'] as const).map((p) => <option key={p} value={p}>{t(`lead.plan.${p}`)}</option>)}</Select></Field>
          <p className="text-xs text-ink/50">{t('projects.consent')}</p>
        </div>
      </Sheet>
    </div>
  );
}
