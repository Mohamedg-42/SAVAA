/*
  Espace investisseur : définition du dossier (particulier ou entreprise), de ses étapes, des contrôles et des statuts.
  Les écrans (screens/investir.tsx) lisent cette définition. Démonstration : le dossier est gardé sur l'appareil.
  Jamais de mot de passe bancaire, de numéro de carte ni de code Mobile Money.
*/

export type Val = string | string[];
export type Data = Record<string, Val>;

export type IField = {
  key: string;
  label: string;
  kind: 'text' | 'email' | 'tel' | 'date' | 'select' | 'chips' | 'yesno' | 'amount' | 'textarea' | 'photo' | 'multi';
  options?: string[];
  required?: boolean;
  placeholder?: string;
  hint?: string;
  /** Champ court affiché sur une demi-largeur, à côté du suivant (formulaire plus compact). */
  half?: boolean;
  /** Champ affiché seulement si la condition est vraie (formulaire conditionnel). */
  showIf?: (d: Data) => boolean;
};
export type IDoc = { key: string; label: string; required?: boolean };
export type IStep = { title: string; intro?: string; fields: IField[]; docs?: IDoc[] };

export type InvestorType = 'particulier' | 'entreprise';
export type DossierStatus = 'brouillon' | 'soumis' | 'attente' | 'analyse' | 'complement' | 'valide' | 'refuse' | 'archive';

export type Dossier = {
  type?: InvestorType;
  data: Data;
  /** Justificatifs : clé → photo réduite (démonstration). */
  docs: Record<string, string>;
  step: number;
  status: DossierStatus;
  ref?: string;
  submittedAt?: string;
  history: { date: string; status: DossierStatus; by: string; note?: string }[];
};

export const EMPTY_DOSSIER: Dossier = { data: {}, docs: {}, step: 0, status: 'brouillon', history: [] };

export const STATUS: Record<DossierStatus, { label: string; tone: 'grey' | 'blue' | 'amber' | 'green' | 'red' }> = {
  brouillon: { label: 'Brouillon', tone: 'grey' },
  soumis: { label: 'Soumis', tone: 'blue' },
  attente: { label: 'En attente de traitement', tone: 'blue' },
  analyse: { label: 'En cours d’analyse', tone: 'amber' },
  complement: { label: 'Informations complémentaires requises', tone: 'amber' },
  valide: { label: 'Validé', tone: 'green' },
  refuse: { label: 'Refusé', tone: 'red' },
  archive: { label: 'Archivé', tone: 'grey' },
};

/** Les 31 régions et les 2 districts autonomes de Côte d'Ivoire. */
export const REGIONS_CI = [
  'District autonome d’Abidjan', 'District autonome de Yamoussoukro',
  'Agnéby-Tiassa', 'Bafing', 'Bagoué', 'Bélier', 'Béré', 'Bounkani', 'Cavally', 'Folon', 'Gbêkê', 'Gbôklé', 'Gôh', 'Gontougo',
  'Grands-Ponts', 'Guémon', 'Hambol', 'Haut-Sassandra', 'Iffou', 'Indénié-Djuablin', 'Kabadougou', 'La Mé', 'Lôh-Djiboua',
  'Marahoué', 'Moronou', 'Nawa', 'N’Zi', 'Poro', 'San-Pédro', 'Sud-Comoé', 'Tchologo', 'Tonkpi', 'Worodougou',
];

export const FILIERES = [
  'Cacao', 'Café', 'Anacarde', 'Hévéa', 'Palmier à huile', 'Riziculture', 'Maïs', 'Manioc', 'Banane plantain', 'Maraîchage',
  'Cultures fruitières', 'Élevage de volailles', 'Élevage bovin', 'Élevage porcin', 'Aquaculture et pisciculture',
  'Transformation agroalimentaire', 'Production de semences et d’intrants', 'Mécanisation et équipements agricoles',
  'Irrigation et infrastructures agricoles', 'Autres',
];

export const TRANCHES = [
  'Moins de 1 000 000 FCFA', '1 000 000 à 5 000 000 FCFA', '5 000 000 à 10 000 000 FCFA', '10 000 000 à 25 000 000 FCFA',
  '25 000 000 à 50 000 000 FCFA', '50 000 000 à 100 000 000 FCFA', 'Plus de 100 000 000 FCFA',
];

