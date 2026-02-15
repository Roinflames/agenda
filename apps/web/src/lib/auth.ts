export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string };
  activeCenterId?: string;
  centers?: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
    serviceStatus?: 'ACTIVE' | 'SUSPENDED';
    suspensionReason?: string | null;
  }>;
};

const KEY = 'centrofit.session.v1';

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
  else {
    const centers = s.centers ?? [];
    const activeCenterId = s.activeCenterId && centers.some((c) => c.id === s.activeCenterId)
      ? s.activeCenterId
      : centers[0]?.id;
    localStorage.setItem(KEY, JSON.stringify({ ...s, activeCenterId }));
  }
}

export function getAccessToken() {
  return getSession()?.accessToken ?? null;
}

export function getRefreshToken() {
  return getSession()?.refreshToken ?? null;
}

export function getActiveCenter(session: AuthSession | null = getSession()) {
  if (!session?.centers?.length) return null;
  if (session.activeCenterId) {
    const found = session.centers.find((c) => c.id === session.activeCenterId);
    if (found) return found;
  }
  return session.centers[0];
}
