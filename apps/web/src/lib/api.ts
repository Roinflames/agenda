import { getAccessToken, getRefreshToken, getSession, setSession, type AuthSession } from './auth';

function resolveApiBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL as string;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:3101`;
  }
  return 'http://localhost:3101';
}

const API_BASE_URL = resolveApiBaseUrl();

type ApiError = Error & { status?: number; body?: any };

async function request<T>(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers = new Headers(init.headers ?? {});
  headers.set('accept', 'application/json');
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');

  if (init.auth !== false) {
    const token = getAccessToken();
    if (token) headers.set('authorization', `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch {
    const err: ApiError = new Error(`No se pudo conectar con API (${API_BASE_URL}). Verifica contenedores y CORS.`);
    err.status = 0;
    throw err;
  }

  const text = await res.text();
  const body = text ? safeJson(text) : null;

  if (res.ok) return body as T;

  if (res.status === 401 && init.auth !== false) {
    const ok = await tryRefresh();
    if (ok) return request<T>(path, init);
  }

  const err: ApiError = new Error(body?.message ?? `HTTP ${res.status}`);
  err.status = res.status;
  err.body = body;
  throw err;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function tryRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    setSession(null);
    return false;
  }

  if (!res.ok) {
    setSession(null);
    return false;
  }

  const data = (await res.json()) as { accessToken: string; refreshToken: string };
  const current = getSession();
  if (!current) return false;
  const next: AuthSession = { ...current, ...data };
  setSession(next);
  return true;
}

export const api = {
  baseUrl: API_BASE_URL,
  login: (email: string, password: string) =>
    request<AuthSession>('/auth/login', { method: 'POST', auth: false, body: JSON.stringify({ email, password }) }),
  me: () => request<{ user: any; centers: any[] }>('/auth/me'),
  centers: () => request<{ centers: any[] }>('/centros'),
  centerDashboard: (centerId: string) => request<any>(`/centros/${centerId}/dashboard`),

  users: (centerId: string) => request<{ users: any[] }>(`/usuarios?centerId=${encodeURIComponent(centerId)}`),
  createUser: (payload: {
    centerId: string;
    email: string;
    password: string;
    name: string;
    phone?: string;
    role?: 'ADMIN' | 'STAFF' | 'MEMBER';
  }) => request<{ userId: string; centerUserId: string }>('/usuarios', { method: 'POST', body: JSON.stringify(payload) }),

  reservations: (centerId: string, userId?: string) =>
    request<{ reservations: any[] }>(
      `/reservas?centerId=${encodeURIComponent(centerId)}${userId ? `&userId=${encodeURIComponent(userId)}` : ''}`,
    ),
  createReservation: (payload: {
    centerId: string;
    userId?: string;
    kind: 'CLASS' | 'SPACE';
    title: string;
    startAt: string;
    endAt: string;
    priceCents?: number;
    currency?: string;
  }) => request<{ reservation: any }>('/reservas', { method: 'POST', body: JSON.stringify(payload) }),

  membershipPlans: (centerId: string) =>
    request<{ plans: any[] }>(`/membresias/planes?centerId=${encodeURIComponent(centerId)}`),
  createMembershipPlan: (payload: {
    centerId: string;
    name: string;
    priceCents: number;
    currency?: string;
    interval: 'MONTHLY' | 'YEARLY';
    isActive?: boolean;
  }) => request<{ plan: any }>('/membresias/planes', { method: 'POST', body: JSON.stringify(payload) }),
  assignMembership: (payload: { centerId: string; userId: string; planId: string; endsAt?: string }) =>
    request<{ membership: any }>('/membresias/asignar', { method: 'POST', body: JSON.stringify(payload) }),

  reportsIncome: (centerId: string) => request<any>(`/reportes/ingresos?centerId=${encodeURIComponent(centerId)}`),
  reportsReservations: (centerId: string) => request<any>(`/reportes/reservas?centerId=${encodeURIComponent(centerId)}`),
};
