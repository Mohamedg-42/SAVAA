import { createHmac, timingSafeEqual } from 'node:crypto';

/*
  Module de Sécurité & Durcissement (Hardening OWASP Top 10) du Serveur Backend SAVAA :
  - En-têtes HTTP de sécurité (CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
  - Politique CORS avec liste blanche configurable (CORS_ORIGINS)
  - Rate Limiting en mémoire par IP et par catégorie de route (anti brute-force & anti DoS)
  - Lecture du corps HTTP bornée (limite stricte anti DoS mémoire : 6 Mo max)
  - Validation binaire des fichiers uploadés par Magic Bytes (PNG, JPEG, PDF, WebM)
  - Vérification de signature HMAC-SHA256 en temps constant pour les Webhooks Mobile Money
*/

export const MAX_JSON_BODY_BYTES = 6 * 1024 * 1024; // 6 Mo max pour le payload JSON
export const MAX_UPLOAD_FILE_BYTES = 5 * 1024 * 1024; // 5 Mo max par fichier binaire

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/** Applique les en-têtes HTTP de sécurité (OWASP) et la politique CORS sur chaque réponse. */
export function applySecurityHeaders(req, res) {
  const origin = req?.headers?.origin || '*';
  if (ALLOWED_ORIGINS.length > 0 && origin !== '*') {
    if (ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Staff-Code, X-Client-Source, X-Webhook-Signature',
  );

  // En-têtes de durcissement HTTP
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(self)');
  res.setHeader('X-XSS-Protection', '0');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}

/** Rate Limiter par fenêtre glissante (IP + bucket). */
const rateBuckets = new Map();

export function resetRateLimiter() {
  rateBuckets.clear();
}

export function checkRateLimit(req, bucket = 'api', maxRequests = 300, windowMs = 60_000) {
  const forwarded = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwarded || req.socket?.remoteAddress || '127.0.0.1';
  const key = `${ip}:${bucket}`;
  const now = Date.now();
  const entry = rateBuckets.get(key);

  if (!entry || entry.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  entry.count += 1;
  if (entry.count > maxRequests) {
    const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSec };
  }
  return { allowed: true, remaining: maxRequests - entry.count };
}

/**
 * Lit et parse le corps JSON d'une requête avec une limite stricte en octets (`MAX_JSON_BODY_BYTES`)
 * pour empêcher les attaques par saturation mémoire (DoS).
 */
export function readBoundedJsonBody(req, maxBytes = MAX_JSON_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    let aborted = false;

    req.on('data', (chunk) => {
      if (aborted) return;
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        aborted = true;
        const err = new Error('Payload trop volumineux (limite 6 Mo dépassée).');
        err.statusCode = 413;
        reject(err);
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (aborted) return;
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        const err = new Error('Corps JSON malformé.');
        err.statusCode = 400;
        reject(err);
      }
    });

    req.on('error', (err) => {
      if (!aborted) reject(err);
    });
  });
}

/**
 * Vérifie les Magic Bytes réels (signature binaire) et la taille d'un fichier uploadé.
 * Refuse systématiquement les exécutables, scripts HTML/SVG/PHP ou fichiers déguisés.
 */
export function validateUploadedBinary(declaredMime, buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return { ok: false, error: 'Fichier vide.' };
  }
  if (buffer.length > MAX_UPLOAD_FILE_BYTES) {
    return { ok: false, error: 'Le fichier dépasse la taille maximale autorisée de 5 Mo.' };
  }

  // PNG : 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;

  // JPEG : FF D8 FF
  const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

  // PDF : 25 50 44 46 2D (%PDF-)
  const isPdf =
    buffer.length >= 5 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d;

  // WebM / Matroska audio : 1A 45 DF A3
  const isWebm =
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3;

  if (declaredMime === 'image/png' && isPng) {
    return { ok: true, ext: 'png', mime: 'image/png' };
  }
  if ((declaredMime === 'image/jpeg' || declaredMime === 'image/jpg') && isJpeg) {
    return { ok: true, ext: 'jpg', mime: 'image/jpeg' };
  }
  if (declaredMime === 'application/pdf' && isPdf) {
    return { ok: true, ext: 'pdf', mime: 'application/pdf' };
  }
  if ((declaredMime === 'audio/webm' || declaredMime === 'video/webm') && isWebm) {
    return { ok: true, ext: 'webm', mime: 'audio/webm' };
  }

  return {
    ok: false,
    error:
      'Type ou signature binaire du fichier non autorisé. Formats acceptés : JPEG, PNG, PDF et audio WebM.',
  };
}

/**
 * Vérifie en temps constant la signature HMAC-SHA256 d'un Webhook Mobile Money
 * si `MOMO_WEBHOOK_SECRET` est configuré sur le serveur.
 */
export function verifyWebhookSignature(payloadObj, signatureHeader) {
  const secret = process.env.MOMO_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signatureHeader || typeof signatureHeader !== 'string') return false;
  const expected = createHmac('sha256', secret).update(JSON.stringify(payloadObj)).digest('hex');
  const a = Buffer.from(signatureHeader.trim());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
