import { Bell } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate, formatTime } from '../../../domain/clock';
import { tText, useLang, useT } from '../../../i18n';
import { markNotificationsRead } from '../../../store/actions';
import { useNotifications, useResident, useRun, useToday } from '../../../store/hooks';
import { Card } from '../../../ui/Card';
import { cx } from '../../../ui/cx';
import { EmptyState } from '../../../ui/EmptyState';
import { ScreenBody } from '../ui/ScreenBody';
import { ScreenHeader } from '../ui/ScreenHeader';

export default function Notifications() {
  const t = useT();
  const [lang] = useLang();
  const nav = useNavigate();
  const run = useRun();
  const today = useToday();
  const ctx = useResident();
  const list = useNotifications(ctx?.recipientKey);
  const hasUnread = list.some((n) => !n.read);
  useEffect(() => {
    if (!ctx || !hasUnread) return;
    const id = setTimeout(() => run(markNotificationsRead, { to: ctx.recipientKey }), 1500);
    return () => clearTimeout(id);
  }, [ctx, hasUnread, run]);
  // One card per day, newest first (the list already comes newest first).
  const days: { day: string; items: typeof list }[] = [];
  for (const n of list) {
    const day = n.createdAt.slice(0, 10);
    const last = days.at(-1);
    if (last && last.day === day) last.items.push(n);
    else days.push({ day, items: [n] });
  }
  return (
    <div>
      <ScreenHeader title={t('account.notifications')} />
      <ScreenBody>
        {list.length === 0 ? (
          <Card><EmptyState title={t('notifications.empty')} body={t('notifications.emptyBody')} pose="thumbs" /></Card>
        ) : (
          days.map(({ day, items }) => (
            <Card key={day} className="overflow-hidden p-0">
              <p className="px-4 pb-1 pt-3 text-xs font-medium uppercase tracking-[0.08em] text-ink/45">{day === today ? t('common.today') : formatDate(day, lang, 'weekday')}</p>
              <div className="divide-y divide-line">
                {items.map((n) => (
                  <button key={n.id} onClick={() => n.link && nav(n.link)} className={cx('flex w-full gap-3 px-4 py-3.5 text-left', !n.read && 'bg-brand-tint/40')}>
                    <span className={cx('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', n.read ? 'bg-paper text-ink/40' : 'bg-brand-dark text-white')}>
                      <Bell className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cx('block text-sm leading-snug', !n.read && 'font-medium')}>{tText(t, n.text)}</span>
                      <span className="mt-0.5 block text-xs text-ink/45 tabular">{formatTime(n.createdAt)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          ))
        )}
      </ScreenBody>
    </div>
  );
}
