import { useSyncExternalStore } from 'react';
import type { Tone } from './ui';

/*
  Données de la démo. Elles partent de la maquette et sont gardées dans le navigateur
  (localStorage) : ce qu'on saisit survit au rechargement. `store.reset()` revient au départ.
  Pour brancher l'API, c'est ce fichier qu'il faut remplacer ; les écrans passent par `store`.
*/

export type Species = 'bovin' | 'ovin' | 'caprin';
export type Proof = 'declared' | 'documented' | 'verified' | 'certified';

export const PROOF: Record<Proof, { label: string; tone: Tone }> = {
  declared: { label: 'Déclaré', tone: 'grey' },
  documented: { label: 'Documenté', tone: 'blue' },
  verified: { label: 'Vérifié', tone: 'green' },
  certified: { label: 'Certifié', tone: 'cert' },
};

export type Animal = {
  id: string;
  species: Species;
  name: string;
  details: string;
  status: string;
  tone: Tone;
  officialId?: string;
  photo?: string;
  /** Documents joints à la fiche (noms de fichiers). */
  docs?: string[];
  /** Détails saisis à l'identification (écran 09b). */
  info?: { breed: string; coat: string; marks: string; entry: string; mother: string; father: string };
};

export type EventKind = 'obs' | 'trt' | 'vac';

export type HealthEvent = {
  animalId: string;
  kind: EventKind;
  date: string;
  title: string;
  text: string;
  proof: Proof;
  file?: string;
  /** Photos jointes depuis l'appareil (data URL réduites). */
  photos?: string[];
  /** Saisi hors connexion, pas encore envoyé. */
  pending?: boolean;
  /** Ligne courte de l'onglet Santé de la fiche (écran 07). `false` : n'y figure pas. Par défaut : titre + date. */
  summary?: { title?: string; sub: string } | false;
};

export type ListingStatus = 'online' | 'review' | 'sold' | 'out';

export type Listing = {
  id: string;
  title: string;
  details: string;
  price: number;
  /** « le lot », « la tête », « le sac »… affiché après le prix. */
  unit?: string;
  negotiable?: boolean;
  place: string;
  seller: string;
  /** Nom court affiché sur les cartes, ex. « Ferme Koné ». */
  sellerShort?: string;
  sellerVerified: boolean;
  category: string;
  photo: string;
  tint?: 'w' | 's';
  /** Badge de traçabilité affiché sur la carte. */
  trace: [string, Tone];
  animalIds?: string[];
  sponsored?: boolean;
  delivery: boolean;
  /** Lieu de retrait affiché au panier, ex. « Sinématiali (taurillon) ». */
  pickup?: string;
  /** Photos ajoutées depuis l'appareil (data URL réduites). */
  photos?: string[];
  /** Quantité disponible ; absent = 1 (un animal, un lot). */
  stock?: number;
  status: ListingStatus;
  /** Publiée depuis cet appareil (onglet Vendre). */
  mine?: boolean;
  date: string;
  description?: string;
};

export type CartItem = { listingId: string; qty: number };
export type Cart = { items: CartItem[]; delivery: boolean; method: string };

export type OrderLine = { listingId: string; title: string; seller: string; qty: number; price: number };
export type Order = {
  ref: string;
  tx: string;
  date: string;
  time: string;
  lines: OrderLine[];
  method: string;
  delivery: boolean;
  shipping: number;
  total: number;
  /** Code de remise à donner au livreur. */
  code: string;
  /** Commande de la maquette, avec son suivi déjà avancé. */
  demo?: boolean;
};

/* ------------------------------------------------------------------ */

const forAnimal = (animalId: string, list: Omit<HealthEvent, 'animalId'>[]): HealthEvent[] => list.map((e) => ({ animalId, ...e }));

/** Frais de livraison forfaitaires de la maquette (bétaillère). */
export const SHIPPING = 25000;

