import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_FILE = join(__dirname, 'schema.sql');

export const EMPTY_NET = {
  alerts: [],
  missions: [],
  quotes: [],
  listings: [],
  sales: [],
  validations: [],
  invoices: [],
  recurring: [],
  visits: [],
  kyc: [],
  couriers: [],
  threads: [],
  reviews: [],
};

/** Configuration du Pool PostgreSQL (via DATABASE_URL ou variables PG*). */
export function createPgPool() {
  const connectionString =
    process.env.DATABASE_URL ||
    `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || 'postgres'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || '5432'}/${process.env.PGDATABASE || 'savaa'}`;
  return new Pool({
    connectionString,
    connectionTimeoutMillis: 4000,
  });
}

export const pool = createPgPool();

/** Exécute backend/db/schema.sql pour créer toutes les tables et index PostgreSQL. */
export async function migratePgSchema(client = pool) {
  const sql = readFileSync(SCHEMA_FILE, 'utf8');
  await client.query(sql);
}

async function bumpRev(client) {
  const res = await client.query(
    `UPDATE savaa_meta SET rev = rev + 1, updated_at = NOW() WHERE id = 1 RETURNING rev, updated_at`,
  );
  return {
    rev: Number(res.rows[0]?.rev || 1),
    updatedAt: res.rows[0]?.updated_at ? new Date(res.rows[0].updated_at).toISOString() : new Date().toISOString(),
  };
}

/** Charge l'état complet (net, accounts, kv, rev, updatedAt) depuis les tables PostgreSQL. */
export async function loadStateFromPg() {
  const [
    metaRes,
    accountsRes,
    listingsRes,
    alertsRes,
    missionsRes,
    quotesRes,
    salesRes,
    validationsRes,
    invoicesRes,
    recurringRes,
    visitsRes,
    kycRes,
    couriersRes,
    threadsRes,
    reviewsRes,
    kvRes,
  ] = await Promise.all([
    pool.query(`SELECT rev, updated_at FROM savaa_meta WHERE id = 1`),
    pool.query(`SELECT phone, payload FROM savaa_accounts ORDER BY updated_at DESC`),
    pool.query(`SELECT payload FROM savaa_listings ORDER BY updated_at DESC`),
    pool.query(`SELECT payload FROM savaa_alerts ORDER BY updated_at DESC`),
    pool.query(`SELECT payload FROM savaa_missions ORDER BY updated_at DESC`),
    pool.query(`SELECT payload FROM savaa_quotes ORDER BY updated_at DESC`),
    pool.query(`SELECT payload FROM savaa_sales ORDER BY updated_at DESC`),
    pool.query(`SELECT payload FROM savaa_validations ORDER BY updated_at DESC`),
    pool.query(`SELECT payload FROM savaa_invoices ORDER BY updated_at DESC`),
    pool.query(`SELECT payload FROM savaa_recurring ORDER BY updated_at DESC`),
    pool.query(`SELECT payload FROM savaa_visits ORDER BY updated_at DESC`),
    pool.query(`SELECT payload FROM savaa_kyc ORDER BY updated_at DESC`),
    pool.query(`SELECT payload FROM savaa_couriers ORDER BY updated_at DESC`),
    pool.query(`SELECT payload FROM savaa_threads ORDER BY updated_at DESC`),
    pool.query(`SELECT payload FROM savaa_reviews ORDER BY updated_at DESC`),
    pool.query(`SELECT key, value FROM savaa_kv`),
  ]);

  const accounts = {};
  for (const r of accountsRes.rows) accounts[r.phone] = r.payload;

  const kv = {};
  for (const r of kvRes.rows) kv[r.key] = r.value;

  const meta = metaRes.rows[0];
  return {
    rev: Number(meta?.rev || 1),
    updatedAt: meta?.updated_at ? new Date(meta.updated_at).toISOString() : new Date().toISOString(),
    net: {
      listings: listingsRes.rows.map((r) => r.payload),
      alerts: alertsRes.rows.map((r) => r.payload),
      missions: missionsRes.rows.map((r) => r.payload),
      quotes: quotesRes.rows.map((r) => r.payload),
      sales: salesRes.rows.map((r) => r.payload),
      validations: validationsRes.rows.map((r) => r.payload),
      invoices: invoicesRes.rows.map((r) => r.payload),
      recurring: recurringRes.rows.map((r) => r.payload),
      visits: visitsRes.rows.map((r) => r.payload),
      kyc: kycRes.rows.map((r) => r.payload),
      couriers: couriersRes.rows.map((r) => r.payload),
      threads: threadsRes.rows.map((r) => r.payload),
      reviews: reviewsRes.rows.map((r) => r.payload),
    },
    accounts,
    kv,
  };
}

