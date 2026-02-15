import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getActiveCenter, getSession } from '../lib/auth';

export default function Reports() {
  const centerId = getActiveCenter(getSession())?.id ?? '';
  const [income, setIncome] = useState<any>(null);
  const [reservations, setReservations] = useState<any>(null);
  const [agenda, setAgenda] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState<string>(() => {
    const now = new Date();
    const fromDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);
    return fromDate.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!centerId) return;
    setLoading(true);
    setError(null);
    Promise.all([api.reportsIncome(centerId, from, to), api.reportsReservations(centerId, from, to), api.reportsAgenda(centerId, from, to)])
      .then(([i, r, a]) => {
        setIncome(i);
        setReservations(r);
        setAgenda(a);
      })
      .catch((e: any) => setError(e.message ?? 'Error'))
      .finally(() => setLoading(false));
  }, [centerId, from, to]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">Reportes</h2>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Desde</div>
            <input className="app-input w-auto" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="block">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Hasta</div>
            <input className="app-input w-auto" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      </div>
      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="app-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reservas totales</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{agenda?.totals?.total ?? (loading ? '...' : 0)}</div>
        </div>
        <div className="app-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Confirmadas</div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">{agenda?.totals?.confirmed ?? (loading ? '...' : 0)}</div>
        </div>
        <div className="app-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Canceladas</div>
          <div className="mt-2 text-2xl font-bold text-rose-600">{agenda?.totals?.canceled ?? (loading ? '...' : 0)}</div>
        </div>
        <div className="app-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">% Cancelacion</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{agenda?.totals?.cancellationRatePct ?? (loading ? '...' : 0)}%</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="app-card p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Ingresos (por dia)</h3>
          <div className="space-y-2 text-sm">
            {income?.series?.map((s: any) => (
              <div key={s.day} className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-600">{s.day}</span>
                <span className="font-medium text-slate-900">{s.revenueCents}</span>
              </div>
            ))}
            {!income ? <div className="text-slate-500">Cargando...</div> : null}
            {income?.series?.length === 0 ? <div className="text-slate-500">Sin datos</div> : null}
          </div>
        </div>
        <div className="app-card p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Reservas (por dia)</h3>
          <div className="space-y-2 text-sm">
            {reservations?.series?.map((s: any) => (
              <div key={s.day} className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-600">{s.day}</span>
                <span className="font-medium text-slate-900">
                  <span className="text-emerald-600">{s.confirmed}</span> / <span className="text-rose-600">{s.canceled}</span>
                </span>
              </div>
            ))}
            {!reservations ? <div className="text-slate-500">Cargando...</div> : null}
            {reservations?.series?.length === 0 ? <div className="text-slate-500">Sin datos</div> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="app-card p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Demanda por dia de semana</h3>
          <div className="space-y-2 text-sm">
            {agenda?.byWeekday?.map((s: any) => (
              <div key={s.day} className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-slate-600">{s.day}</span>
                <span className="font-medium text-slate-900">
                  <span className="text-emerald-600">{s.confirmed}</span> / <span className="text-rose-600">{s.canceled}</span>
                </span>
              </div>
            ))}
            {!agenda ? <div className="text-slate-500">{loading ? 'Cargando...' : 'Sin datos'}</div> : null}
            {agenda?.byWeekday?.length === 0 ? <div className="text-slate-500">Sin datos</div> : null}
          </div>
        </div>
        <div className="app-card p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Top clases (periodo)</h3>
          <div className="space-y-2 text-sm">
            {agenda?.topClasses?.map((c: any) => (
              <div key={`${c.scheduleId ?? 'x'}-${c.name}`} className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                <div className="font-medium text-slate-900">{c.name}</div>
                <div className="mt-1 text-xs text-slate-500">
                  Confirmadas: <span className="font-semibold text-emerald-600">{c.confirmed}</span> | Canceladas:{' '}
                  <span className="font-semibold text-rose-600">{c.canceled}</span>
                  {typeof c.occupancyPct === 'number' ? ` | Ocupacion: ${c.occupancyPct}%` : ''}
                </div>
              </div>
            ))}
            {!agenda ? <div className="text-slate-500">{loading ? 'Cargando...' : 'Sin datos'}</div> : null}
            {agenda?.topClasses?.length === 0 ? <div className="text-slate-500">Sin datos</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
