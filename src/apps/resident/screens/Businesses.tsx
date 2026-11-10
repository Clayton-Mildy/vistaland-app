import { MessageCircle, Search } from 'lucide-react';
import { useState } from 'react';
import type { Business } from '../../../domain/types';
import { useT } from '../../../i18n';
import { registerBusiness } from '../../../store/actions';
import { useData, useResident, useRun } from '../../../store/hooks';
import { AppBar } from '../../../ui/AppBar';
import { Avatar } from '../../../ui/Avatar';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Chip } from '../../../ui/Chip';
import { Field, Input, Select, Textarea } from '../../../ui/Field';
import { Sheet } from '../../../ui/Sheet';
import { StatusPill } from '../../../ui/StatusPill';
import { useToast } from '../../../ui/Toast';

const CATS: Business['category'][] = ['kuliner', 'jasa', 'toko', 'kesehatan', 'pendidikan'];

export default function Businesses() {
  const t = useT();
  const run = useRun();
  const toast = useToast();
  const ctx = useResident()!;
  const all = useData((d) => d.businesses).filter((b) => b.projectId === ctx.project.id && (b.status === 'verified' || b.ownerUnitId === ctx.unit.id));
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<'all' | Business['category']>('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'kuliner' as Business['category'], location: `Rumah · ${ctx.unit.code}`, description: '', whatsapp: ctx.phone });
  const list = all.filter((b) => (cat === 'all' || b.category === cat) && `${b.name} ${b.description}`.toLowerCase().includes(q.toLowerCase()));
  const submit = () => {
    if (!form.name.trim() || !form.description.trim()) return toast.show(t('common.required'), 'error');
    run(registerBusiness, { projectId: ctx.project.id, ownerUnitId: ctx.unit.id, ...form, whatsapp: form.whatsapp.replace(/\D/g, '').replace(/^0/, '62') });
    setOpen(false);
    toast.show(t('biz.registered'));
  };
  return (
    <div>
      <AppBar title={t('biz.title', { project: ctx.project.name.split(' ')[0] })} right={<span className="pr-2 text-xs text-ink/45">{t('biz.count', { n: all.filter((b) => b.status === 'verified').length })}</span>} />
      <div className="space-y-3 p-4">
        <div className="flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-3">
          <Search className="h-4 w-4 text-ink/40" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('biz.search')} className="flex-1 bg-transparent text-sm outline-none" />
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <Chip active={cat === 'all'} onClick={() => setCat('all')}>{t('common.all')}</Chip>
          {CATS.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{t(`biz.cat.${c}`)}</Chip>)}
        </div>
        {list.map((b) => (
          <Card key={b.id} className="flex gap-3">
            <Avatar name={b.name} size={52} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold">{b.name}</p>
                {b.status === 'pending' ? <StatusPill tone="warning">{t('biz.pending')}</StatusPill> : <StatusPill tone={b.open ? 'success' : 'neutral'}>{t(b.open ? 'biz.open' : 'biz.closed')}</StatusPill>}
              </div>
              <p className="text-xs text-ink/50">{t(`biz.cat.${b.category}`)} · {b.location}</p>
              <p className="mt-0.5 text-sm text-ink/70">{b.description}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <a href={`https://wa.me/${b.whatsapp}?text=${encodeURIComponent(t('biz.waText', { name: b.name }))}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-[#1FA855] px-3 py-1.5 text-xs font-bold text-white"><MessageCircle className="h-3.5 w-3.5" />WhatsApp</a>
                {b.hasVoucher && <StatusPill tone="gold">{t('biz.voucher')}</StatusPill>}
              </div>
            </div>
          </Card>
        ))}
        <div className="rounded-2xl border-2 border-dashed border-brand/40 bg-brand-tint/40 p-4">
          <p className="font-bold">{t('biz.ownTitle')}</p>
          <p className="text-sm text-ink/60">{t('biz.ownBody')}</p>
          <Button className="mt-3" onClick={() => setOpen(true)}>{t('biz.ownCta')}</Button>
        </div>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title={t('biz.ownCta')} footer={<Button block onClick={submit}>{t('common.submit')}</Button>}>
        <div className="space-y-3">
          <Field label={t('biz.name')}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label={t('biz.category')}><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Business['category'] })}>{CATS.map((c) => <option key={c} value={c}>{t(`biz.cat.${c}`)}</option>)}</Select></Field>
          <Field label={t('biz.location')}><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
          <Field label={t('biz.desc')}><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="WhatsApp"><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></Field>
        </div>
      </Sheet>
    </div>
  );
}
