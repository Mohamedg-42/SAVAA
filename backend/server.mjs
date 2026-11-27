import { createServer } from 'node:http';
import { isStaffAuthorized } from './auth-token.mjs';
import {
  EMPTY_NET,
  loadAuditLogsFromPg,
  loadStateFromPg,
  migratePgSchema,
  recordAuditToPg,
  resetPgDb,
  saveAccountsToPg,
  saveKvToPg,
  saveNetToPg,
} from './db/postgres.mjs';
import { handleLot1AuthKyc } from './routes/lot1-auth-kyc.mjs';
import { handleLot2CatalogTraceVet } from './routes/lot2-catalog-trace-vet.mjs';
import { handleLot3CommerceDelivery } from './routes/lot3-commerce-delivery.mjs';
import { handleLot4InvestAdmin } from './routes/lot4-invest-admin.mjs';
import {
  applySecurityHeaders,
  checkRateLimit,
  readBoundedJsonBody,
  resetRateLimiter,
} from './security.mjs';

/*
  Serveur Backend API REST SAVAA avec Base de Données PostgreSQL (Lots 1 à 4).
  Partagé en architecture Client-Serveur entre :
  - Client 1 : Site Web (apps/web, port 5173 / production) + Back-Office (/admin)
  - Client 2 : Application Mobile native Android & iOS (apps/mobile, port 5174 / Capacitor)
*/

const PORT = Number(process.env.PORT || 4000);

let pgReady = false;
let cache = {
  rev: 1,
  updatedAt: new Date().toISOString(),
  net: { ...EMPTY_NET },
  accounts: {},
  kv: {},
};
let memoryAuditLogs = [];

async function initPg() {
  try {
    await migratePgSchema();
    cache = await loadStateFromPg();
    pgReady = true;
    console.log('[SAVAA PostgreSQL] Connecté à PostgreSQL et 22 tables initialisées.');
  } catch (err) {
    pgReady = false;
    console.warn(
      `[SAVAA PostgreSQL] Base PostgreSQL non joignable (${err instanceof Error ? err.message : err}). ` +
        'Vérifiez DATABASE_URL ou lancez "docker compose up -d".',
    );
  }
}

/** Clients connectés en temps réel via Server-Sent Events (SSE). */
const sseClients = new Set();

