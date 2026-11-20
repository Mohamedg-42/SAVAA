import type { Animal, Listing, Order, TraceSheet } from './data';
import type { Tone } from './ui';

/*
  Fiches d'identité et de traçabilité : les 8 catégories du cahier des charges, leurs sous-catégories,
  les champs propres à chacune et la correspondance avec les anciennes catégories d'annonce.
  Le formulaire Vendre et la fiche produit lisent cette même définition.
*/

export type TraceField = { label: string; placeholder?: string; type?: 'text' | 'date' | 'number' };

export type TraceCategory = {
  id: string;
  label: string;
  subs: string[];
  /** Unité de vente proposée par défaut. */
  unit: string;
  /** Champs propres à la catégorie, tous facultatifs dans le formulaire court. */
  fields: TraceField[];
  /** Catégorie d'annonce historique (filtres du catalogue, logique « Animaux » des écrans d'achat). */
  legacy: (sub: string) => string;
  /** Catégorie d'animaux vivants : réservée aux éleveurs, sauf les volailles. */
  live?: boolean;
};

const animalLegacy = (sub: string) =>
  sub === 'Bovin' ? 'Animaux, Bovins' : sub === 'Ovin' ? 'Animaux, Ovins' : sub === 'Caprin' ? 'Animaux, Caprins' : sub === 'Volaille' ? 'Volailles' : 'Animaux, Autres';

const ANIMAL_FIELDS: TraceField[] = [
  { label: 'Race ou croisement', placeholder: 'Ex. Zébu Goudali, N’Dama' },
  { label: 'Âge ou âge estimé', placeholder: 'Ex. 18 mois, 6 semaines' },
  { label: 'Poids (kg)', placeholder: 'Ex. 320', type: 'number' },
];

