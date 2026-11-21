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
  /** Galerie de photos d'identification (profil, face, boucle, pesée, troupeau). */
  photos?: string[];
  /** Animal du cheptel de l'utilisateur connecté (les autres sont des fiches publiques liées aux annonces). */
  mine?: boolean;
  /** Documents joints à la fiche (noms de fichiers). */
  docs?: string[];
  /** Détails saisis à l'identification (écran 09b). */
  info?: { breed: string; coat: string; marks: string; entry: string; mother: string; father: string };
  /** Pesée, mensurations, état et vocation (fiche d'identité, section 2.1). */
  measure?: { weight?: number; weighedOn?: string; size?: string; condition?: string; purpose?: 'repro' | 'viande' };
  /** Origine détaillée (section 2.2). */
  origin?: { country: string; region: string; department?: string; town: string; locality?: string };
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
  /** Photos jointes depuis l'appareil ou la démo. */
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
  /** Prix professionnel, réservé aux restaurants et hôtels vérifiés (RCCM renseigné). Toujours inférieur au prix normal. */
  proPrice?: number;
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
  /** Galerie photos de l'annonce (URLs ou data URL réduites). */
  photos?: string[];
  /** Légendes associées aux photos de la galerie. */
  photoLabels?: string[];
  /** Quantité disponible ; absent = 1 (un animal, un lot). */
  stock?: number;
  status: ListingStatus;
  /** Publiée depuis cet appareil (onglet Vendre). */
  mine?: boolean;
  date: string;
  description?: string;
  /** Fiche d'identité et de traçabilité (annonces créées depuis l'onglet Vendre). Les catégories et champs sont définis dans trace.ts. */
  sheet?: TraceSheet;
};

/** Événement de l'historique de traçabilité d'une fiche (partie E du cahier des charges). */
export type TraceEvent = {
  /** Date et heure, ex. « 20/11/2026 14:05 ». */
  date: string;
  /** Nature de l'événement, ex. « Création de la fiche ». */
  kind: string;
  text: string;
  /** Personne ou structure responsable. */
  by: string;
  place?: string;
  proof: Proof;
  file?: string;
};

/** Fiche produit (parties A à E). Le vendeur ne fait que déclarer : Vérifié et Certifié sont attribués par l'équipe, un vétérinaire ou un organisme. */
export type TraceSheet = {
  /** Code SAV-TRACE-2026-XXXXXX. */
  code: string;
  /** Identifiant de catégorie (voir TRACE_CATEGORIES). */
  category: string;
  sub: string;
  brand?: string;
  /** Champs propres à la catégorie (libellé → valeur). */
  extra: Record<string, string>;
  origin: { country: string; region: string; department: string; town: string; locality?: string; farm: string; producedOn?: string };
  sale: { unit: string; minQty: number; available?: string; handover: string };
  seller: { name: string; phone: string; actor: string; attested: boolean };
  events: TraceEvent[];
};

export type CartItem = { listingId: string; qty: number };
export type Cart = { items: CartItem[]; delivery: boolean; method: string; /** Adresse de livraison saisie au panier. */ address?: string };

export type OrderLine = { listingId: string; title: string; seller: string; qty: number; price: number };
export type Order = {
  ref: string;
  tx: string;
  date: string;
  time: string;
  lines: OrderLine[];
  method: string;
  delivery: boolean;
  address?: string;
  shipping: number;
  total: number;
  /** Code de remise à donner au livreur. */
  code: string;
  /** Commande de la maquette, avec son suivi déjà avancé. */
  demo?: boolean;
};

/* ------------------------------------------------------------------ */

const forAnimal = (animalId: string, list: Omit<HealthEvent, 'animalId'>[]): HealthEvent[] => list.map((e) => ({ animalId, ...e }));

/** Villes et communes principales de toute la Côte d'Ivoire, classées par district. */
export const CI_REGIONS: { region: string; towns: string[] }[] = [
  { region: 'District d’Abidjan', towns: ['Abobo', 'Adjamé', 'Anyama', 'Attécoubé', 'Bingerville', 'Cocody', 'Koumassi', 'Marcory', 'Plateau', 'Port-Bouët', 'Songon', 'Treichville', 'Yopougon'] },
  { region: 'District de Yamoussoukro', towns: ['Yamoussoukro', 'Attiégouakro'] },
  { region: 'Savanes (Poro, Tchologo, Bagoué)', towns: ['Korhogo', 'Sinématiali', 'Ferkessédougou', 'Ouangolodougou', 'Kong', 'Boundiali', 'Tengrela', 'Kouto', 'Dikodougou', 'M’Bengué', 'Napiéolédougou'] },
  { region: 'Vallée du Bandama (Gbêkê, Hambol)', towns: ['Bouaké', 'Katiola', 'Dabakala', 'Niakaramadougou', 'Sakassou', 'Béoumi', 'Botro'] },
  { region: 'Bas-Sassandra', towns: ['San-Pédro', 'Soubré', 'Sassandra', 'Tabou', 'Méagui', 'Guéyo'] },
  { region: 'Sassandra-Marahoué', towns: ['Daloa', 'Bouaflé', 'Issia', 'Vavoua', 'Zuénoula', 'Sinfra', 'Zoukougbeu'] },
  { region: 'Gôh-Djiboua', towns: ['Gagnoa', 'Divo', 'Oumé', 'Lakota', 'Guitry'] },
  { region: 'Montagnes', towns: ['Man', 'Danané', 'Duékoué', 'Guiglo', 'Bangolo', 'Biankouma', 'Toulepleu', 'Bloléquin'] },
  { region: 'Lagunes', towns: ['Dabou', 'Agboville', 'Adzopé', 'Azaguié', 'Tiassalé', 'Grand-Lahou', 'Jacqueville', 'Sikensi', 'Akoupé'] },
  { region: 'Comoé', towns: ['Abengourou', 'Aboisso', 'Grand-Bassam', 'Bonoua', 'Adiaké', 'Agnibilékrou', 'Bettié'] },
  { region: 'Lacs', towns: ['Dimbokro', 'Toumodi', 'Bongouanou', 'Daoukro', 'Bocanda', 'M’Bahiakro', 'Arrah', 'Prikro'] },
  { region: 'Zanzan', towns: ['Bondoukou', 'Bouna', 'Tanda', 'Koun-Fao', 'Nassian', 'Sandégué', 'Transua'] },
  { region: 'Woroba', towns: ['Séguéla', 'Mankono', 'Touba', 'Kani', 'Koro', 'Ouaninou'] },
  { region: 'Denguélé', towns: ['Odienné', 'Minignan', 'Madinani', 'Kaniasso', 'Samatiguila'] },
];

/** Frais de livraison forfaitaires de la maquette (bétaillère). */
export const SHIPPING = 25000;