function initial() {
  const animals: Animal[] = [
    { id: 'FK-0142', species: 'bovin', name: 'Taurillon Zébu Goudali', details: 'Mâle, 26 mois, 312 kg', status: 'En vente', tone: 'sp', officialId: 'CI-BOV-2024-•••4817', photo: '/images/taurillon-goudali.jpg' },
    { id: 'FK-0087', species: 'bovin', name: 'Vache N’Dama', details: 'Femelle, 5 ans, gestante', status: 'À jour', tone: 'green', photo: '/images/vache-ndama.jpg' },
    { id: 'FK-0091', species: 'bovin', name: 'Génisse métisse', details: 'Femelle, 19 mois, 241 kg', status: 'À jour', tone: 'green', photo: '/images/genisse-metisse.jpg' },
    { id: 'FK-0119', species: 'ovin', name: 'Brebis Djallonké', details: 'Femelle, 3 ans, alerte ouverte', status: 'Alerte', tone: 'red', photo: '/images/brebis-djallonke.jpg' },
    { id: 'FK-0124', species: 'ovin', name: 'Bélier Sahélien', details: 'Mâle, 2 ans, 58 kg', status: 'Rappel dû', tone: 'amber', photo: '/images/beliers-saheliens.jpg' },
    { id: 'FK-0125', species: 'ovin', name: 'Bélier Sahélien', details: 'Mâle, 2 ans, 61 kg', status: 'Sous traitement', tone: 'blue', photo: '/images/beliers-saheliens.jpg' },
    { id: 'FK-0133', species: 'caprin', name: 'Chèvre Djallonké', details: 'Femelle, 2 ans', status: 'À jour', tone: 'green', photo: '/images/chevre-djallonke.jpg' },
    { id: 'FK-0150', species: 'bovin', name: 'Veau N’Dama', details: 'Mâle, 3 mois, ID à renseigner', status: 'ID manquant', tone: 'grey', photo: '/images/vache-ndama.jpg' },
  ];

  /* Dossiers sanitaires : taurillon FK-0142 (complet) et brebis FK-0119 (alerte ouverte). */
  const events: HealthEvent[] = [
    ...forAnimal('FK-0119', [
      { kind: 'obs', date: '18/11/2026', title: 'Observation : boiterie', text: 'Boiterie antérieure gauche, signalée ce matin par A. Koné. Urgence moyenne.', proof: 'declared' },
      { kind: 'vac', date: '14/05/2026', title: 'Vaccination peste des petits ruminants (PPR)', text: 'Campagne départementale, Dr Y. Coulibaly.', proof: 'verified' },
    ]),
    ...forAnimal('FK-0142', [
      { kind: 'vac', date: '02/10/2026', title: 'Vaccination péripneumonie (PPCB)', text: 'Dr Y. Coulibaly, vétérinaire mandaté. Voie sous-cutanée. Lot PB-2291.', proof: 'verified', file: 'Attestation_PPCB.pdf', summary: { title: 'Vaccin péripneumonie (PPCB)', sub: '02/10/2026, Dr Y. Coulibaly, lot n° PB-2291' } },
      { kind: 'trt', date: '15/08/2026', title: 'Déparasitage interne', text: 'Ivermectine 1 %, 1 ml / 50 kg. Administré par A. Koné.', proof: 'documented', file: 'Facture_pharmacie_vet.jpg', summary: { sub: '15/08/2026, ivermectine, facture jointe' } },
      { kind: 'obs', date: '03/08/2026', title: 'Observation clôturée', text: 'Toux disparue après 6 jours. Appétit normal.', proof: 'declared', summary: false },
      { kind: 'trt', date: '29/07/2026', title: 'Traitement prescrit', text: 'Oxytétracycline LA, 1 injection. Prescription du Dr Coulibaly après examen.', proof: 'verified', file: 'Ordonnance_0729.pdf', summary: false },
      { kind: 'obs', date: '28/07/2026', title: 'Observation : toux légère', text: 'Toux sèche le matin, appétit conservé. Priorité faible.', proof: 'declared', summary: { sub: '28/07/2026, A. Koné, clôturée le 03/08' } },
      { kind: 'vac', date: '10/03/2026', title: 'Vaccination dermatose nodulaire', text: 'Campagne départementale, Dr Y. Coulibaly.', proof: 'verified', summary: { title: 'Vaccin dermatose nodulaire', sub: '10/03/2026, Dr Y. Coulibaly' } },
    ]),
  ];

  const listings: Listing[] = [
    { id: 'L-TAUR3', sponsored: true, title: 'Taurillons Zébu, lot de 3', details: '18 à 22 mois, 260 à 290 kg', price: 1680000, unit: 'le lot', place: 'Ferkessédougou, 54 km', seller: 'Ranch Tuo', sellerVerified: true, category: 'Animaux, Bovins', photo: 'Photo, lot', photos: ['/images/lot-taurillons.jpg'], trace: ['3 fiches', 'blue'], delivery: true, status: 'online', date: '10/11/2026' },
    { id: 'FK-0142', title: 'Taurillon Zébu Goudali', details: '26 mois, 312 kg, pesé le 04/11', price: 650000, place: 'Sinématiali, 12 km', seller: 'Ferme Koné & Fils', sellerShort: 'Ferme Koné', sellerVerified: true, category: 'Animaux, Bovins', photo: 'Photo, taurillon', photos: ['/images/taurillon-goudali.jpg'], pickup: 'Sinématiali (taurillon)', trace: ['Fiche vérifiée', 'green'], animalIds: ['FK-0142'], delivery: true, status: 'online', date: '06/11/2026' },
    { id: 'L-NDAMA', title: 'Taurillon N’Dama', details: '20 mois, poids non renseigné', price: 415000, place: 'Korhogo, 4 km', seller: 'Bamba S.', sellerVerified: false, category: 'Animaux, Bovins', photo: 'Photo, N’Dama', photos: ['/images/vache-ndama.jpg'], trace: ['Fiche déclarée', 'grey'], delivery: false, status: 'online', date: '12/11/2026' },
    { id: 'L-METIS', title: 'Taurillon métis Goudali × N’Dama', details: '24 mois, 275 kg', price: 560000, negotiable: true, place: 'Napiéolédougou, 22 km', seller: 'Ferme Silué', sellerVerified: true, category: 'Animaux, Bovins', photo: 'Photo, métis', photos: ['/images/genisse-metisse.jpg'], trace: ['Fiche documentée', 'blue'], delivery: false, status: 'online', date: '08/11/2026' },
    { id: 'L-BELIERS', sponsored: true, title: 'Béliers Sahéliens, lot de 6', details: 'Adultes, 55 à 65 kg', price: 117500, unit: 'la tête', place: 'Ferkessédougou', seller: 'Bergerie Soro', sellerVerified: true, category: 'Animaux, Ovins', photo: 'Photo, béliers', photos: ['/images/beliers-saheliens.jpg'], trace: ['6 fiches', 'blue'], delivery: true, stock: 6, status: 'online', date: '14/11/2026' },
    { id: 'ALIM-50', title: 'Aliment bétail engraissement, sac de 50 kg', details: 'Livraison possible, stock 86', price: 14500, unit: 'le sac', place: 'Korhogo, 3 km', seller: 'Provenderie du Nord', sellerVerified: true, category: 'Aliments et intrants', pickup: 'Korhogo, zone industrielle (aliment)', photo: 'Photo, sacs d’aliment', photos: ['/images/aliment-betail.jpg'], tint: 'w', trace: ['Livraison', 'grey'], delivery: true, stock: 86, status: 'online', date: '01/11/2026' },
    { id: 'POUSSINS', title: 'Poussins chair, J1', details: 'Vendus par 100', price: 650, unit: 'le poussin', place: 'Korhogo, par 100', seller: 'Couvoir du Nord', sellerVerified: false, category: 'Volailles', photo: 'Photo, poussins', photos: ['/images/poussins-chair.jpg'], tint: 's', trace: ['Profil non vérifié', 'grey'], delivery: false, stock: 2000, status: 'online', date: '15/11/2026' },
    { id: 'IGNAME', title: 'Igname Kponan', details: 'Minimum 200 kg', price: 425, unit: 'le kg', place: 'Dikodougou, 38 km', seller: 'Coopérative de Dikodougou', sellerVerified: true, category: 'Récoltes', photo: 'Photo, igname', photos: ['/images/igname-kponan.jpg'], tint: 'w', trace: ['Min. 200 kg', 'grey'], delivery: false, stock: 5000, status: 'online', date: '13/11/2026' },
  ];

  const cart: Cart = { items: [{ listingId: 'FK-0142', qty: 1 }, { listingId: 'ALIM-50', qty: 4 }], delivery: true, method: 'Orange Money' };

  /* Commande de la maquette (écrans 19 et 20). */
  const orders: Order[] = [
    {
      ref: 'SAV-2026-11-004812', tx: 'TX-7Q4K-21983', date: '18/11/2026', time: '09:42', method: 'Orange Money', delivery: true, shipping: SHIPPING, total: 733000, code: '4827', demo: true,
      lines: [
        { listingId: 'FK-0142', title: 'Taurillon Zébu Goudali', seller: 'Ferme Koné & Fils', qty: 1, price: 650000 },
        { listingId: 'ALIM-50', title: 'Aliment bétail engraissement, sac de 50 kg', seller: 'Provenderie du Nord', qty: 4, price: 14500 },
      ],
    },
  ];

  const tickets: Ticket[] = [
    { id: 'TK-1071', motif: 'Annonce trompeuse', order: '', text: 'Annonce trompeuse signalée', urgent: false, date: '12/11', status: 'closed' },
  ];

  const shop: Shop = {
    name: 'Ferme Koné & Fils',
    desc: 'Élevage familial de bovins et d’ovins à Sinématiali depuis 2009. Animaux suivis par un vétérinaire, visite possible sur rendez-vous.',
    town: 'Sinématiali',
  };

  /* Notifications de la maquette (écran 22). */
  const notifs: Notif[] = [
    { id: 1, g: 'Aujourd’hui', c: 'alr', title: 'Alerte sanitaire, FK-0119', text: 'Boiterie signalée sur la brebis FK-0119. Priorité moyenne. Contactez un vétérinaire si l’état persiste.', time: '09:58', to: '/animal/FK-0119/observation', unread: true },
    { id: 2, g: 'Aujourd’hui', c: 'pay', title: 'Paiement confirmé (simulation)', text: 'SAV-2026-11-004812, 733 000 FCFA, statut transmis par le prestataire.', time: '09:42', to: '/recu?ref=SAV-2026-11-004812', unread: true },
    { id: 3, g: 'Aujourd’hui', c: 'cmd', title: 'Commande prise en charge', text: 'Transports Ouattara a accepté la livraison du taurillon FK-0142.', time: '09:15', to: '/commande?ref=SAV-2026-11-004812', unread: true },
    { id: 4, g: 'Hier', c: 'cmp', title: 'Campagne validée', text: '« Béliers Sahéliens, lot de 6 » est diffusée jusqu’au 24 novembre.', time: '17:20', to: '/campagne/stats', unread: true },
    { id: 5, g: 'Hier', c: 'pro', title: 'Relance prévue demain', text: 'Restaurant Le Baobab, appel de suivi du devis poulets de chair.', time: '16:05', to: '/prospect/1', unread: false },
    { id: 6, g: 'Hier', c: 'alr', title: 'Rappel vaccinal PPR', text: '9 ovins arrivent à échéance le 22 novembre.', time: '07:00', to: '/suivi', unread: false },
  ];

  /* Compte de démonstration : Adama Koné, éleveur et vendeur. */
  const session: Session = {
    loggedIn: false,
    name: 'Adama Koné',
    phone: '07 48 12 33 90',
    roles: ['eleveur', 'vendeur'],
    prefs: { push: true, mkt: false },
    docs: [
      { name: 'CNI recto-verso.pdf', date: '03/03/2025', status: 'verified' },
      { name: 'Attestation d’exploitation, mairie.jpg', date: '10/11/2026', status: 'documented' },
    ],
  };

  return { animals, events, listings, cart, orders, favorites: ['L-METIS', 'L-BELIERS', 'IGNAME'] as string[], tickets, chat: [] as string[], shop, notifs, session };
}

