import { createBrowserRouter } from 'react-router-dom';

const Placeholder = ({ name }: { name: string }) => <div className="p-6 text-sm">{name}</div>;

export const router = createBrowserRouter([
  { path: '/', element: <Placeholder name="Launcher" /> },
  { path: '/demo', element: <Placeholder name="Demo" /> },
  { path: '/app/*', element: <Placeholder name="Resident app" /> },
  { path: '/staff/*', element: <Placeholder name="Staff app" /> },
  { path: '/dashboard/*', element: <Placeholder name="Dashboard" /> },
  { path: '/listing/:id', element: <Placeholder name="Public listing" /> },
]);
