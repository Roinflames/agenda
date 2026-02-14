import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getSession } from '../lib/auth';

type Channel = 'EMAIL' | 'PUSH';

const STATUS_BADGE: Record<string, string> = {
  SENT: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-rose-100 text-rose-700',
  PENDING: 'bg-amber-100 text-amber-700',
};

export default function Notifications() {
  const centerId = getSession()?.centers?.[0]?.id ?? '';
  const [users, setUsers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    userId: '',
    channel: 'EMAIL' as Channel,
    title: '',
    message: '',
  });

  async function load() {
    if (!centerId) return;
    const [u, n] = await Promise.all([api.users(centerId), api.notifications(centerId)]);
    setUsers(u.users ?? []);
    setNotifications(n.notifications ?? []);
    if (!form.userId && u.users?.[0]?.id) setForm((prev) => ({ ...prev, userId: u.users[0].id }));
  }

  useEffect(() => {
    load().catch((e: any) => setError(e.message ?? 'Error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId]);

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-slate-900">Notificaciones</h2>
      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      <div className="app-card p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Enviar notificacion</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <select
            className="app-input"
            value={form.userId}
            onChange={(e) => setForm({ ...form, userId: e.target.value })}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>

          <select
            className="app-input"
            value={form.channel}
            onChange={(e) => setForm({ ...form, channel: e.target.value as Channel })}
          >
            <option value="EMAIL">EMAIL</option>
            <option value="PUSH">PUSH</option>
          </select>

          <input
            className="app-input md:col-span-2"
            placeholder="Titulo"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />

          <textarea
            className="app-input md:col-span-2"
            placeholder="Mensaje"
            rows={4}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />

          <button
            className="app-btn-primary md:col-span-2"
            disabled={sending || !form.userId || !form.title.trim() || !form.message.trim()}
            onClick={async () => {
              setError(null);
              setSending(true);
              try {
                await api.sendNotification({
                  centerId,
                  userId: form.userId,
                  channel: form.channel,
                  title: form.title.trim(),
                  message: form.message.trim(),
                });
                setForm({ ...form, title: '', message: '' });
                await load();
              } catch (e: any) {
                setError(e.message ?? 'No se pudo enviar la notificacion');
              } finally {
                setSending(false);
              }
            }}
          >
            {sending ? 'Enviando...' : 'Enviar notificacion'}
          </button>
        </div>
      </div>

      <div className="app-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Usuario</th>
              <th className="px-3 py-2">Canal</th>
              <th className="px-3 py-2">Titulo</th>
              <th className="px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map((n) => (
              <tr key={n.id} className="border-t border-slate-200">
                <td className="px-3 py-2 text-slate-600">{new Date(n.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">{n.user?.name ?? '-'}</td>
                <td className="px-3 py-2">{n.channel}</td>
                <td className="px-3 py-2">{n.title}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_BADGE[n.status] ?? 'bg-slate-100 text-slate-700'}`}>
                    {n.status}
                  </span>
                </td>
              </tr>
            ))}
            {notifications.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-slate-500" colSpan={5}>Sin notificaciones</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
