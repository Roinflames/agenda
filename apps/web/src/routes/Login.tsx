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
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow">
        <h1 className="text-xl font-semibold">Ingresar</h1>
        <p className="mt-1 text-sm text-zinc-400">Admin / Staff / Member</p>

        <div className="mt-6 space-y-3">
          <label className="block">
            <div className="mb-1 text-xs text-zinc-400">Email</div>
            <input
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs text-zinc-400">Password</div>
            <input
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-600"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error ? <div className="rounded-md border border-red-900 bg-red-950 p-3 text-sm">{error}</div> : null}

          <button
            className="w-full rounded-md bg-white px-3 py-2 text-sm font-medium text-black disabled:opacity-50"
            disabled={!canSubmit || loading}
            onClick={async () => {
              setError(null);
              setLoading(true);
              try {
                const s = await api.login(email.trim(), password);
                setSession(s);
                nav('/app', { replace: true });
              } catch (e: any) {
                setError(e?.message ?? 'Error');
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? 'Ingresando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  );
}

