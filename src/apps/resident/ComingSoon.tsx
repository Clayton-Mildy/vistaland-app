import { Card } from '../../ui/Card';
import { EmptyState } from '../../ui/EmptyState';
import { ScreenBody } from './ui/ScreenBody';
import { ScreenHeader } from './ui/ScreenHeader';

export function ComingSoon({ name }: { name: string }) {
  return (
    <div>
      <ScreenHeader title={name} />
      <ScreenBody>
        <Card><EmptyState title={name} /></Card>
      </ScreenBody>
    </div>
  );
}
