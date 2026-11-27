import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fcfa, store } from './data';

/* Mock localStorage en mémoire pour exécuter le store dans Vitest (environnement Node). */
function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => { map.set(k, String(v)); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => { map.clear(); },
    get length() { return map.size; },
    key: (i: number) => [...map.keys()][i] ?? null,
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createMemoryStorage());
  store.reset();
});

describe('formatage FCFA', () => {
  it('sépare les milliers par une espace', () => {
    expect(fcfa(733000)).toBe('733 000');
    expect(fcfa(1680000)).toBe('1 680 000');
    expect(fcfa(500)).toBe('500');
  });
});

describe('messagerie interne SAVAA', () => {
  it('crée une conversation, évite les doublons et gère les non-lus entre deux comptes', () => {
    store.login({ name: 'Awa Touré', phone: '07 11 22 33 44', roles: ['acheteur'] });
    const seller = { name: 'Ferme Silué', phone: '05 22 33 44 55' };

    const id1 = store.openThread({
      kind: 'listing',
      refId: 'L-METIS',
      subject: 'Taurillon métis',
      other: seller,
      price: 560000,
      negotiable: true,
    });
    /* Rouvrir sur le même contexte + interlocuteur renvoie la même conversation. */
    const id2 = store.openThread({
      kind: 'listing',
      refId: 'L-METIS',
      subject: 'Taurillon métis',
      other: seller,
    });
    expect(id2).toBe(id1);

    store.sendMessage(id1, 'Bonjour, je propose 520 000 FCFA.', { offerAmount: 520000 });
    expect(store.unreadMessages()).toBe(0);
    const offerMsg = store.thread(id1)?.messages[0];
    expect(offerMsg?.offer).toEqual({ amount: 520000, status: 'pending' });

    /* Côté vendeur : la conversation apparaît comme non lue, puis il accepte l’offre. */
    store.logout();
    store.login({ name: 'Ferme Silué', phone: '05 22 33 44 55', roles: ['eleveur'] });
    expect(store.unreadMessages()).toBe(1);

    store.markThreadRead(id1);
    expect(store.unreadMessages()).toBe(0);

    store.answerOffer(id1, offerMsg!.id, 'accepted');
    const updated = store.thread(id1);
    expect(updated?.messages[0].offer?.status).toBe('accepted');
    expect(updated?.messages[1].text).toContain('520 000 FCFA acceptée');

    /* Retour chez l’acheteur : réponse non lue visible. */
    store.logout();
    store.resumeAccount('0711223344');
    expect(store.unreadMessages()).toBe(1);
  });

  it('enregistre une note vocale et une photo dans le fil', () => {
    store.login({ name: 'Awa Touré', phone: '07 11 22 33 44', roles: ['acheteur'] });
    const id = store.openThread({
      kind: 'delivery',
      refId: 'SAV-2026-11-009999',
      subject: 'Livraison Korhogo',
      other: { name: 'Transports Ouattara', phone: '01 44 55 66 77' },
    });
    store.sendMessage(id, '', { audio: 'data:audio/webm;base64,AAA', audioSec: 12 });
    store.sendMessage(id, 'Photo du colis', { photo: 'data:image/jpeg;base64,BBB' });
    const msgs = store.thread(id)?.messages ?? [];
    expect(msgs).toHaveLength(2);
    expect(msgs[0].audioSec).toBe(12);
    expect(msgs[1].photo).toBe('data:image/jpeg;base64,BBB');
  });
});

describe('avis vendeurs', () => {
  it('borne la note entre 1 et 5, détecte un achat vérifié et permet la réponse du vendeur', () => {
    store.loginDemo();
    /* Le compte démo a une commande chez Ferme Koné & Fils. */
    store.addReview({ seller: 'Ferme Koné & Fils', rating: 9, comment: 'Très bon suivi.' });
    const list = store.reviewsFor('Ferme Koné & Fils');
    expect(list[0].rating).toBe(5);
    expect(list[0].verified).toBe(true);

    store.replyReview(list[0].id, 'Merci beaucoup pour votre confiance !');
    expect(store.reviewsFor('Ferme Koné & Fils')[0].reply).toBe('Merci beaucoup pour votre confiance !');
  });
});

