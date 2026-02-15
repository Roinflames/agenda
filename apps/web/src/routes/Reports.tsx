import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getActiveCenter, getSession } from '../lib/auth';

function formatNumber(value: number | null | undefined) {
  if (typeof value !== 'number') return '-';
  return new Intl.NumberFormat('es-CL').format(value);
}

function formatPct(value: number | null | undefined) {
  if (typeof value !== 'number') return 'N/A';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value}%`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Sin fecha de termino';
  return new Date(value).toLocaleDateString('es-CL');
}

function expiryLabel(daysToEnd: number | null | undefined) {
  if (typeof daysToEnd !== 'number') return { text: 'Sin vencimiento', cls: 'bg-slate-100 text-slate-700' };
  if (daysToEnd < 0) return { text: 'Vencido', cls: 'bg-rose-100 text-rose-700' };
  if (daysToEnd <= 7) return { text: 'Vence pronto', cls: 'bg-amber-100 text-amber-700' };
  if (daysToEnd <= 30) return { text: 'Vence este mes', cls: 'bg-sky-100 text-sky-700' };
  return { text: 'Vigente', cls: 'bg-emerald-100 text-emerald-700' };
}

export default function Reports() {
  const centerId = getActiveCenter(getSession())?.id ?? '';
  const [income, setIncome] = useState<any>(null);
  const [reservations, setReservations] = useState<any>(null);
  const [agenda, setAgenda] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState<string>(() => {
    const now = new Date();
    const fromDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);
    return fromDate.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [businessYear, setBusinessYear] = useState<number>(new Date().getUTCFullYear());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!centerId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      api.reportsIncome(centerId, from, to),
      api.reportsReservations(centerId, from, to),
      api.reportsAgenda(centerId, from, to),
      api.reportsBusiness(centerId, businessYear, from, to),
    ])
      .then(([i, r, a, b]) => {
        setIncome(i);
        setReservations(r);
        setAgenda(a);
        setBusiness(b);
      })
      .catch((e: any) => setError(e.message ?? 'Error'))
      .finally(() => setLoading(false));
  }, [centerId, from, to, businessYear]);

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
          <label className="block">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Anio comparativo</div>
            <input
              className="app-input w-28"
              type="number"
              min="2020"
              max="2100"
              value={businessYear}
              onChange={(e) => setBusinessYear(Number(e.target.value) || new Date().getUTCFullYear())}
            />
          </label>
        </div>
      </div>
      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="app-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Ingreso periodo actual
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(business?.income?.yearToDateCents)}</div>
        </div>
        <div className="app-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Mismo periodo anio anterior
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(business?.income?.previousYearTotalCents)}</div>
        </div>
        <div className="app-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Variacion del periodo YoY</div>
          <div className={`mt-2 text-2xl font-bold ${
            (business?.income?.yearlyYoYPct ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {formatPct(business?.income?.yearlyYoYPct)}
          </div>
        </div>
        <div className="app-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Membresias activas</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(business?.memberships?.activeCount)}</div>
        </div>
      </div>

      <div className="app-card p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Ingresos mensuales del rango y comparacion YoY</h3>
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">Mes</th>
                <th className="px-3 py-2">Ingreso {business?.year ?? businessYear}</th>
                <th className="px-3 py-2">Ingreso {business?.previousYear ?? businessYear - 1}</th>
                <th className="px-3 py-2">Variacion</th>
              </tr>
            </thead>
            <tbody>
              {(business?.income?.monthly ?? []).map((row: any) => (
                <tr key={row.month} className="border-t border-slate-100">
                  <td className="px-3 py-2">{row.monthLabel}</td>
                  <td className="px-3 py-2 font-medium text-slate-900">{formatNumber(row.currentCents)}</td>
                  <td className="px-3 py-2">{formatNumber(row.previousCents)}</td>
                  <td className={`px-3 py-2 font-semibold ${typeof row.yoyPct === 'number' && row.yoyPct < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatPct(row.yoyPct)}
                  </td>
                </tr>
              ))}
              {(business?.income?.monthly ?? []).length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={4}>Sin datos</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <div className="app-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Alumnos totales</div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(business?.students?.total)}</div>
        </div>
        <div className="app-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Activos</div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">{formatNumber(business?.students?.active)}</div>
        </div>
        <div className="app-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Inactivos</div>
          <div className="mt-2 text-2xl font-bold text-slate-700">{formatNumber(business?.students?.inactive)}</div>
        </div>
        <div className="app-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Congelados</div>
          <div className="mt-2 text-2xl font-bold text-sky-700">{formatNumber(business?.students?.frozen)}</div>
        </div>
        <div className="app-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suspendidos</div>
          <div className="mt-2 text-2xl font-bold text-rose-600">{formatNumber(business?.students?.suspended)}</div>
        </div>
      </div>

      <div className="app-card p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Evolucion mensual alumnos activos/inactivos</h3>
        <div className="space-y-2 text-sm">
          {(business?.students?.monthlyActivity ?? []).map((row: any) => (
            <div key={row.month} className="flex justify-between border-b border-slate-100 pb-1">
              <span className="text-slate-600">Mes {String(row.month).padStart(2, '0')}</span>
              <span className="font-medium text-slate-900">
                <span className="text-emerald-600">Activos {row.activeStudents}</span> / <span className="text-slate-600">Inactivos {row.inactiveStudents}</span>
              </span>
            </div>
          ))}
          {(business?.students?.monthlyActivity ?? []).length === 0 ? <div className="text-slate-500">Sin datos</div> : null}
        </div>
      </div>

      <div className="app-card p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Termino de plan por alumno</h3>
        <div className="mb-3 grid gap-2 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <div className="text-xs text-slate-500">Vencidos</div>
            <div className="font-semibold text-rose-600">{formatNumber(business?.memberships?.expirationSummary?.expired)}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <div className="text-xs text-slate-500">Vencen en 7 dias</div>
            <div className="font-semibold text-amber-700">{formatNumber(business?.memberships?.expirationSummary?.expiring7)}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <div className="text-xs text-slate-500">Vencen en 30 dias</div>
            <div className="font-semibold text-sky-700">{formatNumber(business?.memberships?.expirationSummary?.expiring30)}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <div className="text-xs text-slate-500">Sin fecha termino</div>
            <div className="font-semibold text-slate-700">{formatNumber(business?.memberships?.expirationSummary?.noEndDate)}</div>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">Alumno</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Termina</th>
                <th className="px-3 py-2">Dias restantes</th>
                <th className="px-3 py-2">Situacion</th>
              </tr>
            </thead>
            <tbody>
              {(business?.memberships?.expiring ?? []).map((m: any) => (
                <tr key={`${m.userId}-${m.planName}-${m.endsAt ?? 'open'}`} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-900">{m.userName}</div>
                    <div className="text-xs text-slate-500">{m.userEmail}</div>
                  </td>
                  <td className="px-3 py-2">{m.memberStatus}</td>
                  <td className="px-3 py-2">{m.planName}</td>
                  <td className="px-3 py-2">{formatDate(m.endsAt)}</td>
                  <td className={`px-3 py-2 font-semibold ${
                    typeof m.daysToEnd === 'number' && m.daysToEnd < 0 ? 'text-rose-600' : 'text-slate-900'
                  }`}>
                    {typeof m.daysToEnd === 'number' ? m.daysToEnd : 'N/A'}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${expiryLabel(m.daysToEnd).cls}`}>
                      {expiryLabel(m.daysToEnd).text}
                    </span>
                  </td>
                </tr>
              ))}
              {(business?.memberships?.expiring ?? []).length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={6}>Sin membresias activas</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

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
