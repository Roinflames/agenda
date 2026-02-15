import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getActiveCenter, getSession } from '../lib/auth';

export default function Memberships() {
  const session = getSession();
  const activeCenter = getActiveCenter(session);
  const centerId = activeCenter?.id ?? '';
  const role = activeCenter?.role ?? 'MEMBER';
  const isMember = role === 'MEMBER';
  const [plans, setPlans] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [myMembership, setMyMembership] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [savingAssign, setSavingAssign] = useState(false);
  const [changingPlanId, setChangingPlanId] = useState<string | null>(null);

  const [planForm, setPlanForm] = useState({
    name: '',
    priceCents: '300000',
    currency: 'clp',
    interval: 'MONTHLY' as 'MONTHLY' | 'YEARLY',
  });

  const [assignForm, setAssignForm] = useState({
    userId: '',
    planId: '',
    endsAt: '',
  });

  async function loadAll() {
    if (!centerId) return;
    if (isMember) {
      const [planRes, myRes] = await Promise.all([api.membershipPlans(centerId), api.currentMembership(centerId)]);
      setPlans(planRes.plans ?? []);
      setMyMembership(myRes.membership ?? null);
      setUsers([]);
      return;
    }

    const [planRes, userRes] = await Promise.all([api.membershipPlans(centerId), api.users(centerId)]);
    setPlans(planRes.plans ?? []);
    setUsers(userRes.users ?? []);
    setMyMembership(null);
  }

  useEffect(() => {
    loadAll().catch((e: any) => setError(e.message ?? 'Error'));
  }, [centerId, isMember]);

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-slate-900">Membresias</h2>
      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      {isMember ? (
        <>
          <div className="app-card p-4">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Mi membresía actual</h3>
            {myMembership ? (
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="text-lg font-semibold text-slate-900">{myMembership.plan?.name ?? 'Plan'}</div>
                <div className="mt-1 text-sm text-slate-600">
                  {myMembership.plan?.priceCents} {myMembership.plan?.currency} · {myMembership.plan?.interval}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Activa desde {new Date(myMembership.startedAt).toLocaleDateString('es-CL')}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                Aun no tienes una membresía activa.
              </div>
            )}
          </div>

          <div className="app-card p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Cambiar de membresía</h3>
            <div className="space-y-2">
              {plans.filter((p) => p.isActive).map((p) => {
                const isCurrent = myMembership?.planId === p.id;
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{p.name}</div>
                      <div className="text-xs text-slate-500">
                        {p.priceCents} {p.currency} · {p.interval}
                      </div>
                    </div>
                    <button
                      className={isCurrent ? 'app-btn-sm opacity-60' : 'app-btn-sm'}
                      disabled={isCurrent || changingPlanId === p.id}
                      onClick={async () => {
                        setError(null);
                        setChangingPlanId(p.id);
                        try {
                          await api.changeMyMembershipPlan({ centerId, planId: p.id });
                          await loadAll();
                        } catch (e: any) {
                          setError(e.message ?? 'No se pudo cambiar el plan');
                        } finally {
                          setChangingPlanId(null);
                        }
                      }}
                    >
                      {isCurrent ? 'Actual' : changingPlanId === p.id ? 'Cambiando...' : 'Cambiar'}
                    </button>
                  </div>
                );
              })}
              {plans.filter((p) => p.isActive).length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                  No hay planes activos disponibles.
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="app-card p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Crear plan</h3>
            <div className="space-y-3">
              <input className="app-input" placeholder="Nombre plan" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <input className="app-input" placeholder="Precio (cents)" value={planForm.priceCents} onChange={(e) => setPlanForm({ ...planForm, priceCents: e.target.value })} />
                <input className="app-input" placeholder="Moneda" value={planForm.currency} onChange={(e) => setPlanForm({ ...planForm, currency: e.target.value })} />
              </div>
              <select className="app-input" value={planForm.interval} onChange={(e) => setPlanForm({ ...planForm, interval: e.target.value as any })}>
                <option value="MONTHLY">MONTHLY</option>
                <option value="YEARLY">YEARLY</option>
              </select>
              <button
                className="app-btn-primary w-full"
                disabled={savingPlan || !planForm.name || !planForm.priceCents}
                onClick={async () => {
                  setError(null);
                  setSavingPlan(true);
                  try {
                    await api.createMembershipPlan({
                      centerId,
                      name: planForm.name.trim(),
                      priceCents: Number(planForm.priceCents),
                      currency: planForm.currency.trim() || undefined,
                      interval: planForm.interval,
                      isActive: true,
                    });
                    setPlanForm({ ...planForm, name: '' });
                    await loadAll();
                  } catch (e: any) {
                    setError(e.message ?? 'No se pudo crear plan');
                  } finally {
                    setSavingPlan(false);
                  }
                }}
              >
                {savingPlan ? 'Guardando...' : 'Crear plan'}
              </button>
            </div>
          </div>

          <div className="app-card p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Asignar membresia</h3>
            <div className="space-y-3">
              <select className="app-input" value={assignForm.userId} onChange={(e) => setAssignForm({ ...assignForm, userId: e.target.value })}>
                <option value="">Seleccionar usuario</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
              <select className="app-input" value={assignForm.planId} onChange={(e) => setAssignForm({ ...assignForm, planId: e.target.value })}>
                <option value="">Seleccionar plan</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <input className="app-input" type="datetime-local" value={assignForm.endsAt} onChange={(e) => setAssignForm({ ...assignForm, endsAt: e.target.value })} />
              <button
                className="app-btn-primary w-full"
                disabled={savingAssign || !assignForm.userId || !assignForm.planId}
                onClick={async () => {
                  setError(null);
                  setSavingAssign(true);
                  try {
                    await api.assignMembership({
                      centerId,
                      userId: assignForm.userId,
                      planId: assignForm.planId,
                      endsAt: assignForm.endsAt ? new Date(assignForm.endsAt).toISOString() : undefined,
                    });
                    setAssignForm({ userId: '', planId: '', endsAt: '' });
                  } catch (e: any) {
                    setError(e.message ?? 'No se pudo asignar membresia');
                  } finally {
                    setSavingAssign(false);
                  }
                }}
              >
                {savingAssign ? 'Asignando...' : 'Asignar membresia'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="app-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Precio</th>
              <th className="px-3 py-2">Intervalo</th>
              <th className="px-3 py-2">Activo</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id} className="border-t border-slate-200">
                <td className="px-3 py-2">{p.name}</td>
                <td className="px-3 py-2">{p.priceCents} {p.currency}</td>
                <td className="px-3 py-2">{p.interval}</td>
                <td className="px-3 py-2">{p.isActive ? 'Si' : 'No'}</td>
              </tr>
            ))}
            {plans.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-slate-500" colSpan={4}>Sin planes</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
