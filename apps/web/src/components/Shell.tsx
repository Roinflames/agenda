import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getSession, setSession } from '../lib/auth';

function navClass(active: boolean) {
  return `app-nav-link ${active ? 'app-nav-link-active' : ''}`;
}

export default function Shell() {
  const nav = useNavigate();
  const session = getSession();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-lg font-bold tracking-tight text-slate-900">
              CentroFit Admin
            </Link>
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              UI v0.4.0
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-slate-600 sm:inline">{session?.user?.email}</span>
            <button
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              onClick={() => {
                setSession(null);
                nav('/login');
              }}
            >
              Salir
            </button>
          </div>
        </div>

        <nav className="mx-auto max-w-6xl px-4 pb-3">
          <div className="flex flex-wrap gap-2">
            <NavLink to="/app" className={({ isActive }) => navClass(isActive)} end>
              Dashboard
            </NavLink>
            <NavLink to="/app/users" className={({ isActive }) => navClass(isActive)}>
              Usuarios
            </NavLink>
            <NavLink to="/app/reservations" className={({ isActive }) => navClass(isActive)}>
              Reservas
            </NavLink>
            <NavLink to="/app/memberships" className={({ isActive }) => navClass(isActive)}>
              Membresias
            </NavLink>
            <NavLink to="/app/schedules" className={({ isActive }) => navClass(isActive)}>
              Horarios
            </NavLink>
            <NavLink to="/app/time-blocks" className={({ isActive }) => navClass(isActive)}>
              Bloqueos
            </NavLink>
            <NavLink to="/app/reports" className={({ isActive }) => navClass(isActive)}>
              Reportes
            </NavLink>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
