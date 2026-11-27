import { migratePgSchema, pool } from './postgres.mjs';

try {
  console.log('[SAVAA PostgreSQL] Application du schéma backend/db/schema.sql…');
  await migratePgSchema();
  console.log('[SAVAA PostgreSQL] Toutes les tables et index PostgreSQL sont prêts.');
} catch (err) {
  console.error('[SAVAA PostgreSQL] Échec de la migration :', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
