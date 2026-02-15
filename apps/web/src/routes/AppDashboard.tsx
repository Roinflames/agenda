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
  const [updatingService, setUpdatingService] = useState(false);
  const [clientCenters, setClientCenters] = useState<Array<any>>([]);
  const [loadingClientCenters, setLoadingClientCenters] = useState(false);

  const selectedCenter = useMemo(() => centers.find((c) => c.id === centerId) ?? session?.centers?.[0], [centers, centerId, session]);
  const selectedRole = selectedCenter?.role ?? session?.centers?.find((c) => c.id === centerId)?.role;
  const canManageService = selectedRole === 'OWNER';
  const isClientManager = useMemo(
    () => Boolean((session?.centers ?? []).some((c) => c.role === 'OWNER' && c.slug === 'comunidad-virtual-demo')),
    [session],
  );
  const formatMetric = (value: number | null | undefined) => (typeof value === 'number' ? value : '-');

  useEffect(() => {
    (async () => {
      const res = await api.centers();
      setCenters(res.centers);
      if (!centerId && res.centers[0]?.id) setCenterId(res.centers[0].id);
      if (session && (!session.centers || session.centers.length === 0)) {
        setSession({ ...session, centers: res.centers });
      }
      if (isClientManager) {
        setLoadingClientCenters(true);
        try {
          const clients = await api.clientCentersForSuspension();
          setClientCenters(clients.centers ?? []);
        } finally {
          setLoadingClientCenters(false);
        }
      }
    })().catch((e: any) => setError(e.message ?? 'Error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClientManager]);

  useEffect(() => {
    if (!centerId) return;
    setError(null);
    setDashboard(null);
    api
      .centerDashboard(centerId)
      .then(setDashboard)
      .catch((e: any) => setError(e.message ?? 'Error'));
  }, [centerId]);

  async function toggleCenterServiceStatus() {
    if (!centerId || !selectedCenter || !canManageService) return;
    const isSuspended = selectedCenter.serviceStatus === 'SUSPENDED';
    if (!isSuspended) {
      const confirmed = window.confirm('Se suspendera el servicio del centro. Los usuarios no podran operar hasta reactivarlo. Deseas continuar?');
      if (!confirmed) return;
    }

    const suspensionReason = !isSuspended
      ? (window.prompt('Motivo de suspension (opcional):', selectedCenter.suspensionReason ?? 'Mensualidad pendiente de pago') ?? '')
      : undefined;
    const nextStatus = isSuspended ? 'ACTIVE' : 'SUSPENDED';

    setUpdatingService(true);
    setError(null);
    try {
      const res = await api.updateCenterServiceStatus(centerId, {
        serviceStatus: nextStatus,
        ...(nextStatus === 'SUSPENDED' ? { suspensionReason } : {}),
      });
      setCenters((prev) => prev.map((c) => (c.id === centerId ? { ...c, ...res.center } : c)));
      if (session?.centers?.length) {
        const nextSession = {
          ...session,
          centers: session.centers.map((c) => (c.id === centerId ? { ...c, ...res.center } : c)),
        };
        setSession(nextSession);
      }
      if (nextStatus === 'ACTIVE') {
        const fresh = await api.centerDashboard(centerId);
        setDashboard(fresh);
      } else {
        setDashboard(null);
      }
    } catch (e: any) {
      setError(e.message ?? 'No se pudo cambiar el estado del servicio');
    } finally {
      setUpdatingService(false);
    }
  }

  async function toggleClientServiceStatus(center: any) {
    const isSuspended = center.serviceStatus === 'SUSPENDED';
    if (!isSuspended) {
      const confirmed = window.confirm(`Se suspendera el servicio de "${center.name}". Deseas continuar?`);
      if (!confirmed) return;
    }
    const suspensionReason = !isSuspended
      ? (window.prompt('Motivo de suspension (opcional):', center.suspensionReason ?? 'Mensualidad pendiente de pago') ?? '')
      : undefined;
    const nextStatus = isSuspended ? 'ACTIVE' : 'SUSPENDED';
    setUpdatingService(true);
    setError(null);
    try {
      const res = await api.updateCenterServiceStatus(center.id, {
        serviceStatus: nextStatus,
        ...(nextStatus === 'SUSPENDED' ? { suspensionReason } : {}),
      });
      setClientCenters((prev) => prev.map((c) => (c.id === center.id ? { ...c, ...res.center } : c)));
    } catch (e: any) {
      setError(e.message ?? 'No se pudo cambiar el estado del servicio');
    } finally {
      setUpdatingService(false);
    }
  }

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

      {selectedCenter?.serviceStatus === 'SUSPENDED' ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Servicio suspendido por morosidad.
          {selectedCenter?.suspensionReason ? ` Motivo: ${selectedCenter.suspensionReason}` : ''}
        </div>
      ) : null}

      {canManageService ? (
        <div className="flex justify-end">
          <button
            type="button"
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
              selectedCenter?.serviceStatus === 'SUSPENDED'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
            } disabled:cursor-not-allowed disabled:opacity-60`}
            onClick={toggleCenterServiceStatus}
            disabled={updatingService}
          >
            {updatingService
              ? 'Guardando...'
              : selectedCenter?.serviceStatus === 'SUSPENDED'
                ? 'Reactivar servicio'
                : 'Suspender servicio'}
          </button>
        </div>
      ) : null}

      {isClientManager ? (
        <div className="app-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Suspensión de centros cliente</h3>
            {loadingClientCenters ? <span className="text-xs text-slate-400">Cargando...</span> : null}
          </div>
          <div className="space-y-2">
            {clientCenters.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{c.name}</div>
                  <div className="text-xs text-slate-500">{c.slug}</div>
                  {c.suspensionReason ? <div className="text-xs text-rose-600">Motivo: {c.suspensionReason}</div> : null}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      c.serviceStatus === 'SUSPENDED' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {c.serviceStatus === 'SUSPENDED' ? 'Suspendido' : 'Activo'}
                  </span>
                  <button
                    type="button"
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      c.serviceStatus === 'SUSPENDED'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                    disabled={updatingService}
                    onClick={() => toggleClientServiceStatus(c)}
                  >
                    {c.serviceStatus === 'SUSPENDED' ? 'Reactivar' : 'Suspender'}
                  </button>
                </div>
              </div>
            ))}
            {!loadingClientCenters && clientCenters.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                No hay centros cliente para gestionar.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
      {dashboard?.scope === 'MEMBER' ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Vista de miembro: solo puedes ver tus reservas del periodo.
        </div>
      ) : null}

      {dashboard ? (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="app-card p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Miembros</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{formatMetric(dashboard.metrics.members)}</div>
          </div>
          <div className="app-card p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {dashboard?.scope === 'MEMBER' ? 'Mis reservas (rango)' : 'Reservas (rango)'}
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{formatMetric(dashboard.metrics.reservations)}</div>
          </div>
          <div className="app-card p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ingresos (cents)</div>
            <div className="mt-2 text-3xl font-bold text-slate-900">{formatMetric(dashboard.metrics.revenueCents)}</div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-slate-500">Cargando...</div>
      )}
    </div>
  );
}