async function replaceRows(client, table, items, insertSql, mapValues) {
  await client.query(`DELETE FROM ${table}`);
  for (const item of items || []) {
    await client.query(insertSql, mapValues(item));
  }
}

/** Enregistre toutes les collections relationnelles du réseau SAVAA dans PostgreSQL en une transaction. */
export async function saveNetToPg(net) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (Array.isArray(net.listings)) {
      await replaceRows(
        client,
        'savaa_listings',
        net.listings,
        `INSERT INTO savaa_listings (id, owner_phone, title, category, price, pro_price, status, place, trace_code, payload, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, NOW())`,
        (l) => [
          l.id,
          l.ownerPhone || null,
          l.title || '',
          l.category || '',
          Number(l.price || 0),
          l.proPrice != null ? Number(l.proPrice) : null,
          l.status || 'review',
          l.place || null,
          l.sheet?.code || null,
          JSON.stringify(l),
        ],
      );
    }

    if (Array.isArray(net.alerts)) {
      await replaceRows(
        client,
        'savaa_alerts',
        net.alerts,
        `INSERT INTO savaa_alerts (id, animal_id, from_phone, urgency, status, payload, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())`,
        (a) => [a.id, a.animalId || '', a.from?.phone || null, a.urgency || 'Moyenne', a.status || 'open', JSON.stringify(a)],
      );
    }

    if (Array.isArray(net.missions)) {
      await replaceRows(
        client,
        'savaa_missions',
        net.missions,
        `INSERT INTO savaa_missions (id, order_ref, status, courier_phone, fee, payload, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())`,
        (m) => [m.id, m.orderRef || '', m.status || 'open', m.courier?.phone || null, Number(m.fee || 0), JSON.stringify(m)],
      );
    }

    if (Array.isArray(net.quotes)) {
      await replaceRows(
        client,
        'savaa_quotes',
        net.quotes,
        `INSERT INTO savaa_quotes (id, from_phone, product, status, payload, updated_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, NOW())`,
        (q) => [q.id, q.from?.phone || null, q.product || '', q.status || 'open', JSON.stringify(q)],
      );
    }

    if (Array.isArray(net.sales)) {
      await replaceRows(
        client,
        'savaa_sales',
        net.sales,
        `INSERT INTO savaa_sales (id, order_ref, listing_id, seller_phone, status, payload, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())`,
        (s) => [s.id, s.orderRef || '', s.listingId || '', s.sellerPhone || '', s.status || 'new', JSON.stringify(s)],
      );
    }

    if (Array.isArray(net.validations)) {
      await replaceRows(
        client,
        'savaa_validations',
        net.validations,
        `INSERT INTO savaa_validations (id, animal_id, from_phone, status, payload, updated_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, NOW())`,
        (v) => [v.id, v.animalId || '', v.from?.phone || null, v.status || 'open', JSON.stringify(v)],
      );
    }

    if (Array.isArray(net.invoices)) {
      await replaceRows(
        client,
        'savaa_invoices',
        net.invoices,
        `INSERT INTO savaa_invoices (id, ref, status, amount, payload, updated_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, NOW())`,
        (inv) => [inv.id, inv.ref || '', inv.status || 'due', Number(inv.amount || 0), JSON.stringify(inv)],
      );
    }

    if (Array.isArray(net.recurring)) {
      await replaceRows(
        client,
        'savaa_recurring',
        net.recurring,
        `INSERT INTO savaa_recurring (id, quote_id, status, next_date, payload, updated_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, NOW())`,
        (r) => [r.id, r.quoteId || '', r.status || 'active', r.next || null, JSON.stringify(r)],
      );
    }

    if (Array.isArray(net.visits)) {
      await replaceRows(
        client,
        'savaa_visits',
        net.visits,
        `INSERT INTO savaa_visits (id, from_phone, status, payload, updated_at)
         VALUES ($1, $2, $3, $4::jsonb, NOW())`,
        (v) => [v.id, v.from?.phone || null, v.status || 'open', JSON.stringify(v)],
      );
    }

    if (Array.isArray(net.kyc)) {
      await replaceRows(
        client,
        'savaa_kyc',
        net.kyc,
        `INSERT INTO savaa_kyc (id, phone, status, payload, updated_at)
         VALUES ($1, $2, $3, $4::jsonb, NOW())`,
        (k) => [k.id, k.person?.phone || '', k.status || 'review', JSON.stringify(k)],
      );
    }

    if (Array.isArray(net.couriers)) {
      await replaceRows(
        client,
        'savaa_couriers',
        net.couriers,
        `INSERT INTO savaa_couriers (phone, name, vehicle, base, radius, online, payload, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())`,
        (c) => [c.phone, c.name || '', c.vehicle || 'moto', c.base || '', Number(c.radius || 15), Boolean(c.online), JSON.stringify(c)],
      );
    }

    if (Array.isArray(net.threads)) {
      await replaceRows(
        client,
        'savaa_threads',
        net.threads,
        `INSERT INTO savaa_threads (id, kind, ref_id, payload, updated_at)
         VALUES ($1, $2, $3, $4::jsonb, NOW())`,
        (t) => [t.id, t.kind || 'listing', t.refId || null, JSON.stringify(t)],
      );
    }

    if (Array.isArray(net.reviews)) {
      await replaceRows(
        client,
        'savaa_reviews',
        net.reviews,
        `INSERT INTO savaa_reviews (id, seller, rating, payload, updated_at)
         VALUES ($1, $2, $3, $4::jsonb, NOW())`,
        (r) => [r.id, r.seller || '', Number(r.rating || 5), JSON.stringify(r)],
      );
    }

    const meta = await bumpRev(client);
    await client.query('COMMIT');
    return meta;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/** Enregistre ou met à jour les comptes utilisateurs dans PostgreSQL (`savaa_accounts`). */
