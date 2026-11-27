/*
  LOT 3 — Commandes, Paiement Mobile Money & Séquestre 20 %, Missions Livreurs (Code à 4 chiffres),
          Devis / Factures B2B, Commandes Récurrentes, Messagerie Interne & Avis Vendeurs
  Routes :
  - GET   /api/orders
  - POST  /api/orders
  - POST  /api/orders/:ref/cancel
  - GET   /api/sales
  - PATCH /api/sales/:id
  - GET   /api/missions
  - PATCH /api/missions/:id
  - GET   /api/couriers
  - PUT   /api/couriers/:phone
  - GET   /api/quotes
  - POST  /api/quotes
  - POST  /api/quotes/:id/offers
  - POST  /api/quotes/:id/accept
  - GET   /api/invoices
  - POST  /api/invoices
  - POST  /api/invoices/:id/pay
  - GET   /api/threads
  - POST  /api/threads
  - POST  /api/threads/:id/messages
  - POST  /api/threads/:id/offers/:msgId
  - GET   /api/reviews
  - POST  /api/reviews
  - POST  /api/reviews/:id/reply
*/

export async function handleLot3CommerceDelivery(ctx) {
  const { req, res, url, path, method, readBody, sendJson, state, persistState, recordAudit } = ctx;

  // 1. Commandes & Paiement Mobile Money (intégral 100 % ou acompte séquestre 20 %)
  if (path === '/api/orders' && method === 'GET') {
    const orders = state.kv['orders.all'] || [];
    sendJson(res, 200, { ok: true, orders });
    return true;
  }

  if (path === '/api/orders' && method === 'POST') {
    const body = await readBody(req);
    const lines = Array.isArray(body.lines) ? body.lines : [];
    if (lines.length === 0) {
      sendJson(res, 400, { ok: false, error: 'Une commande doit contenir au moins un article.' });
      return true;
    }
    const now = new Date();
    const ref =
      body.ref ||
      `SAV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(100000 + Math.random() * 900000))}`;
    const tx = body.tx || `TX-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const code = body.code || String(Math.floor(1000 + Math.random() * 9000));
    const itemsTotal = lines.reduce((sum, l) => sum + Number(l.price || 0) * Number(l.qty || 1), 0);
    const shipping = body.delivery ? Number(body.shipping || 0) : 0;
    const total = Number(body.total ?? itemsTotal + shipping);
    const isDeposit = body.paymentMode === 'deposit' && total >= 10000;
    const paidNow = isDeposit ? Math.max(500, Math.round((total * 0.2) / 500) * 500) : total;
    const balanceDue = Math.max(0, total - paidNow);

    const order = {
      ref,
      tx,
      date: body.date || now.toLocaleDateString('fr-FR'),
      time: body.time || now.toTimeString().slice(0, 5),
      lines,
      method: body.method || 'Orange Money',
      delivery: Boolean(body.delivery ?? true),
      address: body.address,
      shipping,
      vehicle: body.vehicle,
      km: body.km,
      total,
      paymentMode: isDeposit ? 'deposit' : 'full',
      paidNow,
      balanceDue,
      payPhone: body.payPhone,
      buyer: body.buyer || { name: 'Acheteur SAVAA', phone: body.payPhone || '' },
      code,
    };

    // Décrémentation du stock sur les annonces commandées
    const nextListings = state.net.listings.map((l) => {
      const line = lines.find((x) => x.listingId === l.id);
      if (!line) return l;
      const left = (l.stock ?? 1) - Number(line.qty || 1);
      if (left > 0) return { ...l, stock: l.stock === undefined ? undefined : left };
      return { ...l, stock: l.stock === undefined ? undefined : 0, status: l.stock === undefined ? 'sold' : 'out' };
    });

    // Création des lignes de ventes pour chaque vendeur
    const newSales = lines.map((line, idx) => ({
      id: `VT-${Date.now().toString(36).toUpperCase()}-${idx}`,
      orderRef: ref,
      listingId: line.listingId,
      title: line.title,
      qty: Number(line.qty || 1),
      price: Number(line.price || 0),
      buyer: order.buyer,
      delivery: order.delivery,
      address: order.address,
      date: `${order.date}, ${order.time}`,
      sellerName: line.seller || '',
      sellerPhone: line.sellerPhone || '',
      status: 'new',
    }));

    // Création automatique de la mission de transport si livraison activée
    const nextMissions = [...state.net.missions];
    if (order.delivery) {
      nextMissions.unshift({
        id: `MS-${Date.now().toString(36).toUpperCase()}`,
        orderRef: ref,
        title: lines.map((l) => (l.qty > 1 ? `${l.qty} × ${l.title}` : l.title)).join(' + '),
        pickup: body.pickup || 'Point d’enlèvement vendeur',
        dropoff: order.address || 'Adresse acheteur',
        buyer: order.buyer,
        fee: shipping,
        code,
        vehicle: order.vehicle,
        km: order.km,
        date: `${order.date}, ${order.time}`,
        status: 'open',
      });
    }

    const allOrders = [order, ...(state.kv['orders.all'] || [])];
    await persistState({
      net: {
        ...state.net,
        listings: nextListings,
        sales: [...newSales, ...state.net.sales],
        missions: nextMissions,
      },
      kv: { 'orders.all': allOrders },
    });
    await recordAudit(order.buyer.phone || 'acheteur', 'ORDER_PLACED', ref, {
      total,
      paymentMode: order.paymentMode,
      paidNow,
      balanceDue,
    });
    sendJson(res, 201, { ok: true, order });
    return true;
  }

  // Annulation d'une commande avant prise en charge par le livreur
  const cancelMatch = /^\/api\/orders\/([^/]+)\/cancel$/.exec(path);
  if (cancelMatch && method === 'POST') {
    const ref = decodeURIComponent(cancelMatch[1]);
    const mission = state.net.missions.find((m) => m.orderRef === ref);
    if (mission && ['picked', 'route', 'delivered'].includes(mission.status)) {
      sendJson(res, 400, { ok: false, error: 'Impossible d’annuler une commande déjà enlevée par le transporteur.' });
      return true;
    }
    const allOrders = (state.kv['orders.all'] || []).map((o) => (o.ref === ref ? { ...o, cancelled: true } : o));
    await persistState({
      net: {
        ...state.net,
        missions: state.net.missions.filter((m) => m.orderRef !== ref),
        sales: state.net.sales.filter((s) => s.orderRef !== ref),
      },
      kv: { 'orders.all': allOrders },
    });
    await recordAudit('acheteur', 'ORDER_CANCELLED', ref, {});
    sendJson(res, 200, { ok: true, ref, cancelled: true });
    return true;
  }

  // 2. Ventes côté vendeur (/api/sales)
  if (path === '/api/sales' && method === 'GET') {
    sendJson(res, 200, { ok: true, sales: state.net.sales });
    return true;
  }

  const saleMatch = /^\/api\/sales\/([^/]+)$/.exec(path);
  if (saleMatch && method === 'PATCH') {
    const id = decodeURIComponent(saleMatch[1]);
    const body = await readBody(req);
    const target = state.net.sales.find((s) => s.id === id);
    if (!target) {
      sendJson(res, 404, { ok: false, error: 'Vente introuvable.' });
      return true;
    }
    const updated = { ...target, status: body.status || target.status };
    await persistState({
      net: { ...state.net, sales: state.net.sales.map((s) => (s.id === id ? updated : s)) },
    });
    sendJson(res, 200, { ok: true, sale: updated });
    return true;
  }

  // 3. Missions de transport & vérification du code de remise à 4 chiffres (/api/missions)
  if (path === '/api/missions' && method === 'GET') {
    sendJson(res, 200, { ok: true, missions: state.net.missions });
    return true;
  }

  const missionMatch = /^\/api\/missions\/([^/]+)$/.exec(path);
  if (missionMatch && method === 'PATCH') {
    const id = decodeURIComponent(missionMatch[1]);
    const body = await readBody(req);
    const target = state.net.missions.find((m) => m.id === id);
    if (!target) {
      sendJson(res, 404, { ok: false, error: 'Mission de livraison introuvable.' });
      return true;
    }
    // Sécurité remise : pour passer à 'delivered', le code à 4 chiffres de l'acheteur est exigé
    if (body.status === 'delivered' && target.code && String(body.code || '').trim() !== String(target.code).trim()) {
      sendJson(res, 400, {
        ok: false,
        error: 'Code de remise à 4 chiffres incorrect. Demandez le code affiché sur le reçu de l’acheteur.',
      });
      return true;
    }
    const updated = {
      ...target,
      status: body.status || target.status,
      courier: body.courier !== undefined ? body.courier : target.courier,
      deliveredAt: body.status === 'delivered' ? new Date().toLocaleDateString('fr-FR') : target.deliveredAt,
    };
    const handed = ['picked', 'route', 'delivered'].includes(updated.status);
    await persistState({
      net: {
        ...state.net,
        missions: state.net.missions.map((m) => (m.id === id ? updated : m)),
        sales: handed
          ? state.net.sales.map((s) => (s.orderRef === target.orderRef ? { ...s, status: 'handed' } : s))
          : state.net.sales,
      },
    });
    sendJson(res, 200, { ok: true, mission: updated });
    return true;
  }

  // 4. Livreurs en service et zones (/api/couriers)
  if (path === '/api/couriers' && method === 'GET') {
    sendJson(res, 200, { ok: true, couriers: state.net.couriers });
    return true;
  }

  const courierMatch = /^\/api\/couriers\/([^/]+)$/.exec(path);
  if (courierMatch && method === 'PUT') {
    const phone = decodeURIComponent(courierMatch[1]);
    const body = await readBody(req);
    const courier = {
      phone,
      name: body.name || 'Livreur SAVAA',
      vehicle: body.vehicle || 'moto',
      base: body.base || 'Korhogo',
      radius: Number(body.radius || 15),
      online: Boolean(body.online),
    };
    const nextCouriers = [courier, ...state.net.couriers.filter((c) => c.phone !== phone)];
    await persistState({ net: { ...state.net, couriers: nextCouriers } });
    sendJson(res, 200, { ok: true, courier });
    return true;
  }

  // 5. Devis B2B & Factures (/api/quotes, /api/invoices)
  if (path === '/api/quotes' && method === 'GET') {
    sendJson(res, 200, { ok: true, quotes: state.net.quotes });
    return true;
  }

  if (path === '/api/quotes' && method === 'POST') {
    const body = await readBody(req);
    if (!body.product || !body.qty) {
      sendJson(res, 400, { ok: false, error: 'Produit et quantité requis pour une demande de devis.' });
      return true;
    }
    const quote = {
      id: body.id || `NQ-${Date.now().toString(36).toUpperCase()}`,
      product: body.product,
      qty: body.qty,
      qtyNum: body.qtyNum,
      per: body.per,
      place: body.place || 'Korhogo',
      details: body.details,
      from: body.from || { name: 'Client Pro', phone: '' },
      date: new Date().toLocaleDateString('fr-FR'),
      status: 'open',
      offers: [],
    };
    await persistState({ net: { ...state.net, quotes: [quote, ...state.net.quotes] } });
    sendJson(res, 201, { ok: true, quote });
    return true;
  }

  const quoteOfferMatch = /^\/api\/quotes\/([^/]+)\/offers$/.exec(path);
  if (quoteOfferMatch && method === 'POST') {
    const quoteId = decodeURIComponent(quoteOfferMatch[1]);
    const body = await readBody(req);
    const target = state.net.quotes.find((q) => q.id === quoteId);
    if (!target) {
      sendJson(res, 404, { ok: false, error: 'Demande de devis introuvable.' });
      return true;
    }
    const offer = {
      id: body.id || `OF-${Date.now().toString(36).toUpperCase()}`,
      supplier: body.supplier || { name: 'Fournisseur SAVAA', phone: '' },
      price: Number(body.price || 0),
      delay: body.delay || 'Sous 48 h',
      date: new Date().toLocaleDateString('fr-FR'),
    };
    const updated = {
      ...target,
      offers: [...target.offers.filter((o) => o.supplier.phone !== offer.supplier.phone), offer],
    };
    await persistState({
      net: { ...state.net, quotes: state.net.quotes.map((q) => (q.id === quoteId ? updated : q)) },
    });
    sendJson(res, 201, { ok: true, quote: updated, offer });
    return true;
  }

  const quoteAcceptMatch = /^\/api\/quotes\/([^/]+)\/accept$/.exec(path);
  if (quoteAcceptMatch && method === 'POST') {
    const quoteId = decodeURIComponent(quoteAcceptMatch[1]);
    const body = await readBody(req);
    const target = state.net.quotes.find((q) => q.id === quoteId);
    if (!target) {
      sendJson(res, 404, { ok: false, error: 'Devis introuvable.' });
      return true;
    }
    const updated = { ...target, status: 'accepted', accepted: body.offerId };
    await persistState({
      net: { ...state.net, quotes: state.net.quotes.map((q) => (q.id === quoteId ? updated : q)) },
    });
    sendJson(res, 200, { ok: true, quote: updated });
    return true;
  }

  if (path === '/api/invoices' && method === 'GET') {
    sendJson(res, 200, { ok: true, invoices: state.net.invoices });
    return true;
  }

  if (path === '/api/invoices' && method === 'POST') {
    const body = await readBody(req);
    const now = new Date();
    const due = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 15);
    const invoice = {
      id: body.id || `FA-${Date.now().toString(36).toUpperCase()}`,
      ref: body.ref || `FAC-${now.getFullYear()}-${String(1001 + state.net.invoices.length).padStart(4, '0')}`,
      quoteId: body.quoteId,
      recurringId: body.recurringId,
      label: body.label || 'Livraison B2B',
      amount: Number(body.amount || 0),
      client: body.client || { name: 'Client Pro', phone: '' },
      supplier: body.supplier || { name: 'Fournisseur SAVAA', phone: '' },
      date: now.toLocaleDateString('fr-FR'),
      due: due.toLocaleDateString('fr-FR'),
      status: 'due',
    };
    await persistState({ net: { ...state.net, invoices: [invoice, ...state.net.invoices] } });
    sendJson(res, 201, { ok: true, invoice });
    return true;
  }

  const invPayMatch = /^\/api\/invoices\/([^/]+)\/pay$/.exec(path);
  if (invPayMatch && method === 'POST') {
    const id = decodeURIComponent(invPayMatch[1]);
    const target = state.net.invoices.find((i) => i.id === id);
    if (!target) {
      sendJson(res, 404, { ok: false, error: 'Facture introuvable.' });
      return true;
    }
    const updated = { ...target, status: 'paid', paidAt: new Date().toLocaleDateString('fr-FR') };
    await persistState({
      net: { ...state.net, invoices: state.net.invoices.map((i) => (i.id === id ? updated : i)) },
    });
    sendJson(res, 200, { ok: true, invoice: updated });
    return true;
  }

  // 6. Messagerie interne & négociation d'offres (/api/threads)
  if (path === '/api/threads' && method === 'GET') {
    const phone = url.searchParams.get('phone');
    const list = phone
      ? state.net.threads.filter((t) => t.participants?.some((p) => p.phone === phone))
      : state.net.threads;
    sendJson(res, 200, { ok: true, threads: list });
    return true;
  }

  if (path === '/api/threads' && method === 'POST') {
    const body = await readBody(req);
    const thread = {
      id: body.id || `TH-${Date.now().toString(36).toUpperCase()}`,
      kind: body.kind || 'listing',
      refId: body.refId,
      subject: body.subject || 'Conversation SAVAA',
      price: body.price,
      negotiable: body.negotiable,
      photo: body.photo,
      participants: Array.isArray(body.participants) ? body.participants : [],
      messages: Array.isArray(body.messages) ? body.messages : [],
      updatedAt: new Date().toLocaleDateString('fr-FR'),
      readBy: Array.isArray(body.readBy) ? body.readBy : [],
    };
    await persistState({
      net: { ...state.net, threads: [thread, ...state.net.threads.filter((t) => t.id !== thread.id)] },
    });
    sendJson(res, 201, { ok: true, thread });
    return true;
  }

  const msgMatch = /^\/api\/threads\/([^/]+)\/messages$/.exec(path);
  if (msgMatch && method === 'POST') {
    const threadId = decodeURIComponent(msgMatch[1]);
    const body = await readBody(req);
    const target = state.net.threads.find((t) => t.id === threadId);
    if (!target) {
      sendJson(res, 404, { ok: false, error: 'Conversation introuvable.' });
      return true;
    }
    const msg = {
      id: body.id || `MSG-${Date.now().toString(36).toUpperCase()}`,
      from: body.from || { name: 'Utilisateur SAVAA', phone: '' },
      text: String(body.text || '').trim(),
      time: body.time || new Date().toLocaleDateString('fr-FR'),
      photo: body.photo,
      audio: body.audio,
      audioSec: body.audioSec,
      offer: body.offerAmount ? { amount: Number(body.offerAmount), status: 'pending' } : body.offer,
    };
    const updated = {
      ...target,
      messages: [...target.messages, msg],
      updatedAt: msg.time,
      readBy: msg.from.phone ? [msg.from.phone] : target.readBy,
    };
    await persistState({
      net: { ...state.net, threads: state.net.threads.map((t) => (t.id === threadId ? updated : t)) },
    });
    sendJson(res, 201, { ok: true, thread: updated, message: msg });
    return true;
  }

  const offerAnswerMatch = /^\/api\/threads\/([^/]+)\/offers\/([^/]+)$/.exec(path);
  if (offerAnswerMatch && method === 'POST') {
    const threadId = decodeURIComponent(offerAnswerMatch[1]);
    const msgId = decodeURIComponent(offerAnswerMatch[2]);
    const body = await readBody(req);
    const target = state.net.threads.find((t) => t.id === threadId);
    if (!target) {
      sendJson(res, 404, { ok: false, error: 'Conversation introuvable.' });
      return true;
    }
    const status = body.status === 'accepted' ? 'accepted' : 'declined';
    const updated = {
      ...target,
      messages: target.messages.map((m) => (m.id === msgId && m.offer ? { ...m, offer: { ...m.offer, status } } : m)),
    };
    await persistState({
      net: { ...state.net, threads: state.net.threads.map((t) => (t.id === threadId ? updated : t)) },
    });
    sendJson(res, 200, { ok: true, thread: updated });
    return true;
  }

  // 7. Avis vendeurs (/api/reviews)
  if (path === '/api/reviews' && method === 'GET') {
    const seller = url.searchParams.get('seller');
    const reviews = seller ? state.net.reviews.filter((r) => r.seller === seller) : state.net.reviews;
    sendJson(res, 200, { ok: true, reviews });
    return true;
  }

  if (path === '/api/reviews' && method === 'POST') {
    const body = await readBody(req);
    const review = {
      id: body.id || `REV-${Date.now().toString(36).toUpperCase()}`,
      seller: body.seller || '',
      author: body.author || 'Acheteur SAVAA',
      rating: Math.max(1, Math.min(5, Math.round(Number(body.rating || 5)))),
      comment: String(body.comment || '').trim(),
      date: new Date().toLocaleDateString('fr-FR'),
      verified: Boolean(body.verified),
    };
    await persistState({ net: { ...state.net, reviews: [review, ...state.net.reviews] } });
    sendJson(res, 201, { ok: true, review });
    return true;
  }

  return false;
}
