import { CreditCard, Megaphone, Receipt, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../../domain/clock';
import { formatRp } from '../../../domain/money';
import { useLang, useT } from '../../../i18n';
import { useDerived, useResident } from '../../../store/hooks';
import { Card } from '../../../ui/Card';
import { cx } from '../../../ui/cx';
import { Section } from '../../../ui/Section';
import { useIplSummary } from '../hooks';

function Mini({ label, value, sub, tone, onClick, icon: Icon }: { label: string; value: string; sub: string; tone?: 'danger' | 'success' | 'brand'; onClick: () => void; icon: typeof Receipt }) {
  return (
    <button onClick={onClick} className="min-w-0 px-2.5 py-3 text-left transition hover:bg-paper/60">
      <span className="flex items-center gap-1 truncate text-xs text-ink/55"><Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />{label}</span>
      <span className={cx('mt-1 line-clamp-2 block text-sm font-semibold leading-snug tabular', tone === 'danger' && 'text-[#B4192A]', tone === 'success' && 'text-[#17703D]', tone === 'brand' && 'text-brand-dark')}>{value}</span>
      <span className="mt-0.5 block truncate text-xs font-medium text-brand">{sub}</span>
    </button>
  );
}

export function IplStatus() {
  const t = useT();
  const [lang] = useLang();
  const nav = useNavigate();
  const s = useIplSummary();
  const go = () => nav('/app/bills');
  if (s.kind === 'none') return <Mini icon={Receipt} label="IPL" value={t('status.ipl.notStarted')} sub={t('common.view')} onClick={go} />;
  if (s.kind === 'overdue') return <Mini icon={Receipt} label="IPL" tone="danger" value={t('status.ipl.overdue', { n: s.n })} sub={t('status.ipl.payNow')} onClick={go} />;
  if (s.kind === 'free') return <Mini icon={Receipt} label="IPL" tone="success" value={t('status.ipl.free')} sub={t('status.ipl.until', { month: formatDate(s.lastFree ?? s.firstBilled, lang, 'month') })} onClick={go} />;
  if (s.kind === 'due') return <Mini icon={Receipt} label="IPL" tone="brand" value={formatRp(s.amount)} sub={t('status.ipl.due')} onClick={go} />;
  return <Mini icon={Receipt} label="IPL" tone="success" value={t('status.paid')} sub={s.paidThrough ? t('status.ipl.through', { month: formatDate(s.paidThrough, lang, 'month') }) : t('common.view')} onClick={go} />;
}

export function WifiStatus() {
  const t = useT();
  const nav = useNavigate();
  const ctx = useResident()!;
  const sub = useDerived((d) => d.wifi.find((w) => w.unitId === ctx.unit.id), [ctx.unit.id]);
  if (!ctx.settings.features.wifi) return null;
  const pkg = sub && ctx.settings.wifi.packages.find((p) => p.id === sub.packageId);
  if (!sub) return <Mini icon={Wifi} label="WiFi NAV1" value={t('status.wifi.none')} sub={ctx.settings.wifi.promoEnabled ? t('status.wifi.promo', { n: ctx.settings.wifi.freeMonths }) : t('status.wifi.choose')} onClick={() => nav('/app/wifi')} />;
  return <Mini icon={Wifi} label="WiFi NAV1" tone={sub.status === 'installed' ? 'success' : undefined} value={sub.status === 'installed' ? t('status.wifi.active') : t(`status.wifi.${sub.status}`)} sub={pkg ? `${pkg.name} · ${pkg.mbps} Mbps` : ''} onClick={() => nav('/app/wifi')} />;
}

export function CardsStatus() {
  const t = useT();
  const nav = useNavigate();
  const ctx = useResident()!;
  const orders = useDerived((d) => d.cardOrders.filter((o) => o.unitId === ctx.unit.id), [ctx.unit.id]);
  const ready = orders.filter((o) => o.status === 'ready').length;
  const making = orders.filter((o) => o.status === 'toMake' || o.status === 'awaitingPayment').length;
  const value = ready ? t('status.cards.ready', { n: ready }) : making ? t('status.cards.making') : orders.length ? t('status.cards.done') : t('status.cards.free');
  return <Mini icon={CreditCard} label={t('status.cards.label')} tone={ready ? 'brand' : undefined} value={value} sub={orders.length ? t('common.detail') : t('status.cards.claim')} onClick={() => nav('/app/cards')} />;
}

export function Announcements() {
  const t = useT();
  const [lang] = useLang();
  const ctx = useResident()!;
  const list = useDerived((d) => d.announcements.filter((a) => a.projectId === ctx.project.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4), [ctx.project.id]);
  return (
    <Section title={<span className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-brand-dark" strokeWidth={1.75} />{t('home.announcements')}</span>}>
      <Card className="divide-y divide-line p-0">
        {list.map((a) => (
          <div key={a.id} className="flex items-stretch gap-3 px-4 py-3">
            <span className={cx('w-[3px] shrink-0 rounded-full', a.tag === 'penting' ? 'bg-brand' : 'bg-gold')} aria-hidden />
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-ink/45">{t(`announce.${a.tag}`)} · {formatDate(a.date, lang, 'weekday')}</p>
              <p className="mt-0.5 text-sm font-semibold leading-snug">{a.title}</p>
              <p className="mt-0.5 text-xs text-ink/55">{a.body}</p>
            </div>
          </div>
        ))}
      </Card>
    </Section>
  );
}
