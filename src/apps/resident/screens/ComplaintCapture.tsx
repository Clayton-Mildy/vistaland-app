import { AlertTriangle, CheckCircle2, RotateCcw, ShieldAlert, Sparkles, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BEFORE_SAMPLES } from '../../../data/samples';
import { analyzeComplaintPhoto } from '../../../domain/ai';
import type { AiResult, ComplaintCategory, RoomId } from '../../../domain/types';
import { useT } from '../../../i18n';
import { addFinding } from '../../../store/actions';
import { useResident, useRun } from '../../../store/hooks';
import { AiScanning } from '../../../ui/AiScanning';
import { AppBar } from '../../../ui/AppBar';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { cx } from '../../../ui/cx';
import { Field, Select, Textarea } from '../../../ui/Field';
import { Photo } from '../../../ui/Photo';
import { PhotoPicker, type PickedPhoto } from '../../../ui/PhotoPicker';
import { useToast } from '../../../ui/Toast';

const CATEGORIES: ComplaintCategory[] = ['kebocoran', 'retak', 'cat', 'keramik', 'pintuJendela', 'listrik', 'pipa', 'plafonAtap', 'lainnya'];

export default function ComplaintCapture() {
  const t = useT();
  const nav = useNavigate();
  const run = useRun();
  const toast = useToast();
  const ctx = useResident()!;
  const room = useParams().room as RoomId;
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [desc, setDesc] = useState('');
  const [phase, setPhase] = useState<'pick' | 'scan' | 'result'>('pick');
  const [ai, setAi] = useState<AiResult | null>(null);
  const [category, setCategory] = useState<ComplaintCategory>('lainnya');

  const analyse = () => {
    if (!photo) return;
    setPhase('scan');
    setTimeout(() => {
      const r = analyzeComplaintPhoto({ photoId: photo.id, stats: photo.stats, description: desc, room });
      setAi(r);
      setCategory(r.category);
      setPhase('result');
    }, 1800);
  };
  const add = (manualReview: boolean) => {
    if (!photo || !ai) return;
    const r = run(addFinding, { unitId: ctx.unit.id, room, photoIds: [photo.id], description: desc.trim(), ai: { ...ai, category }, manualReview });
    if (!r.ok) return toast.show(t(r.error), 'error');
    toast.show(manualReview ? t('capture.addedManual') : t('capture.added'));
    nav('/app/complaint', { replace: true });
  };
  const reset = () => {
    setPhoto(null);
    setAi(null);
    setPhase('pick');
  };

  return (
    <div>
      <AppBar title={t('capture.title', { room: t(`room.${room}`) })} subtitle={`${ctx.unit.code} · ${ctx.type.name}`} />
      <div className="space-y-3 p-4">
        {phase === 'pick' && (
          <>
            <Card>
              <p className="mb-3 text-sm font-semibold">{t('capture.step1')}</p>
              {photo ? (
                <div>
                  <Photo id={photo.id} className="h-48 w-full rounded-xl" />
                  <button onClick={() => setPhoto(null)} className="mt-2 flex items-center gap-1 text-xs font-bold text-brand-dark"><RotateCcw className="h-3.5 w-3.5" />{t('capture.retake')}</button>
                </div>
              ) : (
                <PhotoPicker samples={BEFORE_SAMPLES} onPicked={setPhoto} />
              )}
            </Card>
            <Card>
              <Field label={t('capture.desc')} hint={t('capture.descHint')}>
                <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t('capture.descPlaceholder')} />
              </Field>
            </Card>
            <Button block size="lg" disabled={!photo} icon={<Sparkles className="h-4 w-4" />} onClick={analyse}>{t('capture.check')}</Button>
          </>
        )}

        {phase === 'scan' && photo && <AiScanning photoId={photo.id} label={t('capture.scanning')} />}

        {phase === 'result' && photo && ai && (
          <>
            <Card className="overflow-hidden p-0">
              <Photo id={photo.id} className="h-52 w-full">
                {ai.area && ai.verdict === 'valid' && (
                  <>
                    <div className="absolute rounded-lg border-[3px] border-white shadow-[0_0_0_2px_rgb(var(--brand))]" style={{ left: `${ai.area.x * 100}%`, top: `${ai.area.y * 100}%`, width: `${ai.area.w * 100}%`, height: `${ai.area.h * 100}%` }} />
                    <span className="absolute rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ left: `${ai.area.x * 100}%`, top: `calc(${ai.area.y * 100}% - 20px)` }}>{t('capture.detected')}</span>
                  </>
                )}
              </Photo>
              <div className="p-4">
                <div className={cx('flex items-center gap-2 text-base font-bold', ai.verdict === 'valid' ? 'text-[#17703D]' : ai.verdict === 'invalid' ? 'text-[#B4192A]' : 'text-[#9A5B00]')}>
                  {ai.verdict === 'valid' ? <CheckCircle2 className="h-5 w-5" /> : ai.verdict === 'invalid' ? <XCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                  {t(`capture.verdict.${ai.verdict}`)}
                </div>
                <p className="mt-1 text-sm text-ink/65">{t(ai.noteKey)}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-ink/55">
                  <Sparkles className="h-3.5 w-3.5 text-brand" />
                  {t('capture.confidence')}
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-brand" style={{ width: `${ai.confidence}%` }} /></div>
                  <b className="tabular">{ai.confidence}%</b>
                </div>
                {ai.verdict === 'valid' && (
                  <Field className="mt-3" label={t('capture.category')} hint={t('capture.categoryHint')}>
                    <Select value={category} onChange={(e) => setCategory(e.target.value as ComplaintCategory)}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{t(`category.${c}`)}</option>)}
                    </Select>
                  </Field>
                )}
              </div>
            </Card>
            {ai.verdict === 'valid' ? (
              <div className="space-y-2">
                <Button block size="lg" onClick={() => add(false)}>{t('capture.add')}</Button>
                <Button block variant="ghost" onClick={reset}>{t('capture.retake')}</Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Button block size="lg" icon={<RotateCcw className="h-4 w-4" />} onClick={reset}>{t('capture.retake')}</Button>
                <Button block variant="secondary" icon={<ShieldAlert className="h-4 w-4" />} onClick={() => add(true)}>{t('capture.manual')}</Button>
                <p className="px-1 text-xs text-ink/50">{t('capture.manualNote')}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
