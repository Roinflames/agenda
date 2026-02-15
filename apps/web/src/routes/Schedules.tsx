import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { getActiveCenter, getSession } from '../lib/auth';

type Schedule = {
  id: string;
  name: string;
  description?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  capacity: number;
  isActive: boolean;
};

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
const DAY_SHORT = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const START_TIMES = ['18:00', '19:00', '20:00'];
const ROOMS = [
  { key: 'SALA_2', label: 'Sala 1 (2 camas)', capacity: 2 },
  { key: 'SALA_3', label: 'Sala 2 (3 camas)', capacity: 3 },
];

function addOneHour(start: string) {
  const [h, m] = start.split(':').map(Number);
  return `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const emptyForm = {
  name: '',
  description: '',
  dayOfWeek: 1,
  startTime: '07:00',
  endTime: '08:00',
  capacity: 20,
};

export default function Schedules() {
  const centerId = getActiveCenter(getSession())?.id ?? '';
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [roomKey, setRoomKey] = useState<string>('SALA_2');
  const [editingId, setEditingId] = useState<string | null>(null);

  async function loadSchedules() {
    if (!centerId) return;
    const r = await api.schedules(centerId);
    setSchedules(r.schedules ?? []);
  }

  useEffect(() => {
    loadSchedules().catch((e: any) => setError(e.message ?? 'Error'));
  }, [centerId]);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      if (editingId) {
        await api.updateSchedule(editingId, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          dayOfWeek: Number(form.dayOfWeek),
          startTime: form.startTime,
          endTime: addOneHour(form.startTime),
          capacity: Number(form.capacity),
        });
      } else {
        await api.createSchedule({
          centerId,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          dayOfWeek: Number(form.dayOfWeek),
          startTime: form.startTime,
          endTime: addOneHour(form.startTime),
          capacity: Number(form.capacity),
        });
      }
      setForm((prev) => ({ ...emptyForm, dayOfWeek: prev.dayOfWeek }));
      setEditingId(null);
      await loadSchedules();
    } catch (e: any) {
      setError(e.message ?? 'Error guardando horario');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(schedule: Schedule) {
    try {
      await api.updateSchedule(schedule.id, { isActive: !schedule.isActive });
      await loadSchedules();
    } catch (e: any) {
      setError(e.message ?? 'Error actualizando horario');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar este horario?')) return;
    try {
      await api.deleteSchedule(id);
      await loadSchedules();
    } catch (e: any) {
      setError(e.message ?? 'Error eliminando horario');
    }
  }

  function startEdit(s: Schedule) {
    setEditingId(s.id);
    const detectedRoom = s.capacity === 3 ? 'SALA_3' : 'SALA_2';
    setRoomKey(detectedRoom);
    setForm({
      name: s.name,
      description: s.description ?? '',
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: addOneHour(s.startTime),
      capacity: s.capacity === 3 ? 3 : 2,
    });
  }

  function startCreateForDay(dayOfWeek: number) {
    setEditingId(null);
    setRoomKey('SALA_2');
    setForm({
      ...emptyForm,
      dayOfWeek,
      startTime: '18:00',
      endTime: '19:00',
      capacity: 2,
      name: `Disponible ${DAY_NAMES[dayOfWeek]} · Sala 1`,
    });
  }

  const slotsByDay = useMemo(() => {
    const map = new Map<number, Schedule[]>();
    for (let i = 0; i < 7; i += 1) map.set(i, []);
    for (const s of schedules) {
      const list = map.get(s.dayOfWeek) ?? [];
      list.push(s);
      map.set(s.dayOfWeek, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [schedules]);

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-slate-900">Horarios de clases</h2>
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="app-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Horas semanales</h3>
            <span className="text-xs text-slate-400">Tipo Calendly</span>
          </div>

          <div className="space-y-2">
            {DAY_NAMES.map((day, dayIndex) => {
              const slots = slotsByDay.get(dayIndex) ?? [];
              return (
                <div key={day} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                      {DAY_SHORT[dayIndex]}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 text-sm font-semibold text-slate-800">{day}</div>

                      {slots.length === 0 ? (
                        <div className="text-sm text-slate-500">No disponible</div>
                      ) : (
                        <div className="space-y-2">
                          {slots.map((s) => (
                            <div key={s.id} className={`flex flex-wrap items-center gap-2 rounded-lg border px-2 py-1.5 text-sm ${s.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}>
                              <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                                {s.startTime} - {s.endTime}
                              </span>
                              <span className="text-slate-600">{s.name}</span>
                              <span className="text-xs text-slate-500">cap {s.capacity}</span>

                              <button
                                className={`relative ml-auto inline-flex h-5 w-10 items-center rounded-full transition-colors ${s.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                onClick={() => toggleActive(s)}
                                title={s.isActive ? 'Desactivar' : 'Activar'}
                              >
                                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${s.isActive ? 'translate-x-5.5' : 'translate-x-1'}`} />
                              </button>
                              <button className="rounded px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50" onClick={() => startEdit(s)}>
                                Editar
                              </button>
                              <button className="rounded px-2 py-0.5 text-xs font-medium text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(s.id)}>
                                Eliminar
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button className="app-btn-sm text-xs" onClick={() => startCreateForDay(dayIndex)}>
                      + Hora
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="app-card p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            {editingId ? 'Editar horario' : 'Agregar horario'}
          </h3>
          <p className="mb-3 text-xs text-slate-500">Reglas del centro: bloques de 1 hora, horario 18:00 a 21:00, salas de 2 o 3 camas.</p>

          <div className="space-y-3">
            <select className="app-input" value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })}>
              {DAY_NAMES.map((name, i) => (
                <option key={i} value={i}>{name}</option>
              ))}
            </select>

            <input className="app-input" placeholder="Nombre (ej: Reformer con Francisca)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="app-input" placeholder="Descripcion (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

            <div className="grid grid-cols-2 gap-2">
              <select
                className="app-input"
                value={START_TIMES.includes(form.startTime) ? form.startTime : '18:00'}
                onChange={(e) => setForm({ ...form, startTime: e.target.value, endTime: addOneHour(e.target.value) })}
              >
                {START_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input className="app-input" value={addOneHour(form.startTime)} disabled readOnly />
            </div>

            <select
              className="app-input"
              value={roomKey}
              onChange={(e) => {
                const next = e.target.value;
                const room = ROOMS.find((r) => r.key === next) ?? ROOMS[0];
                setRoomKey(next);
                setForm((prev) => ({ ...prev, capacity: room.capacity }));
              }}
            >
              {ROOMS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>

            <button className="app-btn-primary w-full" disabled={saving || !form.name} onClick={handleSave}>
              {saving ? 'Guardando...' : editingId ? 'Actualizar horario' : 'Agregar horario'}
            </button>

            {editingId ? (
              <button
                className="app-btn-sm w-full"
                onClick={() => {
                  setEditingId(null);
                  setForm((prev) => ({ ...emptyForm, dayOfWeek: prev.dayOfWeek }));
                }}
              >
                Cancelar edición
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
