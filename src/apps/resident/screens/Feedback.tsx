import { Phone } from 'lucide-react';
import { useState } from 'react';
import type { Feedback as FB } from '../../../domain/types';
import { formatDate } from '../../../domain/clock';
import { useLang, useT } from '../../../i18n';
import { sendFeedback } from '../../../store/actions';
import { useData, useResident, useRun } from '../../../store/hooks';
import { AppBar } from '../../../ui/AppBar';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Chip } from '../../../ui/Chip';
import { Textarea } from '../../../ui/Field';
import { Photo } from '../../../ui/Photo';
import { PhotoPicker } from '../../../ui/PhotoPicker';
import { StatusPill } from '../../../ui/StatusPill';
import { useToast } from '../../../ui/Toast';

const TOPICS: FB['topic'][] = ['saran', 'kebersihan', 'keamanan', 'fasilitas', 'lainnya'];

export default function Feedback() {
  const t = useT();
  const [lang] = useLang();
  const run = useRun();
  const toast = useToast();
  const ctx = useResident()!;
  const [topic, setTopic] = useState<FB['topic']>('saran');
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [showPhoto, setShowPhoto] = useState(false);
  const key = ctx.recipientKey;
  const mine = useData((d) => d.feedback).filter((f) => (f.from.kind === 'owner' ? `owner:${f.from.customerId}` : `renter:${f.from.renterId}`) === key).slice().reverse();
  const send = () => {
    if (!text.trim()) return toast.show(t('feedback.empty'), 'error');
    run(sendFeedback, { unitId: ctx.unit.id, from: ctx.identity, topic, text, photoId: photo });
    setText('');
    setPhoto(undefined);
    setShowPhoto(false);
    toast.show(t('feedback.sent'));
  };
  return (
    <div>
      <AppBar title={t('feature.feedback')} />
      <div className="space-y-3 p-4">
        <Card className="space-y-3">
          <p className="text-sm text-ink/65">{t('feedback.intro', { project: ctx.project.name })}</p>
          <div>
            <p className="mb-1.5 text-xs font-semibold text-ink/60">{t('feedback.topic')}</p>
            <div className="flex flex-wrap gap-2">{TOPICS.map((k) => <Chip key={k} active={topic === k} onClick={() => setTopic(k)}>{t(`feedback.t.${k}`)}</Chip>)}</div>
          </div>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t('feedback.placeholder')} />
          {photo ? <Photo id={photo} className="h-28 rounded-xl" /> : showPhoto ? <PhotoPicker onPicked={(p) => setPhoto(p.id)} /> : <Button size="sm" variant="secondary" onClick={() => setShowPhoto(true)}>{t('feedback.attach')}</Button>}
          <Button block size="lg" onClick={send}>{t('feedback.send')}</Button>
          <p className="text-[11px] text-ink/45">{t('feedback.private')}</p>
        </Card>
        <div className="flex items-center justify-between rounded-2xl border border-[#F5C9A8] bg-[#FFF3EA] p-3">
          <span className="text-sm"><b className="text-[#9A3412]">{t('feedback.urgent')}</b><br /><span className="text-xs text-[#9A3412]/80">{t('feedback.urgentBody')}</span></span>
          <a href="tel:081210002001" className="flex items-center gap-1.5 rounded-xl bg-[#9A3412] px-3 py-2 text-sm font-bold text-white"><Phone className="h-4 w-4" />{t('common.call')}</a>
        </div>
        {mine.length > 0 && (
          <Card className="p-0">
            <p className="px-4 pb-1 pt-4 font-bold">{t('feedback.mine')}</p>
            <ul className="divide-y divide-line">
              {mine.map((f) => (
                <li key={f.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold">{f.text}</span>
                    <StatusPill tone={f.status === 'replied' ? 'success' : f.status === 'read' ? 'neutral' : 'info'}>{t(`feedback.s.${f.status}`)}</StatusPill>
                  </div>
                  <p className="text-[11px] text-ink/45">{t(`feedback.t.${f.topic}`)} · {formatDate(f.createdAt.slice(0, 10), lang)}</p>
                  {f.reply && <p className="mt-2 rounded-xl bg-paper p-2.5 text-xs text-ink/70"><b>{t('feedback.estate')}</b> {f.reply}</p>}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
