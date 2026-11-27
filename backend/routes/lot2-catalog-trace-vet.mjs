import { isStaffAuthorized } from '../auth-token.mjs';

/*
  LOT 2 — Catalogue, Annonces, Traçabilité SAV-TRACE, Alertes Sanitaires & Validations Vétérinaires
  Routes :
  - GET    /api/listings
  - GET    /api/listings/:id
  - POST   /api/listings
  - PATCH  /api/listings/:id
  - GET    /api/trace/:code
  - GET    /api/alerts
  - POST   /api/alerts
  - PATCH  /api/alerts/:id
  - GET    /api/validations
  - POST   /api/validations
  - PATCH  /api/validations/:id
  - GET    /api/visits
  - POST   /api/visits
  - PATCH  /api/visits/:id
  - DELETE /api/visits/:id
*/

function generateTraceCode(existingListings) {
  const taken = new Set(existingListings.map((l) => l.sheet?.code).filter(Boolean));
  const year = new Date().getFullYear();
  for (;;) {
    const n = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
    const code = `SAV-TRACE-${year}-${n}`;
    if (!taken.has(code)) return code;
  }
}

export async function handleLot2CatalogTraceVet(ctx) {
  const { req, res, url, path, method, readBody, sendJson, state, persistState, recordAudit } = ctx;

  // 1. Catalogue & Annonces (/api/listings)
  if (path === '/api/listings' && method === 'GET') {
    const status = url.searchParams.get('status');
    const category = url.searchParams.get('category');
    const seller = url.searchParams.get('seller');
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();

    let list = [...state.net.listings];
    if (status) list = list.filter((l) => l.status === status);
    if (category) list = list.filter((l) => (l.category || '').toLowerCase().includes(category.toLowerCase()));
    if (seller) list = list.filter((l) => l.seller === seller || l.ownerPhone === seller);
    if (q) {
      list = list.filter(
        (l) =>
          (l.title || '').toLowerCase().includes(q) ||
          (l.details || '').toLowerCase().includes(q) ||
          (l.place || '').toLowerCase().includes(q) ||
          (l.sheet?.code || '').toLowerCase().includes(q),
      );
    }
    sendJson(res, 200, { ok: true, count: list.length, listings: list });
    return true;
  }

  if (path === '/api/listings' && method === 'POST') {
    const body = await readBody(req);
    if (!body.title || body.price == null || Number(body.price) <= 0) {
      sendJson(res, 400, { ok: false, error: 'Le titre et un prix strictement positif sont obligatoires.' });
      return true;
    }
    if (body.proPrice != null && Number(body.proPrice) >= Number(body.price)) {
      sendJson(res, 400, { ok: false, error: 'Le prix professionnel doit être inférieur au prix normal.' });
      return true;
    }
    const id = body.id || `L-${Date.now().toString(36).toUpperCase()}`;
    const traceCode = body.sheet?.code || generateTraceCode(state.net.listings);
    const nowDate = new Date().toLocaleDateString('fr-FR');
    const listing = {
      ...body,
      id,
      price: Number(body.price),
      proPrice: body.proPrice != null ? Number(body.proPrice) : undefined,
      status: body.status || 'review',
      date: body.date || nowDate,
      trace: body.trace || ['Fiche déclarée', 'grey'],
      sheet: body.sheet
        ? { ...body.sheet, code: traceCode }
        : {
            code: traceCode,
            category: body.traceCategory || 'frais',
            sub: body.sub || 'Autre',
            extra: body.extra || {},
            origin: body.origin || {
              country: 'Côte d’Ivoire',
              region: 'Savanes',
              department: body.place || 'Korhogo',
              town: body.place || 'Korhogo',
              farm: body.seller || 'Exploitation SAVAA',
            },
            sale: body.sale || { unit: body.unit || 'kg', minQty: 1, handover: 'Livraison ou retrait' },
            seller: { name: body.seller || '', phone: body.ownerPhone || '', actor: 'Producteur', attested: true },
            events: [
              {
                date: nowDate,
                kind: 'Création de la fiche',
                text: 'Fiche enregistrée à la publication.',
                by: body.seller || 'Vendeur SAVAA',
                place: body.place,
                proof: 'declared',
              },
            ],
          },
    };
    const nextListings = [listing, ...state.net.listings.filter((x) => x.id !== id)];
    await persistState({ net: { ...state.net, listings: nextListings } });
    await recordAudit(listing.ownerPhone || listing.seller || 'vendeur', 'LISTING_CREATED', id, {
      traceCode,
      status: listing.status,
    });
    sendJson(res, 201, { ok: true, listing });
    return true;
  }

  const listingMatch = /^\/api\/listings\/([^/]+)$/.exec(path);
  if (listingMatch) {
    const id = decodeURIComponent(listingMatch[1]);
    const found = state.net.listings.find((l) => l.id === id);

    if (method === 'GET') {
      if (!found) {
        sendJson(res, 404, { ok: false, error: 'Annonce introuvable.' });
        return true;
      }
      sendJson(res, 200, { ok: true, listing: found });
      return true;
    }

    if (method === 'PATCH') {
      if (!found) {
        sendJson(res, 404, { ok: false, error: 'Annonce introuvable.' });
        return true;
      }
      const patch = await readBody(req);
      // Sécurité RBAC : seule l'équipe SAVAA peut valider une annonce en modération ('review' -> 'online')
      if (patch.status === 'online' && found.status === 'review' && !isStaffAuthorized(req)) {
        sendJson(res, 403, {
          ok: false,
          error: 'Seule l’équipe SAVAA peut valider et mettre en ligne une annonce en modération.',
        });
        return true;
      }
      // Si l'annonce passe en ligne depuis 'review' (modération back-office), on ajoute l'événement Vérifié à la fiche SAV-TRACE
      let nextSheet = found.sheet;
      if (patch.status === 'online' && found.status === 'review' && found.sheet) {
        nextSheet = {
          ...found.sheet,
          events: [
            {
              date: new Date().toLocaleDateString('fr-FR'),
              kind: 'Validation SAVAA',
              text: 'Annonce et fiche relues et publiées par l’équipe SAVAA.',
              by: 'Équipe SAVAA',
              proof: 'verified',
            },
            ...(found.sheet.events || []),
          ],
        };
      }
      const updated = { ...found, ...patch, sheet: patch.sheet || nextSheet };
      const nextListings = state.net.listings.map((l) => (l.id === id ? updated : l));
      await persistState({ net: { ...state.net, listings: nextListings } });
      await recordAudit(isStaffAuthorized(req) ? 'Équipe SAVAA' : 'vendeur', 'LISTING_UPDATED', id, {
        status: updated.status,
      });
      sendJson(res, 200, { ok: true, listing: updated });
      return true;
    }
  }

  // 2. Consultation publique d'une fiche de traçabilité par code QR (/api/trace/:code)
  const traceMatch = /^\/api\/trace\/([^/]+)$/.exec(path);
  if (traceMatch && method === 'GET') {
    const code = decodeURIComponent(traceMatch[1]).toUpperCase();
    const listing = state.net.listings.find((l) => l.sheet?.code?.toUpperCase() === code);
    if (!listing || !listing.sheet) {
      sendJson(res, 404, { ok: false, error: `Aucune fiche SAV-TRACE trouvée pour le code ${code}.` });
      return true;
    }
    sendJson(res, 200, {
      ok: true,
      code: listing.sheet.code,
      sheet: listing.sheet,
      listing,
    });
    return true;
  }

  // 3. Alertes sanitaires Éleveur → Vétérinaires (/api/alerts)
  if (path === '/api/alerts' && method === 'GET') {
    sendJson(res, 200, { ok: true, alerts: state.net.alerts });
    return true;
  }

  if (path === '/api/alerts' && method === 'POST') {
    const body = await readBody(req);
    if (!body.animalId || !body.sign) {
      sendJson(res, 400, { ok: false, error: 'Identifiant de l’animal et signe observé requis.' });
      return true;
    }
    const alert = {
      id: body.id || `AL-${Date.now().toString(36).toUpperCase()}`,
      animalId: body.animalId,
      animal: body.animal || body.animalId,
      photo: body.photo,
      photos: body.photos || [],
      sign: body.sign,
      text: body.text || '',
      urgency: body.urgency || 'Moyenne',
      farm: body.farm || '',
      from: body.from || { name: 'Éleveur SAVAA', phone: '' },
      date: body.date || new Date().toLocaleDateString('fr-FR'),
      status: 'open',
    };
    await persistState({ net: { ...state.net, alerts: [alert, ...state.net.alerts] } });
    sendJson(res, 201, { ok: true, alert });
    return true;
  }

  const alertMatch = /^\/api\/alerts\/([^/]+)$/.exec(path);
  if (alertMatch && method === 'PATCH') {
    const id = decodeURIComponent(alertMatch[1]);
    const body = await readBody(req);
    const target = state.net.alerts.find((a) => a.id === id);
    if (!target) {
      sendJson(res, 404, { ok: false, error: 'Alerte sanitaire introuvable.' });
      return true;
    }
    const updated = {
      ...target,
      status: body.status || target.status,
      vet: body.vet || target.vet,
      note: body.note !== undefined ? body.note : target.note,
    };
    await persistState({
      net: { ...state.net, alerts: state.net.alerts.map((a) => (a.id === id ? updated : a)) },
    });
    sendJson(res, 200, { ok: true, alert: updated });
    return true;
  }

  // 4. Validations vétérinaires de fiches animales (/api/validations)
  if (path === '/api/validations' && method === 'GET') {
    sendJson(res, 200, { ok: true, validations: state.net.validations });
    return true;
  }

  if (path === '/api/validations' && method === 'POST') {
    const body = await readBody(req);
    if (!body.animalId) {
      sendJson(res, 400, { ok: false, error: 'Identifiant de l’animal requis.' });
      return true;
    }
    const validation = {
      id: body.id || `VF-${Date.now().toString(36).toUpperCase()}`,
      animalId: body.animalId,
      animal: body.animal || body.animalId,
      photo: body.photo,
      officialId: body.officialId,
      details: body.details || '',
      care: body.care || '',
      farm: body.farm || '',
      from: body.from || { name: 'Éleveur SAVAA', phone: '' },
      date: body.date || new Date().toLocaleDateString('fr-FR'),
      status: 'open',
    };
    await persistState({ net: { ...state.net, validations: [validation, ...state.net.validations] } });
    sendJson(res, 201, { ok: true, validation });
    return true;
  }

  const valMatch = /^\/api\/validations\/([^/]+)$/.exec(path);
  if (valMatch && method === 'PATCH') {
    const id = decodeURIComponent(valMatch[1]);
    const body = await readBody(req);
    const target = state.net.validations.find((v) => v.id === id);
    if (!target) {
      sendJson(res, 404, { ok: false, error: 'Demande de validation introuvable.' });
      return true;
    }
    const updated = {
      ...target,
      status: body.status || 'verified',
      vet: body.vet || target.vet,
      reason: body.reason,
      answeredAt: new Date().toLocaleDateString('fr-FR'),
    };
    await persistState({
      net: { ...state.net, validations: state.net.validations.map((v) => (v.id === id ? updated : v)) },
    });
    sendJson(res, 200, { ok: true, validation: updated });
    return true;
  }

  // 5. Visites vétérinaires sur exploitation (/api/visits)
  if (path === '/api/visits' && method === 'GET') {
    sendJson(res, 200, { ok: true, visits: state.net.visits });
    return true;
  }

  if (path === '/api/visits' && method === 'POST') {
    const body = await readBody(req);
    const visit = {
      id: body.id || `VI-${Date.now().toString(36).toUpperCase()}`,
      reason: body.reason || 'Suivi sanitaire',
      animals: body.animals || '',
      wish: body.wish || '',
      farm: body.farm || '',
      from: body.from || { name: 'Éleveur SAVAA', phone: '' },
      date: body.date || new Date().toLocaleDateString('fr-FR'),
      status: 'open',
    };
    await persistState({ net: { ...state.net, visits: [visit, ...state.net.visits] } });
    sendJson(res, 201, { ok: true, visit });
    return true;
  }

  const visitMatch = /^\/api\/visits\/([^/]+)$/.exec(path);
  if (visitMatch) {
    const id = decodeURIComponent(visitMatch[1]);
    if (method === 'PATCH') {
      const body = await readBody(req);
      const target = state.net.visits.find((v) => v.id === id);
      if (!target) {
        sendJson(res, 404, { ok: false, error: 'Visite introuvable.' });
        return true;
      }
      const updated = { ...target, ...body };
      await persistState({
        net: { ...state.net, visits: state.net.visits.map((v) => (v.id === id ? updated : v)) },
      });
      sendJson(res, 200, { ok: true, visit: updated });
      return true;
    }
    if (method === 'DELETE') {
      await persistState({
        net: { ...state.net, visits: state.net.visits.filter((v) => v.id !== id) },
      });
      sendJson(res, 200, { ok: true });
      return true;
    }
  }

  return false;
}
