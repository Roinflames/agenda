export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string };
  centers?: Array<{ id: string; name: string; slug: string; role: string }>;
};

const KEY = 'boxmagic.session.v1';

export function getSession(): AuthSession | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function setSession(s: AuthSession | null) {
  if (!s) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, JSON.stringify(s));
}

export function getAccessToken() {
  return getSession()?.accessToken ?? null;
}

export function getRefreshToken() {
  return getSession()?.refreshToken ?? null;
}

