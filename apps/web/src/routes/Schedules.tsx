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
const START_TIMES = Array.from({ length: 13 }, (_, i) => `${String(i + 9).padStart(2, '0')}:00`);
const ROOMS = [
  { key: 'SALA_2', label: 'Sala 1 (2 camas)', capacity: 2 },
  { key: 'SALA_3', label: 'Sala 2 (3 camas)', capacity: 3 },
];
const CLASS_OPTIONS = ['Pilates'];
const INSTRUCTOR_OPTIONS = ['Felipe', 'Francisca'];

function addOneHour(start: string) {
  const [h, m] = start.split(':').map(Number);
  return `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parseScheduleName(name: string) {
  const parts = name.split(/\s+con\s+/i);
  if (parts.length >= 2) {
    return { className: parts[0].trim(), instructorName: parts.slice(1).join(' con ').trim() };
  }
  return { className: name.trim(), instructorName: '' };
}

function buildScheduleName(className: string, instructorName: string) {
  const cleanClass = className.trim();
  const cleanInstructor = instructorName.trim();
  if (!cleanClass) return '';
  if (!cleanInstructor) return cleanClass;
  return `${cleanClass} con ${cleanInstructor}`;
}

const emptyForm = {
  name: '',
  description: '',
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '10:00',
  capacity: 20,
};

export default function Schedules() {
  const centerId = getActiveCenter(getSession())?.id ?? '';
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [roomKey, setRoomKey] = useState<string>('SALA_2');
  const [className, setClassName] = useState<string>('Pilates');
  const [instructorName, setInstructorName] = useState<string>('Felipe');
  const [editingId, setEditingId] = useState<string | null>(null);

  const classOptions = CLASS_OPTIONS;
  const instructorOptions = INSTRUCTOR_OPTIONS;

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
      setClassName('Pilates');
      setInstructorName('Felipe');
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
    const parsed = parseScheduleName(s.name);
    setEditingId(s.id);
    const detectedRoom = s.capacity === 3 ? 'SALA_3' : 'SALA_2';
    setRoomKey(detectedRoom);
    const normalizedClass = CLASS_OPTIONS.includes(parsed.className) ? parsed.className : 'Pilates';
    const normalizedInstructor = INSTRUCTOR_OPTIONS.includes(parsed.instructorName) ? parsed.instructorName : 'Felipe';
    setClassName(normalizedClass);
    setInstructorName(normalizedInstructor);
    setForm({
      name: buildScheduleName(normalizedClass, normalizedInstructor),
      description: s.description ?? '',
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: addOneHour(s.startTime),
      capacity: s.capacity === 3 ? 3 : 2,
    });
  }

  function startCreateForDay(dayOfWeek: number) {
    const defaultClass = 'Pilates';
    const defaultInstructor = 'Felipe';
    setEditingId(null);
    setRoomKey('SALA_2');
    setClassName(defaultClass);
    setInstructorName(defaultInstructor);
    setForm({
      ...emptyForm,
      dayOfWeek,
      startTime: '09:00',
      endTime: '10:00',
      capacity: 2,
      name: buildScheduleName(defaultClass, defaultInstructor),
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
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Horarios de clases</h2>
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
        <div className="app-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Horas semanales</h3>
            <span className="text-xs text-slate-400">Tipo Calendly</span>
          </div>

          <div className="space-y-1.5">
            {DAY_NAMES.map((day, dayIndex) => {
              const slots = slotsByDay.get(dayIndex) ?? [];
              return (
                <div key={day} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                      {DAY_SHORT[dayIndex]}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 text-sm font-semibold text-slate-800">{day}</div>

                      {slots.length === 0 ? (
                        <div className="text-sm text-slate-500">No disponible</div>
                      ) : (
                        <div className="space-y-1.5">
                          {slots.map((s) => (
                            <div key={s.id} className={`flex items-center gap-2 rounded-lg border px-2 py-1 text-sm ${s.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}>
                              <span className="rounded bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                                {s.startTime} - {s.endTime}
                              </span>
                              <span className="truncate text-slate-600">{s.name}</span>
                              <span className="rounded bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-500">cap {s.capacity}</span>

                              <button
                                className={`relative ml-auto inline-flex h-5 w-10 items-center rounded-full transition-colors ${s.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                onClick={() => toggleActive(s)}
                                title={s.isActive ? 'Desactivar' : 'Activar'}
                              >
                                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${s.isActive ? 'translate-x-5.5' : 'translate-x-1'}`} />
                              </button>
                              <button className="rounded px-1.5 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50" onClick={() => startEdit(s)}>
                                Editar
                              </button>
                              <button className="rounded px-1.5 py-0.5 text-xs font-medium text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(s.id)}>
                                Eliminar
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button className="app-btn-sm px-2 py-1 text-xs" onClick={() => startCreateForDay(dayIndex)}>
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
          <p className="mb-3 text-xs text-slate-500">Reglas del centro: bloques de 1 hora, horario 09:00 a 22:00, salas de 2 o 3 camas.</p>

          <div className="space-y-2.5">
            <select className="app-input" value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })}>
              {DAY_NAMES.map((name, i) => (
                <option key={i} value={i}>{name}</option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <select
                className="app-input"
                value={className}
                onChange={(e) => {
                  const nextClass = e.target.value;
                  setClassName(nextClass);
                  setForm((prev) => ({ ...prev, name: buildScheduleName(nextClass, instructorName) }));
                }}
              >
                {classOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <select
                className="app-input"
                value={instructorName}
                onChange={(e) => {
                  const nextInstructor = e.target.value;
                  setInstructorName(nextInstructor);
                  setForm((prev) => ({ ...prev, name: buildScheduleName(className, nextInstructor) }));
                }}
              >
                {instructorOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <input className="app-input" placeholder="Descripcion (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

            <div className="grid grid-cols-2 gap-2">
              <select
                className="app-input"
                value={START_TIMES.includes(form.startTime) ? form.startTime : START_TIMES[0]}
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
                  setClassName('Pilates');
                  setInstructorName('Felipe');
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
