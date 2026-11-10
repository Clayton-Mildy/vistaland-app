import { Phone } from 'lucide-react';
import { useState } from 'react';
import type { Feedback as FB } from '../../../domain/types';
import { formatDate } from '../../../domain/clock';
import { useLang, useT } from '../../../i18n';
import { sendFeedback } from '../../../store/actions';
import { useData, useResident, useRun } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Chip } from '../../../ui/Chip';
import { Textarea } from '../../../ui/Field';
import { Photo } from '../../../ui/Photo';
import { PhotoPicker } from '../../../ui/PhotoPicker';
import { StatusPill } from '../../../ui/StatusPill';
import { useToast } from '../../../ui/Toast';
import { ScreenBody } from '../ui/ScreenBody';
import { ScreenHeader } from '../ui/ScreenHeader';

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
      <ScreenHeader title={t('feature.feedback')} sub={t('feedback.intro', { project: ctx.project.name })} />
      <ScreenBody>
        <Card className="space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-ink/60">{t('feedback.topic')}</p>
            <div className="flex flex-wrap gap-2">{TOPICS.map((k) => <Chip key={k} active={topic === k} onClick={() => setTopic(k)}>{t(`feedback.t.${k}`)}</Chip>)}</div>
          </div>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t('feedback.placeholder')} />
          {photo ? <Photo id={photo} className="h-28 rounded-xl" /> : showPhoto ? <PhotoPicker onPicked={(p) => setPhoto(p.id)} /> : <Button size="sm" variant="secondary" onClick={() => setShowPhoto(true)}>{t('feedback.attach')}</Button>}
          <Button block size="lg" onClick={send}>{t('feedback.send')}</Button>
          <p className="text-xs text-ink/45">{t('feedback.private')}</p>
        </Card>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#F3D9A4] bg-[#FFF8E8] p-4">
          <span className="text-sm"><span className="font-semibold text-[#8A5A00]">{t('feedback.urgent')}</span><br /><span className="text-xs text-[#8A5A00]/80">{t('feedback.urgentBody')}</span></span>
          <a href="tel:081210002001" className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#8A5A00]/40 px-3.5 py-2 text-sm font-medium text-[#8A5A00] hover:bg-white"><Phone className="h-4 w-4" />{t('common.call')}</a>
        </div>
        {mine.length > 0 && (
          <Card className="p-0">
            <p className="px-4 pb-1 pt-4 text-base font-semibold">{t('feedback.mine')}</p>
            <ul className="divide-y divide-line">
              {mine.map((f) => (
                <li key={f.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium">{f.text}</span>
                    <StatusPill tone={f.status === 'replied' ? 'success' : f.status === 'read' ? 'neutral' : 'info'}>{t(`feedback.s.${f.status}`)}</StatusPill>
                  </div>
                  <p className="text-xs text-ink/45">{t(`feedback.t.${f.topic}`)} · {formatDate(f.createdAt.slice(0, 10), lang)}</p>
                  {f.reply && <p className="mt-2 rounded-xl border-l-[3px] border-l-gold bg-paper p-2.5 text-xs text-ink/70"><span className="font-semibold">{t('feedback.estate')}</span> {f.reply}</p>}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </ScreenBody>
    </div>
  );
}