function broadcast(source = '') {
  const payload = `data: ${JSON.stringify({ rev: cache.rev, updatedAt: cache.updatedAt, source })}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch {
      sseClients.delete(res);
    }
  }
}

function setCors(res, req) {
  applySecurityHeaders(req, res);
}

function sendJson(res, status, data, req) {
  applySecurityHeaders(req, res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return readBoundedJsonBody(req);
}

async function persistState(patch, source = '') {
  let meta = { rev: cache.rev + 1, updatedAt: new Date().toISOString() };
  if (patch.net) {
    const nextNet = { ...EMPTY_NET, ...cache.net, ...patch.net };
    if (pgReady) meta = await saveNetToPg(nextNet);
    cache.net = nextNet;
  }
  if (patch.accounts) {
    if (pgReady) meta = await saveAccountsToPg(patch.accounts);
    cache.accounts = { ...cache.accounts, ...patch.accounts };
  }
  if (patch.kv) {
    if (pgReady) meta = await saveKvToPg(patch.kv);
    cache.kv = { ...cache.kv, ...patch.kv };
  }
  cache.rev = meta.rev;
  cache.updatedAt = meta.updatedAt;
  broadcast(source);
  return meta;
}

async function recordAudit(actor, action, targetId, details = {}) {
  const entry = {
    id: memoryAuditLogs.length + 1,
    actor: actor || 'système',
    action,
    targetId: targetId || null,
    details,
    createdAt: new Date().toISOString(),
  };
  memoryAuditLogs = [entry, ...memoryAuditLogs.slice(0, 99)];
  if (pgReady) {
    try {
      await recordAuditToPg(actor, action, targetId, details);
    } catch {
      /* journal en mémoire conservé */
    }
  }
}

async function getAuditLogs() {
  if (pgReady) {
    try {
      return await loadAuditLogsFromPg();
    } catch {
      return memoryAuditLogs;
    }
  }
  return memoryAuditLogs;
}

export const server = createServer(async (req, res) => {
  applySecurityHeaders(req, res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method || 'GET';
  const source = String(req.headers['x-client-source'] || '');

  // Rate Limiting par IP (plus strict sur /api/auth/* pour bloquer le brute-force)
  const isAuthRoute = path.startsWith('/api/auth/');
  const rate = checkRateLimit(req, isAuthRoute ? 'auth' : 'api', isAuthRoute ? 25 : 300, 60_000);
  if (!rate.allowed) {
    res.setHeader('Retry-After', String(rate.retryAfterSec));
    sendJson(
      res,
      429,
      { ok: false, error: 'Trop de requêtes. Veuillez patienter avant de réessayer.' },
      req,
    );
    return;
  }

  try {
    if (method === 'GET' && path === '/api/health') {
      sendJson(res, 200, {
        ok: true,
        service: 'savaa-backend',
        database: 'postgresql',
        pgConnected: pgReady,
        lots: ['lot1-auth-kyc', 'lot2-catalog-trace-vet', 'lot3-commerce-delivery', 'lot4-invest-admin'],
        rev: cache.rev,
        updatedAt: cache.updatedAt,
      });
      return;
    }

    if (method === 'GET' && path === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.write(`data: ${JSON.stringify({ rev: cache.rev, updatedAt: cache.updatedAt, source: 'init' })}\n\n`);
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));
      return;
    }

    if (method === 'GET' && path === '/api/sync') {
      if (pgReady) {
        cache = await loadStateFromPg();
      }
      sendJson(res, 200, cache);
      return;
    }

    if (method === 'PUT' && path === '/api/net') {
      const body = await readBody(req);
      if (body && typeof body === 'object') {
        await persistState({ net: body }, source);
      }
      sendJson(res, 200, { ok: true, rev: cache.rev, updatedAt: cache.updatedAt });
      return;
    }

    if (method === 'PUT' && path === '/api/accounts') {
      const body = await readBody(req);
      if (body && typeof body === 'object') {
        await persistState({ accounts: body }, source);
      }
      sendJson(res, 200, { ok: true, rev: cache.rev, updatedAt: cache.updatedAt });
      return;
    }

    if (method === 'PUT' && path === '/api/kv') {
      const body = await readBody(req);
      const entries =
        body && typeof body.key === 'string'
          ? { [body.key]: body.value }
          : body && typeof body.kv === 'object' && body.kv !== null
            ? body.kv
            : null;
      if (entries) {
        await persistState({ kv: entries }, source);
      }
      sendJson(res, 200, { ok: true, rev: cache.rev, updatedAt: cache.updatedAt });
      return;
    }

    if (method === 'POST' && path === '/api/reset') {
      if (process.env.NODE_ENV === 'production' && !isStaffAuthorized(req)) {
        sendJson(res, 403, { ok: false, error: 'Réinitialisation réservée à l’équipe SAVAA en production.' });
        return;
      }
      const meta = pgReady
        ? await resetPgDb()
        : { rev: cache.rev + 1, updatedAt: new Date().toISOString() };
      cache = {
        ...meta,
        net: { ...EMPTY_NET },
        accounts: {},
        kv: {},
      };
      memoryAuditLogs = [];
      resetRateLimiter();
      broadcast(source);
      sendJson(res, 200, { ok: true, rev: cache.rev, updatedAt: cache.updatedAt });
      return;
    }

    const ctx = {
      req,
      res,
      url,
      path,
      method,
      source,
      readBody,
      sendJson,
      setCors: (r) => setCors(r, req),
      state: cache,
      persistState: (patch) => persistState(patch, source),
      recordAudit,
      getAuditLogs,
    };

    if (await handleLot1AuthKyc(ctx)) return;
    if (await handleLot2CatalogTraceVet(ctx)) return;
    if (await handleLot3CommerceDelivery(ctx)) return;
    if (await handleLot4InvestAdmin(ctx)) return;

    sendJson(res, 404, { ok: false, error: 'Route API introuvable' });
  } catch (err) {
    const status = err && typeof err === 'object' && 'statusCode' in err ? Number(err.statusCode) : 500;
    const message =
      status === 400 || status === 413
        ? err.message
        : 'Erreur interne du serveur.';
    sendJson(res, status, { ok: false, error: message });
  }
});

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  void initPg().then(() => {
    server.listen(PORT, () => {
      console.log(`[SAVAA Backend API + PostgreSQL] Serveur démarré sur http://localhost:${PORT}`);
    });
  });
}
