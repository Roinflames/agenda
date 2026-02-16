import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { getActiveCenter, getSession } from '../lib/auth';

type Schedule = {
  id: string;
  name: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  capacity: number;
  isActive: boolean;
};

type Reservation = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
  scheduleId?: string;
  staffId?: string | null;
  userId: string;
};

type TimeBlock = {
  id: string;
  name: string;
  startAt: string;
  endAt: string;
};

type ViewMode = 'month' | 'week';

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00 - 22:00

function toDayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fromDayKey(dayKey: string) {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function monthLabel(d: Date) {
  return d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
}

function weekLabel(start: Date) {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  return `${fmt(start)} — ${fmt(end)}`;
}

function timeRange(startAt: string, endAt: string) {
  const fmt = (s: string) => new Date(s).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  return `${fmt(startAt)} - ${fmt(endAt)}`;
}

function toLocalDateTimeInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getWeekDays(monday: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function parseTime(t: string) {
  const [h] = t.split(':').map(Number);
  return h;
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

function occupancyColor(count: number, capacity: number) {
  const ratio = count / capacity;
  if (ratio >= 1) return 'bg-rose-100 border-rose-300 text-rose-800';
  if (ratio >= 0.7) return 'bg-amber-100 border-amber-300 text-amber-800';
  return 'bg-emerald-100 border-emerald-300 text-emerald-800';
}

function isBlockedSlot(schedule: Schedule, date: Date, blocks: TimeBlock[]) {
  const [sh, sm] = schedule.startTime.split(':').map(Number);
  const [eh, em] = schedule.endTime.split(':').map(Number);
  const slotStart = new Date(date);
  slotStart.setHours(sh, sm, 0, 0);
  const slotEnd = new Date(date);
  slotEnd.setHours(eh, em, 0, 0);

  return blocks.some((b) => {
    const bs = new Date(b.startAt).getTime();
    const be = new Date(b.endAt).getTime();
    return slotStart.getTime() < be && slotEnd.getTime() > bs;
  });
}

function getDayAvailabilitySummary(
  day: Date,
  schedules: Schedule[],
  timeBlocks: TimeBlock[],
  getSlotReservations: (schedule: Schedule, date: Date) => Reservation[],
) {
  const daySchedules = schedules.filter((s) => s.dayOfWeek === day.getDay());
  if (daySchedules.length === 0) {
    return { total: 0, available: 0, fullOrBlocked: 0, freeSeats: 0, totalSeats: 0 };
  }

  let available = 0;
  let fullOrBlocked = 0;
  let freeSeats = 0;
  let totalSeats = 0;

  for (const schedule of daySchedules) {
    totalSeats += schedule.capacity;
    const blocked = isBlockedSlot(schedule, day, timeBlocks);
    if (blocked) {
      fullOrBlocked += 1;
      continue;
    }
    const slotRes = getSlotReservations(schedule, day);
    freeSeats += Math.max(0, schedule.capacity - slotRes.length);
    if (slotRes.length < schedule.capacity) available += 1;
    else fullOrBlocked += 1;
  }

  return {
    total: daySchedules.length,
    available,
    fullOrBlocked,
    freeSeats,
    totalSeats,
  };
}

export default function Reservations() {
  const session = getSession();
  const activeCenter = getActiveCenter(session);
  const centerId = activeCenter?.id ?? '';
  const currentUserId = session?.user?.id ?? '';
  const currentCenterRole = (activeCenter?.role ?? 'MEMBER') as 'OWNER' | 'ADMIN' | 'STAFF' | 'MEMBER';
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [view, setView] = useState<ViewMode>('month');

  // Month view state
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Week view state
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));

  // Detail panel
  const [selectedSlot, setSelectedSlot] = useState<{ schedule: Schedule; date: Date } | null>(null);
  const [selectedDayModal, setSelectedDayModal] = useState<Date | null>(null);
  const [dayModalUserId, setDayModalUserId] = useState('');
  const [dayModalTitle, setDayModalTitle] = useState('');
  const [dayModalSavingScheduleId, setDayModalSavingScheduleId] = useState<string | null>(null);
  const [dayModalError, setDayModalError] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);
  const [selectedDayKey, setSelectedDayKey] = useState(toDayKey(today));

  // Create reservation form (same as original)
  const [form, setForm] = useState(() => {
    const start = new Date();
    start.setHours(start.getHours() + 1, 0, 0, 0);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    return {
      title: '',
      kind: 'CLASS' as 'CLASS' | 'SPACE',
      userId: '',
      startAt: toLocalDateTimeInputValue(start),
      endAt: toLocalDateTimeInputValue(end),
      priceCents: '0',
      currency: 'clp',
    };
  });

  async function loadData() {
    if (!centerId) return;
    try {
      const [s, r, tb, u] = await Promise.all([
        api.schedules(centerId),
        api.reservations(centerId),
        api.timeBlocks(centerId),
        currentCenterRole === 'MEMBER' ? Promise.resolve({ users: [] as any[] }) : api.users(centerId),
      ]);
      setSchedules((s.schedules ?? []).filter((x: Schedule) => x.isActive));
      setReservations(r.reservations ?? []);
      setTimeBlocks(tb.timeBlocks ?? []);
      if (currentCenterRole === 'MEMBER') {
        setUsers([
          {
            id: currentUserId,
            name: session?.user?.name ?? session?.user?.email ?? 'Mi usuario',
            email: session?.user?.email ?? '',
            status: 'ACTIVO',
          },
        ]);
      } else {
        setUsers(u.users ?? []);
      }
    } catch (e: any) {
      setError(e.message ?? 'Error cargando datos');
    }
  }

  useEffect(() => {
    loadData();
  }, [centerId]);

  useEffect(() => {
    if (currentCenterRole === 'MEMBER') {
      setDayModalUserId(currentUserId || '');
      return;
    }
    if (users.length === 0) return;

    setForm((prev) => {
      if (prev.userId && users.some((u) => u.id === prev.userId)) return prev;
      return { ...prev, userId: users[0].id };
    });

    setDayModalUserId((prev) => {
      if (prev && users.some((u) => u.id === prev)) return prev;
      return users[0].id;
    });
  }, [users, currentCenterRole, currentUserId]);

  // Maps
  const userMap = useMemo(() => {
    const m = new Map<string, any>();
    for (const u of users) m.set(u.id, u);
    return m;
  }, [users]);

  const reservationMap = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    for (const r of reservations) {
      if (r.status === 'CANCELED') continue;
      const key = `${r.scheduleId ?? 'none'}_${toDayKey(new Date(r.startAt))}`;
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    return map;
  }, [reservations]);

  const reservationsByDay = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    for (const r of reservations) {
      const key = toDayKey(new Date(r.startAt));
      const prev = map.get(key) ?? [];
      prev.push(r);
      map.set(key, prev);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }
    return map;
  }, [reservations]);

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  function getSlotReservations(schedule: Schedule, date: Date) {
    const key = `${schedule.id}_${toDayKey(date)}`;
    return reservationMap.get(key) ?? [];
  }

  function getReservationClassLabel(r: Reservation) {
    const fromSchedule = schedules.find((s) => s.id === r.scheduleId)?.name;
    const raw = (fromSchedule || r.title || 'Clase').trim();
    return raw.replace(/^disponible\s+/i, '').trim() || 'Clase';
  }

  function getReservationSummary(r: Reservation) {
    const studentName = userMap.get(r.userId)?.name ?? 'Alumno';
    const classLabel = getReservationClassLabel(r);
    return `Alumno ${studentName} en clase: ${classLabel}`;
  }

  async function bookFromDay(schedule: Schedule, date: Date) {
    setDayModalSavingScheduleId(schedule.id);
    const targetUserId = currentCenterRole === 'MEMBER' ? currentUserId : (dayModalUserId || undefined);
    try {
      const [sh, sm] = schedule.startTime.split(':').map(Number);
      const [eh, em] = schedule.endTime.split(':').map(Number);
      const startAt = new Date(date);
      startAt.setHours(sh, sm, 0, 0);
      const endAt = new Date(date);
      endAt.setHours(eh, em, 0, 0);

      await api.createReservation({
        centerId,
        userId: currentCenterRole === 'MEMBER' ? undefined : targetUserId,
        kind: 'CLASS',
        title: dayModalTitle.trim() || schedule.name,
        scheduleId: schedule.id,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        priceCents: 0,
        currency: 'clp',
      });

      setDayModalError(null);
      await loadData();
    } catch (e: any) {
      const message = String(e?.message ?? '');
      if (/ya tienes una reserva para ese horario/i.test(message)) {
        try {
          const refreshed = await api.reservations(centerId, targetUserId);
          setReservations(refreshed.reservations ?? []);
        } catch {
          await loadData();
        }
        setDayModalError(null);
        return;
      }
      setDayModalError(e.message ?? 'No se pudo agendar');
    } finally {
      setDayModalSavingScheduleId(null);
    }
  }

  async function cancelReservation(resId: string) {
    setActionLoading(true);
    try {
      await api.updateReservation(resId, { status: 'CANCELED' });
      await loadData();
    } catch (e: any) {
      setError(e.message ?? 'Error cancelando reserva');
    } finally {
      setActionLoading(false);
    }
  }

  async function cancelReservationFromDay(resId: string, scheduleId: string) {
    setDayModalSavingScheduleId(scheduleId);
    try {
      await api.updateReservation(resId, { status: 'CANCELED' });
      setDayModalError(null);
      await loadData();
    } catch (e: any) {
      setDayModalError(e.message ?? 'No se pudo cancelar');
    } finally {
      setDayModalSavingScheduleId(null);
    }
  }

  async function cancelClass(schedule: Schedule, date: Date) {
    if (currentCenterRole === 'MEMBER') {
      setError('No tienes permisos para cancelar clases completas');
      return;
    }
    setActionLoading(true);
    try {
      const [sh, sm] = schedule.startTime.split(':').map(Number);
      const [eh, em] = schedule.endTime.split(':').map(Number);
      const startAt = new Date(date);
      startAt.setHours(sh, sm, 0, 0);
      const endAt = new Date(date);
      endAt.setHours(eh, em, 0, 0);

      await api.createTimeBlock({
        centerId,
        name: `Cancelada: ${schedule.name}`,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      });

      const slotRes = getSlotReservations(schedule, date);
      await Promise.all(slotRes.map((r) => api.updateReservation(r.id, { status: 'CANCELED' })));

      setSelectedSlot(null);
      await loadData();
    } catch (e: any) {
      setError(e.message ?? 'Error cancelando clase');
    } finally {
      setActionLoading(false);
    }
  }

  // ---- CREATE FORM (left sidebar - same as original) ----
  function renderCreateForm() {
    const canPickUser = currentCenterRole !== 'MEMBER';
    return (
      <div className="app-card p-4 lg:col-span-1">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Crear reserva</h3>
        <div className="space-y-3">
          <input className="app-input" placeholder="Titulo" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <select className="app-input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as any })}>
              <option value="CLASS">CLASS</option>
              <option value="SPACE">SPACE</option>
            </select>
            {canPickUser ? (
              <select className="app-input" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            ) : (
              <input className="app-input bg-slate-50" value="Solo para mi usuario" disabled />
            )}
          </div>
          <input className="app-input" type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
          <input className="app-input" type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input className="app-input" placeholder="Precio cents" value={form.priceCents} onChange={(e) => setForm({ ...form, priceCents: e.target.value })} />
            <input className="app-input" placeholder="Moneda" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
          </div>
          <button
            className="app-btn-primary w-full"
            disabled={saving || !form.title || !form.startAt || !form.endAt}
            onClick={async () => {
              setError(null);
              setSaving(true);
              try {
                await api.createReservation({
                  centerId,
                  userId: canPickUser ? form.userId : undefined,
                  kind: form.kind,
                  title: form.title.trim(),
                  startAt: new Date(form.startAt).toISOString(),
                  endAt: new Date(form.endAt).toISOString(),
                  priceCents: Number(form.priceCents || '0'),
                  currency: form.currency.trim() || undefined,
                });
                setForm({ ...form, title: '' });
                await loadData();
              } catch (e: any) {
                setError(e.message ?? 'No se pudo crear reserva');
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? 'Guardando...' : 'Crear reserva'}
          </button>
        </div>
      </div>
    );
  }

  // ---- MONTH VIEW (original design) ----
  function renderMonthView() {
    const days = buildCalendarMatrix(monthCursor);
    const selectedReservations = reservationsByDay.get(selectedDayKey) ?? [];

    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">Calendario de reservas</h2>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
            >
              Anterior
            </button>
            <div className="min-w-44 text-center text-sm font-semibold capitalize text-slate-700">{monthLabel(monthCursor)}</div>
            <button
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
            >
              Siguiente
            </button>
          </div>
        </div>

        <div className="app-card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {DAY_LABELS.map((d) => (
              <div key={d} className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = toDayKey(day);
              const inMonth = day.getMonth() === monthCursor.getMonth();
              const isToday = key === toDayKey(today);
              const isSelected = key === selectedDayKey;
              const count = reservationsByDay.get(key)?.length ?? 0;
              const availability = getDayAvailabilitySummary(day, schedules, timeBlocks, getSlotReservations);

              return (
                <button
                  key={key}
                  className={`min-h-24 border-b border-r border-slate-200 p-2 text-left align-top transition ${
                    isSelected ? 'bg-sky-50' : 'bg-white hover:bg-slate-50'
                  }`}
                  onClick={() => {
                    setSelectedDayKey(key);
                    setDayModalError(null);
                    setSelectedDayModal(new Date(day));
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                        isToday ? 'bg-slate-900 text-white' : 'text-slate-700'
                      } ${!inMonth ? 'opacity-40' : ''}`}
                    >
                      {day.getDate()}
                    </span>
                    {availability.total > 0 ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          availability.available === 0
                            ? 'bg-rose-100 text-rose-700'
                            : availability.available < availability.total
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {availability.available}/{availability.total} horarios
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500">
                    {availability.total === 0
                      ? 'Sin horarios'
                      : availability.available === 0
                        ? 'Lleno/Bloqueado'
                        : availability.available < availability.total
                          ? 'Parcial'
                          : 'Disponible'}
                  </div>
                  {availability.total > 0 ? (
                    <div className="mt-1 text-[10px] text-slate-500">
                      Cupos libres: {availability.freeSeats}/{availability.totalSeats}
                    </div>
                  ) : null}
                  {count > 0 ? (
                    <div className="mt-1 text-[10px] font-medium text-slate-600">{count} reservas</div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="app-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Detalle del dia</h3>
            <span className="text-sm font-medium text-slate-700">{selectedDayKey}</span>
          </div>
          <div className="mb-3">
            <button
              className="app-btn-sm"
              onClick={() => {
                setDayModalError(null);
                setSelectedDayModal(fromDayKey(selectedDayKey));
              }}
            >
              Ver disponibilidad y agendar
            </button>
          </div>

          {selectedReservations.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
              No hay reservas para este dia.
            </div>
          ) : (
            <div className="space-y-2">
              {selectedReservations.map((r) => (
                <div key={r.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{getReservationSummary(r)}</div>
                      <div className="text-xs text-slate-500">{timeRange(r.startAt, r.endAt)}</div>
                      <div className="text-xs text-slate-400">Reserva: {getReservationClassLabel(r)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          r.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {r.status}
                      </span>
                      {r.status === 'CONFIRMED' && (
                        <button
                          className="rounded px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                          disabled={actionLoading || (currentCenterRole === 'MEMBER' && r.userId !== currentUserId)}
                          onClick={() => cancelReservation(r.id)}
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  // ---- WEEK VIEW ----
  function renderWeekView() {
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">Calendario semanal</h2>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }}
            >
              Anterior
            </button>
            <div className="min-w-48 text-center text-sm font-semibold text-slate-700">{weekLabel(weekStart)}</div>
            <button
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }}
            >
              Siguiente
            </button>
          </div>
        </div>

        <div className="app-card overflow-auto">
          <div className="min-w-[700px]">
            {/* Header */}
            <div className="grid grid-cols-[50px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50">
              <div className="px-1 py-2 text-xs font-semibold text-slate-500"></div>
              {weekDays.map((d) => {
                const isToday = toDayKey(d) === toDayKey(today);
                return (
                  <div key={toDayKey(d)} className={`px-1 py-2 text-center text-xs font-semibold ${isToday ? 'text-sky-700 bg-sky-50' : 'text-slate-500'}`}>
                    {DAY_LABELS[d.getDay()]} {d.getDate()}
                  </div>
                );
              })}
            </div>

            {/* Time grid */}
            {HOURS.map((hour) => (
              <div key={hour} className="grid grid-cols-[50px_repeat(7,1fr)] border-b border-slate-100">
                <div className="px-1 py-1 text-[11px] text-slate-400 border-r border-slate-100">
                  {String(hour).padStart(2, '0')}:00
                </div>
                {weekDays.map((day) => {
                  const dayOfWeek = day.getDay();
                  const slotSchedules = schedules.filter((s) => {
                    return s.dayOfWeek === dayOfWeek && parseTime(s.startTime) === hour;
                  });

                  return (
                    <div key={toDayKey(day)} className="px-0.5 py-0.5 min-h-[44px] border-r border-slate-100">
                      {slotSchedules.map((schedule) => {
                        const blocked = isBlockedSlot(schedule, day, timeBlocks);
                        if (blocked) {
                          return (
                            <div key={schedule.id} className="rounded px-1.5 py-1 text-[11px] bg-slate-100 text-slate-400 line-through mb-0.5">
                              {schedule.name}
                            </div>
                          );
                        }
                        const slotRes = getSlotReservations(schedule, day);
                        const count = slotRes.length;
                        const colorClass = occupancyColor(count, schedule.capacity);
                        return (
                          <button
                            key={schedule.id}
                            className={`w-full rounded border px-1.5 py-1 text-left text-[11px] font-medium mb-0.5 transition hover:shadow-sm ${colorClass}`}
                            onClick={() => setSelectedSlot({ schedule, date: day })}
                          >
                            <div className="truncate">{schedule.name}</div>
                            <div className="text-[10px] opacity-70">
                              {schedule.startTime}-{schedule.endTime} · {count}/{schedule.capacity}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  // ---- DETAIL SIDEBAR ----
  function renderDetailPanel() {
    if (!selectedSlot) return null;
    const { schedule, date } = selectedSlot;
    const slotRes = getSlotReservations(schedule, date);
    const blocked = isBlockedSlot(schedule, date, timeBlocks);

    return (
      <div className="fixed inset-0 z-30 flex justify-end" onClick={() => setSelectedSlot(null)}>
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
        <div
          className="relative w-full max-w-md bg-white shadow-xl overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{schedule.name}</h3>
                <p className="text-sm text-slate-500">
                  {DAY_LABELS[date.getDay()]} {date.toLocaleDateString('es-CL')} · {schedule.startTime} - {schedule.endTime}
                </p>
              </div>
              <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" onClick={() => setSelectedSlot(null)}>
                ✕
              </button>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${occupancyColor(slotRes.length, schedule.capacity)}`}>
                {slotRes.length}/{schedule.capacity} inscritos
              </span>
              {blocked && (
                <span className="rounded-full bg-slate-100 border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600">Bloqueada</span>
              )}
            </div>
          </div>

          <div className="p-5 space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Alumnos inscritos ({slotRes.length})
            </h4>

            {slotRes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                No hay alumnos inscritos.
              </div>
            ) : (
              <div className="space-y-2">
                {slotRes.map((r) => {
                  const user = userMap.get(r.userId);
                  return (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div>
                        <div className="text-sm font-medium text-slate-800">{user?.name ?? 'Usuario'}</div>
                        <div className="text-xs text-slate-500">{user?.email ?? ''}</div>
                        {user?.status && (
                          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            user.status === 'ACTIVO' ? 'bg-emerald-100 text-emerald-700' :
                            user.status === 'CONGELADO' ? 'bg-sky-100 text-sky-700' :
                            user.status === 'SUSPENDIDO' ? 'bg-rose-100 text-rose-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {user.status}
                          </span>
                        )}
                      </div>
                      <button
                        className="rounded-lg border border-rose-200 bg-white px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        disabled={
                          actionLoading ||
                          (currentCenterRole === 'MEMBER' && r.userId !== currentUserId) ||
                          (currentCenterRole === 'STAFF' && r.userId !== currentUserId && r.staffId !== currentUserId)
                        }
                        onClick={() => cancelReservation(r.id)}
                      >
                        Cancelar
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {!blocked && (
              <button
                className="w-full rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                disabled={actionLoading || currentCenterRole === 'MEMBER'}
                onClick={() => cancelClass(schedule, date)}
              >
                {actionLoading ? 'Cancelando...' : 'Cancelar clase completa'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderDayAvailabilityModal() {
    if (!selectedDayModal) return null;
    const dayKey = toDayKey(selectedDayModal);
    const daySchedules = schedules
      .filter((s) => s.dayOfWeek === selectedDayModal.getDay())
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center p-4" onClick={() => setSelectedDayModal(null)}>
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
        <div
          className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Disponibilidad del día</h3>
                <p className="text-sm text-slate-500">
                  {DAY_LABELS[selectedDayModal.getDay()]} {selectedDayModal.toLocaleDateString('es-CL')}
                </p>
              </div>
              <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" onClick={() => setSelectedDayModal(null)}>
                ✕
              </button>
            </div>
          </div>

          <div className="space-y-4 p-5">
            {dayModalError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {dayModalError}
              </div>
            ) : null}
            <div className="grid gap-3 md:grid-cols-3">
              <select className="app-input" value={dayModalUserId} onChange={(e) => setDayModalUserId(e.target.value)}>
                {(currentCenterRole === 'MEMBER' ? users.filter((u) => u.id === currentUserId) : users).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <input
                className="app-input md:col-span-2"
                placeholder="Título (opcional, por defecto nombre de la clase)"
                value={dayModalTitle}
                onChange={(e) => setDayModalTitle(e.target.value)}
              />
            </div>

            {daySchedules.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                No hay horarios configurados para este día.
              </div>
            ) : (
              <div className="space-y-2">
                {daySchedules.map((schedule) => {
                  const slotRes = getSlotReservations(schedule, selectedDayModal);
                  const blocked = isBlockedSlot(schedule, selectedDayModal, timeBlocks);
                  const full = slotRes.length >= schedule.capacity;
                  const targetUserId = currentCenterRole === 'MEMBER' ? currentUserId : dayModalUserId;
                  const myReservation = targetUserId ? slotRes.find((r) => r.userId === targetUserId) : undefined;
                  const alreadyBooked = Boolean(myReservation);
                  const canBook = !blocked && !full && !alreadyBooked;
                  const canCancel = Boolean(myReservation);
                  const canAct = canBook || canCancel;
                  const isSaving = dayModalSavingScheduleId === schedule.id;
                  const actionLabel = isSaving
                    ? alreadyBooked ? 'Cancelando...' : 'Agendando...'
                    : alreadyBooked ? 'Cancelar'
                    : blocked ? 'Bloqueado'
                    : full ? 'Lleno'
                    : 'Agendar';
                  const actionClass = canAct
                    ? 'app-btn-sm'
                    : 'rounded-lg border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 cursor-not-allowed';

                  return (
                    <div key={`${schedule.id}_${dayKey}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{schedule.name}</div>
                        <div className="text-xs text-slate-500">
                          {schedule.startTime} - {schedule.endTime}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${occupancyColor(slotRes.length, schedule.capacity)}`}>
                          {slotRes.length}/{schedule.capacity} inscritos
                        </span>
                        {blocked ? (
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">Bloqueado</span>
                        ) : alreadyBooked ? (
                          <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">Agendado</span>
                        ) : full ? (
                          <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">Lleno</span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Disponible</span>
                        )}
                        <button
                          className={actionClass}
                          disabled={!canAct || isSaving}
                          onClick={() => {
                            if (myReservation) {
                              cancelReservationFromDay(myReservation.id, schedule.id);
                              return;
                            }
                            bookFromDay(schedule, selectedDayModal);
                          }}
                        >
                          {actionLabel}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: create form (same as original) */}
        {renderCreateForm()}

        {/* Right: calendar */}
        <div className="space-y-4 lg:col-span-2">
          {/* View toggle */}
          <div className="flex items-center gap-2">
            <button
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${view === 'month' ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
              onClick={() => setView('month')}
            >
              Mes
            </button>
            <button
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${view === 'week' ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
              onClick={() => setView('week')}
            >
              Semana
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
          )}

          {view === 'month' ? renderMonthView() : renderWeekView()}
        </div>
      </div>

      {selectedSlot && renderDetailPanel()}
      {selectedDayModal && renderDayAvailabilityModal()}
    </div>
  );
}
