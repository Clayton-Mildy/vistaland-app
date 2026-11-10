import { AppBar } from '../../ui/AppBar';
import { EmptyState } from '../../ui/EmptyState';

export function ComingSoon({ name }: { name: string }) {
  return (
    <div>
      <AppBar title={name} />
      <EmptyState title={name} />
    </div>
  );
}