export const OBJECTIFS = [
  'Recherche de rentabilité financière', 'Diversification de mes investissements', 'Développement de l’agriculture ivoirienne',
  'Participation à un projet agricole durable', 'Contribution à la création d’emplois', 'Développement de l’agro-industrie',
  'Approvisionnement de marchés', 'Investissement à impact social',
];

export const PARTICIPATION = [
  'Apport financier', 'Apport en matériel agricole', 'Mise à disposition de terrains', 'Partenariat technique',
  'Accompagnement stratégique', 'Participation à la gestion', 'Partenariat commercial',
];

const YES_NO_UNSURE = ['Oui', 'Non', 'Je ne sais pas encore'];
const yes = (k: string) => (d: Data) => d[k] === 'Oui';
/* Libellés courts : le champ tient sur une demi-ligne. */
const PIECES = ['CNI', 'Passeport', 'Carte de séjour', 'Permis de conduire'];

/* Champs propres aux entreprises */
const FIN_ENTREPRISE: IField[] = [
  { key: 'fin.origine', label: 'Origine déclarée des fonds', kind: 'select', options: ['Fonds propres', 'Bénéfices d’exploitation', 'Levée de fonds ou associés', 'Financement bancaire', 'Autre'], required: true },
  { key: 'fin.complement', label: 'Capacité de financement complémentaire', kind: 'select', options: YES_NO_UNSURE },
];
const OBJ_ENTREPRISE: IField[] = [
  { key: 'obj.plan', label: 'Plan stratégique et objectifs de développement', kind: 'textarea' },
  { key: 'obj.appro', label: 'Besoins en approvisionnement ou en transformation', kind: 'textarea' },
  { key: 'obj.partenariats', label: 'Partenariats recherchés', kind: 'textarea' },
];

/* Étapes communes aux deux statuts */
const finance = (entreprise: boolean): IStep => ({
  title: 'Capacité d’investissement',
  intro: 'Ces informations servent à vous proposer des projets à votre mesure. Aucun mot de passe ni code bancaire ne vous sera jamais demandé.',
  fields: [
    { key: 'fin.tranche', label: entreprise ? 'Budget global prévu' : 'Budget consacré à l’investissement agricole', kind: 'select', options: TRANCHES, required: true },
    { key: 'fin.min', half: true, label: 'Montant minimum envisagé (FCFA)', kind: 'amount', required: true },
    { key: 'fin.max', half: true, label: 'Montant maximum envisagé (FCFA)', kind: 'amount', required: true },
    { key: 'fin.dispo', label: 'Les fonds sont-ils disponibles ?', kind: 'select', options: ['Oui, immédiatement', 'Oui, sous 3 mois', 'Oui, sous 6 mois ou plus', 'Pas encore'], required: true },
    ...(entreprise ? FIN_ENTREPRISE : []),
    { key: 'fin.seul', label: entreprise ? 'Investissement seul ou en consortium ?' : 'Investir seul ou avec des partenaires ?', kind: 'select', options: entreprise ? ['Seule', 'En consortium', 'Les deux sont possibles'] : ['Seul', 'Avec des partenaires', 'Les deux sont possibles'], required: true },
    { key: 'fin.deja', label: 'Avez-vous déjà investi dans un projet agricole ?', kind: 'yesno', required: true },
    { key: 'fin.experience', label: 'Décrivez cette expérience', kind: 'textarea', showIf: yes('fin.deja') },
  ],
});

const objectifs = (entreprise: boolean): IStep => ({
  title: 'Objectifs d’investissement',
  fields: [
    { key: 'obj.motivations', label: 'Vos motivations', kind: 'multi', options: OBJECTIFS, required: true },
    { key: 'obj.principal', label: 'Objectif principal', kind: 'select', options: OBJECTIFS, required: true },
    { key: 'obj.rendement', label: 'Rendement cible, si vous en avez un', kind: 'text', placeholder: 'Ex. 10 % par an' },
    { key: 'obj.duree', label: 'Durée envisagée', kind: 'select', options: ['Court terme (moins de 2 ans)', 'Moyen terme (2 à 5 ans)', 'Long terme (plus de 5 ans)'], required: true },
    { key: 'obj.risque', label: 'Acceptez-vous un risque élevé ?', kind: 'select', options: ['Non, risque faible', 'Risque modéré', 'Oui, risque élevé'], required: true },
    { key: 'obj.gestion', label: 'Implication souhaitée', kind: 'select', options: ['Investissement passif', 'Participation active à la gestion', 'Entre les deux'], required: true },
    ...(entreprise ? OBJ_ENTREPRISE : []),
  ],
});

