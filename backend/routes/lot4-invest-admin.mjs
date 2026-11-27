import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isStaffAuthorized } from '../auth-token.mjs';
import { validateUploadedBinary } from '../security.mjs';

/*
  LOT 4 — Espace Investisseur, Projets Agricoles, Propositions, Stockage Uploads & Back-Office Audit/Stats
  Routes :
  - GET   /api/investors
  - POST  /api/investors
  - PATCH /api/investors/:id/status
  - POST  /api/investors/:id/notes
  - GET   /api/projects
  - POST  /api/projects
  - PATCH /api/projects/:id
  - GET   /api/proposals
  - POST  /api/proposals
  - PATCH /api/proposals/:id/respond
  - POST  /api/uploads
  - GET   /uploads/:filename
  - GET   /api/admin/stats
  - GET   /api/admin/audit
*/

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, '..', 'uploads');

export async function handleLot4InvestAdmin(ctx) {
  const { req, res, path, method, readBody, sendJson, state, persistState, recordAudit, getAuditLogs, setCors } = ctx;

  // 1. Dossiers investisseurs (/api/investors)
  if (path === '/api/investors' && method === 'GET') {
    const list = state.kv['invest.admin.dossiers'] || [];
    const local = state.kv['invest.dossier'] || null;
    sendJson(res, 200, { ok: true, dossiers: list, localDossier: local });
    return true;
  }

  if (path === '/api/investors' && method === 'POST') {
    const body = await readBody(req);
    if (!body.type || (body.type !== 'particulier' && body.type !== 'entreprise')) {
      sendJson(res, 400, { ok: false, error: 'Type d’investisseur requis (particulier ou entreprise).' });
      return true;
    }
    const year = new Date().getFullYear();
    const ref = body.ref || `INV-${year}-${String(Math.floor(100000 + Math.random() * 900000))}`;
    const id = body.id || `DOS-${Date.now().toString(36).toUpperCase()}`;
    const nowDate = new Date().toLocaleDateString('fr-FR');
    const dossier = {
      ...body,
      id,
      ref,
      status: body.status || 'soumis',
      submittedAt: body.submittedAt || nowDate,
      updatedAt: nowDate,
      history: body.history || [{ status: 'soumis', date: nowDate, by: body.name || 'Investisseur' }],
      notes: body.notes || [],
    };
    const existing = state.kv['invest.admin.dossiers'] || [];
    const nextList = [dossier, ...existing.filter((d) => d.id !== id && d.ref !== ref)];
    await persistState({
      kv: {
        'invest.dossier': dossier,
        'invest.admin.dossiers': nextList,
      },
    });
    await recordAudit(body.phone || body.name || 'investisseur', 'INVESTOR_DOSSIER_SUBMITTED', ref, {
      type: dossier.type,
    });
    sendJson(res, 201, { ok: true, dossier });
    return true;
  }

  const invStatusMatch = /^\/api\/investors\/([^/]+)\/status$/.exec(path);
  if (invStatusMatch && method === 'PATCH') {
    if (!isStaffAuthorized(req)) {
      sendJson(res, 403, { ok: false, error: 'Accès réservé à l’équipe SAVAA (code SAVAA-EQUIPE requis).' });
      return true;
    }
    const id = decodeURIComponent(invStatusMatch[1]);
    const body = await readBody(req);
    const status = body.status;
    if ((status === 'complement' || status === 'refuse') && !String(body.reason || '').trim()) {
      sendJson(res, 400, {
        ok: false,
        error: 'Un motif est obligatoire pour demander des compléments ou refuser un dossier.',
      });
      return true;
    }
    const list = state.kv['invest.admin.dossiers'] || [];
    const target = list.find((d) => d.id === id || d.ref === id);
    if (!target) {
      sendJson(res, 404, { ok: false, error: 'Dossier investisseur introuvable.' });
      return true;
    }
    const nowDate = new Date().toLocaleDateString('fr-FR');
    const updated = {
      ...target,
      status,
      reason: body.reason ? String(body.reason).trim() : target.reason,
      updatedAt: nowDate,
      history: [
        { status, date: nowDate, by: 'Équipe SAVAA', note: body.reason ? String(body.reason).trim() : undefined },
        ...(target.history || []),
      ],
    };
    const nextList = list.map((d) => (d.id === target.id ? updated : d));
    await persistState({ kv: { 'invest.admin.dossiers': nextList } });
    await recordAudit('Équipe SAVAA', `INVESTOR_STATUS_${String(status).toUpperCase()}`, target.ref || id, {
      reason: body.reason,
    });
    sendJson(res, 200, { ok: true, dossier: updated });
    return true;
  }

  // 2. Catalogue de projets agricoles (/api/projects)
  if (path === '/api/projects' && method === 'GET') {
    const projects = state.kv['invest.admin.projects'] || [];
    sendJson(res, 200, { ok: true, projects });
    return true;
  }

  if (path === '/api/projects' && method === 'POST') {
    if (!isStaffAuthorized(req)) {
      sendJson(res, 403, { ok: false, error: 'Accès réservé à l’équipe SAVAA.' });
      return true;
    }
    const body = await readBody(req);
    if (!body.title || !body.filiere || !body.region) {
      sendJson(res, 400, { ok: false, error: 'Titre, filière et région sont obligatoires pour un projet agricole.' });
      return true;
    }
    const project = {
      ...body,
      id: body.id || `PRJ-${Date.now().toString(36).toUpperCase()}`,
      status: body.status || 'publie',
      updatedAt: new Date().toLocaleDateString('fr-FR'),
    };
    const list = state.kv['invest.admin.projects'] || [];
    const nextList = [project, ...list.filter((p) => p.id !== project.id)];
    await persistState({ kv: { 'invest.admin.projects': nextList } });
    await recordAudit('Équipe SAVAA', 'PROJECT_CREATED', project.id, { title: project.title });
    sendJson(res, 201, { ok: true, project });
    return true;
  }

  // 3. Propositions de projets aux investisseurs (/api/proposals)
  if (path === '/api/proposals' && method === 'GET') {
    const proposals = state.kv['invest.admin.proposals'] || [];
    sendJson(res, 200, { ok: true, proposals });
    return true;
  }

  if (path === '/api/proposals' && method === 'POST') {
    if (!isStaffAuthorized(req)) {
      sendJson(res, 403, { ok: false, error: 'Accès réservé à l’équipe SAVAA.' });
      return true;
    }
    const body = await readBody(req);
    if (!body.dossierId || !body.projectId) {
      sendJson(res, 400, { ok: false, error: 'Identifiants du dossier et du projet obligatoires.' });
      return true;
    }
    const proposal = {
      id: body.id || `PRP-${Date.now().toString(36).toUpperCase()}`,
      dossierId: body.dossierId,
      projectId: body.projectId,
      message: body.message || '',
      conditions: body.conditions || '',
      deadline: body.deadline,
      sentAt: new Date().toLocaleDateString('fr-FR'),
      sentBy: 'Équipe SAVAA',
      status: 'envoyee',
    };
    const list = state.kv['invest.admin.proposals'] || [];
    await persistState({ kv: { 'invest.admin.proposals': [proposal, ...list] } });
    await recordAudit('Équipe SAVAA', 'PROPOSAL_SENT', proposal.id, {
      dossierId: proposal.dossierId,
      projectId: proposal.projectId,
    });
    sendJson(res, 201, { ok: true, proposal });
    return true;
  }

  const propRespondMatch = /^\/api\/proposals\/([^/]+)\/respond$/.exec(path);
  if (propRespondMatch && method === 'PATCH') {
    const id = decodeURIComponent(propRespondMatch[1]);
    const body = await readBody(req);
    const list = state.kv['invest.admin.proposals'] || [];
    const target = list.find((p) => p.id === id);
    if (!target) {
      sendJson(res, 404, { ok: false, error: 'Proposition introuvable.' });
      return true;
    }
    const updated = {
      ...target,
      status: body.status || 'interesse',
      investorNote: body.note,
      respondedAt: new Date().toLocaleDateString('fr-FR'),
    };
    await persistState({
      kv: { 'invest.admin.proposals': list.map((p) => (p.id === id ? updated : p)) },
    });
    await recordAudit('investisseur', 'PROPOSAL_RESPONDED', id, { status: updated.status });
    sendJson(res, 200, { ok: true, proposal: updated });
    return true;
  }

  // 4. Stockage serveur sécurisé des photos, notes vocales et pièces justificatives (/api/uploads)
  if (path === '/api/uploads' && method === 'POST') {
    const body = await readBody(req);
    const dataUrl = String(body.dataUrl || '');
    const match = /^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/.exec(dataUrl);
    if (!match) {
      sendJson(res, 400, { ok: false, error: 'Format data URL base64 invalide.' });
      return true;
    }
    const declaredMime = match[1].toLowerCase();
    const buf = Buffer.from(match[2], 'base64');
    const check = validateUploadedBinary(declaredMime, buf);
    if (!check.ok) {
      sendJson(res, 400, { ok: false, error: check.error });
      return true;
    }
    if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
    const filename = `savaa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${check.ext}`;
    writeFileSync(join(UPLOADS_DIR, filename), buf);
    sendJson(res, 201, {
      ok: true,
      filename,
      mime: check.mime,
      size: buf.length,
      url: `/uploads/${filename}`,
    });
    return true;
  }

  const uploadGetMatch = /^\/uploads\/([a-zA-Z0-9._-]+)$/.exec(path);
  if (uploadGetMatch && method === 'GET') {
    const filename = uploadGetMatch[1];
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      sendJson(res, 400, { ok: false, error: 'Nom de fichier invalide.' });
      return true;
    }
    const filePath = join(UPLOADS_DIR, filename);
    if (!existsSync(filePath)) {
      sendJson(res, 404, { ok: false, error: 'Fichier introuvable.' });
      return true;
    }
    const ext = filename.split('.').pop();
    const mime =
      ext === 'png'
        ? 'image/png'
        : ext === 'pdf'
          ? 'application/pdf'
          : ext === 'webm'
            ? 'audio/webm'
            : 'image/jpeg';
    setCors(res);
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'public, max-age=86400' });
    res.end(readFileSync(filePath));
    return true;
  }

  // 5. Statistiques globales et journal d'audit du Back-Office (/api/admin/stats, /api/admin/audit)
  if (path === '/api/admin/stats' && method === 'GET') {
    if (!isStaffAuthorized(req)) {
      sendJson(res, 403, { ok: false, error: 'Accès réservé à l’équipe SAVAA (code SAVAA-EQUIPE requis).' });
      return true;
    }
    const listings = state.net.listings;
    const orders = state.kv['orders.all'] || [];
    const dossiers = state.kv['invest.admin.dossiers'] || [];
    sendJson(res, 200, {
      ok: true,
      stats: {
        accountsCount: Object.keys(state.accounts).length,
        listingsTotal: listings.length,
        listingsPendingReview: listings.filter((l) => l.status === 'review').length,
        listingsOnline: listings.filter((l) => l.status === 'online').length,
        kycPendingReview: state.net.kyc.filter((k) => k.status === 'review').length,
        alertsOpen: state.net.alerts.filter((a) => a.status !== 'done').length,
        missionsActive: state.net.missions.filter((m) => m.status !== 'delivered').length,
        ordersTotal: orders.length,
        gmvFcfa: orders.filter((o) => !o.cancelled).reduce((s, o) => s + Number(o.total || 0), 0),
        investorDossiersTotal: dossiers.length,
      },
    });
    return true;
  }

  if (path === '/api/admin/audit' && method === 'GET') {
    if (!isStaffAuthorized(req)) {
      sendJson(res, 403, { ok: false, error: 'Accès réservé à l’équipe SAVAA.' });
      return true;
    }
    sendJson(res, 200, { ok: true, logs: await getAuditLogs() });
    return true;
  }

  return false;
}
