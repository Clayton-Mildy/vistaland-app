import { createBrowserRouter, Outlet } from 'react-router-dom';
import { Demo } from './apps/launcher/Demo';
import { Launcher } from './apps/launcher/Launcher';
import ResidentApp from './apps/resident/routes';
import { ToastProvider } from './ui/Toast';

const Placeholder = ({ name }: { name: string }) => <div className="p-6 text-sm">{name}</div>;
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
      { path: '/staff/*', element: <Placeholder name="Staff app" /> },
      { path: '/dashboard/*', element: <Placeholder name="Dashboard" /> },
      { path: '/listing/:id', element: <Placeholder name="Public listing" /> },
    ],
  },
]);
