import { Bell, Check, ChevronRight, Globe, LogOut, Phone, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLang, useT } from '../../../i18n';
import { endResidentSession, switchUnit } from '../../../store/actions';
import { useData, useNotifications, useResident, useRun } from '../../../store/hooks';
import { Card } from '../../../ui/Card';
import { cx } from '../../../ui/cx';
import { Photo } from '../../../ui/Photo';
import { StatusPill } from '../../../ui/StatusPill';
import { houseFor } from '../ui/media';
import { ScreenBody } from '../ui/ScreenBody';
import { ScreenHeader } from '../ui/ScreenHeader';

const initials = (name: string) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export default function Account() {
  const t = useT();
  const [lang, setLang] = useLang();
  const nav = useNavigate();
  const run = useRun();
  const ctx = useResident();
  const units = useData((d) => d.units);
  const types = useData((d) => d.unitTypes);
  const unread = useNotifications(ctx?.recipientKey).filter((n) => !n.read).length;
  if (!ctx) return null;
  const logout = () => {
    run(endResidentSession, {});
    nav('/app/login', { replace: true });
  };
  return (
    <div>
      <ScreenHeader back={false} title={t('account.title')} />
      <ScreenBody>
        <Card className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-dark text-lg font-semibold text-white">{initials(ctx.name)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-semibold">{ctx.name}</p>
            <p className="flex items-center gap-1 text-xs text-ink/50 tabular"><Phone className="h-3 w-3" /> {ctx.phone}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <StatusPill tone={ctx.role === 'renter' ? 'gold' : 'brand'}>{ctx.role === 'renter' ? t('account.renterOf', { owner: ctx.ownerName }) : t('role.owner')}</StatusPill>
              <span className="text-xs text-ink/50">{t(`segment.${ctx.segment}`)}</span>
            </div>
          </div>
        </Card>

        <div>
          <p className="mb-2 mt-2 px-1 text-xs font-medium uppercase tracking-[0.08em] text-ink/45">{t('account.units')}</p>
          <Card className="divide-y divide-line p-0">
            {ctx.unitIds.map((id) => {
              const u = units.find((x) => x.id === id)!;
              const active = id === ctx.unit.id;
              return (
                <button key={id} disabled={active} onClick={() => run(switchUnit, { unitId: id })} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                  <Photo id={houseFor(u)} className="h-11 w-11 shrink-0 rounded-xl" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{u.code} · {types.find((x) => x.id === u.typeId)?.name}</span>
                    <span className="block truncate text-xs text-ink/50">{ctx.project.name} · {t(`occupancy.${u.occupancy}`)}</span>
                  </span>
                  {active ? <Check className="h-4 w-4 shrink-0 text-brand" /> : <span className="shrink-0 text-xs font-medium text-brand">{t('account.switch')}</span>}
                </button>
              );
            })}
          </Card>
          {ctx.role === 'renter' && ctx.renter && <p className="mt-2 px-1 text-xs text-ink/50">{t('account.lease', { start: ctx.renter.lease.start, end: ctx.renter.lease.end })}</p>}
        </div>

        <Card className="divide-y divide-line p-0">
          <button onClick={() => nav('/app/notifications')} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium">
            <Bell className="h-5 w-5 text-brand-dark" strokeWidth={1.75} /> <span className="flex-1">{t('account.notifications')}</span>
            {unread > 0 && <span className="rounded-full bg-brand-dark px-2 text-xs font-medium text-white tabular">{unread}</span>}
            <ChevronRight className="h-4 w-4 text-ink/30" />
          </button>
          <div className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium">
            <Globe className="h-5 w-5 text-brand-dark" strokeWidth={1.75} /> <span className="flex-1">{t('account.language')}</span>
            <div className="flex rounded-full bg-paper p-0.5">
              {(['id', 'en'] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)} className={cx('rounded-full px-3 py-1 text-xs font-medium transition', lang === l ? 'bg-brand-dark text-white' : 'text-ink/60')}>{t(`common.lang.${l}`)}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5 text-sm">
            <ShieldCheck className="h-5 w-5 text-[#17703D]" strokeWidth={1.75} />
            <span className="flex-1 text-ink/60">{t('account.verified')}</span>
          </div>
        </Card>

        <button onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-full border border-line bg-white py-3 text-sm font-medium text-[#B4192A] hover:border-ink/25">
          <LogOut className="h-4 w-4" /> {t('account.logout')}
        </button>
        <p className="pt-1 text-center text-xs text-ink/40">{t('account.version')}</p>
      </ScreenBody>
    </div>
  );
}
