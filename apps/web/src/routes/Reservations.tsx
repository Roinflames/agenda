import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { getSession } from '../lib/auth';

type Reservation = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: 'CONFIRMED' | 'CANCELED' | string;
};

const WEEK_DAYS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

function toDayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthLabel(d: Date) {
  return d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
}

function timeRange(startAt: string, endAt: string) {
  const start = new Date(startAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  const end = new Date(endAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  return `${start} - ${end}`;
}

function buildCalendarMatrix(cursor: Date) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const start = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}

export default function Reservations() {
  const centerId = getSession()?.centers?.[0]?.id ?? '';
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const today = useMemo(() => new Date(), []);
  const [selectedKey, setSelectedKey] = useState(toDayKey(today));

  useEffect(() => {
    if (!centerId) return;
    api
      .reservations(centerId)
      .then((r) => setReservations(r.reservations ?? []))
      .catch((e: any) => setError(e.message ?? 'Error'));
  }, [centerId]);

  const reservationsByDay = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    for (const r of reservations) {
      const key = toDayKey(new Date(r.startAt));
      const prev = map.get(key) ?? [];
      prev.push(r);
      map.set(key, prev);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }
    return map;
  }, [reservations]);

  const days = useMemo(() => buildCalendarMatrix(cursor), [cursor]);
  const selectedReservations = reservationsByDay.get(selectedKey) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900">Calendario de reservas</h2>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          >
            Anterior
          </button>
          <div className="min-w-44 text-center text-sm font-semibold capitalize text-slate-700">{monthLabel(cursor)}</div>
          <button
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          >
            Siguiente
          </button>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

      <div className="app-card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = toDayKey(day);
            const inMonth = day.getMonth() === cursor.getMonth();
            const isToday = key === toDayKey(today);
            const isSelected = key === selectedKey;
            const count = reservationsByDay.get(key)?.length ?? 0;

            return (
              <button
                key={key}
                className={`min-h-24 border-b border-r border-slate-200 p-2 text-left align-top transition ${
                  isSelected ? 'bg-sky-50' : 'bg-white hover:bg-slate-50'
                }`}
                onClick={() => setSelectedKey(key)}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                      isToday ? 'bg-slate-900 text-white' : 'text-slate-700'
                    } ${!inMonth ? 'opacity-40' : ''}`}
                  >
                    {day.getDate()}
                  </span>
                  {count > 0 ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">{count}</span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="app-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Detalle del dia</h3>
          <span className="text-sm font-medium text-slate-700">{selectedKey}</span>
        </div>

        {selectedReservations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
            No hay reservas para este dia.
          </div>
        ) : (
          <div className="space-y-2">
            {selectedReservations.map((r) => (
              <div key={r.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{r.title}</div>
                    <div className="text-xs text-slate-500">{timeRange(r.startAt, r.endAt)}</div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      r.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
