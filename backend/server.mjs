import { createServer } from 'node:http';
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

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Staff-Code, X-Client-Source');
}

function sendJson(res, status, data) {
  setCors(res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
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
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method || 'GET';
  const source = String(req.headers['x-client-source'] || '');

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
      setCors,
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
    sendJson(res, 500, { ok: false, error: err instanceof Error ? err.message : 'Erreur serveur' });
  }
});

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  void initPg().then(() => {
    server.listen(PORT, () => {
      console.log(`[SAVAA Backend API + PostgreSQL] Serveur démarré sur http://localhost:${PORT}`);
    });
  });
}
