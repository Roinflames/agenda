import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getSession } from '../lib/auth';

type TimeBlock = {
  id: string;
  name: string;
  startAt: string;
  endAt: string;
};

function toLocalDateTimeInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const emptyForm = () => {
  const start = new Date();
  start.setHours(start.getHours() + 1, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    name: '',
    startAt: toLocalDateTimeInputValue(start),
    endAt: toLocalDateTimeInputValue(end),
  };
};

export default function TimeBlocks() {
  const centerId = getSession()?.centers?.[0]?.id ?? '';
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function loadBlocks() {
    if (!centerId) return;
    const r = await api.timeBlocks(centerId);
    setBlocks(r.timeBlocks ?? []);
  }

  useEffect(() => {
    loadBlocks().catch((e: any) => setError(e.message ?? 'Error'));
  }, [centerId]);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
      };
      if (editingId) {
        await api.updateTimeBlock(editingId, payload);
      } else {
        await api.createTimeBlock({ centerId, ...payload });
      }
      setForm(emptyForm());
      setEditingId(null);
      await loadBlocks();
    } catch (e: any) {
      setError(e.message ?? 'Error guardando bloqueo');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar este bloqueo?')) return;
    try {
      await api.deleteTimeBlock(id);
      await loadBlocks();
    } catch (e: any) {
      setError(e.message ?? 'Error eliminando bloqueo');
    }
  }

  function startEdit(b: TimeBlock) {
    setEditingId(b.id);
    setForm({
      name: b.name,
      startAt: toLocalDateTimeInputValue(new Date(b.startAt)),
      endAt: toLocalDateTimeInputValue(new Date(b.endAt)),
    });
  }

  // Sort by start date descending (most recent first)
  const sorted = [...blocks].sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-slate-900">Bloqueos y feriados</h2>
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

      <div className="app-card p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {editingId ? 'Editar bloqueo' : 'Crear bloqueo'}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input className="app-input lg:col-span-2" placeholder="Nombre (ej: Feriado Nacional)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="app-input" type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
          <input className="app-input" type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
        </div>
        <div className="mt-3 flex gap-2">
          <button className="app-btn-primary" disabled={saving || !form.name} onClick={handleSave}>
            {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear bloqueo'}
          </button>
          {editingId && (
            <button className="app-btn-sm" onClick={() => { setEditingId(null); setForm(emptyForm()); }}>
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
              <th className="px-3 py-2">Inicio</th>
              <th className="px-3 py-2">Fin</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((b) => {
              const isPast = new Date(b.endAt) < new Date();
              return (
                <tr key={b.id} className={`border-t border-slate-200 ${isPast ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-2 font-medium">{b.name}</td>
                  <td className="px-3 py-2">{formatDateTime(b.startAt)}</td>
                  <td className="px-3 py-2">{formatDateTime(b.endAt)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50" onClick={() => startEdit(b)}>
                        Editar
                      </button>
                      <button className="rounded px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(b.id)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {blocks.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-slate-500" colSpan={4}>Sin bloqueos configurados</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
