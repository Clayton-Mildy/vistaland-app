import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardShell } from './DashboardShell';
import CardsOverdue from './pages/CardsOverdue';
import Community from './pages/Community';
import Complaints from './pages/Complaints';
import Finance from './pages/Finance';
import Handover from './pages/Handover';
import IplList from './pages/IplList';
import Leads from './pages/Leads';
import Prepay from './pages/Prepay';
import Report from './pages/Report';
import Residents from './pages/Residents';
import Security from './pages/Security';
import Settings from './pages/Settings';
import Summary from './pages/Summary';
import UnitDetail from './pages/UnitDetail';

export default function DashboardApp() {
  return (
    <Routes>
      <Route element={<DashboardShell />}>
        <Route index element={<Navigate to="summary" replace />} />
        <Route path="summary" element={<Summary />} />
        <Route path="handover" element={<Handover />} />
        <Route path="residents" element={<Residents />} />
        <Route path="leads" element={<Leads />} />
        <Route path="report" element={<Report />} />
        <Route path="ipl" element={<IplList />} />
        <Route path="ipl/:unitId" element={<UnitDetail />} />
        <Route path="prepay" element={<Prepay />} />
        <Route path="complaints" element={<Complaints />} />
        <Route path="cards" element={<CardsOverdue />} />
        <Route path="finance" element={<Finance />} />
        <Route path="security" element={<Security />} />
        <Route path="community" element={<Community />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="summary" replace />} />
      </Route>
    </Routes>
  );
}
