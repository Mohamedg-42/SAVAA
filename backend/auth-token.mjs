import { createHmac, timingSafeEqual } from 'node:crypto';

/*
  Gestion des jetons d'authentification (JWT HMAC-SHA256) et contrôle d'accès
  du Serveur Backend SAVAA (Lot 1 : Auth OTP & StaffGuard serveur).
*/

const JWT_SECRET = process.env.JWT_SECRET || 'savaa-ci-secret-key-2026-prod';
export const STAFF_CODE = process.env.SAVAA_STAFF_CODE || 'SAVAA-EQUIPE';

function base64UrlEncode(input) {
  return Buffer.from(input).toString('base64url');
}

function base64UrlDecode(input) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

/** Crée un jeton JWT signé (validité par défaut : 30 jours). */
export function signToken(payload, expiresInSec = 30 * 24 * 3600) {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64UrlEncode(
    JSON.stringify({
      ...payload,
      iat: now,
      exp: now + expiresInSec,
    }),
  );
  const sig = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

/** Vérifie et décode un jeton JWT. Renvoie `null` si invalide ou expiré. */
export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(base64UrlDecode(body));
    const now = Math.floor(Date.now() / 1000);
    if (parsed.exp && parsed.exp < now) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Extrait l'utilisateur connecté depuis l'en-tête `Authorization: Bearer <token>`. */
export function getAuthUser(req) {
  const auth = req.headers?.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7).trim());
}

/** Vérifie en temps constant si la requête provient d'un membre autorisé de l'équipe SAVAA (`/admin`). */
export function isStaffAuthorized(req) {
  const staffHeader = String(req.headers?.['x-staff-code'] || '');
  if (staffHeader) {
    const a = Buffer.from(staffHeader);
    const b = Buffer.from(STAFF_CODE);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  const user = getAuthUser(req);
  return Boolean(user?.staff);
}

/** Normalise un numéro de téléphone ivoirien en 10 chiffres (ex: +225 07 48 12 33 90 -> 0748123390). */
export function normalizeCiPhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('00225') && digits.length === 15) digits = digits.slice(5);
  else if (digits.startsWith('225') && digits.length === 13) digits = digits.slice(3);
  if (!/^(01|05|07|25|27)\d{8}$/.test(digits)) return null;
  return digits;
}

/** Valide les règles métier de cumul des rôles SAVAA (max 2 métiers pro, fournisseur seul). */
export function validateRolesRule(roles) {
  if (!Array.isArray(roles)) return { ok: false, error: 'Liste de rôles invalide.' };
  const proRoles = ['eleveur', 'agri', 'vendeur', 'fourn', 'resto', 'veto', 'coursier'];
  const selectedPro = roles.filter((r) => proRoles.includes(r));
  if (selectedPro.length > 2) {
    return { ok: false, error: 'Vous pouvez cumuler au maximum 2 métiers professionnels.' };
  }
  if (selectedPro.includes('fourn') && selectedPro.length > 1) {
    return { ok: false, error: 'Le métier de fournisseur B2B ne peut pas être cumulé avec un autre métier professionnel.' };
  }
  return { ok: true };
}