function initial() {
  const animals: Animal[] = [
    {
      id: 'FK-0142',
      species: 'bovin',
      name: 'Taurillon Zébu Goudali',
      details: 'Mâle, 26 mois, 312 kg',
      status: 'En vente',
      tone: 'sp',
      officialId: 'CI-BOV-2024-•••4817',
      photo: 'images/taurillon-goudali.jpg',
      photos: [
        'images/taurillon-goudali.jpg',
        'images/taurillon-goudali-face.jpg',
        'images/taurillon-goudali-troupeau.jpg',
        'images/boucle-oreille.jpg',
        'images/pesee-bovin.jpg',
        'images/visite-veterinaire.jpg',
      ],
    },
    {
      id: 'FK-0087',
      species: 'bovin',
      name: 'Vache N’Dama',
      details: 'Femelle, 5 ans, gestante',
      status: 'À jour',
      tone: 'green',
      officialId: 'CI-BOV-2021-•••1904',
      photo: 'images/vache-ndama.jpg',
      photos: [
        'images/vache-ndama.jpg',
        'images/veau-ndama.jpg',
        'images/boucle-oreille.jpg',
        'images/visite-veterinaire.jpg',
      ],
      info: { breed: 'N’Dama', coat: 'Fauve uniforme', marks: 'Encoche oreille droite', entry: '14/04/2021, née sur place', mother: 'FK-0018', father: 'Taureau N’Dama CI-BOV-2018-0112' },
    },
    {
      id: 'FK-0091',
      species: 'bovin',
      name: 'Génisse métisse',
      details: 'Femelle, 19 mois, 241 kg',
      status: 'À jour',
      tone: 'green',
      officialId: 'CI-BOV-2025-•••3310',
      photo: 'images/genisse-metisse.jpg',
      photos: [
        'images/genisse-metisse.jpg',
        'images/taurillon-goudali-troupeau.jpg',
        'images/boucle-oreille.jpg',
        'images/pesee-bovin.jpg',
      ],
      info: { breed: 'Métisse Goudali × N’Dama', coat: 'Pie rouge et blanc', marks: 'Liste blanche frontale', entry: '10/04/2025, née sur place', mother: 'FK-0087', father: 'Taureau Goudali CI-BOV-2019-0233' },
    },
    {
      id: 'FK-0105',
      species: 'bovin',
      name: 'Taureau reproducteur Goudali',
      details: 'Mâle, 4 ans, 510 kg',
      status: 'À jour',
      tone: 'green',
      officialId: 'CI-BOV-2022-•••0841',
      photo: 'images/taureau-reproducteur.jpg',
      photos: [
        'images/taureau-reproducteur.jpg',
        'images/taurillon-goudali-face.jpg',
        'images/pesee-bovin.jpg',
        'images/boucle-oreille.jpg',
      ],
      info: { breed: 'Zébu Goudali', coat: 'Blanc moucheté noir', marks: 'Bosse développée, cornes en lyre', entry: '18/01/2024, achat Ferme Silué', mother: 'Inconnue', father: 'Géniteur Silué GS-09' },
    },
    {
      id: 'FK-0112',
      species: 'bovin',
      name: 'Bœuf de trait N’Dama',
      details: 'Mâle, 4 ans, 375 kg',
      status: 'À jour',
      tone: 'green',
      officialId: 'CI-BOV-2022-•••2190',
      photo: 'images/boeuf-attelage.jpg',
      photos: [
        'images/boeuf-attelage.jpg',
        'images/lot-taurillons.jpg',
        'images/pesee-bovin.jpg',
      ],
      info: { breed: 'N’Dama', coat: 'Brun foncé', marks: 'Marque au fer flanc gauche', entry: '05/06/2023, achat Ferkessédougou', mother: 'Inconnue', father: 'Inconnu' },
    },
    {
      id: 'FK-0119',
      species: 'ovin',
      name: 'Brebis Djallonké',
      details: 'Femelle, 3 ans, alerte ouverte',
      status: 'Alerte',
      tone: 'red',
      officialId: 'CI-OVI-2023-•••7712',
      photo: 'images/brebis-djallonke.jpg',
      photos: [
        'images/brebis-djallonke.jpg',
        'images/troupeau-ovins.jpg',
        'images/visite-veterinaire.jpg',
      ],
      info: { breed: 'Djallonké', coat: 'Pie noir et blanc', marks: 'Petite tache noire sur le chanfrein', entry: '22/08/2023, née sur place', mother: 'FK-0052', father: 'FK-0060' },
    },
    {
      id: 'FK-0124',
      species: 'ovin',
      name: 'Bélier Sahélien',
      details: 'Mâle, 2 ans, 58 kg',
      status: 'Rappel dû',
      tone: 'amber',
      officialId: 'CI-OVI-2024-•••5501',
      photo: 'images/belier-sahelien-profil.jpg',
      photos: [
        'images/belier-sahelien-profil.jpg',
        'images/beliers-saheliens.jpg',
        'images/troupeau-ovins.jpg',
      ],
      info: { breed: 'Sahélien', coat: 'Blanc intégral', marks: 'Cornes spiralées larges', entry: '12/11/2024, né sur place', mother: 'FK-0071', father: 'Bélier Soro BS-14' },
    },
    {
      id: 'FK-0125',
      species: 'ovin',
      name: 'Bélier Sahélien',
      details: 'Mâle, 2 ans, 61 kg',
      status: 'Sous traitement',
      tone: 'blue',
      officialId: 'CI-OVI-2024-•••5502',
      photo: 'images/beliers-saheliens.jpg',
      photos: [
        'images/beliers-saheliens.jpg',
        'images/belier-sahelien-profil.jpg',
        'images/troupeau-ovins.jpg',
      ],
      info: { breed: 'Sahélien', coat: 'Blanc et tête rousse', marks: 'Boucle jaune oreille gauche', entry: '14/11/2024, né sur place', mother: 'FK-0074', father: 'Bélier Soro BS-14' },
    },
    {
      id: 'FK-0128',
      species: 'ovin',
      name: 'Brebis Djallonké',
      details: 'Femelle, 2 ans, suitée (2 agneaux)',
      status: 'À jour',
      tone: 'green',
      officialId: 'CI-OVI-2024-•••6120',
      photo: 'images/troupeau-ovins.jpg',
      photos: [
        'images/troupeau-ovins.jpg',
        'images/brebis-djallonke.jpg',
      ],
      info: { breed: 'Djallonké', coat: 'Blanche et noire', marks: 'Collier noir', entry: '03/09/2024, née sur place', mother: 'FK-0119', father: 'FK-0124' },
    },
    {
      id: 'FK-0131',
      species: 'ovin',
      name: 'Agneau Sahélien × Djallonké',
      details: 'Mâle, 8 mois, 31 kg',
      status: 'À jour',
      tone: 'green',
      officialId: 'CI-OVI-2026-•••8014',
      photo: 'images/belier-sahelien-profil.jpg',
      photos: [
        'images/belier-sahelien-profil.jpg',
        'images/troupeau-ovins.jpg',
        'images/beliers-saheliens.jpg',
      ],
      info: { breed: 'Croisé Sahélien × Djallonké', coat: 'Blanc tacheté', marks: 'Aucune', entry: '15/03/2026, né sur place', mother: 'FK-0119', father: 'FK-0124' },
    },
    {
      id: 'FK-0133',
      species: 'caprin',
      name: 'Chèvre Djallonké',
      details: 'Femelle, 2 ans, 26 kg',
      status: 'À jour',
      tone: 'green',
      officialId: 'CI-CAP-2024-•••3091',
      photo: 'images/chevre-djallonke.jpg',
      photos: [
        'images/chevre-djallonke.jpg',
        'images/bouc-djallonke.jpg',
        'images/chevres-saheliennes.jpg',
      ],
      info: { breed: 'Naine Djallonké', coat: 'Fauve à raie dorsale noire', marks: 'Bottes noires', entry: '19/07/2024, née sur place', mother: 'FK-0098', father: 'FK-0136' },
    },
    {
      id: 'FK-0136',
      species: 'caprin',
      name: 'Bouc reproducteur Djallonké',
      details: 'Mâle, 3 ans, 34 kg',
      status: 'À jour',
      tone: 'green',
      officialId: 'CI-CAP-2023-•••1145',
      photo: 'images/bouc-djallonke.jpg',
      photos: [
        'images/bouc-djallonke.jpg',
        'images/chevre-djallonke.jpg',
        'images/chevres-saheliennes.jpg',
      ],
      info: { breed: 'Djallonké', coat: 'Brun et noir charbonné', marks: 'Barbiche longue, cornes arquées', entry: '11/02/2024, achat Boundiali', mother: 'Inconnue', father: 'Inconnu' },
    },
    {
      id: 'FK-0140',
      species: 'caprin',
      name: 'Chèvre Sahélienne',
      details: 'Femelle, 2 ans, 39 kg, lactante',
      status: 'À jour',
      tone: 'green',
      officialId: 'CI-CAP-2024-•••4418',
      photo: 'images/chevres-saheliennes.jpg',
      photos: [
        'images/chevres-saheliennes.jpg',
        'images/chevre-djallonke.jpg',
      ],
      info: { breed: 'Sahélienne', coat: 'Blanche mouchetée', marks: 'Oreilles tombantes', entry: '28/10/2024, achat Ferkessédougou', mother: 'Inconnue', father: 'Inconnu' },
    },
    {
      id: 'FK-0150',
      species: 'bovin',
      name: 'Veau N’Dama',
      details: 'Mâle, 3 mois, ID à renseigner',
      status: 'ID manquant',
      tone: 'grey',
      photo: 'images/veau-ndama.jpg',
      photos: [
        'images/veau-ndama.jpg',
        'images/vache-ndama.jpg',
        'images/boucle-oreille.jpg',
      ],
      info: { breed: 'N’Dama', coat: 'Fauve clair', marks: 'Né sur l’exploitation', entry: '18/08/2026, né sur place', mother: 'FK-0087', father: 'FK-0105' },
    },
  ];

  /* Dossiers sanitaires illustrés avec preuves et photos terrain. */
  const events: HealthEvent[] = [
    ...forAnimal('FK-0119', [
      {
        kind: 'obs',
        date: '18/11/2026',
        title: 'Observation : boiterie',
        text: 'Boiterie antérieure gauche, signalée ce matin par A. Koné. Urgence moyenne.',
        proof: 'declared',
        photos: ['images/brebis-djallonke.jpg', 'images/troupeau-ovins.jpg'],
      },
      {
        kind: 'vac',
        date: '14/05/2026',
        title: 'Vaccination peste des petits ruminants (PPR)',
        text: 'Campagne départementale, Dr Y. Coulibaly.',
        proof: 'verified',
        photos: ['images/visite-veterinaire.jpg'],
      },
    ]),
    ...forAnimal('FK-0142', [
      {
        kind: 'vac',
        date: '02/10/2026',
        title: 'Vaccination péripneumonie (PPCB)',
        text: 'Dr Y. Coulibaly, vétérinaire mandaté. Voie sous-cutanée. Lot PB-2291.',
        proof: 'verified',
        file: 'Attestation_PPCB.pdf',
        photos: ['images/visite-veterinaire.jpg', 'images/boucle-oreille.jpg'],
        summary: { title: 'Vaccin péripneumonie (PPCB)', sub: '02/10/2026, Dr Y. Coulibaly, lot n° PB-2291' },
      },
      {
        kind: 'trt',
        date: '15/08/2026',
        title: 'Déparasitage interne',
        text: 'Ivermectine 1 %, 1 ml / 50 kg. Administré par A. Koné.',
        proof: 'documented',
        file: 'Facture_pharmacie_vet.jpg',
        photos: ['images/taurillon-goudali-troupeau.jpg'],
        summary: { sub: '15/08/2026, ivermectine, facture jointe' },
      },
      {
        kind: 'obs',
        date: '03/08/2026',
        title: 'Observation clôturée',
        text: 'Toux disparue après 6 jours. Appétit normal.',
        proof: 'declared',
        photos: ['images/taurillon-goudali.jpg'],
        summary: false,
      },
      {
        kind: 'trt',
        date: '29/07/2026',
        title: 'Traitement prescrit',
        text: 'Oxytétracycline LA, 1 injection. Prescription du Dr Coulibaly après examen.',
        proof: 'verified',
        file: 'Ordonnance_0729.pdf',
        summary: false,
      },
      {
        kind: 'obs',
        date: '28/07/2026',
        title: 'Observation : toux légère',
        text: 'Toux sèche le matin, appétit conservé. Priorité faible.',
        proof: 'declared',
        summary: { sub: '28/07/2026, A. Koné, clôturée le 03/08' },
      },
      {
        kind: 'vac',
        date: '10/03/2026',
        title: 'Vaccination dermatose nodulaire',
        text: 'Campagne départementale, Dr Y. Coulibaly.',
        proof: 'verified',
        photos: ['images/pesee-bovin.jpg'],
        summary: { title: 'Vaccin dermatose nodulaire', sub: '10/03/2026, Dr Y. Coulibaly' },
      },
    ]),
    ...forAnimal('FK-0087', [
      {
        kind: 'obs',
        date: '05/11/2026',
        title: 'Diagnostic de gestation confirmé',
        text: 'Gestation de 7 mois confirmée par palpation transrectale. Mise bas prévue début décembre.',
        proof: 'verified',
        file: 'Suivi_gestation_FK0087.pdf',
        photos: ['images/vache-ndama.jpg', 'images/visite-veterinaire.jpg'],
      },
      {
        kind: 'vac',
        date: '02/10/2026',
        title: 'Vaccination péripneumonie (PPCB)',
        text: 'Campagne annuelle Sinématiali, Dr Y. Coulibaly.',
        proof: 'verified',
      },
    ]),
    ...forAnimal('FK-0091', [
      {
        kind: 'obs',
        date: '04/11/2026',
        title: 'Pesée mensuelle : 241 kg',
        text: 'Gain moyen quotidien conforme (+680 g/j). Bon état corporel.',
        proof: 'documented',
        photos: ['images/genisse-metisse.jpg', 'images/pesee-bovin.jpg'],
      },
      {
        kind: 'vac',
        date: '02/10/2026',
        title: 'Vaccination PPCB et charbon symptomatique',
        text: 'Dr Y. Coulibaly, lot PB-2291.',
        proof: 'verified',
      },
    ]),
    ...forAnimal('FK-0125', [
      {
        kind: 'trt',
        date: '16/11/2026',
        title: 'Traitement antiparasitaire et vitamines',
        text: 'Albendazole oral et complexe vitaminé B après baisse d’état.',
        proof: 'documented',
        photos: ['images/beliers-saheliens.jpg', 'images/belier-sahelien-profil.jpg'],
      },
    ]),
  ];

  const listings: Listing[] = [
    {
      id: 'L-TAUR3',
      sponsored: true,
      title: 'Taurillons Zébu, lot de 3',
      details: '18 à 22 mois, 260 à 290 kg',
      price: 1680000,
      unit: 'le lot',
      place: 'Ferkessédougou, 54 km',
      seller: 'Ranch Tuo',
      sellerVerified: true,
      category: 'Animaux, Bovins',
      photo: 'Photo, lot',
      photos: [
        'images/lot-taurillons.jpg',
        'images/taurillon-goudali-troupeau.jpg',
        'images/pesee-bovin.jpg',
        'images/boucle-oreille.jpg',
      ],
      photoLabels: ['Lot de 3 taurillons au parc', 'Rassemblement avant pesée', 'Passage sur bascule', 'Boucles officielles posées'],
      trace: ['3 fiches', 'blue'],
      delivery: true,
      status: 'online',
      date: '10/11/2026',
      description: 'Lot homogène de 3 taurillons Zébu nés au Ranch Tuo à Ferkessédougou. Vaccinés PPCB et déparasités en octobre. Idéal pour embouche bovine ou renouvellement de troupeau.',
    },
    {
      id: 'FK-0142',
      title: 'Taurillon Zébu Goudali',
      details: '26 mois, 312 kg, pesé le 04/11',
      price: 650000,
      place: 'Sinématiali, 12 km',
      seller: 'Ferme Koné & Fils',
      sellerShort: 'Ferme Koné',
      sellerVerified: true,
      category: 'Animaux, Bovins',
      photo: 'Photo, taurillon',
      photos: [
        'images/taurillon-goudali.jpg',
        'images/taurillon-goudali-face.jpg',
        'images/taurillon-goudali-troupeau.jpg',
        'images/boucle-oreille.jpg',
        'images/pesee-bovin.jpg',
        'images/visite-veterinaire.jpg',
      ],
      photoLabels: [
        'Photo, taurillon de profil',
        'Vue de trois-quarts et cornes en lyre',
        'Au parc de la Ferme Koné à Sinématiali',
        'Boucle officielle CI-BOV-2024-•••4817',
        'Pesée contrôlée à 312 kg le 04/11',
        'Suivi sanitaire par Dr Y. Coulibaly',
      ],
      pickup: 'Sinématiali (taurillon)',
      trace: ['Fiche vérifiée', 'green'],
      animalIds: ['FK-0142'],
      delivery: true,
      status: 'online',
      date: '06/11/2026',
    },
    {
      id: 'L-NDAMA',
      title: 'Taurillon N’Dama',
      details: '20 mois, poids non renseigné',
      price: 415000,
      place: 'Korhogo, 4 km',
      seller: 'Bamba S.',
      sellerVerified: false,
      category: 'Animaux, Bovins',
      photo: 'Photo, N’Dama',
      photos: [
        'images/vache-ndama.jpg',
        'images/veau-ndama.jpg',
        'images/boeuf-attelage.jpg',
      ],
      photoLabels: ['Taurillon N’Dama au pâturage', 'Robe fauve trypanotolérante', 'Troupeau d’origine à Korhogo'],
      trace: ['Fiche déclarée', 'grey'],
      delivery: false,
      status: 'online',
      date: '12/11/2026',
      description: 'Jeune bovin N’Dama rustique élevé au pâturage naturel en périphérie de Korhogo. Race locale trypanotolérante bien adaptée à la zone des Savanes.',
    },
    {
      id: 'L-METIS',
      title: 'Taurillon métis Goudali × N’Dama',
      details: '24 mois, 275 kg',
      price: 560000,
      negotiable: true,
      place: 'Napiéolédougou, 22 km',
      seller: 'Ferme Silué',
      sellerVerified: true,
      category: 'Animaux, Bovins',
      photo: 'Photo, métis',
      photos: [
        'images/genisse-metisse.jpg',
        'images/taurillon-goudali-troupeau.jpg',
        'images/pesee-bovin.jpg',
        'images/boucle-oreille.jpg',
      ],
      photoLabels: ['Profil du métis Goudali × N’Dama', 'Enclos de la Ferme Silué', 'Pesée à 275 kg', 'Identification par boucle'],
      trace: ['Fiche documentée', 'blue'],
      delivery: false,
      status: 'online',
      date: '08/11/2026',
      description: 'Croisement Goudali × N’Dama alliant la rusticité du N’Dama au gabarit boucher du Zébu Goudali. Carnet de vaccination disponible à la ferme.',
    },
    {
      id: 'L-REPRO-GOUD',
      sponsored: true,
      title: 'Taureau reproducteur Zébu Goudali sélectionné',
      details: '4 ans, 510 kg, géniteur certifié',
      price: 1250000,
      negotiable: true,
      place: 'Napiéolédougou, 22 km',
      seller: 'Ferme Silué',
      sellerVerified: true,
      category: 'Animaux, Bovins, Reproducteurs',
      photo: 'Photo, reproducteur',
      photos: [
        'images/taureau-reproducteur.jpg',
        'images/taurillon-goudali-face.jpg',
        'images/pesee-bovin.jpg',
        'images/visite-veterinaire.jpg',
      ],
      photoLabels: ['Taureau reproducteur Goudali', 'Tête et encornure symétrique', 'Contrôle de poids (510 kg)', 'Bilan sanitaire complet'],
      animalIds: ['FK-0105'],
      trace: ['Fiche certifiée', 'cert'],
      delivery: true,
      status: 'online',
      date: '15/11/2026',
      description: 'Géniteur Zébu Goudali d’élite, très docile, sélectionné sur la conformation et la croissance de ses produits. Bilan sanitaire et test brucellose négatif joints.',
    },
    {
      id: 'L-BOEUFS-TRAIT',
      title: 'Paire de bœufs de trait N’Dama dressés',
      details: '4 ans, 370 et 385 kg, dressés au joug',
      price: 1150000,
      unit: 'la paire',
      place: 'M’Bengué, 72 km',
      seller: 'Coopérative Cotonnière de M’Bengué',
      sellerShort: 'Coop. M’Bengué',
      sellerVerified: true,
      category: 'Animaux, Bovins',
      photo: 'Photo, bœufs de trait',
      photos: [
        'images/boeuf-attelage.jpg',
        'images/lot-taurillons.jpg',
        'images/vache-ndama.jpg',
      ],
      photoLabels: ['Paire de bœufs N’Dama dressés', 'Au repos après le labour', 'Gabarit homogène'],
      animalIds: ['FK-0112'],
      trace: ['2 fiches', 'blue'],
      delivery: true,
      status: 'online',
      date: '11/11/2026',
      description: 'Paire de bœufs de culture attelée habitués à travailler ensemble (labour, buttage du coton et du maïs, transport par charrette). Vaccinés PPCB.',
    },
    {
      id: 'L-BELIERS',
      sponsored: true,
      title: 'Béliers Sahéliens, lot de 6',
      details: 'Adultes, 55 à 65 kg',
      price: 117500,
      unit: 'la tête',
      place: 'Ferkessédougou',
      seller: 'Bergerie Soro',
      sellerVerified: true,
      category: 'Animaux, Ovins',
      photo: 'Photo, béliers',
      photos: [
        'images/beliers-saheliens.jpg',
        'images/belier-sahelien-profil.jpg',
        'images/troupeau-ovins.jpg',
        'images/visite-veterinaire.jpg',
      ],
      photoLabels: ['Lot de 6 béliers Sahéliens', 'Profil d’un sujet de 62 kg', 'Parc d’embouche à Ferkessédougou', 'Vaccination PPR vérifiée'],
      animalIds: ['FK-0124', 'FK-0125'],
      trace: ['6 fiches', 'blue'],
      delivery: true,
      stock: 6,
      status: 'online',
      date: '14/11/2026',
      description: 'Béliers Sahéliens de grand gabarit engraissés au fourrage et tourteau de coton à la Bergerie Soro. Vente à l’unité ou en lot, livraison rapide sur Korhogo et Abidjan.',
    },
    {
      id: 'L-BREBIS-LOT',
      title: 'Brebis Djallonké reproductrices, lot de 5',
      details: '18 à 24 mois, vaccinées PPR',
      price: 340000,
      unit: 'le lot',
      place: 'Ferkessédougou, 54 km',
      seller: 'Bergerie Soro',
      sellerVerified: true,
      category: 'Animaux, Ovins, Reproducteurs',
      photo: 'Photo, brebis',
      photos: [
        'images/troupeau-ovins.jpg',
        'images/brebis-djallonke.jpg',
        'images/belier-sahelien-profil.jpg',
      ],
      photoLabels: ['Lot de 5 brebis Djallonké au pâturage', 'Sujet adulte rustique', 'Troupeau reproducteur de la bergerie'],
      animalIds: ['FK-0128'],
      trace: ['5 fiches', 'green'],
      delivery: true,
      status: 'online',
      date: '16/11/2026',
      description: 'Cinq jeunes brebis Djallonké sélectionnées pour la prolificité et la rusticité. Toutes vaccinées contre la peste des petits ruminants (PPR) et déparasitées.',
    },
    {
      id: 'L-BOUC-REPRO',
      title: 'Bouc reproducteur Djallonké sélectionné',
      details: '3 ans, 34 kg, très prolifique',
      price: 75000,
      place: 'Boundiali, 98 km',
      seller: 'Élevage Ouattara',
      sellerVerified: true,
      category: 'Animaux, Caprins, Ovins, Reproducteurs',
      photo: 'Photo, bouc',
      photos: [
        'images/bouc-djallonke.jpg',
        'images/chevre-djallonke.jpg',
        'images/chevres-saheliennes.jpg',
      ],
      photoLabels: ['Bouc reproducteur Djallonké', 'Femelles issues de l’élevage', 'Enclos caprin à Boundiali'],
      animalIds: ['FK-0136'],
      trace: ['Fiche vérifiée', 'green'],
      delivery: true,
      status: 'online',
      date: '13/11/2026',
      description: 'Bouc reproducteur Djallonké robuste et bien conformé, indemne de pathologies respiratoires, vacciné PPR. Idéal pour améliorer un troupeau caprin villageois.',
    },
    {
      id: 'L-CHEVRES-SAH',
      title: 'Chèvres Sahéliennes, lot de 4',
      details: 'Femelles adultes, 35 à 42 kg',
      price: 68000,
      unit: 'la tête',
      place: 'Ouangolodougou, 84 km',
      seller: 'Bergerie du Nord',
      sellerVerified: true,
      category: 'Animaux, Caprins, Ovins',
      photo: 'Photo, chèvres',
      photos: [
        'images/chevres-saheliennes.jpg',
        'images/chevre-djallonke.jpg',
        'images/bouc-djallonke.jpg',
      ],
      photoLabels: ['Chèvres Sahéliennes en parc', 'Détail de la robe', 'Élevage caprin du Nord'],
      animalIds: ['FK-0140'],
      trace: ['4 fiches', 'blue'],
      delivery: true,
      stock: 4,
      status: 'online',
      date: '17/11/2026',
      description: 'Chèvres Sahéliennes de haute taille, bonnes laitières et habituées au climat sec du Nord. Suivi vétérinaire régulier.',
    },
    {
      id: 'ALIM-50',
      title: 'Aliment bétail engraissement, sac de 50 kg',
      details: 'Livraison possible, stock 86',
      price: 14500,
      unit: 'le sac',
      place: 'Korhogo, 3 km',
      seller: 'Provenderie du Nord',
      sellerVerified: true,
      category: 'Aliments et intrants',
      pickup: 'Korhogo, zone industrielle (aliment)',
      photo: 'Photo, sacs d’aliment',
      photos: [
        'images/aliment-betail.jpg',
        'images/aliment-detail.jpg',
        'images/tourteau-coton.jpg',
      ],
      photoLabels: ['Sacs de 50 kg en entrepôt', 'Granulés riches en protéines', 'Matières premières et minéraux'],
      tint: 'w',
      trace: ['Livraison', 'grey'],
      delivery: true,
      stock: 86,
      status: 'online',
      date: '01/11/2026',
      description: 'Aliment complet granulé pour l’embouche bovine et ovine (16 % de protéines brutes : maïs, son de blé, tourteau de coton, minéraux et vitamines).',
    },
    {
      id: 'L-TOURTEAU',
      title: 'Tourteau de coton + pierre à lécher minérale',
      details: 'Sac de 50 kg + bloc minéral 5 kg',
      price: 16500,
      unit: 'le pack',
      place: 'Korhogo, 5 km',
      seller: 'Agro-Nord Intrants',
      sellerVerified: true,
      category: 'Aliments et intrants',
      photo: 'Photo, tourteau',
      photos: [
        'images/tourteau-coton.jpg',
        'images/aliment-betail.jpg',
        'images/aliment-detail.jpg',
      ],
      photoLabels: ['Tourteau de coton et blocs à lécher', 'Stock disponible à Korhogo', 'Conditionnement en sacs de 50 kg'],
      tint: 'w',
      trace: ['Certifié usine', 'green'],
      delivery: true,
      stock: 120,
      status: 'online',
      date: '15/11/2026',
      description: 'Complément azoté de premier choix issu des huileries cotonnières du Poro, accompagné d’une pierre à lécher riche en oligo-éléments pour prévenir les carences.',
    },
    {
      id: 'L-FUMIER',
      title: 'Fumier bovin composté, sac de 40 kg',
      details: 'Amendement organique mûr et tamisé',
      price: 2000,
      unit: 'le sac',
      place: 'Sinématiali, 12 km',
      seller: 'Ferme Koné & Fils',
      sellerShort: 'Ferme Koné',
      sellerVerified: true,
      category: 'Aliments et intrants',
      photo: 'Photo, fumier',
      photos: [
        'images/fumier-composte.jpg',
        'images/taurillon-goudali-troupeau.jpg',
        'images/aliment-betail.jpg',
      ],
      photoLabels: ['Fumier composté mûr en sacs de 40 kg', 'Parc d’élevage de la Ferme Koné', 'Sacs prêts au chargement'],
      tint: 'w',
      trace: ['100 % naturel', 'green'],
      delivery: true,
      stock: 45,
      status: 'online',
      date: '09/11/2026',
      description: 'Compost de fumier de parc bovin décomposé pendant 4 mois, sans graines d’adventices. Idéal pour le maraîchage, les vergers de manguiers et la culture du maïs.',
    },
    {
      id: 'POUSSINS',
      title: 'Poussins chair, J1',
      details: 'Vendus par 100, souche Cobb 500',
      price: 650,
      unit: 'le poussin',
      place: 'Korhogo, par 100',
      seller: 'Couvoir du Nord',
      sellerVerified: false,
      category: 'Volailles et poussins',
      photo: 'Photo, poussins',
      photos: [
        'images/poussins-chair.jpg',
        'images/poussins-lot.jpg',
        'images/couveuse-oeufs.jpg',
      ],
      photoLabels: ['Poussins Cobb 500 d’un jour', 'Lot trié au couvoir', 'Éclosion contrôlée en couveuse'],
      tint: 's',
      trace: ['Profil non vérifié', 'grey'],
      delivery: false,
      stock: 2000,
      status: 'online',
      date: '15/11/2026',
      description: 'Poussins de chair d’un jour souche Cobb 500 vaccinés Marek et Gumboro au couvoir. Retrait chaque mardi et vendredi matin à Korhogo.',
    },
    {
      id: 'L-OEUFS',
      sponsored: true,
      title: 'Œufs frais de ferme, plateau de 30',
      details: 'Gros calibre, ponte du jour, par 10 plateaux min.',
      price: 2600,
      unit: 'le plateau',
      place: 'Korhogo, quartier Soba',
      seller: 'Ferme Avicole Soba',
      sellerVerified: true,
      category: 'Volailles et poussins',
      photo: 'Photo, œufs',
      photos: [
        'images/oeufs-plateaux.jpg',
        'images/poussins-chair.jpg',
        'images/couveuse-oeufs.jpg',
      ],
      photoLabels: ['Plateaux de 30 œufs roux calibrés', 'Élevage avicole de Soba', 'Conditionnement pour livraison'],
      tint: 's',
      trace: ['Ponte du jour', 'green'],
      delivery: true,
      stock: 350,
      status: 'online',
      date: '18/11/2026',
      description: 'Œufs de consommation à coquille brune issus de poules nourries au maïs local. Livraison quotidienne aux restaurants, hôtels, boulangeries et grossistes.',
    },
    {
      id: 'IGNAME',
      title: 'Igname Kponan',
      details: 'Minimum 200 kg, tubercules entiers',
      price: 425,
      unit: 'le kg',
      place: 'Dikodougou, 38 km',
      seller: 'Coopérative de Dikodougou',
      sellerShort: 'Coop. Dikodougou',
      sellerVerified: true,
      category: 'Récoltes',
      photo: 'Photo, igname',
      photos: [
        'images/igname-kponan.jpg',
        'images/igname-detail.jpg',
        'images/mais-jaune.jpg',
      ],
      photoLabels: ['Caisses d’igname Kponan au marché', 'Tubercules sains de premier choix', 'Magasin de la coopérative'],
      tint: 'w',
      trace: ['Min. 200 kg', 'grey'],
      delivery: false,
      stock: 5000,
      status: 'online',
      date: '13/11/2026',
      description: 'Véritable igname Kponan récoltée à maturité par les producteurs de la Coopérative de Dikodougou. Chair blanche sucrée, excellente tenue au stockage.',
    },
    {
      id: 'L-MAIS',
      title: 'Maïs grain jaune séché, sac de 100 kg',
      details: 'Humidité < 13 %, trié et ensaché',
      price: 18500,
      unit: 'le sac',
      place: 'Dikodougou, 38 km',
      seller: 'Coopérative de Dikodougou',
      sellerShort: 'Coop. Dikodougou',
      sellerVerified: true,
      category: 'Récoltes, Aliments et intrants',
      photo: 'Photo, maïs',
      photos: [
        'images/mais-jaune.jpg',
        'images/aliment-betail.jpg',
        'images/igname-kponan.jpg',
      ],
      photoLabels: ['Maïs grain jaune récolte 2026', 'Sacs empilés sur palettes', 'Collecte à la coopérative'],
      tint: 'w',
      trace: ['Lot contrôlé', 'green'],
      delivery: true,
      stock: 240,
      status: 'online',
      date: '16/11/2026',
      description: 'Maïs jaune hybride séché au soleil sur bâche et vanné mécaniquement. Parfait pour la fabrication de provende avicole ou l’alimentation humaine.',
    },
    {
      id: 'L-CAJOU',
      title: 'Noix de cajou brutes séchées (KOR 49)',
      details: 'Sacs jute de 80 kg, humidité 9 %',
      price: 420,
      unit: 'le kg',
      place: 'Sinématiali, 12 km',
      seller: 'Union des Producteurs du Poro',
      sellerShort: 'Union du Poro',
      sellerVerified: true,
      category: 'Récoltes',
      photo: 'Photo, cajou',
      photos: [
        'images/noix-cajou.jpg',
        'images/mais-jaune.jpg',
        'images/igname-kponan.jpg',
      ],
      photoLabels: ['Séchage des noix de cajou sur natte', 'Stockage ventilé en magasin', 'Lot certifié KOR 49'],
      tint: 'w',
      trace: ['KOR 49 vérifié', 'blue'],
      delivery: true,
      stock: 4000,
      status: 'online',
      date: '14/11/2026',
      description: 'Lot d’anacarde brute bien séchée provenant des vergers de Sinématiali. Taux de rendement grain (KOR) mesuré à 49 lbs par sondeur agréé.',
    },
    {
      id: 'L-COUVEUSE',
      sponsored: true,
      title: 'Couveuse automatique digitale 528 œufs',
      details: 'Basculement auto, hygrométrie et température régulées',
      price: 385000,
      place: 'Korhogo, centre',
      seller: 'Équip’Agri CI',
      sellerVerified: true,
      category: 'Matériel',
      photo: 'Photo, couveuse',
      photos: [
        'images/couveuse-oeufs.jpg',
        'images/oeufs-plateaux.jpg',
        'images/poussins-chair.jpg',
      ],
      photoLabels: ['Couveuse 528 œufs en fonctionnement', 'Plateaux d’incubation multi-espèces', 'Éclosion de poussins à J21'],
      tint: 's',
      trace: ['Garantie 1 an', 'green'],
      delivery: true,
      stock: 5,
      status: 'online',
      date: '12/11/2026',
      description: 'Incubateur professionnel double alimentation (220 V et batterie/solaire 12 V) pour œufs de poule, pintade et caille. Livré avec paniers d’éclosion et formation.',
    },
    {
      id: 'L-BASCULE',
      title: 'Cage de pesée bétail galvanisée 1 500 kg',
      details: 'Portes coulissantes, afficheur numérique rechargeable',
      price: 620000,
      negotiable: true,
      place: 'Korhogo, zone industrielle',
      seller: 'Équip’Agri CI',
      sellerVerified: true,
      category: 'Matériel',
      photo: 'Photo, pesée',
      photos: [
        'images/pesee-bovin.jpg',
        'images/taurillon-goudali-troupeau.jpg',
        'images/lot-taurillons.jpg',
      ],
      photoLabels: ['Cage de pesée installée en parc', 'Couloir de contention', 'Pesée rapide des taurillons'],
      tint: 's',
      trace: ['Sur commande', 'blue'],
      delivery: true,
      stock: 3,
      status: 'online',
      date: '07/11/2026',
      description: 'Bascule pèse-bétail robuste en acier galvanisé avec barres de pesée étanches. Permet de justifier le poids exact sur les fiches animales SAVAA.',
    },
    {
      id: 'L-VETO-SRV',
      title: 'Forfait suivi sanitaire et bouclage de cheptel',
      details: 'Déplacement sur ferme, vaccination et identification',
      price: 35000,
      unit: 'la visite',
      place: 'Korhogo et Poro (rayon 60 km)',
      seller: 'Cabinet Vétérinaire des Savanes',
      sellerShort: 'Cab. Vét. Savanes',
      sellerVerified: true,
      category: 'Services',
      photo: 'Photo, vétérinaire',
      photos: [
        'images/visite-veterinaire.jpg',
        'images/boucle-oreille.jpg',
        'images/pesee-bovin.jpg',
      ],
      photoLabels: ['Intervention vétérinaire en parc', 'Pose de boucle officielle', 'Contrôle de croissance et santé'],
      trace: ['Vétérinaire agréé', 'cert'],
      delivery: true,
      stock: 15,
      status: 'online',
      date: '17/11/2026',
      description: 'Visite sur exploitation par un docteur vétérinaire mandaté : bilan sanitaire, pose de boucles d’identification, vaccinations réglementaires et validation des fiches SAVAA.',
    },
    {
      id: 'L-TRANSP-SRV',
      title: 'Transport d’animaux vivants en bétaillère ventilée',
      details: 'Capacité 12 bovins ou 45 ovins, Poro → toute la Côte d’Ivoire',
      price: 25000,
      unit: 'le forfait zone',
      place: 'Korhogo, Sinématiali, Ferkessédougou',
      seller: 'Transports Ouattara',
      sellerVerified: true,
      category: 'Services',
      photo: 'Photo, parc',
      photos: [
        'images/lot-taurillons.jpg',
        'images/taurillon-goudali-troupeau.jpg',
        'images/beliers-saheliens.jpg',
      ],
      photoLabels: ['Rassemblement avant embarquement', 'Quai de chargement en ferme', 'Transport d’ovins et bovins'],
      trace: ['Transporteur agréé', 'green'],
      delivery: true,
      stock: 10,
      status: 'online',
      date: '18/11/2026',
      description: 'Service de transport spécialisé pour animaux vivants avec rampe antidérapante, litière propre et suivi par code de remise SAVAA.',
    },
  ];

  /* Un nouveau compte part de zéro : rien de personnel n'est pré-rempli. */
  const session: Session = { loggedIn: false, name: '', phone: '', roles: [], prefs: { push: true, mkt: false }, docs: [] };
  const shop: Shop = { created: false, name: '', desc: '', town: '' };

  return {
    animals, events, listings, session, shop,
    cart: { items: [], delivery: true, method: 'Orange Money' } as Cart,
    orders: [] as Order[], favorites: [] as string[], tickets: [] as Ticket[], chat: [] as string[], notifs: [] as Notif[],
    kv: {} as Record<string, unknown>,
  };
}

