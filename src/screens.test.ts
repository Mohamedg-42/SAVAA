import { beforeEach, describe, expect, it, vi } from 'vitest';
import { store } from './data';
import { fetchServerSync, getApiBase } from '../packages/shared/api';

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

describe('parcours multi-rôles et architecture Client-Serveur (Web & Mobile)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    store.reset();
  });

  it('redirige chaque métier vers son écran d’accueil dédié', () => {
    expect(store.home()).toBe('/accueil');

    store.login({ name: 'Awa', phone: '0701020304', roles: ['acheteur'] });
    expect(store.home()).toBe('/accueil');

    store.login({ name: 'Koffi', phone: '0701020305', roles: ['eleveur'] });
    expect(store.home()).toBe('/suivi');

    store.login({ name: 'Soro', phone: '0701020306', roles: ['agri'] });
    expect(store.home()).toBe('/recoltes');

    store.login({ name: 'Dr Touré', phone: '0701020307', roles: ['veto'] });
    expect(store.home()).toBe('/veto');

    store.login({ name: 'Ouattara', phone: '0701020308', roles: ['coursier'] });
    expect(store.home()).toBe('/missions');

    store.login({ name: 'Konan', phone: '0701020309', roles: ['invest'] });
    expect(store.home()).toBe('/investir');

    store.login({ name: 'Baobab', phone: '0701020310', roles: ['resto'] });
    expect(store.home()).toBe('/restaurant');

    store.login({ name: 'AgroNord', phone: '0701020311', roles: ['fourn'] });
    expect(store.home()).toBe('/fournisseur');
  });

  it('applique le prix professionnel uniquement aux restaurants vérifiés ayant renseigné leur RCCM', () => {
    const listing = store.listing('L-OEUFS');
    if (!listing) throw new Error('annonce L-OEUFS introuvable');

    store.login({ name: 'Client standard', phone: '0711111111', roles: ['acheteur'] });
    expect(store.isVerifiedPro()).toBe(false);
    expect(store.priceFor(listing)).toBe(2600);

    store.login({ name: 'Restaurant Le Baobab', phone: '0722222222', roles: ['resto'], pro: { 'resto.rccm': 'CI-KGO-2025-B-412' } });
    // Tant que le dossier KYC soumis est en attente de validation ('review'), le prix pro reste bloqué
    store.submitKyc([['RCCM', 'CI-KGO-2025-B-412']], [{ label: 'Extrait RCCM' }]);
    expect(store.isVerifiedPro()).toBe(false);
    expect(store.priceFor(listing)).toBe(2600);

    // Une fois validé par l'équipe SAVAA dans /admin, le prix pro est débloqué
    const kyc = store.kycOf();
    expect(kyc).toBeTruthy();
    store.answerKyc(kyc!.id, 'verified');
    expect(store.isVerifiedPro()).toBe(true);
    expect(store.priceFor(listing)).toBe(2400);
  });

  it('gère le flux complet devis B2B → offre fournisseur → facture → règlement', () => {
    store.login({ name: 'Hôtel Mont Korhogo', phone: '0733333333', roles: ['resto'] });
    const quoteId = store.askQuote({
      product: 'Maïs grain jaune',
      qty: '20 sacs',
      place: 'Korhogo',
      org: 'Hôtel Mont Korhogo',
      per: 'le sac',
      qtyNum: 20,
    });

    store.login({ name: 'Agro-Nord Intrants', phone: '0744444444', roles: ['fourn'] });
    store.offerQuote(quoteId, 17500, 'Livraison sous 48 h', 'Agro-Nord Intrants');

    const quote = store.net().quotes.find((q) => q.id === quoteId);
    expect(quote?.offers).toHaveLength(1);
    const offerId = quote!.offers[0].id;

    store.login({ name: 'Hôtel Mont Korhogo', phone: '0733333333', roles: ['resto'] });
    store.acceptOffer(quoteId, offerId);
    expect(store.net().quotes.find((q) => q.id === quoteId)?.status).toBe('accepted');

    store.login({ name: 'Agro-Nord Intrants', phone: '0744444444', roles: ['fourn'] });
    const invoice = store.issueInvoice({
      quoteId,
      label: '20 sacs de Maïs grain jaune',
      amount: 350000,
      client: { name: 'Hôtel Mont Korhogo', phone: '0733333333', org: 'Hôtel Mont Korhogo' },
      org: 'Agro-Nord Intrants',
    });
    expect(invoice.status).toBe('due');

    store.login({ name: 'Hôtel Mont Korhogo', phone: '0733333333', roles: ['resto'] });
    store.payInvoice(invoice.id);
    expect(store.net().invoices.find((i) => i.id === invoice.id)?.status).toBe('paid');
  });

  it('configure correctement le client API partagé entre Site Web et Application Mobile', async () => {
    expect(getApiBase()).toBe('http://localhost:4000');
    /* En environnement Vitest, les appels réseau sont court-circuités proprement sans erreur. */
    expect(await fetchServerSync()).toBeNull();
  });
});