export const TRACE_CATEGORIES: TraceCategory[] = [
  { id: 'vivant', label: 'Animaux vivants et reproducteurs', subs: ['Bovin', 'Ovin', 'Caprin', 'Porcin', 'Volaille', 'Autre'], unit: 'tête', fields: ANIMAL_FIELDS, legacy: animalLegacy, live: true },
  { id: 'abattage', label: 'Animaux destinés à la viande', subs: ['Bovin', 'Ovin', 'Caprin', 'Porcin', 'Volaille', 'Autre'], unit: 'tête', fields: ANIMAL_FIELDS, legacy: animalLegacy, live: true },
  {
    id: 'viande', label: 'Viandes et produits carnés', subs: ['Bœuf', 'Mouton', 'Chèvre', 'Porc', 'Volaille', 'Abats', 'Produits transformés'], unit: 'kg',
    fields: [{ label: 'Date d’abattage', type: 'date' }, { label: 'Abattoir', placeholder: 'Nom de l’abattoir ou de l’aire d’abattage' }, { label: 'Conservation', placeholder: 'Frais, réfrigéré, congelé' }, { label: 'Date limite de consommation', type: 'date' }],
    legacy: () => 'Viandes',
  },
  {
    id: 'frais', label: 'Produits végétaux frais et maraîchers', subs: ['Légumes', 'Fruits', 'Tubercules', 'Banane plantain', 'Herbes et condiments'], unit: 'kg',
    fields: [{ label: 'Variété', placeholder: 'Ex. igname Kponan, tomate Mongal' }, { label: 'Date de récolte', type: 'date' }, { label: 'Traitements phytosanitaires', placeholder: 'Produit et date, ou « aucun »' }],
    legacy: () => 'Récoltes',
  },
  {
    id: 'cereales', label: 'Céréales et produits agricoles bruts', subs: ['Maïs', 'Riz paddy', 'Riz blanchi', 'Mil et sorgho', 'Arachide', 'Soja', 'Noix de cajou', 'Autre'], unit: 'sac',
    fields: [{ label: 'Variété', placeholder: 'Ex. maïs jaune' }, { label: 'Campagne ou date de récolte', placeholder: 'Ex. 2026' }, { label: 'Humidité (%)', type: 'number' }, { label: 'Conditionnement', placeholder: 'Ex. sacs de 100 kg' }],
    legacy: () => 'Récoltes',
  },
  {
    id: 'semences', label: 'Semences et plants', subs: ['Semences de céréales', 'Semences maraîchères', 'Plants', 'Boutures', 'Autre'], unit: 'kg',
    fields: [{ label: 'Variété' }, { label: 'Numéro de lot' }, { label: 'Numéro de certificat', placeholder: 'Si la semence est certifiée' }, { label: 'Taux de germination (%)', type: 'number' }],
    legacy: () => 'Aliments et intrants',
  },
  {
    id: 'transforme', label: 'Produits agroalimentaires transformés', subs: ['Aliment pour bétail et volaille', 'Farines', 'Huiles', 'Dérivés du manioc', 'Produits laitiers', 'Autre'], unit: 'sac',
    fields: [{ label: 'Numéro de lot' }, { label: 'Date de fabrication', type: 'date' }, { label: 'Date de péremption', type: 'date' }, { label: 'Ingrédients principaux' }],
    legacy: () => 'Aliments et intrants',
  },
  /* Hors des 8 catégories du cahier des charges, ajoutée à la demande : les engrais et produits phytosanitaires
     ont besoin d'une traçabilité propre (composition, homologation, lot, péremption). */
  {
    id: 'intrants', label: 'Engrais et produits phytosanitaires', subs: ['Engrais minéraux', 'Engrais organiques et compost', 'Herbicides', 'Insecticides', 'Fongicides', 'Autre'], unit: 'sac',
    fields: [
      { label: 'Fabricant ou marque' },
      { label: 'Composition ou matière active', placeholder: 'Ex. NPK 15-15-15, glyphosate 360 g/l' },
      { label: 'Numéro d’homologation', placeholder: 'Pour un produit phytosanitaire' },
      { label: 'Numéro de lot' },
      { label: 'Date de péremption', type: 'date' },
    ],
    legacy: () => 'Aliments et intrants',
  },
  {
    id: 'equipement', label: 'Équipements, matériels et machines', subs: ['Matériel d’élevage', 'Matériel agricole', 'Irrigation', 'Transformation', 'Pièces détachées', 'Autre'], unit: 'pièce',
    fields: [{ label: 'Marque' }, { label: 'Modèle' }, { label: 'État', placeholder: 'Neuf ou occasion' }, { label: 'Année', type: 'number' }],
    legacy: () => 'Matériel',
  },
];

export const traceCategory = (id: string) => TRACE_CATEGORIES.find((c) => c.id === id);

/** Espèces dont les animaux sont suivis dans le cheptel : elles se vendent avec leur fiche animale. */
export const HERD_SPECIES = ['Bovin', 'Ovin', 'Caprin'];

/** Sous-catégories proposées selon le profil : seul un éleveur vend des animaux suivis au cheptel. */
export function subsFor(c: TraceCategory, breeder: boolean): string[] {
  if (!c.live || breeder) return c.subs;
  return c.subs.filter((s) => !HERD_SPECIES.includes(s) && s !== 'Porcin' && s !== 'Autre');
}

export const UNITS = ['kg', 'tonne', 'sac', 'pièce', 'tête', 'litre', 'carton', 'lot'];
const UNIT_PRICE: Record<string, string> = { kg: 'le kg', tonne: 'la tonne', sac: 'le sac', pièce: 'la pièce', tête: 'la tête', litre: 'le litre', carton: 'le carton', lot: 'le lot' };
export const unitPrice = (u: string) => UNIT_PRICE[u] ?? `l’unité`;
export const unitQty = (n: number, u: string) => `${n} ${u === 'kg' || n < 2 ? u : `${u}s`}`;

export const HANDOVER = ['Livraison par un transporteur SAVAA', 'Retrait sur place', 'Livraison ou retrait'];
export const ACTORS = ['Producteur', 'Éleveur', 'Coopérative', 'Transformateur', 'Distributeur', 'Commerçant', 'Industriel'];