/* Compte de démonstration de la maquette : Adama Koné, éleveur et vendeur (Ferme Koné & Fils). */
function demoAccount() {
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
    created: true,
    name: 'Ferme Koné & Fils',
    desc: 'Élevage familial de bovins et d’ovins à Sinématiali depuis 2009. Animaux suivis par un vétérinaire, visite possible sur rendez-vous.',
    town: 'Sinématiali',
    logo: 'images/ferme-kone-logo.jpg',
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

  const session: Session = {
    loggedIn: true,
    demo: true,
    name: 'Adama Koné',
    phone: '07 48 12 33 90',
    roles: ['eleveur', 'vendeur'],
    prefs: { push: true, mkt: false },
    docs: [
      { name: 'CNI recto-verso.pdf', date: '03/03/2025', status: 'verified' },
      { name: 'Attestation d’exploitation, mairie.jpg', date: '10/11/2026', status: 'documented' },
    ],
  };

  return { cart, orders, favorites: ['L-METIS', 'L-BELIERS', 'IGNAME', 'L-REPRO-GOUD', 'L-OEUFS'], tickets, shop, notifs, session };
}

export type NotifCat = 'cmd' | 'pay' | 'cmp' | 'pro' | 'alr';
export type Notif = { id: number; c: NotifCat; title: string; text: string; time: string; to: string; unread: boolean; /** Groupe affiché ; sinon la date. */ g?: string; date?: string };

