import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getSession } from '../lib/auth';

export default function RequireAuth() {
  const loc = useLocation();
  const s = getSession();
  if (!s?.accessToken) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <Outlet />;
}

