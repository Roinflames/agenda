import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getSession } from '../lib/auth';

export default function Memberships() {
  const centerId = getSession()?.centers?.[0]?.id ?? '';
  const [plans, setPlans] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!centerId) return;
    api
      .membershipPlans(centerId)
      .then((r) => setPlans(r.plans))
      .catch((e: any) => setError(e.message ?? 'Error'));
  }, [centerId]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Membresias (Planes)</h2>
      {error ? <div className="rounded-md border border-red-900 bg-red-950 p-3 text-sm">{error}</div> : null}

      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-300">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Precio</th>
              <th className="px-3 py-2">Intervalo</th>
              <th className="px-3 py-2">Activo</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id} className="border-t border-zinc-800">
                <td className="px-3 py-2">{p.name}</td>
                <td className="px-3 py-2 text-zinc-300">
                  {p.priceCents} {p.currency}
                </td>
                <td className="px-3 py-2">{p.interval}</td>
                <td className="px-3 py-2">{p.isActive ? 'Si' : 'No'}</td>
              </tr>
            ))}
            {plans.length === 0 ? (
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

