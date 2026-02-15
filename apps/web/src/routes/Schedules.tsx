import { useEffect, useState } from 'react';
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
          endTime: form.endTime,
          capacity: Number(form.capacity),
        });
      } else {
        await api.createSchedule({
          centerId,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          dayOfWeek: Number(form.dayOfWeek),
          startTime: form.startTime,
          endTime: form.endTime,
          capacity: Number(form.capacity),
        });
      }
      setForm(emptyForm);
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
    setForm({
      name: s.name,
      description: s.description ?? '',
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      capacity: s.capacity,
    });
  }

  // Sort by day then start time
  const sorted = [...schedules].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-slate-900">Horarios de clases</h2>
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <div className="app-card p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {editingId ? 'Editar horario' : 'Crear horario'}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input className="app-input" placeholder="Nombre (ej: Pilates con Felipe)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="app-input" placeholder="Descripcion (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <select className="app-input" value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) })}>
            {DAY_NAMES.map((name, i) => (
              <option key={i} value={i}>{name}</option>
            ))}
          </select>
          <input className="app-input" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          <input className="app-input" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          <input className="app-input" type="number" min="1" placeholder="Capacidad" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
        </div>
        <div className="mt-3 flex gap-2">
          <button className="app-btn-primary" disabled={saving || !form.name} onClick={handleSave}>
            {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear horario'}
          </button>
          {editingId && (
            <button className="app-btn-sm" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
              Cancelar
            </button>
          )}
        </div>
      </div>

      <div className="app-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Dia</th>
              <th className="px-3 py-2">Horario</th>
              <th className="px-3 py-2">Capacidad</th>
              <th className="px-3 py-2">Activo</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr key={s.id} className={`border-t border-slate-200 ${!s.isActive ? 'opacity-50' : ''}`}>
                <td className="px-3 py-2 font-medium">{s.name}</td>
                <td className="px-3 py-2">{DAY_NAMES[s.dayOfWeek]}</td>
                <td className="px-3 py-2">{s.startTime} - {s.endTime}</td>
                <td className="px-3 py-2">{s.capacity}</td>
                <td className="px-3 py-2">
                  <button
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${s.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    onClick={() => toggleActive(s)}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${s.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <button className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50" onClick={() => startEdit(s)}>
                      Editar
                    </button>
                    <button className="rounded px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(s.id)}>
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {schedules.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-slate-500" colSpan={6}>Sin horarios configurados</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
