import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getSession } from '../lib/auth';

export default function Users() {
  const centerId = getSession()?.centers?.[0]?.id ?? '';
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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

      <div className="app-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Rol</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-200">
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2 text-slate-600">{u.email}</td>
                <td className="px-3 py-2">{u.role}</td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-slate-500" colSpan={3}>
                  Sin usuarios
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
