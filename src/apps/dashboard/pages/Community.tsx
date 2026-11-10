import { BadgeCheck, Flag, Megaphone, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatDate, formatDateTime } from '../../../domain/clock';
import type { Announcement, Feedback } from '../../../domain/types';
import { useLang, useT } from '../../../i18n';
import { markFeedbackRead, publishAnnouncement, replyFeedback, resolveListingReport, verifyBusiness } from '../../../store/actions';
import { useDashboardProject, useDerived, useRun } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { cx } from '../../../ui/cx';
import { DataTable } from '../../../ui/DataTable';
import { Field, Input, Textarea } from '../../../ui/Field';
import { Photo } from '../../../ui/Photo';
import { Segmented } from '../../../ui/Segmented';
import { StatusPill, type PillTone } from '../../../ui/StatusPill';
import { Tabs } from '../../../ui/Tabs';
import { useToast } from '../../../ui/Toast';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { UnitLink } from '../components/UnitLink';
import { maskPhone } from '../util';

type Tab = 'feedback' | 'announcements' | 'businesses' | 'vouchers';
const FB_TONE: Record<Feedback['status'], PillTone> = { sent: 'danger', read: 'warning', replied: 'success' };
const ANN_TONE: Record<Announcement['tag'], PillTone> = { jadwal: 'info', info: 'neutral', penting: 'danger' };

export default function Community() {
  const t = useT();
  const project = useDashboardProject();
  const [tab, setTab] = useState<Tab>('feedback');
  const counts = useDerived((d) => {
    const ids = new Set(d.units.filter((u) => u.projectId === project.id).map((u) => u.id));
    return {
      feedback: d.feedback.filter((f) => ids.has(f.unitId) && f.status !== 'replied').length,
      businesses: d.businesses.filter((b) => b.projectId === project.id && b.status === 'pending').length,
      vouchers: d.listings.filter((l) => l.projectId === project.id && l.reported).length,
    };
  }, [project.id]);
  return (
    <div>
      <PageHeader title={t('dash.com.title')} subtitle={t('dash.com.sub')} />
      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-4"
        items={[
          { value: 'feedback', label: t('dash.com.tab.feedback'), count: counts.feedback || undefined },
          { value: 'announcements', label: t('dash.com.tab.announcements') },
          { value: 'businesses', label: t('dash.com.tab.businesses'), count: counts.businesses || undefined },
          { value: 'vouchers', label: t('dash.com.tab.vouchers'), count: counts.vouchers || undefined },
        ]}
      />
      {tab === 'feedback' && <FeedbackTab />}
      {tab === 'announcements' && <AnnouncementsTab />}
      {tab === 'businesses' && <BusinessesTab />}
      {tab === 'vouchers' && <VouchersTab />}
    </div>
  );
}

