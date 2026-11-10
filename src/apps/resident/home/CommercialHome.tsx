import { Lock, PartyPopper, Ticket, Wifi } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { PROJECT_SHOWCASE } from '../../../data/content';
import { formatDate } from '../../../domain/clock';
import { formatRp } from '../../../domain/money';
import { useLang, useT } from '../../../i18n';
import { useAccess, useDerived, useResident, useToday } from '../../../store/hooks';
import { HOUSE_PHOTOS } from '../../../store/photos';
import { Card } from '../../../ui/Card';
import { cx } from '../../../ui/cx';
import { LangToggle } from '../../../ui/LangToggle';
import { Photo } from '../../../ui/Photo';
import { Section } from '../../../ui/Section';
import { greetingKey, useIplSummary } from '../hooks';
import { HomeBand } from '../ui/HomeBand';
import { listingThumb } from '../ui/media';
import { HomeSearchSheet, HomeTopRow, OwnerHouseCard } from './HomeParts';
import { MenuGrid } from './MenuGrid';
import { OnboardingCard } from './OnboardingCard';
import { Announcements, CardsStatus, IplStatus, WifiStatus } from './StatusCards';

/** A calm promo card: icon disc, short title, text link. */
function Promo({ icon: Icon, kicker, title, cta, onClick }: { icon: typeof Ticket; kicker: ReactNode; title: ReactNode; cta: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-[264px] shrink-0 snap-start items-center gap-3 rounded-2xl border border-line bg-white p-4 text-left shadow-card">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand-dark"><Icon className="h-5 w-5" strokeWidth={1.75} /></span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium uppercase tracking-[0.1em] text-ink/45">{kicker}</span>
        <span className="mt-0.5 line-clamp-2 block text-sm font-semibold leading-snug">{title}</span>
        <span className="mt-1 block text-xs font-medium text-brand">{cta}</span>
      </span>
    </button>
  );
}

function Locked({ show }: { show: boolean }) {
  const t = useT();
  if (!show) return null;
  return (
    <span className="absolute inset-0 flex items-center justify-center bg-white/40">
      <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink/70 shadow-card">
        <Lock className="h-3.5 w-3.5" /> {t('home.afterMoveIn')}
      </span>
    </span>
  );
}

