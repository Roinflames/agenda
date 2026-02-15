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
import Profile from './routes/Profile';

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
          <Route path="/app/profile" element={<Profile />} />
          <Route path="/app/memberships" element={<Memberships />} />
          <Route path="/app/reports" element={<RequireNonMember><Reports /></RequireNonMember>} />
          <Route path="/app/schedules" element={<RequireNonMember><Schedules /></RequireNonMember>} />
          <Route path="/app/time-blocks" element={<RequireNonMember><TimeBlocks /></RequireNonMember>} />
          <Route path="/app/notifications" element={<RequireNonMember><Notifications /></RequireNonMember>} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
