import { Navigate, Route, Routes } from 'react-router-dom';
import RequireAuth from './components/RequireAuth';
import Shell from './components/Shell';
import Login from './routes/Login';
import AppDashboard from './routes/AppDashboard';
import Users from './routes/Users';
import Reservations from './routes/Reservations';
import Memberships from './routes/Memberships';
import Reports from './routes/Reports';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<Shell />}>
          <Route path="/app" element={<AppDashboard />} />
          <Route path="/app/users" element={<Users />} />
          <Route path="/app/reservations" element={<Reservations />} />
          <Route path="/app/memberships" element={<Memberships />} />
          <Route path="/app/reports" element={<Reports />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}

