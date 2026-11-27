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

/** Adresse du serveur Backend (configurable via VITE_API_URL, par défaut http://localhost:4000). */
export function getApiBase(): string {
  const envUrl = import.meta.env?.VITE_API_URL as string | undefined;
  if (envUrl) return envUrl.replace(/\/$/, '');
  return 'http://localhost:4000';
}

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined' && typeof fetch === 'function' && !import.meta.env?.VITEST;
}

async function apiRequest(path: string, method: 'GET' | 'POST' | 'PUT', body?: unknown): Promise<unknown> {
  if (!isBrowserRuntime()) return null;
  try {
    const res = await fetch(`${getApiBase()}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Source': CLIENT_ID,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    /* Serveur hors-ligne ou appareil sans réseau : le cache local continue de fonctionner. */
    return null;
  }
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
