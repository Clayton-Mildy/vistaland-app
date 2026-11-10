import { useData } from '../../store/hooks';

export function useStaff() {
  return useData((d) => {
    const id = d.session.staff?.staffId;
    return id ? d.staff.find((s) => s.id === id) : undefined;
  });
}