export type Session = {
  loggedIn: boolean;
  /** Inscription commencée mais pas terminée : il reste le choix du métier (`role`) ou le profil métier (`profil`).
      Tant qu'elle est en cours, le compte n'existe pas : `loggedIn` reste faux. */
  onboarding?: 'role' | 'profil';
  /** Compte de démonstration de la maquette (données d'Adama Koné). */
  demo?: boolean;
  name: string;
  phone: string;
  mail?: string;
  town?: string;
  roles: string[];
  prefs: { push: boolean; mkt: boolean };
  docs: { name: string; date: string; status: 'verified' | 'documented' | 'review' }[];
  /** Photo du compte (réduite), affichée dans l'en-tête des espaces métiers et la page Compte. */
  photo?: string;
  /** Profil métier saisi après le choix du rôle (voir profils.ts) : clé → valeur. */
  pro?: Record<string, string>;
  /** Photos des justificatifs du profil métier (pièce d'identité, carte grise…) : clé → image réduite. */
  proPhotos?: Record<string, string>;
};

export type Shop = { created: boolean; name: string; desc: string; town: string; logo?: string };

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

const KEY = 'savaa-demo-v4';

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

/* Effectifs de la maquette (18, 22, 6) : animaux non listés + animaux listés (6, 5, 3). */
const UNLISTED: Record<Species, number> = { bovin: 12, ovin: 17, caprin: 3 };

