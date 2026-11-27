/*
  Client API REST & Temps Réel (SSE) partagé entre :
  - Client 1 : Site Web (apps/web)
  - Client 2 : Application Mobile (apps/mobile)
  Tous deux communiquent avec le Serveur Backend central (backend/server.mjs).
*/

export type ServerSyncPayload<TNet = unknown, TAccounts = Record<string, unknown>> = {
  rev: number;
  updatedAt: string;
  net: TNet;
  accounts: TAccounts;
  kv: Record<string, unknown>;
};

const CLIENT_ID = `${import.meta.env?.VITE_APP_TARGET || 'web'}-${Math.random().toString(36).slice(2, 8)}`;
const TOKEN_KEY = 'savaa-jwt-token-v1';

export function getAuthToken(): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (typeof localStorage === 'undefined') return;
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* stockage indisponible */
  }
}

/** Adresse du serveur Backend (configurable via VITE_API_URL, par défaut http://localhost:4000). */
export function getApiBase(): string {
  const envUrl = import.meta.env?.VITE_API_URL as string | undefined;
  if (envUrl) return envUrl.replace(/\/$/, '');
  return 'http://localhost:4000';
}

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined' && typeof fetch === 'function' && !import.meta.env?.VITEST;
}

async function apiRequest(path: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', body?: unknown): Promise<unknown> {
  if (!isBrowserRuntime()) return null;
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-Source': CLIENT_ID,
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${getApiBase()}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    /* Serveur hors-ligne ou appareil sans réseau : le cache local continue de fonctionner. */
    return null;
  }
}

/** Demande d'envoi d'un code OTP SMS via le Lot 1 du serveur Backend. */
export async function requestOtpFromServer(phone: string): Promise<{ ok: boolean; phone?: string; devCode?: string } | null> {
  const res = await apiRequest('/api/auth/request-otp', 'POST', { phone });
  return (res as { ok: boolean; phone?: string; devCode?: string } | null) ?? null;
}

/** Vérifie le code OTP SMS auprès du Lot 1 du serveur Backend et stocke le jeton JWT reçu. */
export async function verifyOtpOnServer(phone: string, code: string): Promise<{ ok: boolean; token?: string; existingAccount?: boolean } | null> {
  const res = (await apiRequest('/api/auth/verify-otp', 'POST', { phone, code })) as {
    ok: boolean;
    token?: string;
    existingAccount?: boolean;
  } | null;
  if (res?.ok && res.token) {
    setAuthToken(res.token);
  }
  return res;
}

/** Téléverse un média (photo, justificatif, note vocale en data URL) vers `/api/uploads` (Lot 4). */
export async function uploadMediaToServer(dataUrl: string): Promise<string> {
  const res = (await apiRequest('/api/uploads', 'POST', { dataUrl })) as { ok?: boolean; url?: string } | null;
  if (res?.ok && res.url) {
    return `${getApiBase()}${res.url}`;
  }
  return dataUrl;
}

export async function fetchServerSync<TNet = unknown, TAccounts = Record<string, unknown>>(): Promise<ServerSyncPayload<TNet, TAccounts> | null> {
  const data = await apiRequest('/api/sync', 'GET');
  if (!data || typeof data !== 'object' || !('net' in data)) return null;
  return data as ServerSyncPayload<TNet, TAccounts>;
}

export function pushServerNet(net: unknown): void {
  void apiRequest('/api/net', 'PUT', net);
}

export function pushServerAccounts(accounts: unknown): void {
  void apiRequest('/api/accounts', 'PUT', accounts);
}

export function pushServerKv(key: string, value: unknown): void {
  void apiRequest('/api/kv', 'PUT', { key, value });
}

export function resetServerDb(): void {
  void apiRequest('/api/reset', 'POST');
}

/** Abonne le client (Web ou Mobile) aux mises à jour temps réel du serveur Backend via SSE. */
export function subscribeServerUpdates(onRemoteChange: () => void): () => void {
  if (!isBrowserRuntime() || typeof EventSource === 'undefined') return () => {};
  let es: EventSource | null = null;
  try {
    es = new EventSource(`${getApiBase()}/api/events`);
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as { source?: string };
        if (msg.source && msg.source !== 'init' && msg.source !== CLIENT_ID) {
          onRemoteChange();
        }
      } catch {
        /* message ignoré */
      }
    };
  } catch {
    /* SSE indisponible */
  }
  return () => {
    es?.close();
  };
}