const filieres: IStep = {
  title: 'Préférences agricoles',
  fields: [
    { key: 'pref.filieres', label: 'Filières qui vous intéressent', kind: 'multi', options: FILIERES, required: true },
    { key: 'pref.prioritaire', label: 'Filière prioritaire', kind: 'select', options: FILIERES, required: true },
    { key: 'pref.regions', label: 'Régions d’investissement souhaitées', kind: 'multi', options: REGIONS_CI, required: true },
    { key: 'pref.localites', label: 'Localités précises, si vous en avez', kind: 'text', placeholder: 'Ex. Bouaké, Daloa' },
    { key: 'pref.projet', label: 'Type de projet', kind: 'select', options: ['Projet existant à développer', 'Nouveau projet', 'Les deux'], required: true },
    { key: 'pref.chaine', label: 'Maillon de la chaîne de valeur', kind: 'select', options: ['Production', 'Transformation', 'Commercialisation', 'Toute la chaîne de valeur'], required: true },
  ],
};

const DOC_HINT = 'Dans cette démonstration : photo nette du document (JPG ou PNG). Elle est réduite avant d’être gardée.';

export const STEPS_PARTICULIER: IStep[] = [
  {
    title: 'Informations personnelles',
    fields: [
      { key: 'id.nom', half: true, label: 'Nom', kind: 'text', required: true },
      { key: 'id.prenoms', half: true, label: 'Prénom(s)', kind: 'text', required: true },
      { key: 'id.naissance', half: true, label: 'Date de naissance', kind: 'date', required: true },
      { key: 'id.nationalite', half: true, label: 'Nationalité', kind: 'text', required: true, placeholder: 'Ex. ivoirienne' },
      { key: 'id.sexe', half: true, label: 'Sexe', kind: 'select', options: ['Femme', 'Homme'], required: true },
      { key: 'id.piece', half: true, label: 'Type de pièce', kind: 'select', options: PIECES, required: true },
      { key: 'doc.piece', half: true, label: 'Photo de la pièce', kind: 'photo', required: true },
      { key: 'id.expiration', half: true, label: 'Date d’expiration de la pièce', kind: 'date' },
      { key: 'id.pays', half: true, label: 'Pays de résidence', kind: 'text', required: true, placeholder: 'Ex. Côte d’Ivoire' },
      { key: 'id.ville', half: true, label: 'Ville', kind: 'text', required: true },
      { key: 'id.commune', half: true, label: 'Commune', kind: 'text' },
      { key: 'id.adresse', half: true, label: 'Adresse', kind: 'text', required: true },
      { key: 'id.tel', half: true, label: 'Téléphone', kind: 'tel', required: true },
      { key: 'id.email', half: true, label: 'Adresse e-mail', kind: 'email', required: true },
      { key: 'id.profession', half: true, label: 'Profession', kind: 'text', required: true },
      { key: 'id.situation', half: true, label: 'Situation', kind: 'select', options: ['Salarié', 'Fonctionnaire', 'Chef d’entreprise', 'Indépendant', 'Retraité', 'Autre'], required: true },
      { key: 'id.fonction', label: 'Fonction actuelle', kind: 'text' },
    ],
  },
  finance(false),
  objectifs(false),
  filieres,
  {
    title: 'Mode de participation',
    fields: [
      { key: 'part.modes', label: 'Nature de votre contribution', kind: 'chips', options: PARTICIPATION, required: true },
      { key: 'part.terrain', label: 'Possédez-vous un terrain agricole ?', kind: 'yesno', required: true },
      { key: 'part.terrainDetail', label: 'Localisation et superficie du terrain', kind: 'text', placeholder: 'Ex. 12 ha à Toumodi', showIf: yes('part.terrain') },
      { key: 'part.materiel', label: 'Possédez-vous du matériel agricole ?', kind: 'yesno', required: true },
      { key: 'part.materielDetail', label: 'Matériel disponible', kind: 'text', placeholder: 'Ex. tracteur, motopompe', showIf: yes('part.materiel') },
      { key: 'part.entreprise', label: 'Avez-vous une entreprise agricole ?', kind: 'yesno', required: true },
      { key: 'part.entrepriseDetail', label: 'Nom et activité de l’entreprise', kind: 'text', showIf: yes('part.entreprise') },
      { key: 'part.filiereExp', label: 'Avez-vous une expérience dans une filière ?', kind: 'yesno', required: true },
      { key: 'part.filiereExpDetail', label: 'Laquelle, et depuis combien de temps ?', kind: 'text', showIf: yes('part.filiereExp') },
    ],
  },
  {
    title: 'Documents et justificatifs',
    intro: DOC_HINT,
    fields: [],
    docs: [
      { key: 'doc.domicile', label: 'Justificatif de domicile' },
      { key: 'doc.financier', label: 'Justificatif financier, si demandé' },
      { key: 'doc.autre', label: 'Autre document' },
    ],
  },
];

