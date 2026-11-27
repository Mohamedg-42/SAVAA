import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
// @ts-expect-error module ESM backend
import { server } from '../backend/server.mjs';

let baseUrl = '';

async function api(path: string, method = 'GET', body?: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, data: json };
}

describe('Serveur Backend API REST SAVAA (Lots 1 à 4)', () => {
  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(async () => {
    await api('/api/reset', 'POST');
  });

  it('Lot 1 : Authentification OTP SMS (+225), jeton JWT, règles de rôles et validation KYC Back-Office', async () => {
    // 1. Numéro invalide refusé
    const badOtp = await api('/api/auth/request-otp', 'POST', { phone: '12345' });
    expect(badOtp.status).toBe(400);

    // 2. Demande OTP valide avec indicatif +225
    const reqOtp = await api('/api/auth/request-otp', 'POST', { phone: '+225 07 48 12 33 90' });
    expect(reqOtp.status).toBe(200);
    expect(reqOtp.data.phone).toBe('0748123390');

    // 3. Vérification OTP → JWT émis
    const verOtp = await api('/api/auth/verify-otp', 'POST', { phone: '07 48 12 33 90', code: '1234' });
    expect(verOtp.status).toBe(200);
    expect(verOtp.data.token).toBeTruthy();

    // 4. Règle métier : impossible de cumuler fournisseur avec un autre métier pro
    const badRoles = await api('/api/users/0748123390', 'PUT', {
      session: { name: 'Adama Koné', town: 'Sinématiali', roles: ['fourn', 'eleveur'] },
    });
    expect(badRoles.status).toBe(400);

    // 5. Enregistrement valide d'un compte Éleveur + Vendeur
    const saveUser = await api('/api/users/0748123390', 'PUT', {
      session: { name: 'Adama Koné', town: 'Sinématiali', roles: ['eleveur', 'vendeur'] },
    });
    expect(saveUser.status).toBe(200);

    // 6. Consultation /api/auth/me avec le Bearer token
    const me = await api('/api/auth/me', 'GET', undefined, { Authorization: `Bearer ${ saveUser.data.token as string }` });
    expect(me.status).toBe(200);
    expect(me.data.account.session.name).toBe('Adama Koné');

    // 7. Soumission d'un dossier KYC et validation par l'équipe Back-Office (code SAVAA-EQUIPE)
    const kycPost = await api('/api/kyc', 'POST', {
      person: { name: 'Dr Touré', phone: '05 44 11 22 33' },
      roles: ['veto'],
      town: 'Korhogo',
      summary: [['Ordre', 'CI-VET-2026-089']],
      docs: [{ label: 'Carte Ordre des Vétérinaires' }],
    });
    expect(kycPost.status).toBe(201);
    const kycId = kycPost.data.kyc.id as string;

    const kycForbidden = await api(`/api/kyc/${kycId}/decision`, 'PUT', { status: 'verified' });
    expect(kycForbidden.status).toBe(403);

    const kycApproved = await api(
      `/api/kyc/${kycId}/decision`,
      'PUT',
      { status: 'verified' },
      { 'X-Staff-Code': 'SAVAA-EQUIPE' },
    );
    expect(kycApproved.status).toBe(200);
    expect(kycApproved.data.kyc.status).toBe('verified');
  });

  it('Lot 2 : Publication d’annonce, génération SAV-TRACE, modération Back-Office, consultation QR et alertes véto', async () => {
    // 1. Prix pro supérieur au prix normal refusé
    const badPrice = await api('/api/listings', 'POST', {
      title: 'Sac de maïs',
      price: 15000,
      proPrice: 16000,
    });
    expect(badPrice.status).toBe(400);

    // 2. Publication d'une annonce avec génération automatique du code SAV-TRACE
    const created = await api('/api/listings', 'POST', {
      id: 'L-TEST-1',
      title: 'Taurillon Goudali de Sinématiali',
      price: 450000,
      proPrice: 430000,
      category: 'Animaux, Bovins',
      place: 'Sinématiali',
      seller: 'Ferme Koné & Fils',
      ownerPhone: '0748123390',
      stock: 2,
    });
    expect(created.status).toBe(201);
    expect(created.data.listing.status).toBe('review');
    const traceCode = created.data.listing.sheet.code as string;
    expect(traceCode).toMatch(/^SAV-TRACE-\d{4}-\d{6}$/);

    // 3. Modération par l'équipe SAVAA → passe en ligne + événement Vérifié ajouté à la fiche SAV-TRACE
    const mod = await api(
      '/api/listings/L-TEST-1',
      'PATCH',
      { status: 'online' },
      { 'X-Staff-Code': 'SAVAA-EQUIPE' },
    );
    expect(mod.status).toBe(200);
    expect(mod.data.listing.status).toBe('online');
    expect(mod.data.listing.sheet.events[0].proof).toBe('verified');

    // 4. Consultation publique par scan QR (/api/trace/:code)
    const traceGet = await api(`/api/trace/${traceCode}`);
    expect(traceGet.status).toBe(200);
    expect(traceGet.data.listing.title).toBe('Taurillon Goudali de Sinématiali');

    // 5. Alerte sanitaire Éleveur → Vétérinaire
    const alertPost = await api('/api/alerts', 'POST', {
      animalId: 'FK-0142',
      animal: 'Taurillon Zébu Goudali',
      sign: 'Boiterie membre postérieur',
      urgency: 'Élevée',
      farm: 'Ferme Koné, Sinématiali',
    });
    expect(alertPost.status).toBe(201);

    const alertPatch = await api(`/api/alerts/${alertPost.data.alert.id as string}`, 'PATCH', {
      status: 'taken',
      vet: { name: 'Dr Touré', phone: '0544112233' },
      note: 'Visite prévue cet après-midi',
    });
    expect(alertPatch.status).toBe(200);
    expect(alertPatch.data.alert.status).toBe('taken');
  });

  it('Lot 3 : Commande avec acompte séquestre 20 %, mission livreur, contrôle du code à 4 chiffres, devis B2B et messagerie', async () => {
    await api('/api/listings', 'POST', {
      id: 'L-MAIS-100',
      title: 'Maïs jaune, sac 100 kg',
      price: 20000,
      category: 'Récoltes',
      place: 'Dikodougou',
      seller: 'Coop. Dikodougou',
      stock: 10,
      status: 'online',
    });

    // 1. Commande livrée avec acompte séquestre de 20 %
    const orderRes = await api('/api/orders', 'POST', {
      paymentMode: 'deposit',
      method: 'Wave',
      delivery: true,
      shipping: 5000,
      address: 'Korhogo, Quartier Soba',
      buyer: { name: 'Restaurant Le Baobab', phone: '0711223344' },
      lines: [{ listingId: 'L-MAIS-100', title: 'Maïs jaune, sac 100 kg', seller: 'Coop. Dikodougou', qty: 5, price: 20000 }],
    });
    expect(orderRes.status).toBe(201);
    expect(orderRes.data.order.total).toBe(105000);
    expect(orderRes.data.order.paidNow).toBe(21000);
    expect(orderRes.data.order.balanceDue).toBe(84000);
    const handoverCode = orderRes.data.order.code as string;

    // Le stock de l'annonce a baissé de 10 à 5
    const listingAfter = await api('/api/listings/L-MAIS-100');
    expect(listingAfter.data.listing.stock).toBe(5);

    // 2. Mission créée automatiquement pour les transporteurs
    const missionsRes = await api('/api/missions');
    expect(missionsRes.data.missions).toHaveLength(1);
    const missionId = missionsRes.data.missions[0].id as string;

    // 3. Tentative de livraison avec un mauvais code à 4 chiffres → bloquée (400)
    const wrongCode = await api(`/api/missions/${missionId}`, 'PATCH', {
      status: 'delivered',
      code: '0000',
    });
    expect(wrongCode.status).toBe(400);

    // 4. Livraison confirmée avec le vrai code à 4 chiffres de l'acheteur
    const okDelivery = await api(`/api/missions/${missionId}`, 'PATCH', {
      status: 'delivered',
      code: handoverCode,
    });
    expect(okDelivery.status).toBe(200);
    expect(okDelivery.data.mission.status).toBe('delivered');

    // 5. Messagerie avec négociation d'offre de prix
    const thRes = await api('/api/threads', 'POST', {
      kind: 'listing',
      refId: 'L-MAIS-100',
      subject: 'Maïs jaune, sac 100 kg',
      participants: [
        { name: 'Acheteur', phone: '0711223344' },
        { name: 'Coop. Dikodougou', phone: '0799887766' },
      ],
    });
    const threadId = thRes.data.thread.id as string;
    const msgRes = await api(`/api/threads/${threadId}/messages`, 'POST', {
      from: { name: 'Acheteur', phone: '0711223344' },
      text: 'Proposition à 18 000 FCFA le sac',
      offerAmount: 18000,
    });
    const msgId = msgRes.data.message.id as string;
    const acceptOffer = await api(`/api/threads/${threadId}/offers/${msgId}`, 'POST', { status: 'accepted' });
    expect(acceptOffer.status).toBe(200);
    expect(acceptOffer.data.thread.messages[0].offer.status).toBe('accepted');

    // 6. Connecteurs Mobile Money (/api/payments/initiate, /api/payments/webhook) et itinéraire routier (/api/delivery/route)
    const payInit = await api('/api/payments/initiate', 'POST', {
      orderRef: orderRes.data.order.ref,
      amount: 21000,
      method: 'Wave',
      phone: '0711223344',
      paymentMode: 'deposit',
    });
    expect(payInit.status).toBe(200);
    expect(payInit.data.status).toBe('CONFIRMED');

    const webhookRes = await api('/api/payments/webhook', 'POST', {
      txId: payInit.data.txId,
      status: 'ACCEPTED',
    });
    expect(webhookRes.status).toBe(200);

    const routeRes = await api('/api/delivery/route?from=Sin%C3%A9matiali&to=Korhogo');
    expect(routeRes.status).toBe(200);
    expect(routeRes.data.route.km).toBeGreaterThan(10);
    expect(routeRes.data.route.estimated).toBe(false);
  });

  it('Lot 4 : Dossier investisseur, décision Back-Office, projet agricole, proposition, upload fichier et journal d’audit', async () => {
    // 1. Soumission d'un dossier investisseur
    const invPost = await api('/api/investors', 'POST', {
      type: 'entreprise',
      name: 'Ivoire Agro Capital',
      phone: '0700112233',
      data: { 'ent.raison': 'Ivoire Agro Capital', 'fin.min': '10000000', 'fin.max': '50000000' },
    });
    expect(invPost.status).toBe(201);
    const dossierId = invPost.data.dossier.id as string;
    expect(invPost.data.dossier.ref).toMatch(/^INV-\d{4}-\d{6}$/);

    // 2. Décision Back-Office : validation du dossier investisseur
    const invValid = await api(
      `/api/investors/${dossierId}/status`,
      'PATCH',
      { status: 'valide' },
      { 'X-Staff-Code': 'SAVAA-EQUIPE' },
    );
    expect(invValid.status).toBe(200);
    expect(invValid.data.dossier.status).toBe('valide');

    // 3. Création d'un projet agricole et envoi d'une proposition à l'investisseur
    const prjPost = await api(
      '/api/projects',
      'POST',
      {
        title: 'Unité d’embouche bovine de Ferkessédougou',
        filiere: 'Élevage bovin',
        region: 'Tchologo',
        targetAmount: 25000000,
      },
      { 'X-Staff-Code': 'SAVAA-EQUIPE' },
    );
    expect(prjPost.status).toBe(201);

    const propPost = await api(
      '/api/proposals',
      'POST',
      {
        dossierId,
        projectId: prjPost.data.project.id,
        message: 'Projet correspondant à votre budget et filière.',
      },
      { 'X-Staff-Code': 'SAVAA-EQUIPE' },
    );
    expect(propPost.status).toBe(201);

    const propResp = await api(`/api/proposals/${propPost.data.proposal.id as string}/respond`, 'PATCH', {
      status: 'rdv',
      note: 'Disponible mardi à 10 h.',
    });
    expect(propResp.status).toBe(200);
    expect(propResp.data.proposal.status).toBe('rdv');

    // 4. Upload d'une image en base64 sur le serveur
    const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const upRes = await api('/api/uploads', 'POST', { dataUrl: tinyPng });
    expect(upRes.status).toBe(201);
    expect(upRes.data.url).toMatch(/^\/uploads\/savaa-.*\.png$/);

    // 5. Statistiques et journal d'audit du Back-Office
    const statsRes = await api('/api/admin/stats', 'GET', undefined, { 'X-Staff-Code': 'SAVAA-EQUIPE' });
    expect(statsRes.status).toBe(200);
    expect(statsRes.data.stats.investorDossiersTotal).toBe(1);

    const auditRes = await api('/api/admin/audit', 'GET', undefined, { 'X-Staff-Code': 'SAVAA-EQUIPE' });
    expect(auditRes.status).toBe(200);
    expect(auditRes.data.logs.length).toBeGreaterThan(0);
  });

  it('Sécurité OWASP (SEC-001 à SEC-004) : anti brute-force OTP, RBAC modération, anti-falsification de prix, idempotence webhook et Magic Bytes upload', async () => {
    // SEC-004 : Vérification des en-têtes HTTP de sécurité
    const healthRaw = await fetch(`${baseUrl}/api/health`);
    expect(healthRaw.headers.get('x-content-type-options')).toBe('nosniff');
    expect(healthRaw.headers.get('x-frame-options')).toBe('DENY');
    expect(healthRaw.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');

    // SEC-001 : Verrouillage anti brute-force OTP après 5 tentatives erronées
    await api('/api/auth/request-otp', 'POST', { phone: '0709080706' });
    for (let i = 0; i < 5; i++) {
      const bad = await api('/api/auth/verify-otp', 'POST', { phone: '0709080706', code: '9999' });
      expect(bad.status).toBe(401);
    }
    const locked = await api('/api/auth/verify-otp', 'POST', { phone: '0709080706', code: '1234' });
    expect(locked.status).toBe(429);

    // SEC-003 (RBAC) : Un vendeur sans code équipe ne peut pas auto-valider son annonce en modération ('review' -> 'online')
    await api('/api/listings', 'POST', {
      id: 'L-SEC-1',
      title: 'Bélier Sahélien',
      price: 120000,
      category: 'Animaux, Ovins',
      place: 'Korhogo',
      seller: 'Bergerie',
      stock: 1,
    });
    const selfMod = await api('/api/listings/L-SEC-1', 'PATCH', { status: 'online' });
    expect(selfMod.status).toBe(403);

    // Validation légitime par l'équipe SAVAA
    const staffMod = await api(
      '/api/listings/L-SEC-1',
      'PATCH',
      { status: 'online' },
      { 'X-Staff-Code': 'SAVAA-EQUIPE' },
    );
    expect(staffMod.status).toBe(200);

    // SEC-003 (Intégrité financière) : Un client ne peut pas falsifier le prix d'une annonce à 500 FCFA au lieu de 120 000 FCFA
    const tamperedOrder = await api('/api/orders', 'POST', {
      method: 'Orange Money',
      delivery: false,
      lines: [{ listingId: 'L-SEC-1', title: 'Bélier Sahélien', seller: 'Bergerie', qty: 1, price: 500 }],
    });
    expect(tamperedOrder.status).toBe(400);

    // SEC-003 (Idempotence Webhook Mobile Money anti double paiement)
    const wh1 = await api('/api/payments/webhook', 'POST', { txId: 'TX-UNIQUE-999', status: 'ACCEPTED' });
    expect(wh1.status).toBe(200);
    expect(wh1.data.idempotentReplay).toBe(false);

    const wh2 = await api('/api/payments/webhook', 'POST', { txId: 'TX-UNIQUE-999', status: 'ACCEPTED' });
    expect(wh2.status).toBe(200);
    expect(wh2.data.idempotentReplay).toBe(true);

    // SEC-002 (Magic Bytes upload) : Un script HTML/JS déguisé en data:image/png est rejeté
    const fakePng = `data:image/png;base64,${Buffer.from('<script>alert("xss")</script>').toString('base64')}`;
    const badUpload = await api('/api/uploads', 'POST', { dataUrl: fakePng });
    expect(badUpload.status).toBe(400);
  });

  it('Best Practices Production (1 à 7) : X-Request-Id, /api/ready, révocation JWT logout, Anti-IDOR, Idempotency-Key (SHA-256) et pagination', async () => {
    // 1. Readiness probe (/api/ready) & Correlation ID (X-Request-Id)
    const readyRaw = await fetch(`${baseUrl}/api/ready`, {
      headers: { 'X-Request-Id': 'req-savaa-test-001' },
    });
    expect(readyRaw.status).toBe(200);
    expect(readyRaw.headers.get('x-request-id')).toBe('req-savaa-test-001');
    const readyData = await readyRaw.json();
    expect(readyData.ready).toBe(true);

    // 2. Authentification de 2 utilisateurs distincts (User A et User B)
    const otpA = await api('/api/auth/verify-otp', 'POST', { phone: '0711111111', code: '1234' });
    const tokenA = otpA.data.token as string;
    const otpB = await api('/api/auth/verify-otp', 'POST', { phone: '0722222222', code: '1234' });
    const tokenB = otpB.data.token as string;

    // 3. Protection Anti-IDOR (OWASP API1) : User A tente de modifier le profil de User B -> 403 Forbidden
    const idorProfile = await api(
      '/api/users/0722222222',
      'PUT',
      { session: { name: 'Pirate', roles: ['acheteur'] } },
      { Authorization: `Bearer ${tokenA}` },
    );
    expect(idorProfile.status).toBe(403);

    // User B publie une annonce qui lui appartient (ownerPhone: 0722222222)
    await api('/api/listings', 'POST', {
      id: 'L-OWNER-B',
      title: 'Igname Kponan de User B',
      price: 10000,
      category: 'Récoltes',
      place: 'Dikodougou',
      seller: 'Ferme B',
      ownerPhone: '0722222222',
      stock: 10,
      status: 'online',
    });

    // User A tente de modifier l'annonce de User B -> 403 Forbidden (Anti-IDOR)
    const idorListing = await api(
      '/api/listings/L-OWNER-B',
      'PATCH',
      { price: 1000 },
      { Authorization: `Bearer ${tokenA}` },
    );
    expect(idorListing.status).toBe(403);

    // User B peut modifier sa propre annonce -> 200 OK
    const ownListing = await api(
      '/api/listings/L-OWNER-B',
      'PATCH',
      { price: 12000 },
      { Authorization: `Bearer ${tokenB}` },
    );
    expect(ownListing.status).toBe(200);

    // 4. Clé d'Idempotence (Idempotency-Key + SHA-256) sur POST /api/orders
    const orderPayload = {
      method: 'Orange Money',
      delivery: false,
      lines: [{ listingId: 'L-OWNER-B', title: 'Igname Kponan de User B', seller: 'Ferme B', qty: 3, price: 12000 }],
    };
    const firstOrder = await api('/api/orders', 'POST', orderPayload, {
      'Idempotency-Key': 'idem-order-key-001',
    });
    expect(firstOrder.status).toBe(201);

    // Rejeu réseau avec la MÊME clé et le MÊME panier -> renvoie la même commande sans re-débiter le stock (stock reste à 7, pas 4)
    const replayOrder = await api('/api/orders', 'POST', orderPayload, {
      'Idempotency-Key': 'idem-order-key-001',
    });
    expect(replayOrder.status).toBe(201);
    expect(replayOrder.data.order.ref).toBe(firstOrder.data.order.ref);

    const listingCheck = await api('/api/listings/L-OWNER-B');
    expect(listingCheck.data.listing.stock).toBe(7);

    // Réutilisation de la MÊME clé Idempotency-Key avec un panier DIFFÉRENT -> 409 Conflict
    const conflictOrder = await api(
      '/api/orders',
      'POST',
      {
        ...orderPayload,
        lines: [{ listingId: 'L-OWNER-B', title: 'Igname Kponan de User B', seller: 'Ferme B', qty: 1, price: 12000 }],
      },
      { 'Idempotency-Key': 'idem-order-key-001' },
    );
    expect(conflictOrder.status).toBe(409);

    // 5. Pagination du catalogue (/api/listings?page=1&limit=1)
    await api('/api/listings', 'POST', {
      id: 'L-PAGE-2',
      title: 'Maïs jaune',
      price: 15000,
      category: 'Récoltes',
      place: 'Korhogo',
      seller: 'Coop',
    });
    const pagedRes = await api('/api/listings?page=1&limit=1');
    expect(pagedRes.status).toBe(200);
    expect(pagedRes.data.total).toBe(2);
    expect(pagedRes.data.count).toBe(1);
    expect(pagedRes.data.totalPages).toBe(2);

    // 6. Révocation immédiate du JWT lors de la déconnexion (POST /api/auth/logout)
    const meBefore = await api('/api/auth/me', 'GET', undefined, { Authorization: `Bearer ${tokenA}` });
    expect(meBefore.status).toBe(200);

    const logoutRes = await api('/api/auth/logout', 'POST', {}, { Authorization: `Bearer ${tokenA}` });
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.data.revoked).toBe(true);

    // Le jeton révoqué est immédiatement refusé (401 Unauthorized)
    const meAfter = await api('/api/auth/me', 'GET', undefined, { Authorization: `Bearer ${tokenA}` });
    expect(meAfter.status).toBe(401);
  });
});