describe('panier, prix pro, acompte et commandes', () => {
  it('applique le prix pro uniquement aux restaurants vérifiés avec RCCM', () => {
    const eggs = store.listing('L-OEUFS')!;
    expect(eggs.price).toBe(2600);

    store.login({ name: 'Resto Le Baobab', phone: '07 55 66 77 88', roles: ['resto'] });
    expect(store.isVerifiedPro()).toBe(false);
    expect(store.priceFor(eggs)).toBe(2600);

    store.setSession({ pro: { 'resto.rccm': 'CI-KGO-2024-B-123' } });
    expect(store.isVerifiedPro()).toBe(true);
    expect(store.priceFor(eggs)).toBe(2400);
  });

  it('respecte le prix convenu d’une offre, calcule l’acompte 20 % et crée puis annule une commande', () => {
    store.login({ name: 'Awa Touré', phone: '07 11 22 33 44', roles: ['acheteur'], town: 'Korhogo' });
    store.addToCart('L-METIS', 1, 520000);
    store.setCart({ delivery: false, paymentMode: 'deposit' });

    const totals = store.cartTotals();
    expect(totals.items).toBe(520000);
    expect(totals.shipping).toBe(0);
    expect(totals.isDeposit).toBe(true);
    expect(totals.dueNow).toBe(104000); // 20 % arrondi à 500 FCFA
    expect(totals.balanceDue).toBe(416000);

    const order = store.placeOrder();
    expect(order.total).toBe(520000);
    expect(order.paymentMode).toBe('deposit');
    expect(store.cart().items).toHaveLength(0);
    expect(store.listing('L-METIS')?.status).toBe('sold');

    store.cancelOrder(order.ref);
    expect(store.order(order.ref)?.cancelled).toBe(true);
  });

  it('crée une mission transporteur pour une commande avec livraison', () => {
    store.login({ name: 'Awa Touré', phone: '07 11 22 33 44', roles: ['acheteur'], town: 'Korhogo' });
    store.addToCart('ALIM-50', 2);
    store.setCart({ delivery: true, town: 'Korhogo', address: 'Quartier Soba' });
    const stockBefore = store.listing('ALIM-50')!.stock!;

    const order = store.placeOrder();
    expect(store.listing('ALIM-50')?.stock).toBe(stockBefore - 2);
    expect(store.net().missions.some((m) => m.orderRef === order.ref)).toBe(true);

    store.cancelOrder(order.ref);
    expect(store.net().missions.some((m) => m.orderRef === order.ref)).toBe(false);
  });
});

describe('liaisons entre rôles : inscription, devis/factures et alertes', () => {
  it('gère le cycle inscription → déconnexion → reconnexion par numéro', () => {
    store.startSignup({ name: 'Koffi Yao', phone: '07 99 88 77 66', town: 'Korhogo' });
    expect(store.session().loggedIn).toBe(false);
    expect(store.signupStep()).toBe('/role');

    store.setSession({ roles: ['eleveur'], onboarding: 'profil' });
    expect(store.signupStep()).toBe('/profil-metier');

    store.finishSignup();
    expect(store.session().loggedIn).toBe(true);
    expect(store.home()).toBe('/suivi');

    store.logout();
    expect(store.session().loggedIn).toBe(false);
    expect(store.knownAccount('0799887766')).toBe('Koffi Yao');

    expect(store.resumeAccount('0799887766')).toBe(true);
    expect(store.session().name).toBe('Koffi Yao');
    expect(store.session().loggedIn).toBe(true);
  });

  it('enchaîne devis → offre → acceptation → facture → paiement et récurrence', () => {
    store.login({ name: 'Resto Baobab', phone: '07 20 30 40 50', roles: ['resto'] });
    const qId = store.askQuote({ product: 'Poulets de chair', qty: '50 kg', qtyNum: 50, per: 'le kg', place: 'Korhogo', org: 'Le Baobab' });

    store.logout();
    store.login({ name: 'Ferme Avicole', phone: '05 60 70 80 90', roles: ['fourn'] });
    store.offerQuote(qId, 2200, '24 h', 'Ferme Avicole Soba');
    const quote = store.net().quotes.find((q) => q.id === qId)!;
    expect(quote.offers).toHaveLength(1);

    store.logout();
    store.resumeAccount('0720304050');
    store.acceptOffer(qId, quote.offers[0].id);
    expect(store.net().quotes.find((q) => q.id === qId)?.status).toBe('accepted');

    store.startRecurring(qId, 'week', 1);
    const rec = store.net().recurring[0];
    expect(rec.status).toBe('active');

    store.logout();
    store.resumeAccount('0560708090');
    store.deliverRecurring(rec.id, 'Ferme Avicole Soba');
    const inv = store.net().invoices[0];
    expect(inv.amount).toBe(110000);
    expect(inv.status).toBe('due');

    store.payInvoice(inv.id);
    expect(store.net().invoices[0].status).toBe('paid');
  });

  it('transmet une observation sanitaire de l’éleveur aux vétérinaires', () => {
    store.loginDemo();
    store.addEvent({
      animalId: 'FK-0142',
      kind: 'obs',
      date: '27/11/2026',
      title: 'Observation : fièvre',
      text: 'Température élevée, urgence élevée.',
      proof: 'declared',
    });
    const alert = store.net().alerts[0];
    expect(alert.animalId).toBe('FK-0142');
    expect(alert.urgency).toBe('Élevée');

    store.logout();
    store.login({ name: 'Dr Coulibaly', phone: '07 00 11 22 33', roles: ['veto'] });
    store.answerAlert(alert.id, 'taken', 'Visite prévue à 15h');
    expect(store.net().alerts[0].status).toBe('taken');
    expect(store.net().alerts[0].vet?.name).toBe('Dr Coulibaly');
  });
});
