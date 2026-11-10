import { Link } from 'react-router-dom';
import { useData } from '../../../store/hooks';

export function UnitLink({ unitId, className }: { unitId: string; className?: string }) {
  const code = useData((d) => d.units.find((u) => u.id === unitId)?.code ?? unitId);
  return <Link to={`/dashboard/ipl/${unitId}`} className={className ?? 'font-bold hover:text-brand hover:underline'}>{code}</Link>;
}
