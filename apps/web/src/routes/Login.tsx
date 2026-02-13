import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { setSession } from '../lib/auth';

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('rreyes@example.com');
  const [password, setPassword] = useState('DevPassword123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => email.trim() && password.trim(), [email, password]);

  return (
    <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-4 py-10 md:grid-cols-2">
      <section className="hidden md:block">
        <div className="space-y-4">
          <div className="inline-flex items-center rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
            Panel operativo
          </div>
          <h1 className="text-4xl font-bold leading-tight text-slate-900">Gestiona reservas, membresias y reportes desde un solo lugar</h1>
          <p className="max-w-md text-slate-600">
            Accede al panel administrativo para operar centros, usuarios y pagos con una vista clara para el equipo.
          </p>
        </div>
      </section>

      <section className="app-card w-full p-6 md:p-8">
        <h2 className="text-2xl font-bold text-slate-900">Ingreso al panel</h2>
        <p className="mt-1 text-sm text-slate-600">Usa tu cuenta de operador o administrador.</p>

        <div className="mt-6 space-y-4">
          <label className="block">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Email</div>
            <input
              className="app-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="nombre@empresa.com"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Password</div>
            <input
              className="app-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}

          <button
            className="app-btn-primary w-full"
            disabled={!canSubmit || loading}
            onClick={async () => {
              setError(null);
              setLoading(true);
              try {
                const s = await api.login(email.trim(), password);
                setSession(s);
                nav('/app', { replace: true });
              } catch (e: any) {
                setError(e?.message ?? 'No fue posible iniciar sesion');
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? 'Ingresando...' : 'Entrar'}
          </button>
        </div>
      </section>
    </div>
  );
}
