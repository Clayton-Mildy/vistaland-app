import { Navigate, Route, Routes } from 'react-router-dom';
import { PhoneFrame } from '../../ui/PhoneFrame';
import ContractorHistory from './contractor/History';
import TaskDetail from './contractor/TaskDetail';
import Tasks from './contractor/Tasks';
import Fuel from './gardener/Fuel';
import GardenHistory from './gardener/History';
import MowLog from './gardener/MowLog';
import Today from './gardener/Today';
import SecurityEmergency from './security/Emergency';
import MoveInsToday from './security/MoveInsToday';
import StaffLogin from './StaffLogin';
import { StaffShell } from './StaffShell';

export default function StaffApp() {
  return (
    <PhoneFrame>
      <Routes>
        <Route index element={<StaffLogin />} />
        <Route element={<StaffShell />}>
          <Route path="security/movein" element={<MoveInsToday />} />
          <Route path="security/emergency" element={<SecurityEmergency />} />
          <Route path="mandor/tasks" element={<Tasks />} />
          <Route path="mandor/tasks/:groupId/:complaintId/:findingId" element={<TaskDetail />} />
          <Route path="mandor/history" element={<ContractorHistory />} />
          <Route path="garden/today" element={<Today />} />
          <Route path="garden/mow" element={<MowLog />} />
          <Route path="garden/fuel" element={<Fuel />} />
          <Route path="garden/history" element={<GardenHistory />} />
        </Route>
        <Route path="*" element={<Navigate to="/staff" replace />} />
      </Routes>
    </PhoneFrame>
  );
}
