import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getSession, setSession } from '../lib/auth';

function cx(active: boolean) {
  return active
    ? 'rounded-md bg-zinc-800 px-3 py-2 text-sm text-white'
    : 'rounded-md px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white';
}

export default function Shell() {
  const nav = useNavigate();
  const session = getSession();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-semibold tracking-tight">
            BoxMagic Admin
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">{session?.user?.email}</span>
            <button
              className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm hover:bg-zinc-800"
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
            <NavLink to="/app" className={({ isActive }) => cx(isActive)} end>
              Dashboard
            </NavLink>
            <NavLink to="/app/users" className={({ isActive }) => cx(isActive)}>
              Usuarios
            </NavLink>
            <NavLink to="/app/reservations" className={({ isActive }) => cx(isActive)}>
              Reservas
            </NavLink>
            <NavLink to="/app/memberships" className={({ isActive }) => cx(isActive)}>
              Membresias
            </NavLink>
            <NavLink to="/app/reports" className={({ isActive }) => cx(isActive)}>
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

