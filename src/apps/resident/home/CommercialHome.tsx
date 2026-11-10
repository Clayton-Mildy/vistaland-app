import { Bell, ChevronRight, Home, Lock, Search, Siren } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PROJECT_SHOWCASE } from '../../../data/content';
import { formatDate } from '../../../domain/clock';
import { formatRp } from '../../../domain/money';
import { useLang, useT } from '../../../i18n';
import { useAccess, useDerived, useNotifications, useResident, useToday } from '../../../store/hooks';
import { HOUSE_PHOTOS } from '../../../store/photos';
import { Card } from '../../../ui/Card';
import { cx } from '../../../ui/cx';
import { LangToggle } from '../../../ui/LangToggle';
import { Moni } from '../../../ui/Moni';
import { Section } from '../../../ui/Section';
import { Sheet } from '../../../ui/Sheet';
import { StatusPill } from '../../../ui/StatusPill';
import { greetingKey, useIplSummary } from '../hooks';
import { MENU, MenuGrid, useMenuState } from './MenuGrid';
import { OnboardingCard } from './OnboardingCard';
import { Announcements, CardsStatus, IplStatus, WifiStatus } from './StatusCards';

export default function CommercialHome() {
  const t = useT();
  const [lang] = useLang();
  const nav = useNavigate();
  const ctx = useResident()!;
  const access = useAccess();
  const unread = useNotifications(ctx.recipientKey).filter((n) => !n.read).length;
  const occupied = access('vouchers').ok;
  const [search, setSearch] = useState(false);
  const today = useToday();
  const data = useDerived((d) => ({
    vouchers: d.vouchers.filter((v) => v.projectId === ctx.project.id && v.validUntil >= d.today),
    listings: d.listings.filter((l) => l.projectId === ctx.project.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    wifi: d.wifi.find((w) => w.unitId === ctx.unit.id),
  }), [ctx.project.id, ctx.unit.id]);
  const prepay = ctx.settings.features.prepay ? ctx.settings.prepay.ipl.filter((p) => p.active && p.discountType !== 'none') : [];
  const wifiPrepay = ctx.settings.prepay.wifi.filter((p) => p.active && p.discountType !== 'none');
  const ipl = useIplSummary();
  const showWifiPromo = ctx.settings.features.wifi && ctx.settings.wifi.promoEnabled && !data.wifi;

  return (
    <div className="pb-4">
      <div className="bg-white px-4 pb-4 pt-4 md:pt-9">
        <div className="flex items-center gap-2">
          <button onClick={() => setSearch(true)} className="flex h-10 flex-1 items-center gap-2 rounded-full border border-line bg-paper px-3.5 text-left text-sm text-ink/40">
            <Search className="h-4 w-4" /> {t('home.search')}
          </button>
          <button onClick={() => nav('/app/notifications')} className="relative rounded-full p-2 text-ink/70 hover:bg-paper" aria-label={t('account.notifications')}>
            <Bell className="h-5 w-5" />
            {unread > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-ink">{unread}</span>}
          </button>
          <button onClick={() => nav('/app/emergency')} className="flex items-center gap-1 rounded-full border-2 border-brand px-2.5 py-1 text-xs font-extrabold text-brand">
            <Siren className="h-3.5 w-3.5" /> SOS
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-ink/55">
            <Home className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{t('home.unitLine', { unit: ctx.unit.code, project: ctx.project.name })}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {ctx.activeRenter && <StatusPill tone="gold">{t('home.rented')}</StatusPill>}
            <StatusPill tone={ctx.unit.occupancy === 'occupied' ? 'success' : 'warning'}>{t(`occupancy.${ctx.unit.occupancy}`)}</StatusPill>
          </div>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <h1 className="text-[22px] font-extrabold leading-tight">{t(greetingKey(), { name: ctx.name.split(' ')[0] })}</h1>
          <LangToggle />
        </div>
      </div>

      <div className="space-y-3 px-4 pt-3">
        <OnboardingCard />
        <div className="grid grid-cols-3 gap-2">
          <IplStatus />
          <WifiStatus />
          <CardsStatus />
        </div>

        {(prepay.length > 0 || wifiPrepay.length > 0) && ipl.kind !== 'none' && (
          <Card className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">{t('home.prepayTitle')}</span>
              <button onClick={() => nav('/app/bills?prepay=1')} className="text-xs font-bold text-brand">{t('home.prepayCta')}</button>
            </div>
            <div className="no-scrollbar -mx-1 mt-2 flex gap-2 overflow-x-auto px-1">
              {prepay.map((p) => (
                <button key={p.id} onClick={() => nav('/app/bills?prepay=1')} className="shrink-0 rounded-xl border border-line px-3 py-2 text-left">
                  <span className="block text-[11px] text-ink/50">{t('home.prepayIpl', { n: p.months })}</span>
                  <span className="block text-xs font-bold text-[#17703D]">{p.discountType === 'percent' ? t('home.discountPct', { n: p.value }) : t('home.freeMonths', { n: p.value })}</span>
                </button>
              ))}
              {wifiPrepay.map((p) => (
                <button key={p.id} onClick={() => nav('/app/bills?tab=wifi')} className="shrink-0 rounded-xl border border-line px-3 py-2 text-left">
                  <span className="block text-[11px] text-ink/50">{t('home.prepayWifi', { n: p.months })}</span>
                  <span className="block text-xs font-bold text-[#17703D]">{p.discountType === 'percent' ? t('home.discountPct', { n: p.value }) : t('home.freeMonths', { n: p.value })}</span>
                </button>
              ))}
            </div>
          </Card>
        )}

        <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
          <button onClick={() => nav('/app/vouchers')} className="relative h-32 w-[290px] shrink-0 snap-start overflow-hidden rounded-2xl bg-gradient-to-br from-[#E8590C] to-[#C2410C] p-4 text-left text-white">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">{t('home.promo.voucherKicker')}</span>
            <span className="mt-1 block max-w-[170px] text-lg font-extrabold leading-tight">{t('home.promo.voucher', { n: Math.max(0, data.vouchers.length - 1) })}</span>
            <span className="mt-2 inline-block rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold">{t('home.promo.voucherCta')}</span>
            <Moni pose="cool" size={84} className="absolute -bottom-3 right-2" />
          </button>
          {showWifiPromo && (
            <button onClick={() => nav('/app/wifi')} className="relative h-32 w-[290px] shrink-0 snap-start overflow-hidden rounded-2xl bg-gradient-to-br from-[#2463C9] to-[#173F87] p-4 text-left text-white">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">WiFi NAV1</span>
              <span className="mt-1 block max-w-[180px] text-lg font-extrabold leading-tight">{t('home.promo.wifi', { n: ctx.settings.wifi.freeMonths })}</span>
              <span className="mt-2 inline-block rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold">{t('home.promo.wifiCta')}</span>
              <Moni pose="point" size={70} className="absolute -bottom-3 right-3" />
            </button>
          )}
          <button onClick={() => nav('/app/projects')} className="relative h-32 w-[290px] shrink-0 snap-start overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-brand-dark p-4 text-left text-white">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gold">Harmoni Fest 2026</span>
            <span className="mt-1 block max-w-[170px] text-lg font-extrabold leading-tight">{t('home.promo.fest')}</span>
            <span className="mt-2 inline-block rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold">{t('home.promo.festCta')}</span>
            <Moni pose="waveSm" size={70} className="absolute -bottom-3 right-3" />
          </button>
        </div>

        {!occupied && (
          <div className="flex items-center gap-3 rounded-2xl border border-[#F3D9A4] bg-[#FFF8E8] p-3">
            <Moni pose="crossed" size={38} />
            <p className="text-xs font-semibold text-[#8A5A00]">{t('home.lockedNote')}</p>
          </div>
        )}

        <Card>
          <MenuGrid />
        </Card>
      </div>

      <div className="px-4">
        <Section title={t('home.vouchersTitle')} action={<button onClick={() => nav('/app/vouchers')} className="text-xs font-bold text-brand">{t('common.seeAll')}</button>}>
          <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4">
            {data.vouchers.map((v) => (
              <button key={v.id} onClick={() => nav('/app/vouchers')} className="relative w-36 shrink-0 overflow-hidden rounded-2xl border border-line bg-white p-3 text-left">
                <span className={cx('block text-2xl font-extrabold', occupied ? 'text-brand' : 'text-ink/20')}>{v.valueLabel}</span>
                <span className={cx('mt-1 line-clamp-2 block text-xs font-semibold', !occupied && 'text-ink/30')}>{v.title}</span>
                <span className={cx('mt-1 block text-[10px]', occupied ? 'text-ink/45' : 'text-ink/25')}>{v.partner}</span>
                {!occupied && (
                  <span className="absolute inset-0 flex flex-col items-center justify-center bg-white/55 text-[11px] font-bold text-ink/60 backdrop-blur-[1px]">
                    <Lock className="mb-1 h-4 w-4" /> {t('home.afterMoveIn')}
                  </span>
                )}
              </button>
            ))}
          </div>
        </Section>

        <Section title={t('home.listingsTitle')} action={<button onClick={() => nav('/app/market')} className="text-xs font-bold text-brand">{t('common.seeAll')}</button>}>
          <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4">
            {data.listings.map((l) => (
              <button key={l.id} onClick={() => nav(`/app/market/${l.id}`)} className="relative w-40 shrink-0 overflow-hidden rounded-2xl border border-line bg-white text-left">
                <div className={cx('flex h-20 items-center justify-center text-3xl font-extrabold', occupied ? 'bg-brand-tint text-brand/70' : 'bg-paper text-ink/15')}>{l.title[0]}</div>
                <div className="p-2.5">
                  <span className={cx('line-clamp-2 block text-xs font-semibold', !occupied && 'text-ink/30')}>{l.title}</span>
                  {l.price && <span className={cx('mt-0.5 block text-xs font-bold', occupied ? 'text-brand' : 'text-ink/25')}>{formatRp(l.price)}</span>}
                </div>
                {!occupied && (
                  <span className="absolute inset-0 flex flex-col items-center justify-center bg-white/55 text-[11px] font-bold text-ink/60 backdrop-blur-[1px]">
                    <Lock className="mb-1 h-4 w-4" /> {t('home.afterMoveIn')}
                  </span>
                )}
              </button>
            ))}
          </div>
        </Section>

        {ctx.settings.features.projects && (
          <Section title={t('home.projectsTitle')} action={<button onClick={() => nav('/app/projects')} className="text-xs font-bold text-brand">{t('common.seeAll')}</button>}>
            <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4">
              {PROJECT_SHOWCASE.map((p) => (
                <button key={p.name} onClick={() => nav('/app/projects')} className="w-44 shrink-0 overflow-hidden rounded-2xl border border-line bg-white text-left">
                  <img src={HOUSE_PHOTOS[p.photo - 1]} alt="" className="h-24 w-full object-cover" />
                  <div className="p-2.5">
                    <span className="block truncate text-xs font-bold">{p.name}</span>
                    <span className="block truncate text-[11px] text-ink/50">{p.location}</span>
                  </div>
                </button>
              ))}
            </div>
          </Section>
        )}

        <Announcements />
        <p className="mt-4 text-center text-[11px] text-ink/35">{t('home.dataNote', { date: formatDate(today, lang) })}</p>
      </div>

      <Sheet open={search} onClose={() => setSearch(false)} title={t('home.searchTitle')}>
        <SearchMenu onPick={(route) => { setSearch(false); nav(route); }} />
      </Sheet>
    </div>
  );
}

function SearchMenu({ onPick }: { onPick: (route: string) => void }) {
  const t = useT();
  const state = useMenuState();
  const [q, setQ] = useState('');
  const items = MENU.filter((m) => state(m) !== 'hidden' && t(m.labelKey).toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('home.search')} className="h-11 w-full rounded-xl border border-line px-3.5 text-sm outline-none focus:border-brand" />
      <ul className="mt-2 divide-y divide-line">
        {items.map((m) => (
          <li key={m.key}>
            <button onClick={() => onPick(m.route)} className="flex w-full items-center gap-3 py-3 text-left text-sm font-semibold">
              <m.icon className="h-5 w-5 text-ink/50" />
              <span className="flex-1">{t(m.labelKey)}</span>
              {state(m) === 'locked' && <Lock className="h-4 w-4 text-ink/30" />}
              <ChevronRight className="h-4 w-4 text-ink/25" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