export const STEPS_ENTREPRISE: IStep[] = [
  {
    title: 'Identification de l’entreprise',
    fields: [
      { key: 'ent.raison', label: 'Raison sociale', kind: 'text', required: true },
      { key: 'ent.commercial', label: 'Nom commercial', kind: 'text' },
      { key: 'ent.forme', label: 'Forme juridique', kind: 'select', options: ['SARL', 'SA', 'SAS', 'Entreprise individuelle', 'Coopérative (SCOOPS)', 'Autre'], required: true },
      { key: 'ent.rccm', half: true, label: 'Numéro RCCM', kind: 'text', required: true },
      { key: 'ent.ncc', half: true, label: 'Numéro de compte contribuable (NCC)', kind: 'text', required: true },
      { key: 'ent.creation', half: true, label: 'Date de création', kind: 'date', required: true },
      { key: 'ent.pays', half: true, label: 'Pays d’immatriculation', kind: 'text', required: true, placeholder: 'Ex. Côte d’Ivoire' },
      { key: 'ent.secteur', label: 'Secteur d’activité', kind: 'text', required: true },
      { key: 'ent.siege', label: 'Adresse du siège social', kind: 'text', required: true },
      { key: 'ent.ville', half: true, label: 'Ville', kind: 'text', required: true },
      { key: 'ent.commune', half: true, label: 'Commune', kind: 'text' },
      { key: 'ent.site', label: 'Site internet', kind: 'text', placeholder: 'Ex. www.exemple.ci' },
      { key: 'ent.email', half: true, label: 'E-mail professionnel', kind: 'email', required: true },
      { key: 'ent.tel', half: true, label: 'Téléphone professionnel', kind: 'tel', required: true },
    ],
  },
  {
    title: 'Représentant légal',
    fields: [
      { key: 'rep.nom', label: 'Nom et prénoms', kind: 'text', required: true },
      { key: 'rep.fonction', half: true, label: 'Fonction', kind: 'text', required: true, placeholder: 'Ex. gérant, directeur général' },
      { key: 'rep.nationalite', half: true, label: 'Nationalité', kind: 'text', required: true },
      { key: 'rep.piece', half: true, label: 'Type de pièce', kind: 'select', options: PIECES, required: true },
      { key: 'doc.pieceRep', half: true, label: 'Photo de la pièce', kind: 'photo', required: true },
      { key: 'rep.tel', half: true, label: 'Téléphone', kind: 'tel', required: true },
      { key: 'rep.email', half: true, label: 'E-mail', kind: 'email', required: true },
    ],
  },
  {
    title: 'Profil économique',
    fields: [
      { key: 'eco.taille', label: 'Taille de l’entreprise', kind: 'select', options: ['Très petite entreprise', 'Petite et moyenne entreprise', 'Grande entreprise'], required: true },
      { key: 'eco.employes', label: 'Nombre d’employés', kind: 'select', options: ['1 à 9', '10 à 49', '50 à 249', '250 et plus'], required: true },
      { key: 'eco.ca', label: 'Chiffre d’affaires annuel', kind: 'select', options: ['Moins de 50 M FCFA', '50 à 200 M FCFA', '200 M à 1 milliard FCFA', 'Plus de 1 milliard FCFA', 'Je préfère ne pas répondre'], required: true },
      { key: 'eco.activites', label: 'Activités principales', kind: 'textarea', required: true },
      { key: 'eco.agri', label: 'Expérience dans le secteur agricole ?', kind: 'yesno', required: true },
      { key: 'eco.agriDetail', label: 'Décrivez cette expérience', kind: 'textarea', showIf: yes('eco.agri') },
      { key: 'eco.presentation', label: 'Présentation de l’entreprise', kind: 'textarea' },
    ],
  },
  finance(true),
  objectifs(true),
  filieres,
  {
    title: 'Documents de l’entreprise',
    intro: DOC_HINT,
    fields: [],
    docs: [
      { key: 'doc.rccm', label: 'Extrait RCCM', required: true },
      { key: 'doc.fiscal', label: 'Document d’identification fiscale', required: true },
      { key: 'doc.statuts', label: 'Statuts de l’entreprise', required: true },
      { key: 'doc.presentation', label: 'Présentation de l’entreprise' },
      { key: 'doc.financier', label: 'États financiers, si demandés' },
      { key: 'doc.mandat', label: 'Mandat ou procuration, le cas échéant' },
    ],
  },
];