function FeedbackTab() {
  const t = useT();
  const [lang] = useLang();
  const run = useRun();
  const toast = useToast();
  const project = useDashboardProject();
  const [selId, setSelId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const data = useDerived((d) => {
    const units = d.units.filter((u) => u.projectId === project.id);
    const code = new Map(units.map((u) => [u.id, u.code]));
    const name = (f: Feedback) => (f.from.kind === 'owner' ? d.vles.customers.find((c) => c.customer_id === (f.from as { customerId: number }).customerId)?.name : d.renters.find((r) => r.id === (f.from as { renterId: string }).renterId)?.name) ?? '';
    return d.feedback.filter((f) => code.has(f.unitId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((f) => ({ f, code: code.get(f.unitId)!, name: name(f) }));
  }, [project.id]);
  const sel = data.find((x) => x.f.id === selId) ?? data[0];
  useEffect(() => {
    if (sel?.f.status === 'sent') run(markFeedbackRead, { id: sel.f.id });
    setReply('');
  }, [sel?.f.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const send = () => {
    if (!sel) return;
    const r = run(replyFeedback, { id: sel.f.id, reply });
    if (!r.ok) return toast.show(t(r.error), 'error');
    toast.show(t('dash.com.replied'));
    setReply('');
  };
  if (!data.length) return <Panel><p className="text-sm text-ink/50">{t('dash.com.noFeedback')}</p></Panel>;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <Panel pad={false}>
        <ul className="max-h-[560px] divide-y divide-line/70 overflow-y-auto">
          {data.map((x) => (
            <li key={x.f.id}>
              <button onClick={() => setSelId(x.f.id)} className={cx('w-full px-4 py-3 text-left transition hover:bg-brand-tint/40', sel?.f.id === x.f.id && 'bg-brand-tint/60')}>
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold">{x.code} <span className="font-normal text-ink/55">· {x.name}{x.f.from.kind === 'renter' ? ` (${t('role.renter')})` : ''}</span></span>
                  <StatusPill tone={FB_TONE[x.f.status]}>{t(`feedback.s.${x.f.status}`)}</StatusPill>
                </span>
                <span className="mt-0.5 block truncate text-xs text-ink/60">{t(`feedback.t.${x.f.topic}`)} · {x.f.text}</span>
                <span className="block text-[11px] text-ink/40">{formatDateTime(x.f.createdAt, lang)}</span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
      {sel && (
        <Panel title={`${sel.code} · ${t(`feedback.t.${sel.f.topic}`)}`} right={formatDateTime(sel.f.createdAt, lang)}>
          <p className="text-xs text-ink/50">{sel.name}{sel.f.from.kind === 'renter' ? ` · ${t('role.renter')}` : ''}</p>
          <p className="mt-2 whitespace-pre-line text-sm">{sel.f.text}</p>
          {sel.f.photoId && <Photo id={sel.f.photoId} className="mt-3 aspect-video rounded-xl" />}
          {sel.f.reply ? (
            <div className="mt-4 rounded-xl bg-[#E8F6EC] p-3 text-sm">
              <p className="text-xs font-bold text-[#17703D]">{t('dash.com.yourReply')} · {sel.f.repliedAt ? formatDateTime(sel.f.repliedAt, lang) : ''}</p>
              <p className="mt-1 whitespace-pre-line">{sel.f.reply}</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              <Field label={t('dash.com.reply')}>
                <Textarea rows={4} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t('dash.com.replyPh')} />
              </Field>
              <div className="flex justify-end"><Button disabled={!reply.trim()} icon={<Send className="h-4 w-4" />} onClick={send}>{t('dash.com.send')}</Button></div>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

function AnnouncementsTab() {
  const t = useT();
  const [lang] = useLang();
  const run = useRun();
  const toast = useToast();
  const project = useDashboardProject();
  const data = useDerived((d) => ({ list: d.announcements.filter((a) => a.projectId === project.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), today: d.today }), [project.id]);
  const [tag, setTag] = useState<Announcement['tag']>('info');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [date, setDate] = useState(data.today);
  const publish = () => {
    const r = run(publishAnnouncement, { projectId: project.id, tag, title, body, date });
    if (!r.ok) return toast.show(t(r.error), 'error');
    toast.show(t('dash.com.published'));
    setTitle('');
    setBody('');
  };
  return (
    <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
      <Panel title={<span className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-brand" />{t('dash.com.compose')}</span>}>
        <div className="space-y-3">
          <Segmented value={tag} onChange={setTag} items={(['info', 'jadwal', 'penting'] as const).map((k) => ({ value: k, label: t(`announce.${k}`) }))} />
          <Field label={t('dash.com.annTitle')}><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('dash.com.annTitlePh')} maxLength={80} /></Field>
          <Field label={t('dash.com.annBody')}><Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t('dash.com.annBodyPh')} /></Field>
          <Field label={t('dash.com.annDate')}><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Button block disabled={!title.trim() || !body.trim()} onClick={publish}>{t('dash.com.publish')}</Button>
          <p className="text-[11px] text-ink/45">{t('dash.com.publishNote')}</p>
        </div>
      </Panel>
      <Panel title={t('dash.com.annList')} pad={false}>
        {data.list.length ? (
          <ul className="divide-y divide-line/70">
            {data.list.map((a) => (
              <li key={a.id} className="px-5 py-3">
                <p className="flex items-center gap-2"><StatusPill tone={ANN_TONE[a.tag]}>{t(`announce.${a.tag}`)}</StatusPill><b className="text-sm">{a.title}</b></p>
                <p className="mt-1 text-sm text-ink/70">{a.body}</p>
                <p className="mt-0.5 text-[11px] text-ink/40">{formatDate(a.date, lang)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-4 text-sm text-ink/50">{t('dash.nothing')}</p>
        )}
      </Panel>
    </div>
  );
}

function BusinessesTab() {
  const t = useT();
  const run = useRun();
  const toast = useToast();
  const project = useDashboardProject();
  const list = useDerived((d) => d.businesses.filter((b) => b.projectId === project.id).sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1) || a.name.localeCompare(b.name)), [project.id]);
  return (
    <Panel title={t('dash.com.bizTitle')} right={t('dash.com.bizPending', { n: list.filter((b) => b.status === 'pending').length })} pad={false}>
      <DataTable
        rows={list}
        rowKey={(b) => b.id}
        empty={t('dash.nothing')}
        rowClassName={(b) => (b.status === 'pending' ? 'bg-[#FFFBEF]' : '')}
        columns={[
          { key: 'name', header: t('dash.res.name'), render: (b) => <span className="text-sm"><b>{b.name}</b><span className="block text-xs text-ink/50">{b.description}</span></span> },
          { key: 'cat', header: t('dash.com.col.category'), render: (b) => <span className="text-xs">{t(`biz.cat.${b.category}`)}</span> },
          { key: 'loc', header: t('dash.com.col.location'), render: (b) => <span className="text-xs">{b.location}</span> },
          { key: 'unit', header: t('common.unit'), render: (b) => (b.ownerUnitId ? <UnitLink unitId={b.ownerUnitId} /> : <span className="text-xs text-ink/40">{t('dash.com.outside')}</span>) },
          { key: 'wa', header: 'WhatsApp', render: (b) => <span className="font-mono text-xs">{maskPhone(b.whatsapp)}</span> },
          { key: 'st', header: t('common.status'), render: (b) => (b.status === 'verified' ? <StatusPill tone="success"><BadgeCheck className="mr-0.5 inline h-3 w-3" />{t('dash.com.verified')}</StatusPill> : <StatusPill tone="warning">{t('dash.com.pending')}</StatusPill>) },
          {
            key: 'act', header: '', render: (b) => (b.status === 'pending' ? (
              <Button size="sm" className="whitespace-nowrap" onClick={() => { const r = run(verifyBusiness, { id: b.id }); toast.show(r.ok ? t('dash.com.bizVerified', { name: b.name }) : t(r.error), r.ok ? undefined : 'error'); }}>{t('dash.com.verify')}</Button>
            ) : null),
          },
        ]}
      />
    </Panel>
  );
}

function VouchersTab() {
  const t = useT();
  const [lang] = useLang();
  const run = useRun();
  const toast = useToast();
  const project = useDashboardProject();
  const data = useDerived((d) => {
    const code = new Map(d.units.filter((u) => u.projectId === project.id).map((u) => [u.id, u.code]));
    return {
      vouchers: d.vouchers.filter((v) => v.projectId === project.id).map((v) => ({ v, claims: d.voucherClaims.filter((c) => c.voucherId === v.id).length })),
      reported: d.listings.filter((l) => l.projectId === project.id && l.reported).map((l) => ({ l, code: code.get(l.unitId) ?? '' })),
      today: d.today,
    };
  }, [project.id]);
  const resolve = (id: string, remove: boolean) => {
    const r = run(resolveListingReport, { id, remove });
    toast.show(r.ok ? t(remove ? 'dash.com.removed' : 'dash.com.kept') : t(r.error), r.ok ? undefined : 'error');
  };
  return (
    <div className="space-y-4">
      <Panel title={t('dash.com.vouchers')} pad={false}>
        <DataTable
          rows={data.vouchers}
          rowKey={(x) => x.v.id}
          empty={t('dash.nothing')}
          columns={[
            { key: 'p', header: t('dash.com.col.partner'), render: (x) => <span className="text-sm"><b>{x.v.partner}</b><span className="block text-xs text-ink/50">{x.v.title}</span></span> },
            { key: 'val', header: t('dash.com.col.value'), render: (x) => <span className="text-xs font-semibold">{x.v.valueLabel}</span> },
            { key: 'stock', header: t('dash.com.col.stock'), align: 'right', render: (x) => <span className={cx('tabular text-sm', x.v.stock <= 5 && 'font-bold text-[#B4192A]')}>{x.v.stock}</span> },
            { key: 'claims', header: t('dash.com.col.claims'), align: 'right', render: (x) => <span className="tabular text-sm">{x.claims}</span> },
            { key: 'until', header: t('dash.com.col.until'), render: (x) => <span className={cx('text-xs', x.v.validUntil < data.today && 'text-[#B4192A]')}>{formatDate(x.v.validUntil, lang)}</span> },
          ]}
        />
      </Panel>
      <Panel title={<span className="flex items-center gap-2"><Flag className="h-4 w-4 text-[#B4192A]" />{t('dash.com.reported')}</span>} pad={false}>
        <DataTable
          rows={data.reported}
          rowKey={(x) => x.l.id}
          empty={t('dash.com.noReported')}
          columns={[
            { key: 'title', header: t('dash.com.col.listing'), render: (x) => <span className="text-sm"><b>{x.l.title}</b><span className="block text-xs text-ink/50">{t(`market.kind.${x.l.kind}`)}</span></span> },
            { key: 'unit', header: t('common.unit'), render: (x) => <UnitLink unitId={x.l.unitId} /> },
            { key: 'at', header: t('common.date'), render: (x) => <span className="text-xs">{formatDate(x.l.createdAt.slice(0, 10), lang, 'short')}</span> },
            {
              key: 'act', header: '', render: (x) => (
                <span className="flex justify-end gap-1.5">
                  <Button size="sm" variant="secondary" className="whitespace-nowrap" onClick={() => resolve(x.l.id, false)}>{t('dash.com.keep')}</Button>
                  <Button size="sm" variant="danger" className="whitespace-nowrap" onClick={() => resolve(x.l.id, true)}>{t('dash.com.remove')}</Button>
                </span>
              ),
            },
          ]}
        />
      </Panel>
    </div>
  );
}
