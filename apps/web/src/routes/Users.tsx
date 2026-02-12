import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getSession } from '../lib/auth';

export default function Users() {
  const centerId = getSession()?.centers?.[0]?.id ?? '';
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!centerId) return;
    api
      .users(centerId)
      .then((r) => setUsers(r.users))
      .catch((e: any) => setError(e.message ?? 'Error'));
  }, [centerId]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Usuarios</h2>
      {error ? <div className="rounded-md border border-red-900 bg-red-950 p-3 text-sm">{error}</div> : null}

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-300">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-zinc-800">
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2 text-zinc-300">{u.email}</td>
                <td className="px-3 py-2">{u.role}</td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-zinc-400" colSpan={3}>
                  Sin datos
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

