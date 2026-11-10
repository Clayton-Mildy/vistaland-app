import { createBrowserRouter, Outlet } from 'react-router-dom';
import { Demo } from './apps/launcher/Demo';
import { Launcher } from './apps/launcher/Launcher';
import ResidentApp from './apps/resident/routes';
import ListingPage from './apps/public/ListingPage';
import StaffApp from './apps/staff/routes';
import DashboardApp from './apps/dashboard/routes';
import { ToastProvider } from './ui/Toast';

const Root = () => (
  <ToastProvider>
    <Outlet />
  </ToastProvider>
);

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { path: '/', element: <Launcher /> },
      { path: '/demo', element: <Demo /> },
      { path: '/app/*', element: <ResidentApp /> },
      { path: '/staff/*', element: <StaffApp /> },
      { path: '/dashboard/*', element: <DashboardApp /> },
      { path: '/listing/:id', element: <ListingPage /> },
    ],
  },
]);
