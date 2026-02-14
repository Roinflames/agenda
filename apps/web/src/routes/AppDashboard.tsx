import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { getSession, setSession } from '../lib/auth';

export default function AppDashboard() {
  const session = getSession();
  const defaultCenterId = session?.centers?.[0]?.id;
  const [centerId, setCenterId] = useState(defaultCenterId ?? '');
  const [centers, setCenters] = useState<Array<any>>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedCenter = useMemo(() => centers.find((c) => c.id === centerId) ?? session?.centers?.[0], [centers, centerId, session]);

  useEffect(() => {
    (async () => {
      const res = await api.centers();
      setCenters(res.centers);
      if (!centerId && res.centers[0]?.id) setCenterId(res.centers[0].id);
      if (session && (!session.centers || session.centers.length === 0)) {
        setSession({ ...session, centers: res.centers });
      }
    })().catch((e: any) => setError(e.message ?? 'Error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!centerId) return;
    setError(null);
    setDashboard(null);
    api
      .centerDashboard(centerId)
      .then(setDashboard)
      .catch((e: any) => setError(e.message ?? 'Error'));
  }, [centerId]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-500">Bienvenido, {session?.user?.name ?? session?.user?.email ?? 'usuario'}. Centro: {selectedCenter?.name ?? '-'}</p>
        </div>
        <label className="block">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Centro</div>
          <select
            className="app-input w-auto"
            value={centerId}
            onChange={(e) => setCenterId(e.target.value)}
          >
            {centers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      {dashboard ? (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="app-card p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Miembros</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{dashboard.metrics.members}</div>
          </div>
          <div className="app-card p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reservas (rango)</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{dashboard.metrics.reservations}</div>
          </div>
          <div className="app-card p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ingresos (cents)</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{dashboard.metrics.revenueCents}</div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-slate-500">Cargando...</div>
      )}
    </div>
  );
}
