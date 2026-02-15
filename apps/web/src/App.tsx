import { Navigate, Route, Routes } from 'react-router-dom';
import RequireAuth from './components/RequireAuth';
import Shell from './components/Shell';
import { getActiveCenter, getSession } from './lib/auth';
import Login from './routes/Login';
import AppDashboard from './routes/AppDashboard';
import Users from './routes/Users';
import Reservations from './routes/Reservations';
import Memberships from './routes/Memberships';
import Reports from './routes/Reports';
import Schedules from './routes/Schedules';
import TimeBlocks from './routes/TimeBlocks';
import Notifications from './routes/Notifications';

function RequireNonMember({ children }: { children: JSX.Element }) {
  const role = getActiveCenter(getSession())?.role ?? 'MEMBER';
  if (role === 'MEMBER') return <Navigate to="/app/reservations" replace />;
  return children;
}

function AppHome() {
  const role = getActiveCenter(getSession())?.role ?? 'MEMBER';
  if (role === 'MEMBER') return <Navigate to="/app/reservations" replace />;
  return <AppDashboard />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<Shell />}>
          <Route path="/app" element={<AppHome />} />
          <Route path="/app/users" element={<RequireNonMember><Users /></RequireNonMember>} />
          <Route path="/app/reservations" element={<Reservations />} />
          <Route path="/app/memberships" element={<Memberships />} />
          <Route path="/app/reports" element={<RequireNonMember><Reports /></RequireNonMember>} />
          <Route path="/app/schedules" element={<Schedules />} />
          <Route path="/app/time-blocks" element={<TimeBlocks />} />
          <Route path="/app/notifications" element={<Notifications />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
