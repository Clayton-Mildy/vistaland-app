import type { ReactNode } from 'react';
import { Moni, type MoniPose } from './Moni';

export function EmptyState({ title, body, action, pose = 'point' }: { title: ReactNode; body?: ReactNode; action?: ReactNode; pose?: MoniPose }) {
  return (
    <div className="flex flex-col items-center px-6 py-8 text-center">
      <Moni pose={pose} size={84} />
      <h3 className="mt-3 text-base font-bold">{title}</h3>
      {body && <p className="mt-1 text-sm text-ink/55">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
