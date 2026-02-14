import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { getSession } from '../lib/auth';

const STATUS_OPTIONS = ['ACTIVO', 'CONGELADO', 'SUSPENDIDO', 'PRUEBA'] as const;

const STATUS_COLORS: Record<string, string> = {
  ACTIVO: 'bg-emerald-100 text-emerald-700',
  CONGELADO: 'bg-blue-100 text-blue-700',
  SUSPENDIDO: 'bg-rose-100 text-rose-700',
  PRUEBA: 'bg-amber-100 text-amber-700',
};

export default function Users() {
  const centerId = getSession()?.centers?.[0]?.id ?? '';
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: 'DevPassword123!',
    phone: '',
    role: 'MEMBER' as 'ADMIN' | 'STAFF' | 'MEMBER',
  });

  async function loadUsers() {
    if (!centerId) return;
    const r = await api.users(centerId);
    setUsers(r.users ?? []);
  }

  useEffect(() => {
    loadUsers().catch((e: any) => setError(e.message ?? 'Error'));
  }, [centerId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q),
    );
  }, [users, search]);

  async function changeStatus(userId: string, status: string) {
    try {
      await api.updateUser(userId, { centerId, status });
      await loadUsers();
    } catch (e: any) {
      setError(e.message ?? 'Error actualizando estado');
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-slate-900">Usuarios</h2>
      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      <div className="app-card p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Crear usuario</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <input className="app-input" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="app-input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="app-input" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <input className="app-input" placeholder="Telefono (opcional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <select className="app-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as any })}>
            <option value="MEMBER">MEMBER</option>
            <option value="STAFF">STAFF</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <button
            className="app-btn-primary"
            disabled={saving || !form.name || !form.email || !form.password}
            onClick={async () => {
              setError(null);
              setSaving(true);
              try {
                await api.createUser({
                  centerId,
                  name: form.name.trim(),
                  email: form.email.trim().toLowerCase(),
                  password: form.password,
                  phone: form.phone.trim() || undefined,
                  role: form.role,
                });
                setForm({ ...form, name: '', email: '', phone: '' });
                await loadUsers();
              } catch (e: any) {
                setError(e.message ?? 'No se pudo crear usuario');
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? 'Guardando...' : 'Crear usuario'}
          </button>
        </div>
      </div>

      {/* Search bar */}
      <input
        className="app-input w-full"
        placeholder="Buscar por nombre o email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="app-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Rol</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-slate-200">
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2 text-slate-600">{u.email}</td>
                <td className="px-3 py-2">{u.role}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_COLORS[u.status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {u.status ?? 'N/A'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <select
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                    value={u.status ?? 'ACTIVO'}
                    onChange={(e) => changeStatus(u.id, e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-slate-500" colSpan={5}>
                  {search ? 'Sin resultados' : 'Sin usuarios'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