/** Code de traçabilité SAV-TRACE-<année>-XXXXXX, unique parmi les fiches existantes. */
export function newTraceCode(existing: Listing[]): string {
  const taken = new Set(existing.map((l) => l.sheet?.code).filter(Boolean));
  const year = new Date().getFullYear();
  for (;;) {
    const n = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
    const code = `SAV-TRACE-${year}-${n}`;
    if (!taken.has(code)) return code;
  }
}

/** Statut de la fiche selon l'annonce : la publication passe par la modération de l'équipe. */
export function sheetStatus(l: Listing): { label: string; tone: Tone } {
  switch (l.status) {
    case 'online': return { label: 'Publiée', tone: 'green' };
    case 'review': return { label: 'En modération', tone: 'amber' };
    case 'sold': return { label: 'Vendue', tone: 'grey' };
    default: return { label: 'Indisponible', tone: 'grey' };
  }
}

/** Date et heure courantes, ex. « 20/11/2026 14:05 ». */
export function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/*
  Fiches des annonces de démonstration. Elles reprennent uniquement ce que la maquette dit déjà de ces annonces
  (fiche animale de FK-0142, descriptions des lots) : rien n'est ajouté. Elles sont lues à part pour ne pas changer
  la forme des données gardées sur l'appareil.
*/
const DEMO_SHEETS: Record<string, TraceSheet> = {
  'FK-0142': {
    code: 'SAV-TRACE-2026-014217',
    category: 'vivant',
    sub: 'Bovin',
    brand: 'Zébu Goudali',
    extra: { 'Race ou croisement': 'Zébu Goudali', 'Âge ou âge estimé': '26 mois', 'Poids (kg)': '312' },
    origin: { country: 'Côte d’Ivoire', region: 'Savanes (Poro, Tchologo, Bagoué)', department: 'Sinématiali', town: 'Sinématiali', farm: 'Ferme Koné & Fils', producedOn: '12/09/2024' },
    sale: { unit: 'tête', minQty: 1, handover: 'Livraison ou retrait' },
    seller: { name: 'Ferme Koné & Fils', phone: '07 48 12 33 90', actor: 'Éleveur', attested: true },
    events: [
      { date: '12/09/2024', kind: 'Naissance sur l’exploitation', text: 'Né à la Ferme Koné & Fils.', by: 'Adama Koné', place: 'Sinématiali', proof: 'declared' },
      { date: '21/09/2026', kind: 'Mouvement', text: 'Retour de transhumance courte, parc de Kassoumbarga (juin à septembre 2026).', by: 'Adama Koné', place: 'Kassoumbarga', proof: 'declared' },
      { date: '04/11/2026', kind: 'Pesée', text: '312 kg.', by: 'Ferme Koné & Fils', place: 'Sinématiali', proof: 'documented', file: 'Photo de la pesée' },
      { date: '06/11/2026', kind: 'Mise en vente sur SAVAA', text: 'Annonce n° A-20931, relue par l’équipe SAVAA.', by: 'SAVAA', place: 'Sinématiali', proof: 'verified' },
    ],
  },
  IGNAME: {
    code: 'SAV-TRACE-2026-031105',
    category: 'frais',
    sub: 'Tubercules',
    brand: 'Kponan',
    extra: { Variété: 'Kponan' },
    origin: { country: 'Côte d’Ivoire', region: 'Savanes (Poro, Tchologo, Bagoué)', department: 'Dikodougou', town: 'Dikodougou', farm: 'Coopérative de Dikodougou' },
    sale: { unit: 'kg', minQty: 200, handover: 'Retrait sur place' },
    seller: { name: 'Coopérative de Dikodougou', phone: '', actor: 'Coopérative', attested: true },
    events: [
      { date: '13/11/2026', kind: 'Mise en vente sur SAVAA', text: 'Tubercules entiers, vente à partir de 200 kg.', by: 'Coopérative de Dikodougou', place: 'Dikodougou', proof: 'declared' },
    ],
  },
  'L-MAIS': {
    code: 'SAV-TRACE-2026-031206',
    category: 'cereales',
    sub: 'Maïs',
    extra: { Variété: 'Maïs jaune hybride', 'Campagne ou date de récolte': '2026', 'Humidité (%)': 'moins de 13', Conditionnement: 'Sacs de 100 kg' },
    origin: { country: 'Côte d’Ivoire', region: 'Savanes (Poro, Tchologo, Bagoué)', department: 'Dikodougou', town: 'Dikodougou', farm: 'Coopérative de Dikodougou' },
    sale: { unit: 'sac', minQty: 1, handover: 'Livraison ou retrait' },
    seller: { name: 'Coopérative de Dikodougou', phone: '', actor: 'Coopérative', attested: true },
    events: [
      { date: '16/11/2026', kind: 'Séchage et tri', text: 'Séché au soleil sur bâche, vanné mécaniquement, trié et ensaché.', by: 'Coopérative de Dikodougou', place: 'Dikodougou', proof: 'declared' },
      { date: '16/11/2026', kind: 'Mise en vente sur SAVAA', text: 'Lot contrôlé avant mise en ligne.', by: 'SAVAA', place: 'Dikodougou', proof: 'verified' },
    ],
  },
};

