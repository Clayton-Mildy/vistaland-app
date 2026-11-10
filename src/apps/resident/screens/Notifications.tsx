import { Bell } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDateTime } from '../../../domain/clock';
import { tText, useLang, useT } from '../../../i18n';
import { markNotificationsRead } from '../../../store/actions';
import { useNotifications, useResident, useRun } from '../../../store/hooks';
import { AppBar } from '../../../ui/AppBar';
import { cx } from '../../../ui/cx';
import { EmptyState } from '../../../ui/EmptyState';

export default function Notifications() {
  const t = useT();
  const [lang] = useLang();
  const nav = useNavigate();
  const run = useRun();
  const ctx = useResident();
  const list = useNotifications(ctx?.recipientKey);
  const hasUnread = list.some((n) => !n.read);
  useEffect(() => {
    if (!ctx || !hasUnread) return;
    const id = setTimeout(() => run(markNotificationsRead, { to: ctx.recipientKey }), 1500);
    return () => clearTimeout(id);
  }, [ctx, hasUnread, run]);
  return (
    <div>
      <AppBar title={t('account.notifications')} />
      {list.length === 0 ? (
        <EmptyState title={t('notifications.empty')} body={t('notifications.emptyBody')} pose="thumbs" />
      ) : (
        <ul className="divide-y divide-line bg-white">
          {list.map((n) => (
            <li key={n.id}>
              <button onClick={() => n.link && nav(n.link)} className={cx('flex w-full gap-3 px-4 py-3.5 text-left', !n.read && 'bg-brand-tint/40')}>
                <span className={cx('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', n.read ? 'bg-paper text-ink/40' : 'bg-brand text-white')}>
                  <Bell className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cx('block text-sm leading-snug', !n.read && 'font-semibold')}>{tText(t, n.text)}</span>
                  <span className="mt-0.5 block text-[11px] text-ink/45">{formatDateTime(n.createdAt, lang)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
