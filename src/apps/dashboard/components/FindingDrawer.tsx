import { ArrowRight, Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CHECKLIST_BY_CATEGORY } from '../../../domain/complaints';
import { formatDateTime } from '../../../domain/clock';
import type { ComplaintCategory, RoomId } from '../../../domain/types';
import { useLang, useT } from '../../../i18n';
import { estateFinalOk, estateRejectFinding, estateVerifyFinding } from '../../../store/actions';
import { useRun } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { Field, Select, Textarea } from '../../../ui/Field';
import { Photo } from '../../../ui/Photo';
import { Sheet } from '../../../ui/Sheet';
import { StatusPill } from '../../../ui/StatusPill';
import { Timeline } from '../../../ui/Timeline';
import { useToast } from '../../../ui/Toast';
import type { BoardItem } from './FindingCard';

const CATEGORIES = Object.keys(CHECKLIST_BY_CATEGORY) as ComplaintCategory[];
const ROOMS: RoomId[] = ['teras', 'carport', 'ruangTamu', 'ruangKeluarga', 'dapur', 'kamarUtama', 'kamar2', 'kamar3', 'kamarMandi', 'kamarMandi2', 'taman'];

/** Full history and photos of one finding, plus the estate's verify / reject / final-OK actions. */
export function FindingDrawer({ item, mandorName, onClose }: { item: BoardItem | null; mandorName?: string; onClose: () => void }) {
  const t = useT();
  const [lang] = useLang();
  const run = useRun();
  const toast = useToast();
  const [category, setCategory] = useState<ComplaintCategory>('lainnya');
  const [room, setRoom] = useState<RoomId>('dapur');
  const [note, setNote] = useState('');
  const [rejecting, setRejecting] = useState(false);
  useEffect(() => {
    if (!item) return;
    setCategory(item.f.category);
    setRoom(item.f.room);
    setNote(item.f.estateNote ?? '');
    setRejecting(false);
  }, [item?.f.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!item) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;
  const { c, f } = item;
  const ref = { complaintId: c.id, findingId: f.id };
  const done = (key: string, ok: boolean, error?: string) => {
    if (!ok) return toast.show(t(error ?? 'error.generic'), 'error');
    toast.show(t(key));
    onClose();
  };
  const verify = () => {
    const r = run(estateVerifyFinding, { ...ref, category: category !== f.category ? category : undefined, room: room !== f.room ? room : undefined, note: note.trim() || undefined });
    done('dash.cmp.verified', r.ok, r.ok ? undefined : r.error);
  };
  const reject = () => {
    if (!note.trim()) return toast.show(t('dash.cmp.rejectNeedsNote'), 'error');
    const r = run(estateRejectFinding, { ...ref, note: note.trim() });
    done('dash.cmp.rejected', r.ok, r.ok ? undefined : r.error);
  };
  const finalOk = () => {
    const r = run(estateFinalOk, ref);
    done('dash.cmp.finalDone', r.ok, r.ok ? undefined : r.error);
  };
  const lastFix = f.fixChecks.at(-1);

  return (
    <Sheet open onClose={onClose} title={`${item.unitCode} · ${t(`room.${f.room}`)}`} className="md:max-w-xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink/55">
          <StatusPill tone="brand">{t(`stage.${f.stage}`)}</StatusPill>
          <span>{c.id}</span>
          {mandorName && <span>· {t('dash.cmp.mandorLine', { name: mandorName })}</span>}
          {f.groupId && <span>· {f.groupId}</span>}
        </div>

        {f.stage === 'workDone' && lastFix ? (
          <div>
            <p className="mb-1.5 text-sm font-bold">{t('dash.cmp.beforeAfter')}</p>
            <div className="grid grid-cols-2 gap-2">
              <figure><Photo id={f.photoIds[0]} className="aspect-square rounded-xl" /><figcaption className="mt-1 text-center text-[11px] text-ink/50">{t('dash.cmp.before')}</figcaption></figure>
              <figure><Photo id={lastFix.photoId} className="aspect-square rounded-xl" /><figcaption className="mt-1 text-center text-[11px] text-ink/50">{t('dash.cmp.after')}</figcaption></figure>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {f.photoIds.map((id) => <Photo key={id} id={id} className="aspect-square rounded-xl" />)}
          </div>
        )}

        <div className="rounded-xl bg-[#F5F3FF] p-3 text-sm">
          <p className="font-semibold text-[#4C1D95]">{t('dash.cmp.aiTitle', { verdict: t(`dash.cmp.ai.${f.ai.verdict}`), n: f.ai.confidence })}</p>
          <p className="text-xs text-[#4C1D95]/80">{t(f.ai.noteKey)} · {t('dash.cmp.aiCategory', { category: t(`category.${f.ai.category}`) })}</p>
          {f.manualReview && <p className="mt-1 text-xs font-semibold text-[#9A5B00]">{t('dash.cmp.manualNote')}</p>}
        </div>
        <p className="text-sm"><span className="text-ink/50">{t('dash.cmp.residentNote')}:</span> {f.description || '—'}</p>
        {f.estateNote && <p className="text-sm"><span className="text-ink/50">{t('dash.cmp.estateNote')}:</span> {f.estateNote}</p>}

        {f.fixChecks.length > 0 && (
          <div>
            <p className="mb-1.5 text-sm font-bold">{t('dash.cmp.fixChecks')}</p>
            <ul className="space-y-1.5">
              {f.fixChecks.map((x, i) => (
                <li key={i} className="flex items-center gap-2.5 rounded-xl border border-line p-2">
                  <Photo id={x.photoId} className="h-11 w-11 shrink-0 rounded-lg" />
                  <span className="min-w-0 flex-1 text-xs">
                    <span className={x.verdict === 'fixed' ? 'font-bold text-[#17703D]' : 'font-bold text-[#B4192A]'}>{t(`tracker.fix.${x.verdict}`, { n: x.confidence })}</span>
                    <span className="block text-ink/50">{t(x.noteKey)} · {formatDateTime(x.at, lang)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {f.checklist.length > 0 && (
          <div>
            <p className="mb-1.5 text-sm font-bold">{t('dash.cmp.checklist')}</p>
            <ul className="space-y-1 text-xs">
              {f.checklist.map((x, i) => <li key={i} className="flex items-center gap-1.5">{x.done ? <Check className="h-3.5 w-3.5 text-[#17703D]" /> : <span className="h-3.5 w-3.5 rounded-full border border-line" />}{t(x.label)}</li>)}
            </ul>
          </div>
        )}

        <div>
          <p className="mb-1.5 text-sm font-bold">{t('dash.cmp.history')}</p>
          <Timeline items={f.history.map((h, i) => ({ key: `${h.stage}-${i}`, label: t(`stage.${h.stage}`), meta: `${formatDateTime(h.at, lang)} · ${t(`dash.cmp.by.${h.by}`)}`, state: h.stage === 'rejected' ? 'failed' : 'done' }))} />
        </div>

        {f.stage === 'submitted' && (
          <div className="space-y-2 rounded-2xl border border-line p-3">
            <p className="text-sm font-bold">{t('dash.cmp.review')}</p>
            <div className="grid grid-cols-2 gap-2">
              <Field label={t('dash.cmp.category')}>
                <Select value={category} onChange={(e) => setCategory(e.target.value as ComplaintCategory)}>
                  {CATEGORIES.map((k) => <option key={k} value={k}>{t(`category.${k}`)}</option>)}
                </Select>
              </Field>
              <Field label={t('dash.cmp.room')}>
                <Select value={room} onChange={(e) => setRoom(e.target.value as RoomId)}>
                  {ROOMS.map((k) => <option key={k} value={k}>{t(`room.${k}`)}</option>)}
                </Select>
              </Field>
            </div>
            <Field label={rejecting ? t('dash.cmp.rejectReason') : t('dash.cmp.note')} optional={rejecting ? undefined : t('common.optional')}>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={rejecting ? t('dash.cmp.rejectPh') : t('dash.cmp.notePh')} />
            </Field>
            {rejecting ? (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setRejecting(false)}>{t('common.cancel')}</Button>
                <Button variant="danger" className="flex-1" icon={<X className="h-4 w-4" />} onClick={reject}>{t('dash.cmp.rejectConfirm')}</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="secondary" icon={<X className="h-4 w-4" />} onClick={() => setRejecting(true)}>{t('dash.cmp.reject')}</Button>
                <Button className="flex-1" icon={<ArrowRight className="h-4 w-4" />} onClick={verify}>{t('dash.cmp.validToContractor')}</Button>
              </div>
            )}
          </div>
        )}
        {f.stage === 'workDone' && (
          <Button block size="lg" icon={<Check className="h-4 w-4" />} onClick={finalOk}>{t('dash.cmp.finalOk')}</Button>
        )}
      </div>
    </Sheet>
  );
}
