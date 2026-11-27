import {
  getAuthUser,
  isStaffAuthorized,
  normalizeCiPhone,
  signToken,
  validateRolesRule,
} from '../auth-token.mjs';
import { sendSmsOtp } from '../providers.mjs';

/*
  LOT 1 — Authentification OTP SMS, Sessions JWT, Comptes Utilisateurs, Rôles & KYC
  Routes :
  - POST /api/auth/request-otp
  - POST /api/auth/verify-otp
  - GET  /api/auth/me
  - GET  /api/users/:phone
  - PUT  /api/users/:phone
  - GET  /api/kyc
  - POST /api/kyc
  - PUT  /api/kyc/:id/decision
*/

const otpMemory = new Map();

export async function handleLot1AuthKyc(ctx) {
  const { req, res, path, method, readBody, sendJson, state, persistState, recordAudit } = ctx;

  // 1. Demande d'envoi d'un code OTP SMS sur un numéro ivoirien à 10 chiffres
  if (method === 'POST' && path === '/api/auth/request-otp') {
    const body = await readBody(req);
    const phone = normalizeCiPhone(body.phone);
    if (!phone) {
      sendJson(res, 400, {
        ok: false,
        error: 'Numéro ivoirien invalide. Format attendu : 10 chiffres commençant par 01, 05, 07, 25 ou 27.',
      });
      return true;
    }
    const code = process.env.SMS_LIVE === 'true' ? String(Math.floor(1000 + Math.random() * 9000)) : '1234';
    const expiresAt = Date.now() + 10 * 60 * 1000;
    otpMemory.set(phone, { code, expiresAt, attempts: 0 });
    const smsResult = await sendSmsOtp(phone, code);
    await recordAudit(phone, 'AUTH_OTP_REQUESTED', phone, {
      expiresAt: new Date(expiresAt).toISOString(),
      smsMode: smsResult.mode,
    });
    sendJson(res, 200, {
      ok: true,
      phone,
      expiresInSec: 600,
      smsMode: smsResult.mode,
      devCode: process.env.SMS_LIVE === 'true' ? undefined : code,
    });
    return true;
  }

  // 2. Vérification du code OTP avec protection anti brute-force (verrouillage après 5 échecs)
  if (method === 'POST' && path === '/api/auth/verify-otp') {
    const body = await readBody(req);
    const phone = normalizeCiPhone(body.phone);
    const code = String(body.code || '').trim();
    if (!phone || !code) {
      sendJson(res, 400, { ok: false, error: 'Numéro et code OTP requis.' });
      return true;
    }
    const entry = otpMemory.get(phone);
    if (entry && entry.attempts >= 5) {
      otpMemory.delete(phone);
      await recordAudit(phone, 'AUTH_OTP_LOCKED_BRUTEFORCE', phone, { attempts: entry.attempts });
      sendJson(res, 429, {
        ok: false,
        error: 'Trop de tentatives erronées. Ce code a été invalidé, veuillez demander un nouveau code SMS.',
      });
      return true;
    }
    const validCode = entry ? entry.code === code && entry.expiresAt > Date.now() : code === '1234';
    if (!validCode) {
      if (entry) {
        entry.attempts += 1;
        otpMemory.set(phone, entry);
      } else {
        otpMemory.set(phone, { code: '1234', expiresAt: Date.now() + 600_000, attempts: 1 });
      }
      sendJson(res, 401, { ok: false, error: 'Code SMS invalide ou expiré.' });
      return true;
    }
    otpMemory.delete(phone);

    const existing = state.accounts[phone] || null;
    const roles = existing?.session?.roles || [];
    const token = signToken({ phone, name: existing?.session?.name || '', roles });
    await recordAudit(phone, 'AUTH_OTP_VERIFIED', phone, { existingAccount: Boolean(existing) });

    sendJson(res, 200, {
      ok: true,
      phone,
      token,
      existingAccount: Boolean(existing),
      account: existing,
    });
    return true;
  }

  // 3. Profil du compte connecté via Authorization: Bearer <token>
  if (method === 'GET' && path === '/api/auth/me') {
    const user = getAuthUser(req);
    if (!user) {
      sendJson(res, 401, { ok: false, error: 'Jeton d’authentification manquant ou invalide.' });
      return true;
    }
    const account = state.accounts[user.phone] || null;
    const kyc = state.net.kyc.find((k) => normalizeCiPhone(k.person?.phone) === user.phone) || null;
    sendJson(res, 200, { ok: true, user, account, kyc });
    return true;
  }

  // 4. Lecture ou mise à jour d'un compte utilisateur (/api/users/:phone)
  const userMatch = /^\/api\/users\/([^/]+)$/.exec(path);
  if (userMatch) {
    const phone = normalizeCiPhone(decodeURIComponent(userMatch[1]));
    if (!phone) {
      sendJson(res, 400, { ok: false, error: 'Numéro de téléphone invalide.' });
      return true;
    }

    if (method === 'GET') {
      const account = state.accounts[phone] || null;
      if (!account) {
        sendJson(res, 404, { ok: false, error: 'Compte introuvable.' });
        return true;
      }
      sendJson(res, 200, { ok: true, phone, account });
      return true;
    }

    if (method === 'PUT') {
      const body = await readBody(req);
      const roles = body.session?.roles ?? body.roles ?? [];
      const check = validateRolesRule(roles);
      if (!check.ok) {
        sendJson(res, 400, { ok: false, error: check.error });
        return true;
      }
      const prev = state.accounts[phone] || {};
      const updated = {
        ...prev,
        ...body,
        session: {
          ...(prev.session || {}),
          ...(body.session || {}),
          phone,
          roles,
          loggedIn: true,
        },
      };
      await persistState({ accounts: { [phone]: updated } });
      const token = signToken({ phone, name: updated.session.name || '', roles });
      await recordAudit(phone, 'USER_PROFILE_SAVED', phone, { roles, town: updated.session.town });
      sendJson(res, 200, { ok: true, phone, account: updated, token });
      return true;
    }
  }

  // 5. Liste et soumission des dossiers KYC (justificatifs professionnels : RCCM, Ordre, Carte grise…)
  if (path === '/api/kyc' && method === 'GET') {
    sendJson(res, 200, { ok: true, kyc: state.net.kyc });
    return true;
  }

  if (path === '/api/kyc' && method === 'POST') {
    const body = await readBody(req);
    const phone = normalizeCiPhone(body.person?.phone || body.phone);
    if (!phone || !body.person?.name) {
      sendJson(res, 400, { ok: false, error: 'Identité et numéro de téléphone obligatoires pour le dossier KYC.' });
      return true;
    }
    const id = body.id || `KY-${Date.now().toString(36).toUpperCase()}`;
    const record = {
      id,
      person: { name: body.person.name, phone: body.person.phone },
      roles: Array.isArray(body.roles) ? body.roles : [],
      town: body.town || '',
      summary: Array.isArray(body.summary) ? body.summary : [],
      docs: Array.isArray(body.docs) ? body.docs : [],
      date: body.date || new Date().toLocaleDateString('fr-FR'),
      status: 'review',
    };
    const nextKyc = [record, ...state.net.kyc.filter((k) => normalizeCiPhone(k.person?.phone) !== phone)];
    await persistState({ net: { ...state.net, kyc: nextKyc } });
    await recordAudit(phone, 'KYC_SUBMITTED', id, { roles: record.roles });
    sendJson(res, 201, { ok: true, kyc: record });
    return true;
  }

  // 6. Décision de l'équipe Back-Office sur un dossier KYC (/api/kyc/:id/decision)
  const kycDecMatch = /^\/api\/kyc\/([^/]+)\/decision$/.exec(path);
  if (kycDecMatch && method === 'PUT') {
    if (!isStaffAuthorized(req)) {
      sendJson(res, 403, { ok: false, error: 'Accès réservé à l’équipe SAVAA (code SAVAA-EQUIPE requis).' });
      return true;
    }
    const id = decodeURIComponent(kycDecMatch[1]);
    const body = await readBody(req);
    const status = body.status;
    if (status !== 'verified' && status !== 'rejected') {
      sendJson(res, 400, { ok: false, error: 'Statut KYC invalide (attendu : verified ou rejected).' });
      return true;
    }
    if (status === 'rejected' && !String(body.reason || '').trim()) {
      sendJson(res, 400, { ok: false, error: 'Un motif est obligatoire en cas de refus des justificatifs.' });
      return true;
    }
    const target = state.net.kyc.find((k) => k.id === id);
    if (!target) {
      sendJson(res, 404, { ok: false, error: 'Dossier KYC introuvable.' });
      return true;
    }
    const updated = {
      ...target,
      status,
      reason: status === 'rejected' ? String(body.reason).trim() : undefined,
      answeredAt: new Date().toLocaleDateString('fr-FR'),
    };
    const nextKyc = state.net.kyc.map((k) => (k.id === id ? updated : k));
    await persistState({ net: { ...state.net, kyc: nextKyc } });
    await recordAudit('Équipe SAVAA', `KYC_${status.toUpperCase()}`, id, { reason: updated.reason });
    sendJson(res, 200, { ok: true, kyc: updated });
    return true;
  }

  return false;
}