/** Fiche d'une annonce : celle saisie par le vendeur, ou celle des annonces de démonstration. */
export const sheetOf = (l: Listing): TraceSheet | undefined => l.sheet ?? DEMO_SHEETS[l.id];

/** Adresse de la fiche, encodée dans le QR code. */
export const ficheUrl = (code: string) => `${window.location.origin}${window.location.pathname}#/fiche/${code}`;

/* ------------------------------------------------------------------ */
/* Fiche animale (sections 2.1 et 2.2) */

export const animalUrl = (id: string) => `${window.location.origin}${window.location.pathname}#/animal/${id}`;

/** Ce que la maquette dit déjà de FK-0142 (pesée et origine), lu à part pour ne pas changer les données gardées sur l'appareil. */
const ANIMAL_DEMO: Record<string, Pick<Animal, 'measure' | 'origin'>> = {
  'FK-0142': {
    measure: { weight: 312, weighedOn: '04/11/2026' },
    origin: { country: 'Côte d’Ivoire', region: 'Savanes (Poro, Tchologo, Bagoué)', department: 'Sinématiali', town: 'Sinématiali' },
  },
};

export const animalMeasure = (a: Animal) => a.measure ?? ANIMAL_DEMO[a.id]?.measure;
export const animalOrigin = (a: Animal) => a.origin ?? ANIMAL_DEMO[a.id]?.origin;

/** Statut de l'animal (disponible, réservé, vendu, en élevage, indisponible) déduit de ses annonces et des commandes. */
export function animalStatus(a: Animal, listings: Listing[], orders: Order[]): { label: string; tone: Tone } {
  const linked = listings.filter((l) => l.animalIds?.includes(a.id));
  if (a.tone === 'red') return { label: 'Indisponible', tone: 'red' };
  if (linked.some((l) => l.status === 'sold')) return { label: 'Vendu', tone: 'grey' };
  if (orders.some((o) => o.lines.some((x) => linked.some((l) => l.id === x.listingId)))) return { label: 'Réservé', tone: 'amber' };
  if (linked.some((l) => l.status === 'online' || l.status === 'review')) return { label: 'Disponible', tone: 'green' };
  return { label: 'En élevage', tone: 'blue' };
}

/** Vocation : celle saisie à l'ajout, sinon la catégorie de l'annonce liée. */
export function animalPurpose(a: Animal, listings: Listing[]): string {
  const p = animalMeasure(a)?.purpose;
  if (p) return p === 'repro' ? 'Reproducteur' : 'Destiné à la viande';
  const sheet = listings.filter((l) => l.animalIds?.includes(a.id)).map(sheetOf).find(Boolean);
  if (sheet?.category === 'abattage') return 'Destiné à la viande';
  if (sheet?.category === 'vivant') return 'Animal vivant ou reproducteur';
  return '—';
}
