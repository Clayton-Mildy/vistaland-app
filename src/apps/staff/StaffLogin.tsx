import { ChevronRight } from 'lucide-react';
import { useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { STAFF_PERSONAS } from '../../data/personas';
import { useT } from '../../i18n';
import { startStaffSession } from '../../store/actions';
import { useData, useRun } from '../../store/hooks';
import { DevelopedBy } from '../../ui/Footer';
import { LangToggle } from '../../ui/LangToggle';
import { MONI_ICON } from '../../ui/Moni';
import { roleIcon } from './StaffShell';
import { useStaff } from './hooks';

export const HOME_BY_ROLE = { security: '/staff/security/movein', mandor: '/staff/mandor/tasks', gardener: '/staff/garden/today' } as const;

export default function StaffLogin() {
  const t = useT();
  const nav = useNavigate();
  const run = useRun();
  const [params] = useSearchParams();
  const staffList = useData((d) => d.staff);
  const current = useStaff();
  const pick = (id: string) => {
    run(startStaffSession, { staffId: id });
    const s = staffList.find((x) => x.id === id)!;
    nav(HOME_BY_ROLE[s.role], { replace: true });
  };
  useEffect(() => {
    const id = params.get('staff');
    if (id && staffList.some((s) => s.id === id)) pick(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (current && !params.get('staff')) return <Navigate to={HOME_BY_ROLE[current.role]} replace />;
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white px-6 pt-8 md:pt-12">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-extrabold"><img src={MONI_ICON} alt="" className="h-8 w-8 rounded-lg" />VHome {t('staff.brand')}</span>
        <LangToggle />
      </div>
      <h1 className="mt-6 text-2xl font-extrabold">{t('staff.loginTitle')}</h1>
      <p className="mt-1 text-sm text-ink/55">{t('staff.loginBody')}</p>
      <div className="mt-5 space-y-2.5">
        {STAFF_PERSONAS.map((p) => {
          const s = staffList.find((x) => x.id === p.id)!;
          const Icon = roleIcon[s.role];
          return (
            <button key={p.id} onClick={() => pick(p.id)} className="flex w-full items-center gap-3 rounded-2xl border border-line p-4 text-left hover:border-ink/30">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-paper text-ink/70"><Icon className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block font-bold">{p.name}</span><span className="block text-xs text-ink/50">{t(p.roleKey)} · {t(p.scenarioKey)}</span></span>
              <ChevronRight className="h-4 w-4 text-ink/30" />
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-center text-xs text-ink/40">{t('staff.pinNote')}</p>
      <div className="flex-1" />
      <DevelopedBy className="py-5" />
    </div>
  );
}