export async function saveAccountsToPg(accounts) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [phone, acc] of Object.entries(accounts || {})) {
      const session = acc?.session || {};
      await client.query(
        `INSERT INTO savaa_accounts (phone, name, town, roles, payload, updated_at)
         VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, NOW())
         ON CONFLICT (phone) DO UPDATE
         SET name = EXCLUDED.name,
             town = EXCLUDED.town,
             roles = EXCLUDED.roles,
             payload = EXCLUDED.payload,
             updated_at = NOW()`,
        [phone, session.name || '', session.town || null, JSON.stringify(session.roles || []), JSON.stringify(acc)],
      );
    }
    const meta = await bumpRev(client);
    await client.query('COMMIT');
    return meta;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/** Enregistre une entrée clé → valeur (dossiers investisseurs, projets agricoles, CRM) dans PostgreSQL (`savaa_kv`). */
export async function saveKvToPg(entries) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [key, value] of Object.entries(entries || {})) {
      await client.query(
        `INSERT INTO savaa_kv (key, value, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value,
             updated_at = NOW()`,
        [key, JSON.stringify(value ?? null)],
      );
    }
    const meta = await bumpRev(client);
    await client.query('COMMIT');
    return meta;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/** Vide toutes les tables PostgreSQL SAVAA lors d'une remise à zéro de la démo. */
export async function resetPgDb() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      TRUNCATE TABLE
        savaa_accounts,
        savaa_listings,
        savaa_alerts,
        savaa_missions,
        savaa_quotes,
        savaa_sales,
        savaa_validations,
        savaa_invoices,
        savaa_recurring,
        savaa_visits,
        savaa_kyc,
        savaa_couriers,
        savaa_threads,
        savaa_reviews,
        savaa_kv,
        savaa_otps,
        savaa_orders,
        savaa_investors,
        savaa_projects,
        savaa_proposals,
        savaa_audit_logs
    `);
    const meta = await bumpRev(client);
    await client.query('COMMIT');
    return meta;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/** Enregistre une entrée dans le journal d'audit PostgreSQL (`savaa_audit_logs`). */
export async function recordAuditToPg(actor, action, targetId, details) {
  await pool.query(
    `INSERT INTO savaa_audit_logs (actor, action, target_id, details, created_at)
     VALUES ($1, $2, $3, $4::jsonb, NOW())`,
    [actor || 'système', action, targetId || null, JSON.stringify(details || {})],
  );
}

/** Lit les 100 dernières entrées du journal d'audit PostgreSQL. */
export async function loadAuditLogsFromPg() {
  const res = await pool.query(
    `SELECT id, actor, action, target_id AS "targetId", details, created_at AS "createdAt"
     FROM savaa_audit_logs
     ORDER BY id DESC
     LIMIT 100`,
  );
  return res.rows;
}