export type NotifCat = 'cmd' | 'pay' | 'cmp' | 'pro' | 'alr';
export type Notif = { id: number; c: NotifCat; title: string; text: string; time: string; to: string; unread: boolean; /** Groupe affiché ; sinon la date. */ g?: string; date?: string };

export type Session = {
  loggedIn: boolean;
  name: string;
  phone: string;
  mail?: string;
  roles: string[];
  prefs: { push: boolean; mkt: boolean };
  docs: { name: string; date: string; status: 'verified' | 'documented' | 'review' }[];
};

export type Shop = { name: string; desc: string; town: string; logo?: string };

export type Ticket = {
  id: string;
  motif: string;
  order: string;
  text: string;
  urgent: boolean;
  date: string;
  status: 'open' | 'closed';
  photos?: string[];
};

type State = ReturnType<typeof initial>;

/* ------------------------------------------------------------------ */
/* Sauvegarde dans le navigateur                                       */

const KEY = 'savaa-demo-v2';

function load(): State {
  const base = initial();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...base, ...(JSON.parse(raw) as Partial<State>) };
  } catch {
    /* navigation privée, stockage plein ou données illisibles : on repart de la maquette */
  }
  return base;
}

let state: State = load();
const listeners = new Set<() => void>();
let version = 0;

