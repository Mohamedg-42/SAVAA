import { createServer } from 'node:http';
import {
  EMPTY_NET,
  loadStateFromPg,
  migratePgSchema,
  resetPgDb,
  saveAccountsToPg,
  saveKvToPg,
  saveNetToPg,
} from './db/postgres.mjs';

/*
  Serveur Backend API REST SAVAA avec Base de Données PostgreSQL.
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

async function initPg() {
  try {
    await migratePgSchema();
    cache = await loadStateFromPg();
    pgReady = true;
    console.log('[SAVAA PostgreSQL] Connecté à PostgreSQL et tables initialisées.');
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Client-Source');
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

export const server = createServer(async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const path = url.pathname;
  const source = String(req.headers['x-client-source'] || '');

  try {
    if (req.method === 'GET' && path === '/api/health') {
      sendJson(res, 200, {
        ok: true,
        service: 'savaa-backend',
        database: 'postgresql',
        pgConnected: pgReady,
        rev: cache.rev,
        updatedAt: cache.updatedAt,
      });
      return;
    }

    if (req.method === 'GET' && path === '/api/events') {
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

    if (req.method === 'GET' && path === '/api/sync') {
      if (pgReady) {
        cache = await loadStateFromPg();
      }
      sendJson(res, 200, cache);
      return;
    }

    if (req.method === 'PUT' && path === '/api/net') {
      const body = await readBody(req);
      if (body && typeof body === 'object') {
        const nextNet = { ...EMPTY_NET, ...cache.net, ...body };
        const meta = pgReady
          ? await saveNetToPg(nextNet)
          : { rev: cache.rev + 1, updatedAt: new Date().toISOString() };
        cache = { ...cache, ...meta, net: nextNet };
        broadcast(source);
      }
      sendJson(res, 200, { ok: true, rev: cache.rev, updatedAt: cache.updatedAt });
      return;
    }

    if (req.method === 'PUT' && path === '/api/accounts') {
      const body = await readBody(req);
      if (body && typeof body === 'object') {
        const meta = pgReady
          ? await saveAccountsToPg(body)
          : { rev: cache.rev + 1, updatedAt: new Date().toISOString() };
        cache = { ...cache, ...meta, accounts: { ...cache.accounts, ...body } };
        broadcast(source);
      }
      sendJson(res, 200, { ok: true, rev: cache.rev, updatedAt: cache.updatedAt });
      return;
    }

    if (req.method === 'PUT' && path === '/api/kv') {
      const body = await readBody(req);
      const entries =
        body && typeof body.key === 'string'
          ? { [body.key]: body.value }
          : body && typeof body.kv === 'object' && body.kv !== null
            ? body.kv
            : null;
      if (entries) {
        const meta = pgReady
          ? await saveKvToPg(entries)
          : { rev: cache.rev + 1, updatedAt: new Date().toISOString() };
        cache = { ...cache, ...meta, kv: { ...cache.kv, ...entries } };
        broadcast(source);
      }
      sendJson(res, 200, { ok: true, rev: cache.rev, updatedAt: cache.updatedAt });
      return;
    }

    if (req.method === 'POST' && path === '/api/reset') {
      const meta = pgReady
        ? await resetPgDb()
        : { rev: cache.rev + 1, updatedAt: new Date().toISOString() };
      cache = {
        ...meta,
        net: { ...EMPTY_NET },
        accounts: {},
        kv: {},
      };
      broadcast(source);
      sendJson(res, 200, { ok: true, rev: cache.rev, updatedAt: cache.updatedAt });
      return;
    }

    sendJson(res, 404, { ok: false, error: 'Route API introuvable' });
  } catch (err) {
    sendJson(res, 500, { ok: false, error: err instanceof Error ? err.message : 'Erreur serveur' });
  }
});

if (process.env.NODE_ENV !== 'test') {
  void initPg().then(() => {
    server.listen(PORT, () => {
      console.log(`[SAVAA Backend API + PostgreSQL] Serveur démarré sur http://localhost:${PORT}`);
    });
  });
}
