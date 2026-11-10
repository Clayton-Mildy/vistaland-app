import { Bell, Check, ChevronRight, Globe, Home, LogOut, Phone, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLang, useT } from '../../../i18n';
import { endResidentSession, switchUnit } from '../../../store/actions';
import { useData, useNotifications, useResident, useRun } from '../../../store/hooks';
import { AppBar } from '../../../ui/AppBar';
import { Avatar } from '../../../ui/Avatar';
import { Card } from '../../../ui/Card';
import { cx } from '../../../ui/cx';
import { StatusPill } from '../../../ui/StatusPill';

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
    <div className="pb-6">
      <AppBar back={false} title={t('account.title')} />
      <div className="space-y-4 px-4 pt-4">
        <Card className="flex items-center gap-3">
          <Avatar name={ctx.name} size={52} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">{ctx.name}</p>
            <p className="flex items-center gap-1 text-xs text-ink/50"><Phone className="h-3 w-3" /> {ctx.phone}</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              <StatusPill tone={ctx.role === 'renter' ? 'gold' : 'brand'}>{ctx.role === 'renter' ? t('account.renterOf', { owner: ctx.ownerName }) : t('role.owner')}</StatusPill>
              <StatusPill tone="neutral">{t(`segment.${ctx.segment}`)}</StatusPill>
            </div>
          </div>
        </Card>

        <div>
          <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-ink/45">{t('account.units')}</p>
          <Card className="divide-y divide-line p-0">
            {ctx.unitIds.map((id) => {
              const u = units.find((x) => x.id === id)!;
              const active = id === ctx.unit.id;
              return (
                <button key={id} disabled={active} onClick={() => run(switchUnit, { unitId: id })} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-tint text-brand-dark"><Home className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{u.code} · {types.find((x) => x.id === u.typeId)?.name}</span>
                    <span className="block text-xs text-ink/50">{ctx.project.name} · {t(`occupancy.${u.occupancy}`)}</span>
                  </span>
                  {active ? <Check className="h-4 w-4 text-brand" /> : <span className="text-xs font-semibold text-brand-dark">{t('account.switch')}</span>}
                </button>
              );
            })}
          </Card>
          {ctx.role === 'renter' && ctx.renter && <p className="mt-2 px-1 text-xs text-ink/50">{t('account.lease', { start: ctx.renter.lease.start, end: ctx.renter.lease.end })}</p>}
        </div>

        <Card className="divide-y divide-line p-0">
          <button onClick={() => nav('/app/notifications')} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-semibold">
            <Bell className="h-5 w-5 text-ink/50" /> <span className="flex-1">{t('account.notifications')}</span>
            {unread > 0 && <span className="rounded-full bg-brand px-2 text-xs font-bold text-white">{unread}</span>}
            <ChevronRight className="h-4 w-4 text-ink/30" />
          </button>
          <div className="flex items-center gap-3 px-4 py-3.5 text-sm font-semibold">
            <Globe className="h-5 w-5 text-ink/50" /> <span className="flex-1">{t('account.language')}</span>
            <div className="flex gap-1">
              {(['id', 'en'] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)} className={cx('rounded-lg px-2.5 py-1 text-xs font-bold', lang === l ? 'bg-ink text-white' : 'bg-paper text-ink/60')}>{t(`common.lang.${l}`)}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5 text-sm">
            <ShieldCheck className="h-5 w-5 text-[#17703D]" />
            <span className="flex-1 text-ink/60">{t('account.verified')}</span>
          </div>
        </Card>

        <button onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-white py-3.5 text-sm font-bold text-[#B4192A]">
          <LogOut className="h-4 w-4" /> {t('account.logout')}
        </button>
        <p className="text-center text-[11px] text-ink/35">VHome prototype · v0.1</p>
      </div>
    </div>
  );
}