function commit(next: Partial<State>) {
  state = { ...state, ...next };
  version++;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* pas de stockage : la démo marche quand même, sans mémoire */
  }
  listeners.forEach((l) => l());
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */

const pad = (n: number) => String(n).padStart(2, '0');
/** « 19/11/2026 » */
export const today = () => {
  const d = new Date();
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};
/** « 09:42 » */
export const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/* Effectifs de la maquette (18, 22, 6) : animaux non listés + animaux listés. */
const UNLISTED: Record<Species, number> = { bovin: 14, ovin: 19, caprin: 5 };

const findListing = (id: string) => state.listings.find((l) => l.id === id);

export const store = {
  /** Efface tout ce qui a été saisi et revient aux données de la maquette. */
  reset() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* rien à effacer */
    }
    state = initial();
    version++;
    listeners.forEach((l) => l());
  },

  /* Cheptel et santé */
  animals: () => state.animals,
  /** `undefined` si l'identifiant est inconnu : l'écran affiche alors « introuvable ». */
  animal: (id: string): Animal | undefined => state.animals.find((a) => a.id === id),
  eventsFor: (animalId: string) => state.events.filter((e) => e.animalId === animalId),
  count: (s: Species) => UNLISTED[s] + state.animals.filter((a) => a.species === s).length,
  total: () => (['bovin', 'ovin', 'caprin'] as Species[]).reduce((n, s) => n + store.count(s), 0),
  addAnimal(a: Animal) {
    commit({ animals: [a, ...state.animals] });
  },
  addEvent(e: HealthEvent) {
    commit({ events: [e, ...state.events] });
    if (e.kind === 'obs') store.notify({ c: 'alr', title: `Alerte sanitaire, ${e.animalId}`, text: `${e.title}. ${e.pending ? 'Envoi au vétérinaire dès le retour du réseau.' : ''}`.trim(), to: `/animal/${e.animalId}/sante` });
  },

  /* Compte */
  session: () => state.session,
  login(patch: Partial<Session>) {
    commit({ session: { ...state.session, ...patch, loggedIn: true } });
  },
  logout() {
    commit({ session: { ...state.session, loggedIn: false } });
  },
  setSession(patch: Partial<Session>) {
    commit({ session: { ...state.session, ...patch } });
  },

  /* Notifications */
  notifs: () => state.notifs,
  unread: () => state.notifs.filter((n) => n.unread).length,
  notify(n: Omit<Notif, 'id' | 'time' | 'unread' | 'date'>) {
    const id = Math.max(0, ...state.notifs.map((x) => x.id)) + 1;
    commit({ notifs: [{ ...n, id, time: nowTime(), date: today(), unread: true }, ...state.notifs] });
  },
  markRead(id: number) {
    if (!state.notifs.some((n) => n.id === id && n.unread)) return;
    commit({ notifs: state.notifs.map((n) => (n.id === id ? { ...n, unread: false } : n)) });
  },
  markAllRead() {
    commit({ notifs: state.notifs.map((n) => ({ ...n, unread: false })) });
  },

  /* Annonces */
  listings: () => state.listings,
  listing: (id: string): Listing | undefined => findListing(id),
  addListing(l: Listing) {
    commit({ listings: [l, ...state.listings] });
    if (l.mine) store.notify({ c: 'cmp', title: 'Annonce envoyée en relecture', text: `« ${l.title} » sera vérifiée par l’équipe SAVAA, en général sous 24 h.`, to: `/annonce/${l.id}` });
  },
  updateListing(id: string, patch: Partial<Listing>) {
    commit({ listings: state.listings.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  },

  /* Boutique du vendeur */
  shop: () => state.shop,
  setShop(patch: Partial<Shop>) {
    commit({ shop: { ...state.shop, ...patch } });
  },
  myListings: () => state.listings.filter((l) => l.mine),

  /* Favoris */
  favorites: () => state.favorites,
  isFavorite: (id: string) => state.favorites.includes(id),
  toggleFavorite(id: string) {
    commit({ favorites: state.favorites.includes(id) ? state.favorites.filter((f) => f !== id) : [...state.favorites, id] });
  },

  /* Panier */
  cart: () => state.cart,
  setCart(c: Partial<Cart>) {
    commit({ cart: { ...state.cart, ...c } });
  },
  /** Lignes du panier dont l'annonce existe encore. */
  cartLines() {
    return state.cart.items.flatMap((it) => {
      const l = findListing(it.listingId);
      return l ? [{ listing: l, qty: it.qty, amount: l.price * it.qty }] : [];
    });
  },
  addToCart(listingId: string, qty = 1) {
    const l = findListing(listingId);
    if (!l) return;
    const max = l.stock ?? 1;
    const has = state.cart.items.find((i) => i.listingId === listingId);
    const items = has
      ? state.cart.items.map((i) => (i.listingId === listingId ? { ...i, qty: Math.min(max, i.qty + qty) } : i))
      : [...state.cart.items, { listingId, qty: Math.min(max, qty) }];
    commit({ cart: { ...state.cart, items } });
  },
  setQty(listingId: string, qty: number) {
    const max = findListing(listingId)?.stock ?? 1;
    commit({ cart: { ...state.cart, items: state.cart.items.map((i) => (i.listingId === listingId ? { ...i, qty: Math.max(1, Math.min(max, qty)) } : i)) } });
  },
  removeFromCart(listingId: string) {
    commit({ cart: { ...state.cart, items: state.cart.items.filter((i) => i.listingId !== listingId) } });
  },
  cartTotals() {
    const lines = store.cartLines();
    const items = lines.reduce((n, l) => n + l.amount, 0);
    const shipping = state.cart.delivery && lines.length ? SHIPPING : 0;
    return { items, shipping, total: items + shipping, count: lines.length, sellers: new Set(lines.map((l) => l.listing.seller)).size };
  },

  /* Assistance */
  tickets: () => state.tickets,
  addTicket(t: Omit<Ticket, 'id' | 'date' | 'status'>): Ticket {
    const num = Math.max(...state.tickets.map((x) => Number(x.id.slice(3)) || 0), 1092) + 1;
    const d = new Date();
    const ticket: Ticket = { ...t, id: `TK-${num}`, date: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`, status: 'open' };
    commit({ tickets: [ticket, ...state.tickets] });
    store.notify({ c: 'cmd', title: `Ticket ${ticket.id} ouvert`, text: `${ticket.motif}${ticket.order ? `, ${ticket.order}` : ''}. Première réponse sous ${ticket.urgent ? '1 h' : '4 h'}.`, to: '/assistance?onglet=reclamation' });
    return ticket;
  },
  chat: () => state.chat,
  addChat(text: string) {
    commit({ chat: [...state.chat, text] });
  },

  /* Commandes */
  orders: () => state.orders,
  order: (ref: string) => state.orders.find((o) => o.ref === ref),
  lastOrder: () => state.orders[0],
  /** Paiement confirmé : la commande est créée et le panier vidé. */
  placeOrder(): Order {
    const t = store.cartTotals();
    const n = 4812 + state.orders.length * 7 + Math.floor(Math.random() * 6) + 1;
    const d = new Date();
    const order: Order = {
      ref: `SAV-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${String(n).padStart(6, '0')}`,
      tx: `TX-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${String(Math.floor(Math.random() * 90000) + 10000)}`,
      date: today(),
      time: nowTime(),
      method: state.cart.method,
      delivery: state.cart.delivery,
      shipping: t.shipping,
      total: t.total,
      code: String(Math.floor(Math.random() * 9000) + 1000),
      lines: store.cartLines().map(({ listing, qty }) => ({ listingId: listing.id, title: listing.title, seller: listing.seller, qty, price: listing.price })),
    };
    /* Le stock baisse ; un animal ou un lot vendu passe en « vendu ». */
    const listings = state.listings.map((l) => {
      const line = order.lines.find((x) => x.listingId === l.id);
      if (!line) return l;
      const left = (l.stock ?? 1) - line.qty;
      return left > 0 ? { ...l, stock: l.stock === undefined ? undefined : left } : { ...l, stock: l.stock === undefined ? undefined : 0, status: l.stock === undefined ? 'sold' : 'out' } as Listing;
    });
    commit({ orders: [order, ...state.orders], listings, cart: { ...state.cart, items: [] } });
    store.notify({ c: 'pay', title: 'Paiement confirmé (simulation)', text: `${order.ref}, ${fcfa(order.total)} FCFA, statut transmis par le prestataire.`, to: `/recu?ref=${order.ref}` });
    return order;
  },
};

/** 733000 → « 733 000 » */
export const fcfa = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** Prix d'une annonce : « 117 500 FCFA la tête ». */
export const priceLabel = (l: Listing) => `${fcfa(l.price)} FCFA${l.unit ? ` ${l.unit}` : ''}`;

/** Re-rend le composant quand les données de démo changent. */
export function useStore() {
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => version,
  );
  return store;
}
