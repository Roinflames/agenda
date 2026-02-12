import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getSession } from '../lib/auth';

export default function Reports() {
  const centerId = getSession()?.centers?.[0]?.id ?? '';
  const [income, setIncome] = useState<any>(null);
  const [reservations, setReservations] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!centerId) return;
    Promise.all([api.reportsIncome(centerId), api.reportsReservations(centerId)])
      .then(([i, r]) => {
        setIncome(i);
        setReservations(r);
      })
      .catch((e: any) => setError(e.message ?? 'Error'));
  }, [centerId]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Reportes</h2>
      {error ? <div className="rounded-md border border-red-900 bg-red-950 p-3 text-sm">{error}</div> : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-sm font-medium">Ingresos (por dia)</div>
          <div className="mt-3 space-y-2 text-sm text-zinc-300">
            {income?.series?.map((s: any) => (
              <div key={s.day} className="flex justify-between">
                <span>{s.day}</span>
                <span>{s.revenueCents}</span>
              </div>
            ))}
            {!income ? <div className="text-zinc-400">Cargando...</div> : null}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-sm font-medium">Reservas (por dia)</div>
          <div className="mt-3 space-y-2 text-sm text-zinc-300">
            {reservations?.series?.map((s: any) => (
              <div key={s.day} className="flex justify-between">
                <span>{s.day}</span>
                <span>
                  {s.confirmed} / {s.canceled}
                </span>
              </div>
            ))}
            {!reservations ? <div className="text-zinc-400">Cargando...</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

