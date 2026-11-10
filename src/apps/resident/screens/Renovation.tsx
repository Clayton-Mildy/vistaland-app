import { ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../../domain/clock';
import { useLang, useT } from '../../../i18n';
import { ownerDecideRenovation, requestRenovation } from '../../../store/actions';
import { useData, useResident, useRun } from '../../../store/hooks';
import { AppBar } from '../../../ui/AppBar';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { EmptyState } from '../../../ui/EmptyState';
import { Field, Input, Textarea } from '../../../ui/Field';
import { Photo } from '../../../ui/Photo';
import { PhotoPicker } from '../../../ui/PhotoPicker';
import { Sheet } from '../../../ui/Sheet';
import { StatusPill } from '../../../ui/StatusPill';
import { useToast } from '../../../ui/Toast';

export default function Renovation() {
  const t = useT();
  const [lang] = useLang();
  const nav = useNavigate();
  const run = useRun();
  const toast = useToast();
  const ctx = useResident()!;
  const all = useData((d) => d.renovations);
  const isRenter = ctx.role === 'renter';
  const mine = all.filter((r) => r.unitId === ctx.unit.id && (!isRenter || r.renterId === ctx.renter!.id)).reverse();
  const pendingApproval = !isRenter ? all.filter((r) => ctx.unitIds.includes(r.unitId) && r.step === 'ownerApproval') : [];
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [drawing, setDrawing] = useState<string | undefined>();

  const submit = () => {
    if (!title.trim()) return toast.show(t('common.required'), 'error');
    run(requestRenovation, { unitId: ctx.unit.id, title: title.trim(), description: desc.trim(), drawingPhotoId: drawing, renterId: isRenter ? ctx.renter!.id : undefined });
    setOpen(false);
    setTitle('');
    setDesc('');
    setDrawing(undefined);
    toast.show(isRenter ? t('reno.sentOwner') : t('reno.sentEstate'));
  };

  return (
    <div>
      <AppBar title={t('feature.renovation')} right={<Button size="sm" variant="ghost" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>{t('reno.new')}</Button>} />
      <div className="space-y-3 p-4">
        {pendingApproval.length > 0 && (
          <Card className="border-[#F3D9A4] bg-[#FFF8E8]">
            <p className="font-bold text-[#8A5A00]">{t('reno.ownerQueue')}</p>
            {pendingApproval.map((r) => (
              <div key={r.id} className="mt-3 rounded-xl bg-white p-3">
                <p className="text-sm font-semibold">{r.id} · {r.title}</p>
                <p className="text-xs text-ink/55">{r.description}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button size="sm" variant="secondary" onClick={() => { run(ownerDecideRenovation, { id: r.id, approve: false }); toast.show(t('reno.declined')); }}>{t('reno.decline')}</Button>
                  <Button size="sm" onClick={() => { run(ownerDecideRenovation, { id: r.id, approve: true }); toast.show(t('reno.approvedOwner')); }}>{t('reno.approve')}</Button>
                </div>
              </div>
            ))}
          </Card>
        )}
        {mine.length === 0 ? (
          <EmptyState title={t('reno.emptyTitle')} body={t('reno.emptyBody', { amount: '' })} action={<Button onClick={() => setOpen(true)}>{t('reno.new')}</Button>} />
        ) : (
          mine.map((r) => (
            <Card key={r.id} interactive onClick={() => nav(`/app/renovation/${r.id}`)}>
              <div className="flex items-center justify-between">
                <span className="font-bold">{r.id} · {r.title}</span>
                <StatusPill tone={r.step === 'awaitingDeposit' ? 'warning' : r.step === 'rejected' ? 'danger' : r.step === 'depositReturned' ? 'success' : 'info'}>{t(`reno.short.${r.step}`)}</StatusPill>
              </div>
              <p className="mt-1 text-xs text-ink/50">{t('reno.requestedOn', { date: formatDate(r.history[0]?.at.slice(0, 10) ?? '', lang) })}{r.requestedBy === 'renter' ? ` · ${t('role.renter')}` : ''}</p>
              <div className="mt-2 flex items-center justify-between text-sm font-semibold text-brand-dark">{t(`reno.step.${r.step}`)}<ChevronRight className="h-4 w-4" /></div>
            </Card>
          ))
        )}
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title={t('reno.new')} footer={<Button block onClick={submit}>{t('reno.submit')}</Button>}>
        <div className="space-y-3">
          {isRenter && <p className="rounded-xl bg-[#FFF8E8] p-3 text-xs text-[#8A5A00]">{t('renter.renovationNote')}</p>}
          <Field label={t('reno.fieldTitle')}><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('reno.titlePlaceholder')} /></Field>
          <Field label={t('reno.fieldDesc')}><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t('reno.descPlaceholder')} /></Field>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-ink/70">{t('reno.drawing')} <span className="font-normal text-ink/40">({t('common.optional')})</span></p>
            {drawing ? <Photo id={drawing} className="h-32 rounded-xl" /> : <PhotoPicker onPicked={(p) => setDrawing(p.id)} />}
          </div>
          <p className="text-xs text-ink/50">{t('reno.depositNote', { amount: new Intl.NumberFormat('id-ID').format(ctx.settings.renovation.deposit) })}</p>
        </div>
      </Sheet>
    </div>
  );
}
