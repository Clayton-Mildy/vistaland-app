import { CheckCircle2, Wifi as WifiIcon } from 'lucide-react';
import { useState } from 'react';
import { WIFI_SLOTS } from '../../../data/content';
import { addDays, dayName, formatDate } from '../../../domain/clock';
import { formatRp } from '../../../domain/money';
import { useLang, useT } from '../../../i18n';
import { requestWifi } from '../../../store/actions';
import { useData, useResident, useRun, useToday } from '../../../store/hooks';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { cx } from '../../../ui/cx';
import { StatusPill } from '../../../ui/StatusPill';
import { useToast } from '../../../ui/Toast';
import { ScreenBody } from '../ui/ScreenBody';
import { ScreenHeader } from '../ui/ScreenHeader';

export default function Wifi() {
  const t = useT();
  const [lang] = useLang();
  const run = useRun();
  const toast = useToast();
  const today = useToday();
  const ctx = useResident()!;
  const s = ctx.settings.wifi;
  const sub = useData((d) => d.wifi.find((w) => w.unitId === ctx.unit.id));
  const [pkg, setPkg] = useState(s.packages.find((p) => p.popular)?.id ?? s.packages[0].id);
  const days = Array.from({ length: 5 }, (_, i) => addDays(today, i + 1));
  const [day, setDay] = useState(days[0]);
  const [slot, setSlot] = useState<string>(WIFI_SLOTS[1]);
  const chosen = s.packages.find((p) => p.id === pkg)!;
  const current = sub && s.packages.find((p) => p.id === sub.packageId);

  return (
    <div>
      <ScreenHeader
        title={t('wifi.title')}
        eyebrow="WiFi NAV1"
        figure={sub && current ? `${current.name} · ${current.mbps} Mbps` : s.promoEnabled && s.freeMonths > 0 ? t('wifi.promoTitle', { n: s.freeMonths }) : undefined}
        sub={sub && current ? t(`status.wifi.${sub.status === 'installed' ? 'active' : sub.status}`) : s.promoEnabled && s.freeMonths > 0 ? t('wifi.promoBody', { n: s.freeMonths + 1 }) : undefined}
      />
      <ScreenBody>
        {sub && current ? (
          <Card>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-base font-semibold"><WifiIcon className="h-5 w-5 text-brand-dark" strokeWidth={1.75} />{current.name} · {current.mbps} Mbps</span>
              <StatusPill tone={sub.status === 'installed' ? 'success' : 'info'}>{t(`status.wifi.${sub.status === 'installed' ? 'active' : sub.status}`)}</StatusPill>
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-ink/50">{t('wifi.install')}</dt><dd className="font-medium">{formatDate(sub.installedAt ?? sub.installSlot.date, lang, 'weekday')} · {sub.installSlot.time}</dd></div>
              <div className="flex justify-between"><dt className="text-ink/50">{t('wifi.price')}</dt><dd className="font-medium">{formatRp(current.price)}{t('common.perMonth')}</dd></div>
              {sub.freeUntil && <div className="flex justify-between"><dt className="text-ink/50">{t('wifi.freeUntil')}</dt><dd className="font-medium text-[#17703D]">{formatDate(sub.freeUntil, lang, 'month')}</dd></div>}
            </dl>
            {sub.status !== 'installed' && <p className="mt-3 rounded-xl bg-paper p-3 text-xs text-ink/55">{t('wifi.waiting')}</p>}
            {sub.status === 'installed' && <p className="mt-3 flex items-center gap-1.5 text-xs text-ink/55"><CheckCircle2 className="h-4 w-4 text-[#17703D]" />{t('wifi.billsNote')}</p>}
          </Card>
        ) : (
          <>
            {!(s.promoEnabled && s.freeMonths > 0) && <Card className="text-sm text-ink/60">{t('wifi.noPromo')}</Card>}
            <Card className="divide-y divide-line p-0">
              <h3 className="px-4 pb-2 pt-4 text-base font-semibold">{t('wifi.step1')}</h3>
              {s.packages.map((p) => (
                <button key={p.id} role="radio" aria-checked={pkg === p.id} onClick={() => setPkg(p.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                  <span className={cx('h-5 w-5 shrink-0 rounded-full border-2', pkg === p.id ? 'border-[6px] border-brand-dark' : 'border-line')} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{p.name}</span>
                    <span className="block text-xs text-ink/50">{p.mbps} Mbps{p.popular ? ` · ${t('wifi.popular')}` : ''}</span>
                  </span>
                  <span className="text-sm font-semibold tabular">{formatRp(p.price)}<span className="text-xs font-normal text-ink/45">{t('common.perMonth')}</span></span>
                </button>
              ))}
            </Card>
            <Card>
              <h3 className="text-base font-semibold">{t('wifi.step2')}</h3>
              <div className="mt-3 grid grid-cols-5 gap-1.5">
                {days.map((d) => (
                  <button key={d} onClick={() => setDay(d)} className={cx('rounded-xl border py-2 text-center transition', day === d ? 'border-brand-dark bg-brand-dark text-white' : 'border-line bg-white')}>
                    <span className="block text-xs">{dayName(d, lang)}</span>
                    <span className="block text-lg font-semibold tabular">{Number(d.slice(8))}</span>
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {WIFI_SLOTS.map((x) => (
                  <button key={x} onClick={() => setSlot(x)} className={cx('rounded-xl border py-2.5 text-sm font-medium transition', slot === x ? 'border-brand-dark bg-brand-dark text-white' : 'border-line bg-white')}>{x}</button>
                ))}
              </div>
            </Card>
            <Card>
              <p className="text-base font-semibold">{chosen.name} · {chosen.mbps} Mbps</p>
              <p className="text-sm text-ink/60">{t('wifi.summary', { date: formatDate(day, lang, 'weekday'), time: slot })}</p>
              <p className="text-xs text-ink/50">{s.promoEnabled ? t('wifi.summaryPromo', { n: s.freeMonths, price: formatRp(chosen.price) }) : t('wifi.summaryNoPromo', { price: formatRp(chosen.price) })}</p>
            </Card>
            <Button block size="lg" onClick={() => { run(requestWifi, { unitId: ctx.unit.id, packageId: pkg, date: day, time: slot }); toast.show(t('wifi.requested')); }}>{t('wifi.submit')}</Button>
          </>
        )}
      </ScreenBody>
    </div>
  );
}