export default function CommercialHome() {
  const t = useT();
  const [lang] = useLang();
  const nav = useNavigate();
  const ctx = useResident()!;
  const access = useAccess();
  const occupied = access('vouchers').ok;
  const [search, setSearch] = useState(false);
  const today = useToday();
  const data = useDerived((d) => ({
    vouchers: d.vouchers.filter((v) => v.projectId === ctx.project.id && v.validUntil >= d.today),
    listings: d.listings.filter((l) => l.projectId === ctx.project.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)
      .map((l) => ({ l, unit: d.units.find((u) => u.id === l.unitId) })),
    wifi: d.wifi.find((w) => w.unitId === ctx.unit.id),
  }), [ctx.project.id, ctx.unit.id]);
  const prepay = ctx.settings.features.prepay ? ctx.settings.prepay.ipl.filter((p) => p.active && p.discountType !== 'none') : [];
  const wifiPrepay = ctx.settings.prepay.wifi.filter((p) => p.active && p.discountType !== 'none');
  const ipl = useIplSummary();
  const showWifiPromo = ctx.settings.features.wifi && ctx.settings.wifi.promoEnabled && !data.wifi;
  const seeAll = (to: string) => <button onClick={() => nav(to)} className="text-xs font-medium text-brand">{t('common.seeAll')}</button>;

  return (
    <div>
      <HomeBand
        eyebrow={ctx.project.name}
        greeting={t(greetingKey(), { name: ctx.name.split(' ')[0] })}
        unitLine={t('home.unitRole', { unit: ctx.unit.code, type: ctx.type.name, role: t(`role.${ctx.role}`) })}
        right={<LangToggle dark />}
      >
        <HomeTopRow onSearch={() => setSearch(true)} />
      </HomeBand>

      <div className="relative -mt-10 space-y-3 px-4">
        <OwnerHouseCard />
        <OnboardingCard />
        <Card className="grid auto-cols-fr grid-flow-col divide-x divide-line p-0">
          <IplStatus />
          <WifiStatus />
          <CardsStatus />
        </Card>

        {(prepay.length > 0 || wifiPrepay.length > 0) && ipl.kind !== 'none' && (
          <Card>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{t('home.prepayTitle')}</span>
              <button onClick={() => nav('/app/bills?prepay=1')} className="text-xs font-medium text-brand">{t('home.prepayCta')}</button>
            </div>
            <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1">
              {prepay.map((p) => (
                <button key={p.id} onClick={() => nav('/app/bills?prepay=1')} className="shrink-0 rounded-xl border border-line px-3 py-2 text-left">
                  <span className="block text-xs text-ink/55">{t('home.prepayIpl', { n: p.months })}</span>
                  <span className="block text-sm font-medium text-[#17703D]">{p.discountType === 'percent' ? t('home.discountPct', { n: p.value }) : t('home.freeMonths', { n: p.value })}</span>
                </button>
              ))}
              {wifiPrepay.map((p) => (
                <button key={p.id} onClick={() => nav('/app/bills?tab=wifi')} className="shrink-0 rounded-xl border border-line px-3 py-2 text-left">
                  <span className="block text-xs text-ink/55">{t('home.prepayWifi', { n: p.months })}</span>
                  <span className="block text-sm font-medium text-[#17703D]">{p.discountType === 'percent' ? t('home.discountPct', { n: p.value }) : t('home.freeMonths', { n: p.value })}</span>
                </button>
              ))}
            </div>
          </Card>
        )}

        <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
          <Promo icon={Ticket} kicker={t('home.promo.voucherKicker')} title={t('home.promo.voucher', { n: Math.max(0, data.vouchers.length - 1) })} cta={t('home.promo.voucherCta')} onClick={() => nav('/app/vouchers')} />
          {showWifiPromo && <Promo icon={Wifi} kicker="WiFi NAV1" title={t('home.promo.wifi', { n: ctx.settings.wifi.freeMonths })} cta={t('home.promo.wifiCta')} onClick={() => nav('/app/wifi')} />}
          <Promo icon={PartyPopper} kicker="Harmoni Fest 2026" title={t('home.promo.fest')} cta={t('home.promo.festCta')} onClick={() => nav('/app/projects')} />
        </div>

        {!occupied && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-[#F3D9A4] bg-[#FFF8E8] p-3">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#8A5A00]" />
            <p className="text-xs font-medium text-[#8A5A00]">{t('home.lockedNote')}</p>
          </div>
        )}
      </div>

      <div className="px-4">
        <MenuGrid />

        <Section title={t('home.vouchersTitle')} action={seeAll('/app/vouchers')}>
          <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
            {data.vouchers.map((v) => (
              <button key={v.id} onClick={() => nav('/app/vouchers')} className="relative w-44 shrink-0 overflow-hidden rounded-2xl border border-line bg-white p-3.5 text-left shadow-card">
                <span className={cx('block', !occupied && 'opacity-40 grayscale')}>
                <span className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-tint text-xs font-semibold text-brand-dark">{v.partner.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
                  <span className="min-w-0 truncate text-xs text-ink/55">{v.partner}</span>
                </span>
                <span className="mt-2 block text-base font-semibold text-brand-dark">{v.valueLabel}</span>
                <span className="mt-0.5 line-clamp-2 block text-xs text-ink/70">{v.title}</span>
                <span className="mt-1.5 block text-xs text-ink/45">{t('home.validUntil', { date: formatDate(v.validUntil, lang, 'short') })}</span>
                </span>
                <Locked show={!occupied} />
              </button>
            ))}
          </div>
        </Section>

        <Section title={t('home.listingsTitle')} action={seeAll('/app/market')}>
          <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
            {data.listings.map(({ l, unit }) => {
              const thumb = listingThumb(l, unit);
              return (
                <button key={l.id} onClick={() => nav(`/app/market/${l.id}`)} className="relative w-44 shrink-0 overflow-hidden rounded-2xl border border-line bg-white text-left shadow-card">
                  <span className={cx('block', !occupied && 'opacity-40 grayscale')}>
                  {'photoId' in thumb ? <Photo id={thumb.photoId} className="h-24 w-full" /> : (
                    <span className="flex h-24 items-center justify-center bg-paper text-brand-dark"><thumb.icon className="h-7 w-7" strokeWidth={1.5} /></span>
                  )}
                  <span className="block p-3">
                    <span className="line-clamp-2 block text-sm font-medium leading-snug">{l.title}</span>
                    {l.price && <span className="mt-0.5 block text-sm font-semibold tabular text-brand-dark">{formatRp(l.price)}</span>}
                  </span>
                  </span>
                  <Locked show={!occupied} />
                </button>
              );
            })}
          </div>
        </Section>

        {ctx.settings.features.projects && (
          <Section title={t('home.projectsTitle')} action={seeAll('/app/projects')}>
            <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
              {PROJECT_SHOWCASE.map((p) => (
                <button key={p.name} onClick={() => nav('/app/projects')} className="w-48 shrink-0 overflow-hidden rounded-2xl border border-line bg-white text-left shadow-card">
                  <img src={HOUSE_PHOTOS[p.photo - 1]} alt="" className="h-28 w-full object-cover" />
                  <span className="block p-3">
                    <span className="block truncate text-sm font-semibold">{p.name}</span>
                    <span className="block truncate text-xs text-ink/55">{p.location}</span>
                  </span>
                </button>
              ))}
            </div>
          </Section>
        )}

        <Announcements />
        <p className="mt-5 text-center text-xs text-ink/40">{t('home.dataNote', { date: formatDate(today, lang) })}</p>
      </div>

      <HomeSearchSheet open={search} onClose={() => setSearch(false)} />
    </div>
  );
}