const findListing = (id: string) => state.listings.find((l) => l.id === id);

/* Comptes déjà créés sur cet appareil, rangés par numéro (démo sans serveur) : la déconnexion
   les met de côté, la connexion avec le même numéro les retrouve. */
const ACCOUNTS_KEY = 'savaa-comptes-v1';
type Accounts = Record<string, State>;
function readAccounts(): Accounts {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '{}') as Accounts;
  } catch {
    return {};
  }
}
function writeAccounts(a: Accounts) {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(a));
  } catch {
    /* stockage plein : on garde au moins le compte sans ses photos */
    try {
      const light: Accounts = {};
      for (const [k, v] of Object.entries(a)) light[k] = { ...v, session: { ...v.session, photo: undefined, proPhotos: undefined } };
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(light));
    } catch {
      /* pas de stockage : le compte ne sera pas retrouvé */
    }
  }
}

/** Remet l'appareil sur la maquette, sans toucher aux comptes mis de côté. */
function clearCurrent() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* rien à effacer */
  }
  state = initial();
  version++;
  listeners.forEach((l) => l());
}

export const store = {
  /** Efface tout ce qui a été saisi, y compris les comptes créés sur l'appareil, et revient aux données de la maquette. */
  reset() {
    try {
      localStorage.removeItem(ACCOUNTS_KEY);
    } catch {
      /* rien à effacer */
    }
    clearCurrent();
  },
  /** Prénom et nom du compte déjà créé sur cet appareil avec ce numéro (10 chiffres), sinon null. */
  knownAccount: (digits: string): string | null => readAccounts()[digits]?.session.name ?? null,
  /** Reprend le compte créé avec ce numéro : métier, profil, cheptel, boutique, commandes. */
  resumeAccount(digits: string): boolean {
    const saved = readAccounts()[digits];
    if (!saved) return false;
    state = { ...initial(), ...saved, session: { ...saved.session, loggedIn: true } };
    commit({});
    return true;
  },

  /* Cheptel et santé */
  /** Cheptel de l'utilisateur connecté. */
  animals: () => state.animals.filter((a) => a.mine),
  /** Toute fiche, y compris les fiches publiques liées aux annonces. `undefined` si inconnue. */
  animal: (id: string): Animal | undefined => state.animals.find((a) => a.id === id),
  eventsFor: (animalId: string) => state.events.filter((e) => e.animalId === animalId),
  /* Le compte de démonstration reprend les effectifs de la maquette (18, 22, 6) : animaux non listés + listés. */
  count: (s: Species) => (state.session.demo ? UNLISTED[s] : 0) + store.animals().filter((a) => a.species === s).length,
  total: () => (['bovin', 'ovin', 'caprin'] as Species[]).reduce((n, s) => n + store.count(s), 0),
  /** Prochain n° interne libre (FK-xxxx), toutes fiches confondues. */
  nextAnimalId: () => `FK-${String(Math.max(150, ...state.animals.map((a) => Number(a.id.slice(3)) || 0)) + 1).padStart(4, '0')}`,
  addAnimal(a: Animal) {
    commit({ animals: [{ ...a, mine: true }, ...state.animals] });
  },
  addEvent(e: HealthEvent) {
    commit({ events: [e, ...state.events] });
    if (e.kind === 'obs') store.notify({ c: 'alr', title: `Alerte sanitaire, ${e.animalId}`, text: `${e.title}. ${e.pending ? 'Envoi au vétérinaire dès le retour du réseau.' : ''}`.trim(), to: `/animal/${e.animalId}/sante` });
  },

  /* Compte */
  session: () => state.session,
  login(patch: Partial<Session>) {
    commit({ session: { ...state.session, ...patch, loggedIn: true, onboarding: undefined } });
  },
  /** Début d'inscription (numéro vérifié, nom et ville saisis) : le compte n'est créé qu'à la fin, avec `finishSignup`. */
  startSignup(patch: Partial<Session>) {
    commit({ session: { ...state.session, ...patch, loggedIn: false, onboarding: 'role' } });
  },
  /** Fin d'inscription : métier choisi et profil métier enregistré (ou remis à plus tard). Le compte existe. */
  finishSignup() {
    commit({ session: { ...state.session, loggedIn: true, onboarding: undefined } });
  },
  /** Étape où reprendre une inscription en cours, sinon null. */
  signupStep: (): string | null =>
    state.session.loggedIn || !state.session.onboarding ? null : state.session.onboarding === 'profil' ? '/profil-metier' : '/role',
  /** Charge le compte de la maquette (Adama Koné) avec son cheptel, sa boutique, ses commandes… */
  loginDemo() {
    const base = initial();
    const demo = demoAccount();
    state = { ...base, ...demo, animals: base.animals.map((a) => ({ ...a, mine: true })), events: base.events, listings: base.listings };
    commit({});
  },
  /** Déconnexion : le compte est mis de côté sous son numéro, puis l'appareil revient à l'état visiteur.
      Le compte de démonstration n'est pas gardé : il se recharge à neuf. */
  logout() {
    const digits = state.session.phone.replace(/\D/g, '');
    if (state.session.loggedIn && !state.session.demo && digits.length === 10) {
      writeAccounts({ ...readAccounts(), [digits]: { ...state, session: { ...state.session, loggedIn: false } } });
    }
    clearCurrent();
  },
  /** Rôles : éleveur, producteur agricole, vendeur, fournisseur, restaurant, acheteur… */
  has: (role: string) => state.session.loggedIn && state.session.roles.includes(role),
  isBreeder: () => store.has('eleveur'),
  canSell: () => ['eleveur', 'agri', 'vendeur', 'fourn'].some((r) => store.has(r)),
  /** Restaurant ou hôtel vérifié : il a renseigné son RCCM (contrôlé par l'équipe en production). Il voit les prix pro. */
  isVerifiedPro: () => store.has('resto') && !!state.session.pro?.['resto.rccm']?.trim(),
  /** Prix appliqué à ce compte : le prix pro pour un professionnel vérifié, sinon le prix normal. */
  priceFor: (l: Listing): number => {
    const pro = proPriceOf(l);
    return store.isVerifiedPro() && pro && pro < l.price ? pro : l.price;
  },
  /** Accueil du compte : l'espace de son métier principal. Seuls le visiteur et l'acheteur ont l'accueil marchand. */
  home: (): string =>
    store.has('eleveur') ? '/suivi'
      : store.has('agri') ? '/recoltes'
        : store.has('fourn') ? '/fournisseur'
          : store.has('vendeur') ? (state.shop.created ? '/vendeur' : '/boutique/creer')
            : store.has('resto') ? '/restaurant'
              : store.has('veto') ? '/veto'
                : store.has('coursier') ? '/missions'
                  : store.has('invest') ? '/investir'
                  : '/accueil',
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

  /* Petites données d'écran gardées telles quelles (CRM : prospects ajoutés, journaux, conversions). */
  get<T>(key: string, fallback: T): T {
    return key in state.kv ? (state.kv[key] as T) : fallback;
  },
  put(key: string, value: unknown) {
    commit({ kv: { ...state.kv, [key]: value } });
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
      return l ? [{ listing: l, qty: it.qty, amount: store.priceFor(l) * it.qty }] : [];
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
      address: state.cart.address,
      shipping: t.shipping,
      total: t.total,
      code: String(Math.floor(Math.random() * 9000) + 1000),
      lines: store.cartLines().map(({ listing, qty }) => ({ listingId: listing.id, title: listing.title, seller: listing.seller, qty, price: store.priceFor(listing) })),
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
/* Prix pro des annonces de démonstration (œufs, igname, maïs), lus à part pour ne pas changer les données gardées. */
const DEMO_PRO: Record<string, number> = { 'L-OEUFS': 2400, IGNAME: 390, 'L-MAIS': 17000 };
/** Prix pro d'une annonce, s'il existe. */
export const proPriceOf = (l: Listing): number | undefined => l.proPrice ?? DEMO_PRO[l.id];

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
