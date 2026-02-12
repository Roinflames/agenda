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
          <h2 className="text-lg font-semibold">Dashboard</h2>
          <div className="text-sm text-zinc-400">Centro: {selectedCenter?.name ?? '-'}</div>
        </div>
        <label className="block">
          <div className="mb-1 text-xs text-zinc-400">Centro</div>
          <select
            className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
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

      {error ? <div className="rounded-md border border-red-900 bg-red-950 p-3 text-sm">{error}</div> : null}

      {dashboard ? (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="text-xs text-zinc-400">Miembros</div>
            <div className="mt-1 text-2xl font-semibold">{dashboard.metrics.members}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="text-xs text-zinc-400">Reservas (rango)</div>
            <div className="mt-1 text-2xl font-semibold">{dashboard.metrics.reservations}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="text-xs text-zinc-400">Ingresos (cents)</div>
            <div className="mt-1 text-2xl font-semibold">{dashboard.metrics.revenueCents}</div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-zinc-400">Cargando...</div>
      )}
    </div>
  );
}

