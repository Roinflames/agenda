import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { getActiveCenter, getSession } from '../lib/auth';

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

function money(v: number, currency = 'clp') {
  try {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: currency.toUpperCase(), maximumFractionDigits: 0 }).format(v);
  } catch {
    return `${v} ${currency}`;
  }
}

function toDayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthLabel(d: Date) {
  return d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
}

function buildCalendarMatrix(cursor: Date) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const start = new Date(year, month, 1 - startOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}

export default function Profile() {
  const session = getSession();
  const center = getActiveCenter(session);
  const centerId = center?.id ?? '';
  const userId = session?.user?.id ?? '';
  const role = center?.role ?? 'MEMBER';
  const isMember = role === 'MEMBER';

  const [me, setMe] = useState<any>(null);
  const [membership, setMembership] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [monthCursor, setMonthCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  useEffect(() => {
    if (!centerId) return;
    setError(null);
    Promise.all([
      api.me(),
      api.currentMembership(centerId),
      api.membershipPayments(centerId, isMember ? userId : undefined),
      api.reservations(centerId, userId),
      isMember ? Promise.resolve({ users: [] as any[] }) : api.users(centerId),
    ])
      .then(([meRes, mRes, pRes, rRes, uRes]) => {
        setMe(meRes.user ?? null);
        setMembership(mRes.membership ?? null);
        const incomingPayments = (pRes.payments ?? [])
          .filter((p: any) => (isMember ? true : p.userId !== userId))
          .filter((p: any) => (isMember ? true : p.status === 'PAID'))
          .slice(0, 25);
        setPayments(incomingPayments);
        setUsers(uRes.users ?? []);
        const upcoming = (rRes.reservations ?? [])
          .filter((r: any) => r.status === 'CONFIRMED' && new Date(r.startAt).getTime() >= Date.now())
          .sort((a: any, b: any) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
        const top = upcoming.slice(0, 8);
        setReservations(top);
        if (top.length > 0) {
          const firstDate = new Date(top[0].startAt);
          setMonthCursor(new Date(firstDate.getFullYear(), firstDate.getMonth(), 1));
          setSelectedDayKey(toDayKey(firstDate));
        } else {
          const now = new Date();
          setMonthCursor(new Date(now.getFullYear(), now.getMonth(), 1));
          setSelectedDayKey(toDayKey(now));
        }
      })
      .catch((e: any) => setError(e.message ?? 'Error cargando perfil'));
  }, [centerId, userId, isMember]);

  const userMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const u of users) map.set(u.id, u);
    return map;
  }, [users]);

  const nextClass = useMemo(() => reservations[0] ?? null, [reservations]);
  const calendarDays = useMemo(() => buildCalendarMatrix(monthCursor), [monthCursor]);
  const reservationsByDay = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const r of reservations) {
      const key = toDayKey(new Date(r.startAt));
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }
    return map;
  }, [reservations]);
  const selectedDayReservations = selectedDayKey ? (reservationsByDay.get(selectedDayKey) ?? []) : [];

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-slate-900">Mi perfil</h2>
      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="app-card p-4 md:col-span-2">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Datos de cuenta</h3>
          <div className="space-y-1 text-sm">
            <div><span className="text-slate-500">Nombre:</span> <span className="font-medium text-slate-900">{me?.name ?? session?.user?.name}</span></div>
            <div><span className="text-slate-500">Email:</span> <span className="font-medium text-slate-900">{me?.email ?? session?.user?.email}</span></div>
            <div><span className="text-slate-500">Centro:</span> <span className="font-medium text-slate-900">{center?.name}</span></div>
            <div><span className="text-slate-500">Rol:</span> <span className="font-medium text-slate-900">{center?.role ?? 'MEMBER'}</span></div>
          </div>
        </div>
        <div className="app-card p-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Próxima reserva</h3>
          {nextClass ? (
            <div className="text-sm">
              <div className="font-semibold text-slate-900">{nextClass.title}</div>
              <div className="text-slate-600">{new Date(nextClass.startAt).toLocaleString('es-CL')}</div>
            </div>
          ) : (
            <div className="text-sm text-slate-500">No tienes reservas próximas.</div>
          )}
        </div>
      </div>

      <div className="app-card p-4">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Mi membresía</h3>
        {membership ? (
          <div className="text-sm">
            <div className="font-semibold text-slate-900">{membership.plan?.name}</div>
            <div className="text-slate-600">
              {money(membership.plan?.priceCents ?? 0, membership.plan?.currency ?? 'clp')} · {membership.plan?.interval}
            </div>
            <div className="text-slate-500">
              Inicio: {new Date(membership.startedAt).toLocaleDateString('es-CL')}
              {membership.endsAt ? ` · Termina: ${new Date(membership.endsAt).toLocaleDateString('es-CL')}` : ''}
            </div>
            <div className="mt-2 text-xs text-slate-500">Puedes cambiar tu plan en la pestaña Membresias.</div>
          </div>
        ) : (
          <div className="text-sm text-slate-500">No tienes membresía activa.</div>
        )}
      </div>

      <div className="app-card p-4">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {isMember ? 'Historial de pagos (últimos 10)' : 'Pagos recibidos (últimos 25)'}
        </h3>
        {payments.length === 0 ? (
          <div className="text-sm text-slate-500">{isMember ? 'Sin pagos registrados.' : 'Sin pagos recibidos registrados.'}</div>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                <div>
                  <div className="font-medium text-slate-900">{money(p.amountCents ?? 0, p.currency ?? 'clp')}</div>
                  {!isMember ? (
                    <div className="text-xs text-slate-600">
                      {userMap.get(p.userId)?.name ?? 'Alumno'} · {userMap.get(p.userId)?.email ?? p.userId}
                    </div>
                  ) : null}
                  <div className="text-xs text-slate-500">{new Date(p.createdAt).toLocaleString('es-CL')}</div>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${p.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="app-card p-4">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Próximas reservas (8)</h3>
        {reservations.length === 0 ? (
          <div className="text-sm text-slate-500">No tienes reservas próximas.</div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <button
                className="app-btn-sm"
                onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              >
                Anterior
              </button>
              <div className="text-sm font-semibold text-slate-700">{monthLabel(monthCursor)}</div>
              <button
                className="app-btn-sm"
                onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              >
                Siguiente
              </button>
            </div>

            <div className="overflow-auto">
              <div className="min-w-[640px]">
                <div className="grid grid-cols-7 gap-1">
                  {DAY_LABELS.map((d) => (
                    <div key={d} className="px-2 py-1 text-center text-xs font-semibold text-slate-500">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day) => {
                    const key = toDayKey(day);
                    const inMonth = day.getMonth() === monthCursor.getMonth();
                    const dayRes = reservationsByDay.get(key) ?? [];
                    const isSelected = selectedDayKey === key;
                    return (
                      <button
                        key={key}
                        className={`min-h-[70px] rounded-lg border px-2 py-1 text-left text-xs transition ${
                          isSelected ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
                        } ${!inMonth ? 'opacity-40' : ''}`}
                        onClick={() => setSelectedDayKey(key)}
                      >
                        <div className="font-semibold text-slate-700">{day.getDate()}</div>
                        {dayRes.length > 0 ? (
                          <div className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            {dayRes.length} reserva{dayRes.length > 1 ? 's' : ''}
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Detalle {selectedDayKey ?? ''}
              </div>
              {selectedDayReservations.length === 0 ? (
                <div className="text-sm text-slate-500">Sin reservas para este día.</div>
              ) : (
                <div className="space-y-2">
                  {selectedDayReservations.map((r) => (
                    <div key={r.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                      <div className="font-medium text-slate-900">{r.title}</div>
                      <div className="text-xs text-slate-500">
                        {new Date(r.startAt).toLocaleString('es-CL')} - {new Date(r.endAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