export const stepsFor = (t?: InvestorType) => (t === 'entreprise' ? STEPS_ENTREPRISE : STEPS_PARTICULIER);

const empty = (v?: Val) => (Array.isArray(v) ? v.length === 0 : !v || !v.trim());
export const visible = (f: IField, d: Data) => !f.showIf || f.showIf(d);

/** Erreurs d'une étape : clé du champ ou du document → message. */
export function stepErrors(step: IStep, d: Data, docs: Record<string, string>): Record<string, string> {
  const e: Record<string, string> = {};
  for (const f of step.fields) {
    if (!visible(f, d)) continue;
    const v = d[f.key];
    if (f.required && empty(v)) { e[f.key] = f.kind === 'chips' || f.kind === 'multi' ? 'Choisissez au moins une option.' : f.kind === 'photo' ? 'Ajoutez la photo de la pièce.' : 'Ce champ est obligatoire.'; continue; }
    if (typeof v === 'string' && v.trim()) {
      if (f.kind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) e[f.key] = 'Adresse e-mail invalide.';
      if (f.kind === 'tel' && v.replace(/\D/g, '').length < 10) e[f.key] = 'Numéro à 10 chiffres au moins.';
    }
  }
  /* Dates (format AAAA-MM-JJ du sélecteur) : pièce non expirée, investisseur particulier majeur. */
  const now = new Date();
  const iso = (dt: Date) => dt.toISOString().slice(0, 10);
  /* Date d'expiration de la pièce : facultative et non contrôlée pour le moment. */
  const birth = d['id.naissance'];
  if (step.fields.some((f) => f.key === 'id.naissance') && typeof birth === 'string' && birth) {
    const adult = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
    if (birth > iso(adult)) e['id.naissance'] = 'L’investisseur doit être majeur (18 ans au moins).';
  }
  const min = Number(d['fin.min'] || 0);
  const max = Number(d['fin.max'] || 0);
  if (step.fields.some((f) => f.key === 'fin.max') && min && max && min > max) e['fin.max'] = 'Le maximum doit être supérieur au minimum.';
  for (const doc of step.docs ?? []) if (doc.required && !docs[doc.key]) e[doc.key] = 'Ce document est obligatoire.';
  return e;
}

/** Part des éléments obligatoires remplis, en pourcentage. */
export function completion(dossier: Dossier): number {
  if (!dossier.type) return 0;
  let total = 1;
  let done = 1; // statut choisi
  for (const step of stepsFor(dossier.type)) {
    for (const f of step.fields) if (f.required && visible(f, dossier.data)) { total++; if (!empty(dossier.data[f.key])) done++; }
    for (const doc of step.docs ?? []) if (doc.required) { total++; if (dossier.docs[doc.key]) done++; }
  }
  return Math.round((done / total) * 100);
}

/** Référence unique du dossier, ex. INV-2026-048213. */
export const newDossierRef = () => `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')}`;

/** Valeur lisible d'un champ dans le récapitulatif. */
export function display(f: IField, v?: Val): string {
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  if (!v || !v.trim()) return '—';
  if (f.kind === 'photo') return 'Photo jointe';
  if (f.kind === 'date') return v.split('-').reverse().join('/');
  if (f.kind === 'amount') return `${String(Number(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`;
  return v;
}
