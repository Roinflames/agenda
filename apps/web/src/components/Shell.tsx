import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { getActiveCenter, getSession, setSession } from '../lib/auth';
import { getStoredTheme, initTheme, setTheme, toggleTheme, type UiTheme } from '../lib/theme';

function navClass(active: boolean) {
  return `app-nav-link ${active ? 'app-nav-link-active' : ''}`;
}

export default function Shell() {
  const nav = useNavigate();
  const [session, setLocalSession] = useState(getSession());
  const [theme, setThemeState] = useState<UiTheme>(getStoredTheme());
  const activeCenter = useMemo(() => getActiveCenter(session), [session]);
  const role = activeCenter?.role ?? 'MEMBER';
  const isMember = role === 'MEMBER';
  const roleLabel =
    role === 'OWNER' ? 'OWNER' : role === 'ADMIN' ? 'ADMIN' : role === 'STAFF' ? 'STAFF' : 'MEMBER';
  const isSuspended = activeCenter?.serviceStatus === 'SUSPENDED';

  useEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    api
      .centers()
      .then((res) => {
        const current = getSession();
        if (!current) return;
        const next = { ...current, centers: res.centers };
        setSession(next);
        setLocalSession(next);
      })
      .catch(() => {
        // no-op: keep existing session snapshot
      });
  }, []);

  const centers = session?.centers ?? [];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-lg font-bold tracking-tight text-slate-900">
              CentroFit Admin
            </Link>
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              UI v0.5.0
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
              onClick={() => {
                const next = toggleTheme(theme);
                setTheme(next);
                setThemeState(next);
              }}
              title="Alternar tema de fondo"
            >
              Tema: {theme === 'verde' ? 'Verde' : 'Corporativa'}
            </button>
            {centers.length > 1 ? (
              <select
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700"
                value={activeCenter?.id ?? ''}
                onChange={(e) => {
                  const current = getSession();
                  if (!current) return;
                  const next = { ...current, activeCenterId: e.target.value };
                  setSession(next);
                  setLocalSession(next);
                  nav('/app');
                }}
              >
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : null}
            <span className="hidden text-xs text-slate-600 sm:inline">
              {session?.user?.email} · {roleLabel}
            </span>
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

        {!isSuspended ? (
          <nav className="mx-auto max-w-6xl px-4 pb-3">
            <div className="flex flex-wrap gap-2">
              {!isMember ? (
                <NavLink to="/app" className={({ isActive }) => navClass(isActive)} end>
                  Dashboard
                </NavLink>
              ) : null}
              {!isMember ? (
                <NavLink to="/app/users" className={({ isActive }) => navClass(isActive)}>
                  Usuarios
                </NavLink>
              ) : null}
              <NavLink to="/app/reservations" className={({ isActive }) => navClass(isActive)}>
                Reservas
              </NavLink>
              <NavLink to="/app/profile" className={({ isActive }) => navClass(isActive)}>
                Perfil
              </NavLink>
              <NavLink to="/app/memberships" className={({ isActive }) => navClass(isActive)}>
                Membresias
              </NavLink>
              {!isMember ? (
                <NavLink to="/app/schedules" className={({ isActive }) => navClass(isActive)}>
                  Horarios
                </NavLink>
              ) : null}
              {!isMember ? (
                <NavLink to="/app/time-blocks" className={({ isActive }) => navClass(isActive)}>
                  Bloqueos
                </NavLink>
              ) : null}
              {!isMember ? (
                <NavLink to="/app/reports" className={({ isActive }) => navClass(isActive)}>
                  Reportes
                </NavLink>
              ) : null}
              {!isMember ? (
                <NavLink to="/app/notifications" className={({ isActive }) => navClass(isActive)}>
                  Notificaciones
                </NavLink>
              ) : null}
            </div>
          </nav>
        ) : null}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {isSuspended ? (
          <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
            <h2 className="text-xl font-bold text-rose-800">Servicio suspendido por falta de pago</h2>
            <p className="mt-2 text-sm text-rose-700">
              Tu centro esta temporalmente bloqueado. Regulariza la mensualidad para restablecer el acceso.
            </p>
            {activeCenter?.suspensionReason ? (
              <p className="mt-2 text-xs text-rose-600">Motivo: {activeCenter.suspensionReason}</p>
            ) : null}
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
