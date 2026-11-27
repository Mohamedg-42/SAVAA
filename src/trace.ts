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
    fields: [
      { label: 'Animal ou lot d’origine', placeholder: 'Ex. FK-0142 ou n° de lot' },
      { label: 'Date d’abattage', type: 'date' },
      { label: 'Abattoir', placeholder: 'Nom de l’abattoir ou de l’aire d’abattage' },
      { label: 'N° d’inspection vétérinaire', placeholder: 'Estampille ou certificat sanitaire' },
      { label: 'Découpe ou pièce', placeholder: 'Ex. carcasse, filet, gigot' },
      { label: 'Conservation', placeholder: 'Frais (0–4 °C), réfrigéré, congelé (-18 °C)' },
      { label: 'Conditionnement', placeholder: 'Ex. sous vide, caisse isotherme' },
      { label: 'Date limite de consommation', type: 'date' },
    ],
    legacy: () => 'Viandes',
  },
  {
    id: 'frais', label: 'Produits végétaux frais et maraîchers', subs: ['Légumes', 'Fruits', 'Tubercules', 'Banane plantain', 'Herbes et condiments'], unit: 'kg',
    fields: [
      { label: 'Variété', placeholder: 'Ex. igname Kponan, tomate Mongal' },
      { label: 'Mode de conduite', placeholder: 'Plein champ, irrigué, agroécologique' },
      { label: 'Date de récolte', type: 'date' },
      { label: 'Calibre ou catégorie', placeholder: 'Ex. extra, 1er choix, gros calibre' },
      { label: 'Traitements phytosanitaires', placeholder: 'Produit et date, ou « aucun »' },
      { label: 'Délai avant récolte respecté', placeholder: 'Oui / Non applicable' },
      { label: 'Conditionnement et conservation', placeholder: 'Ex. caisses aérées, chambre froide' },
    ],
    legacy: () => 'Récoltes',
  },
  {
    id: 'cereales', label: 'Céréales et produits agricoles bruts', subs: ['Maïs', 'Riz paddy', 'Riz blanchi', 'Mil et sorgho', 'Arachide', 'Soja', 'Noix de cajou', 'Autre'], unit: 'sac',
    fields: [
      { label: 'Variété', placeholder: 'Ex. maïs jaune hybride' },
      { label: 'Campagne ou date de récolte', placeholder: 'Ex. campagne 2026' },
      { label: 'Humidité (%)', type: 'number', placeholder: 'Ex. 12' },
      { label: 'Taux d’impuretés ou grade', placeholder: 'Ex. < 2 %, KOR 49' },
      { label: 'Mode de séchage et tri', placeholder: 'Ex. séché sur bâche, vanné et trié' },
      { label: 'Conditionnement', placeholder: 'Ex. sacs jute ou PP de 100 kg' },
      { label: 'Conditions de stockage', placeholder: 'Ex. magasin ventilé sur palettes' },
    ],
    legacy: () => 'Récoltes',
  },
  {
    id: 'semences', label: 'Semences et plants', subs: ['Semences de céréales', 'Semences maraîchères', 'Plants', 'Boutures', 'Autre'], unit: 'kg',
    fields: [
      { label: 'Espèce et variété', placeholder: 'Ex. maïs composite, boutures manioc' },
      { label: 'Catégorie ou génération', placeholder: 'Ex. R1, R2, semence certifiée' },
      { label: 'Numéro de lot' },
      { label: 'Numéro de certificat', placeholder: 'Certificat officiel ou ANADER / CNRA' },
      { label: 'Taux de germination (%)', type: 'number', placeholder: 'Ex. 92' },
      { label: 'Pureté spécifique (%)', type: 'number', placeholder: 'Ex. 98' },
      { label: 'Traitement de semence', placeholder: 'Fongicide/insecticide appliqué ou non traitée' },
      { label: 'Date d’analyse ou de validité', type: 'date' },
    ],
    legacy: () => 'Aliments et intrants',
  },
  {
    id: 'transforme', label: 'Produits agroalimentaires transformés', subs: ['Aliment pour bétail et volaille', 'Farines', 'Huiles', 'Dérivés du manioc', 'Produits laitiers', 'Autre'], unit: 'sac',
    fields: [
      { label: 'Unité ou atelier de transformation', placeholder: 'Nom de la provenderie ou de l’atelier' },
      { label: 'Numéro de lot' },
      { label: 'Ingrédients principaux', placeholder: 'Ex. maïs, tourteau de coton, son de blé, minéraux' },
      { label: 'Teneur analytique / nutritionnelle', placeholder: 'Ex. 16 % protéines brutes' },
      { label: 'Poids ou volume net', placeholder: 'Ex. sac de 50 kg, bidon de 20 L' },
      { label: 'Date de fabrication', type: 'date' },
      { label: 'Date de péremption', type: 'date' },
      { label: 'Conditions de conservation', placeholder: 'Ex. au sec, à l’abri de la chaleur' },
    ],
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
      { label: 'Dose et culture recommandées', placeholder: 'Ex. 200 kg/ha sur maïs ou coton' },
      { label: 'Délai avant récolte (DAR)', placeholder: 'Ex. 21 jours' },
      { label: 'Numéro de lot' },
      { label: 'Date de péremption', type: 'date' },
    ],
    legacy: () => 'Aliments et intrants',
  },
  {
    id: 'equipement', label: 'Équipements, matériels et machines', subs: ['Matériel d’élevage', 'Matériel agricole', 'Irrigation', 'Transformation', 'Pièces détachées', 'Autre'], unit: 'pièce',
    fields: [
      { label: 'Marque' },
      { label: 'Modèle' },
      { label: 'Numéro de série', placeholder: 'Si applicable' },
      { label: 'État', placeholder: 'Neuf, reconditionné ou occasion' },
      { label: 'Année', type: 'number' },
      { label: 'Capacité ou puissance', placeholder: 'Ex. 528 œufs, 1 500 kg, 220 V / 12 V' },
      { label: 'Garantie et service après-vente', placeholder: 'Ex. garantie 12 mois, pièces disponibles' },
    ],
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
  'L-METIS': {
    code: 'SAV-TRACE-2026-009101',
    category: 'vivant',
    sub: 'Bovin',
    brand: 'Métisse Goudali × N’Dama',
    extra: { 'Race ou croisement': 'Métisse Goudali × N’Dama', 'Âge ou âge estimé': '19 mois', 'Poids (kg)': '241' },
    origin: { country: 'Côte d’Ivoire', region: 'Savanes (Poro, Tchologo, Bagoué)', department: 'Sinématiali', town: 'Sinématiali', farm: 'Ferme Koné & Fils', producedOn: '10/04/2025' },
    sale: { unit: 'tête', minQty: 1, handover: 'Livraison ou retrait' },
    seller: { name: 'Ferme Koné & Fils', phone: '07 48 12 33 90', actor: 'Éleveur', attested: true },
    events: [
      { date: '10/04/2025', kind: 'Naissance sur l’exploitation', text: 'Née sur place, mère FK-0087.', by: 'Ferme Koné & Fils', place: 'Sinématiali', proof: 'declared' },
      { date: '15/11/2026', kind: 'Mise en vente sur SAVAA', text: 'Fiche vérifiée avant publication.', by: 'SAVAA', place: 'Sinématiali', proof: 'verified' },
    ],
  },
  'L-REPRO-GOUD': {
    code: 'SAV-TRACE-2026-010502',
    category: 'vivant',
    sub: 'Bovin',
    brand: 'Zébu Goudali',
    extra: { 'Race ou croisement': 'Zébu Goudali', 'Âge ou âge estimé': '4 ans', 'Poids (kg)': '520' },
    origin: { country: 'Côte d’Ivoire', region: 'Savanes (Poro, Tchologo, Bagoué)', department: 'Korhogo', town: 'Korhogo', farm: 'Ferme Koné & Fils' },
    sale: { unit: 'tête', minQty: 1, handover: 'Livraison ou retrait' },
    seller: { name: 'Ferme Koné & Fils', phone: '07 48 12 33 90', actor: 'Éleveur', attested: true },
    events: [
      { date: '12/11/2026', kind: 'Contrôle sanitaire', text: 'Certificat sanitaire, vacciné PPCB et fièvre aphteuse.', by: 'Cabinet Vétérinaire des Savanes', place: 'Korhogo', proof: 'certified' },
    ],
  },
  'L-BELIERS': {
    code: 'SAV-TRACE-2026-012406',
    category: 'vivant',
    sub: 'Ovin',
    brand: 'Sahélien',
    extra: { 'Race ou croisement': 'Sahélien', 'Poids (kg)': '55 à 65' },
    origin: { country: 'Côte d’Ivoire', region: 'Savanes (Poro, Tchologo, Bagoué)', department: 'Ferkessédougou', town: 'Ferkessédougou', farm: 'Bergerie Soro' },
    sale: { unit: 'tête', minQty: 1, handover: 'Livraison ou retrait' },
    seller: { name: 'Bergerie Soro', phone: '', actor: 'Éleveur', attested: true },
    events: [
      { date: '14/11/2026', kind: 'Mise en vente sur SAVAA', text: 'Lot de 6 béliers Sahéliens vaccinés PPR.', by: 'Bergerie Soro', place: 'Ferkessédougou', proof: 'documented' },
    ],
  },
  'L-OEUFS': {
    code: 'SAV-TRACE-2026-021830',
    category: 'vivant',
    sub: 'Volaille',
    extra: { Conditionnement: 'Plateau de 30 œufs' },
    origin: { country: 'Côte d’Ivoire', region: 'Savanes (Poro, Tchologo, Bagoué)', department: 'Korhogo', town: 'Korhogo', locality: 'Quartier Soba', farm: 'Ferme Avicole Soba' },
    sale: { unit: 'lot', minQty: 10, handover: 'Livraison ou retrait' },
    seller: { name: 'Ferme Avicole Soba', phone: '', actor: 'Éleveur', attested: true },
    events: [
      { date: '18/11/2026', kind: 'Collecte et calibrage', text: 'Gros calibre, ponte du jour.', by: 'Ferme Avicole Soba', place: 'Korhogo', proof: 'verified' },
    ],
  },
  'L-CAJOU': {
    code: 'SAV-TRACE-2026-031449',
    category: 'cereales',
    sub: 'Noix de cajou',
    extra: { 'Humidité (%)': '9', 'Taux d’impuretés ou grade': 'KOR 49', Conditionnement: 'Sacs jute de 80 kg' },
    origin: { country: 'Côte d’Ivoire', region: 'Savanes (Poro, Tchologo, Bagoué)', department: 'Sinématiali', town: 'Sinématiali', farm: 'Union des Producteurs du Poro' },
    sale: { unit: 'kg', minQty: 80, handover: 'Livraison ou retrait' },
    seller: { name: 'Union des Producteurs du Poro', phone: '', actor: 'Coopérative', attested: true },
    events: [
      { date: '14/11/2026', kind: 'Sondage KOR', text: 'Taux de rendement grain (KOR) mesuré à 49 lbs par sondeur agréé.', by: 'Union des Producteurs du Poro', place: 'Sinématiali', proof: 'documented' },
    ],
  },
  'ALIM-50': {
    code: 'SAV-TRACE-2026-040150',
    category: 'transforme',
    sub: 'Aliment pour bétail et volaille',
    extra: { 'Unité ou atelier de transformation': 'Provenderie du Nord', 'Ingrédients principaux': 'Maïs, son de blé, tourteau de coton, minéraux et vitamines', 'Teneur analytique / nutritionnelle': '16 % de protéines brutes', 'Poids ou volume net': 'Sac de 50 kg' },
    origin: { country: 'Côte d’Ivoire', region: 'Savanes (Poro, Tchologo, Bagoué)', department: 'Korhogo', town: 'Korhogo', locality: 'Zone industrielle', farm: 'Provenderie du Nord' },
    sale: { unit: 'sac', minQty: 1, handover: 'Livraison ou retrait' },
    seller: { name: 'Provenderie du Nord', phone: '', actor: 'Transformateur', attested: true },
    events: [
      { date: '01/11/2026', kind: 'Fabrication et ensachage', text: 'Aliment complet granulé en sacs de 50 kg.', by: 'Provenderie du Nord', place: 'Korhogo', proof: 'declared' },
    ],
  },
  'L-COUVEUSE': {
    code: 'SAV-TRACE-2026-051228',
    category: 'equipement',
    sub: 'Matériel d’élevage',
    extra: { État: 'Neuf', 'Capacité ou puissance': '528 œufs, double alimentation 220 V et 12 V', 'Garantie et service après-vente': 'Garantie 1 an, livré avec paniers d’éclosion et formation' },
    origin: { country: 'Côte d’Ivoire', region: 'Savanes (Poro, Tchologo, Bagoué)', department: 'Korhogo', town: 'Korhogo', farm: 'Équip’Agri CI' },
    sale: { unit: 'pièce', minQty: 1, handover: 'Livraison ou retrait' },
    seller: { name: 'Équip’Agri CI', phone: '', actor: 'Distributeur', attested: true },
    events: [
      { date: '12/11/2026', kind: 'Contrôle en atelier', text: 'Basculement automatique, hygrométrie et température régulées vérifiés.', by: 'Équip’Agri CI', place: 'Korhogo', proof: 'verified' },
    ],
  },
  'L-BOEUFS-TRAIT': {
    code: 'SAV-TRACE-2026-011203',
    category: 'vivant',
    sub: 'Bovin',
    brand: 'N’Dama',
    extra: { 'Race ou croisement': 'N’Dama', 'Âge ou âge estimé': '3 et 4 ans' },
    origin: { country: 'Côte d’Ivoire', region: 'Savanes (Poro, Tchologo, Bagoué)', department: 'Sinématiali', town: 'Sinématiali', farm: 'Ferme Koné & Fils' },
    sale: { unit: 'lot', minQty: 1, handover: 'Livraison ou retrait' },
    seller: { name: 'Ferme Koné & Fils', phone: '07 48 12 33 90', actor: 'Éleveur', attested: true },
    events: [
      { date: '11/11/2026', kind: 'Dressage et vaccination', text: 'Paire de bœufs de culture attelée vaccinés PPCB.', by: 'Ferme Koné & Fils', place: 'Sinématiali', proof: 'documented' },
    ],
  },
  'L-BREBIS-LOT': {
    code: 'SAV-TRACE-2026-012805',
    category: 'vivant',
    sub: 'Ovin',
    brand: 'Djallonké',
    extra: { 'Race ou croisement': 'Djallonké', 'Âge ou âge estimé': '18 à 24 mois' },
    origin: { country: 'Côte d’Ivoire', region: 'Savanes (Poro, Tchologo, Bagoué)', department: 'Ferkessédougou', town: 'Ferkessédougou', farm: 'Bergerie Soro' },
    sale: { unit: 'lot', minQty: 1, handover: 'Livraison ou retrait' },
    seller: { name: 'Bergerie Soro', phone: '', actor: 'Éleveur', attested: true },
    events: [
      { date: '16/11/2026', kind: 'Vaccination PPR', text: 'Lot de 5 brebis reproductrices vaccinées contre la peste des petits ruminants (PPR) et déparasitées.', by: 'Bergerie Soro', place: 'Ferkessédougou', proof: 'verified' },
    ],
  },
  'L-BOUC-REPRO': {
    code: 'SAV-TRACE-2026-013601',
    category: 'vivant',
    sub: 'Caprin',
    brand: 'Djallonké',
    extra: { 'Race ou croisement': 'Djallonké', 'Âge ou âge estimé': '3 ans', 'Poids (kg)': '34' },
    origin: { country: 'Côte d’Ivoire', region: 'Savanes (Poro, Tchologo, Bagoué)', department: 'Boundiali', town: 'Boundiali', farm: 'Élevage Ouattara' },
    sale: { unit: 'tête', minQty: 1, handover: 'Livraison ou retrait' },
    seller: { name: 'Élevage Ouattara', phone: '', actor: 'Éleveur', attested: true },
    events: [
      { date: '13/11/2026', kind: 'Bilan sanitaire', text: 'Bouc reproducteur indemne de pathologies respiratoires, vacciné PPR.', by: 'Élevage Ouattara', place: 'Boundiali', proof: 'verified' },
    ],
  },
  'L-CHEVRES-SAH': {
    code: 'SAV-TRACE-2026-014004',
    category: 'vivant',
    sub: 'Caprin',
    brand: 'Sahélienne',
    extra: { 'Race ou croisement': 'Sahélienne', 'Poids (kg)': '35 à 42' },
    origin: { country: 'Côte d’Ivoire', region: 'Savanes (Poro, Tchologo, Bagoué)', department: 'Ouangolodougou', town: 'Ouangolodougou', farm: 'Bergerie du Nord' },
    sale: { unit: 'tête', minQty: 1, handover: 'Livraison ou retrait' },
    seller: { name: 'Bergerie du Nord', phone: '', actor: 'Éleveur', attested: true },
    events: [
      { date: '17/11/2026', kind: 'Suivi vétérinaire', text: 'Lot de 4 femelles adultes suivies régulièrement.', by: 'Bergerie du Nord', place: 'Ouangolodougou', proof: 'documented' },
    ],
  },
  'L-TOURTEAU': {
    code: 'SAV-TRACE-2026-041550',
    category: 'transforme',
    sub: 'Aliment pour bétail et volaille',
    extra: { 'Unité ou atelier de transformation': 'Agro-Nord Intrants', 'Poids ou volume net': 'Sac de 50 kg + bloc minéral 5 kg' },
    origin: { country: 'Côte d’Ivoire', region: 'Savanes (Poro, Tchologo, Bagoué)', department: 'Korhogo', town: 'Korhogo', farm: 'Agro-Nord Intrants' },
    sale: { unit: 'lot', minQty: 1, handover: 'Livraison ou retrait' },
    seller: { name: 'Agro-Nord Intrants', phone: '', actor: 'Distributeur', attested: true },
    events: [
      { date: '15/11/2026', kind: 'Conditionnement', text: 'Tourteau de coton issu des huileries cotonnières du Poro avec pierre à lécher minérale.', by: 'Agro-Nord Intrants', place: 'Korhogo', proof: 'verified' },
    ],
  },
  'L-FUMIER': {
    code: 'SAV-TRACE-2026-040940',
    category: 'intrants',
    sub: 'Engrais organiques et compost',
    extra: { 'Composition ou matière active': 'Compost de fumier de parc bovin mûr et tamisé (4 mois)' },
    origin: { country: 'Côte d’Ivoire', region: 'Savanes (Poro, Tchologo, Bagoué)', department: 'Sinématiali', town: 'Sinématiali', farm: 'Ferme Koné & Fils' },
    sale: { unit: 'sac', minQty: 1, handover: 'Livraison ou retrait' },
    seller: { name: 'Ferme Koné & Fils', phone: '07 48 12 33 90', actor: 'Éleveur', attested: true },
    events: [
      { date: '09/11/2026', kind: 'Compostage et tamisage', text: 'Amendement organique décomposé pendant 4 mois, ensaché en sacs de 40 kg.', by: 'Ferme Koné & Fils', place: 'Sinématiali', proof: 'verified' },
    ],
  },
  POUSSINS: {
    code: 'SAV-TRACE-2026-021501',
    category: 'vivant',
    sub: 'Volaille',
    brand: 'Cobb 500',
    extra: { 'Race ou croisement': 'Souche Cobb 500', 'Âge ou âge estimé': 'J1 (1 jour)' },
    origin: { country: 'Côte d’Ivoire', region: 'Savanes (Poro, Tchologo, Bagoué)', department: 'Korhogo', town: 'Korhogo', farm: 'Couvoir du Nord' },
    sale: { unit: 'tête', minQty: 100, handover: 'Retrait sur place' },
    seller: { name: 'Couvoir du Nord', phone: '', actor: 'Éleveur', attested: true },
    events: [
      { date: '15/11/2026', kind: 'Éclosion et vaccination au couvoir', text: 'Poussins vaccinés Marek et Gumboro au couvoir.', by: 'Couvoir du Nord', place: 'Korhogo', proof: 'declared' },
    ],
  },
  'L-BASCULE': {
    code: 'SAV-TRACE-2026-050715',
    category: 'equipement',
    sub: 'Matériel d’élevage',
    extra: { État: 'Neuf', 'Capacité ou puissance': '1 500 kg, acier galvanisé, afficheur numérique rechargeable' },
    origin: { country: 'Côte d’Ivoire', region: 'Savanes (Poro, Tchologo, Bagoué)', department: 'Korhogo', town: 'Korhogo', locality: 'Zone industrielle', farm: 'Équip’Agri CI' },
    sale: { unit: 'pièce', minQty: 1, handover: 'Livraison ou retrait' },
    seller: { name: 'Équip’Agri CI', phone: '', actor: 'Distributeur', attested: true },
    events: [
      { date: '07/11/2026', kind: 'Étalonnage en atelier', text: 'Barres de pesée étanches contrôlées jusqu’à 1 500 kg.', by: 'Équip’Agri CI', place: 'Korhogo', proof: 'documented' },
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
