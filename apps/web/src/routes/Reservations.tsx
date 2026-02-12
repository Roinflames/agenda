import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getSession } from '../lib/auth';

export default function Reservations() {
  const centerId = getSession()?.centers?.[0]?.id ?? '';
  const [reservations, setReservations] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!centerId) return;
    api
      .reservations(centerId)
      .then((r) => setReservations(r.reservations))
      .catch((e: any) => setError(e.message ?? 'Error'));
  }, [centerId]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Reservas</h2>
      {error ? <div className="rounded-md border border-red-900 bg-red-950 p-3 text-sm">{error}</div> : null}

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-300">
            <tr>
              <th className="px-3 py-2">Titulo</th>
              <th className="px-3 py-2">Inicio</th>
              <th className="px-3 py-2">Fin</th>
              <th className="px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((r) => (
              <tr key={r.id} className="border-t border-zinc-800">
                <td className="px-3 py-2">{r.title}</td>
                <td className="px-3 py-2 text-zinc-300">{new Date(r.startAt).toLocaleString()}</td>
                <td className="px-3 py-2 text-zinc-300">{new Date(r.endAt).toLocaleString()}</td>
                <td className="px-3 py-2">{r.status}</td>
              </tr>
            ))}
            {reservations.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-zinc-400" colSpan={4}>
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

