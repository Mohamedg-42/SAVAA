/*
  Côté administration de l'espace investisseur : dossiers reçus, catalogue de projets, rapprochement et propositions.
  Démonstration sans serveur : le dossier de l'investisseur connecté sur cet appareil (« local ») est lu et modifié
  directement ; les autres dossiers et projets sont des exemples fictifs.
  Le rapprochement aide l'administrateur à choisir, il ne décide jamais à sa place.
*/
import { EMPTY_DOSSIER, type Data, type Dossier, type DossierStatus } from './invest';

export type AdminDossier = Dossier & { id: string; name: string; phone: string; email: string; local?: boolean; notes: { date: string; by: string; text: string }[] };

export type ProjectStatus = 'brouillon' | 'publie' | 'depublie' | 'archive';
export type Project = {
  id: string;
  name: string;
  presentation: string;
  filiere: string;
  region: string;
  localisation: string;
  superficie: string;
  capacite: string;
  budget: number;
  recherche: number;
  finance: number;
  duree: string;
  risque: string;
  objectifs: string;
  besoins: string;
  risques: string;
  conditions: string;
  /** Photo du projet (image réduite ou fichier de démonstration). Sans photo, la carte affiche la filière. */
  photo?: string;
  status: ProjectStatus;
};

export const PROJECT_STATUS: Record<ProjectStatus, { label: string; tone: 'grey' | 'green' | 'amber' }> = {
  brouillon: { label: 'Brouillon', tone: 'grey' },
  publie: { label: 'Publié', tone: 'green' },
  depublie: { label: 'Dépublié', tone: 'amber' },
  archive: { label: 'Archivé', tone: 'grey' },
};

export type ProposalStatus = 'recue' | 'consultation' | 'interet' | 'rdv' | 'negociation' | 'acceptee' | 'declinee' | 'cloturee';
export const PROPOSAL_STATUS: Record<ProposalStatus, { label: string; tone: 'grey' | 'blue' | 'amber' | 'green' | 'red' }> = {
  recue: { label: 'Proposition reçue', tone: 'blue' },
  consultation: { label: 'En cours de consultation', tone: 'blue' },
  interet: { label: 'Intérêt manifesté', tone: 'green' },
  rdv: { label: 'Rendez-vous demandé', tone: 'amber' },
  negociation: { label: 'Négociation en cours', tone: 'amber' },
  acceptee: { label: 'Acceptée pour étude approfondie', tone: 'green' },
  declinee: { label: 'Déclinée', tone: 'grey' },
  cloturee: { label: 'Clôturée', tone: 'grey' },
};

export type Proposal = {
  id: string;
  dossierId: string;
  projectId: string;
  message: string;
  amount: number;
  conditions: string;
  deadline: string;
  date: string;
  status: ProposalStatus;
  question?: string;
};

export const KEYS = { local: 'invest.dossier', admin: 'invest.admin.dossiers', projects: 'invest.projects', proposals: 'invest.props' } as const;
export const LOCAL_ID = 'local';

/* ------------------------------------------------------------------ */
/* Exemples fictifs (démonstration)                                    */
/* ------------------------------------------------------------------ */

const seed = (id: string, name: string, type: Dossier['type'], status: DossierStatus, date: string, data: Data, phone: string, email: string, history: AdminDossier['history']): AdminDossier => ({
  ...EMPTY_DOSSIER, id, name, type, status, data, phone, email, docs: { 'doc.piece': 'exemple', 'doc.rccm': 'exemple', 'doc.fiscal': 'exemple', 'doc.statuts': 'exemple', 'doc.pieceRep': 'exemple' },
  step: 99, ref: `INV-2026-${id.slice(-6)}`, submittedAt: date, history, notes: [],
});

export const SEED_DOSSIERS: AdminDossier[] = [
  seed('EX-000412', 'Kouamé N’Guessan (exemple)', 'particulier', 'soumis', '17/11/2026', {
    'fin.min': '5000000', 'fin.max': '15000000', 'fin.tranche': '10 000 000 à 25 000 000 FCFA', 'pref.filieres': ['Élevage de volailles', 'Maraîchage'],
    'pref.prioritaire': 'Élevage de volailles', 'pref.regions': ['District autonome d’Abidjan', 'Agnéby-Tiassa'], 'obj.duree': 'Moyen terme (2 à 5 ans)', 'obj.risque': 'Risque modéré',
    'part.modes': ['Apport financier'], 'fin.deja': 'Non',
  }, '0708123456', 'kouame.exemple@mail.ci', [{ date: '17/11/2026', status: 'soumis', by: 'Investisseur' }]),
  seed('EX-000377', 'Agro-Invest Bélier SARL (exemple)', 'entreprise', 'analyse', '12/11/2026', {
    'fin.min': '50000000', 'fin.max': '120000000', 'fin.tranche': 'Plus de 100 000 000 FCFA', 'pref.filieres': ['Anacarde', 'Transformation agroalimentaire'],
    'pref.prioritaire': 'Anacarde', 'pref.regions': ['Gbêkê', 'Hambol', 'Poro'], 'obj.duree': 'Long terme (plus de 5 ans)', 'obj.risque': 'Risque modéré',
    'part.modes': ['Apport financier', 'Accompagnement stratégique'], 'fin.origine': 'Fonds propres', 'ent.rccm': 'CI-YAM-2019-B-00000 (exemple)',
  }, '0505000000', 'contact@exemple-agroinvest.ci', [{ date: '12/11/2026', status: 'soumis', by: 'Investisseur' }, { date: '14/11/2026', status: 'analyse', by: 'Équipe SAVAA' }]),
  seed('EX-000351', 'Fatoumata Diabaté (exemple)', 'particulier', 'complement', '08/11/2026', {
    'fin.min': '1000000', 'fin.max': '3000000', 'fin.tranche': '1 000 000 à 5 000 000 FCFA', 'pref.filieres': ['Banane plantain', 'Manioc'],
    'pref.prioritaire': 'Banane plantain', 'pref.regions': ['Sud-Comoé'], 'obj.duree': 'Court terme (moins de 2 ans)', 'obj.risque': 'Non, risque faible',
    'part.modes': ['Apport financier', 'Mise à disposition de terrains'],
  }, '0102030405', 'fatoumata.exemple@mail.ci', [{ date: '08/11/2026', status: 'soumis', by: 'Investisseur' }, { date: '10/11/2026', status: 'complement', by: 'Équipe SAVAA', note: 'Pièce d’identité illisible : merci d’en envoyer une photo nette.' }]),
  seed('EX-000298', 'Coopérative Espoir du Nawa (exemple)', 'entreprise', 'valide', '30/10/2026', {
    'fin.min': '20000000', 'fin.max': '40000000', 'fin.tranche': '25 000 000 à 50 000 000 FCFA', 'pref.filieres': ['Cacao', 'Production de semences et d’intrants'],
    'pref.prioritaire': 'Cacao', 'pref.regions': ['Nawa', 'San-Pédro'], 'obj.duree': 'Moyen terme (2 à 5 ans)', 'obj.risque': 'Risque modéré',
    'part.modes': ['Apport financier', 'Partenariat technique'],
  }, '0748000000', 'espoir.nawa.exemple@mail.ci', [{ date: '30/10/2026', status: 'soumis', by: 'Investisseur' }, { date: '02/11/2026', status: 'analyse', by: 'Équipe SAVAA' }, { date: '06/11/2026', status: 'valide', by: 'Équipe SAVAA' }]),
];

export const SEED_PROJECTS: Project[] = [
  {
    id: 'PRJ-01', name: 'Ferme avicole de 10 000 poulets de chair (exemple)', filiere: 'Élevage de volailles', region: 'Agnéby-Tiassa', localisation: 'Azaguié',
    presentation: 'Bâtiments d’élevage et abattoir de proximité pour approvisionner les restaurants d’Abidjan.', superficie: '2 ha', capacite: '10 000 poulets par bande, 6 bandes par an',
    budget: 45000000, recherche: 25000000, finance: 12000000, duree: 'Moyen terme (2 à 5 ans)', risque: 'Risque modéré',
    objectifs: 'Approvisionnement régulier des restaurants et hôtels.', besoins: 'Vétérinaire de suivi, chaîne du froid.', risques: 'Maladies aviaires, prix de l’aliment.', conditions: 'Participation à partir de 5 000 000 FCFA.', photo: '/images/poussins-chair.jpg', status: 'publie',
  },
  {
    id: 'PRJ-02', name: 'Unité de décorticage d’anacarde (exemple)', filiere: 'Anacarde', region: 'Gbêkê', localisation: 'Bouaké',
    presentation: 'Transformation locale de noix brutes en amandes pour l’export.', superficie: '1 ha bâti', capacite: '1 500 t de noix brutes par an',
    budget: 300000000, recherche: 150000000, finance: 60000000, duree: 'Long terme (plus de 5 ans)', risque: 'Risque élevé',
    objectifs: 'Valoriser l’anacarde sur place et créer 80 emplois.', besoins: 'Décortiqueuses, séchoirs, certification.', risques: 'Cours mondiaux, approvisionnement.', conditions: 'Investisseurs institutionnels ou consortium.', photo: '/images/noix-cajou.jpg', status: 'publie',
  },
  {
    id: 'PRJ-03', name: 'Plantation de banane plantain irriguée (exemple)', filiere: 'Banane plantain', region: 'Sud-Comoé', localisation: 'Aboisso',
    presentation: 'Plantation de 8 ha avec irrigation goutte-à-goutte et vente aux grossistes d’Abidjan.', superficie: '8 ha', capacite: '160 t par an',
    budget: 18000000, recherche: 6000000, finance: 3500000, duree: 'Court terme (moins de 2 ans)', risque: 'Non, risque faible',
    objectifs: 'Production régulière toute l’année.', besoins: 'Forage, système d’irrigation.', risques: 'Sécheresse, prix de gros.', conditions: 'Participation à partir de 1 000 000 FCFA.', status: 'publie',
  },
  {
    id: 'PRJ-04', name: 'Pépinière de cacao certifiée (exemple)', filiere: 'Cacao', region: 'Nawa', localisation: 'Soubré',
    presentation: 'Production de plants de cacao améliorés pour la replantation.', superficie: '3 ha', capacite: '300 000 plants par an',
    budget: 60000000, recherche: 35000000, finance: 5000000, duree: 'Moyen terme (2 à 5 ans)', risque: 'Risque modéré',
    objectifs: 'Fournir des plants sains aux coopératives de la région.', besoins: 'Ombrières, eau, agrément.', risques: 'Maladies du cacaoyer.', conditions: 'Participation à partir de 10 000 000 FCFA.', status: 'publie',
  },
  {
    id: 'PRJ-05', name: 'Pisciculture en cages (exemple)', filiere: 'Aquaculture et pisciculture', region: 'Bélier', localisation: 'Lac de Kossou',
    presentation: 'Élevage de tilapia en cages flottantes.', superficie: '20 cages', capacite: '120 t par an',
    budget: 80000000, recherche: 40000000, finance: 0, duree: 'Moyen terme (2 à 5 ans)', risque: 'Risque élevé',
    objectifs: 'Réduire les importations de poisson.', besoins: 'Alevins, aliment flottant.', risques: 'Qualité de l’eau.', conditions: 'En préparation.', status: 'brouillon',
  },
];

/* ------------------------------------------------------------------ */
/* Rapprochement investisseur / projet                                 */
/* ------------------------------------------------------------------ */

const RISK_LEVEL: Record<string, number> = { 'Non, risque faible': 0, 'Risque modéré': 1, 'Oui, risque élevé': 2, 'Risque élevé': 2 };
const list = (v: Data[string] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
export const remaining = (p: Project) => Math.max(0, p.recherche - p.finance);

export type Match = { score: number; reasons: string[]; warnings: string[] };

/**
 * Note de correspondance sur 100, avec les raisons et les points d'attention.
 * Critères : budget, filières, régions, durée, risque, mode de participation, expérience.
 */
export function matchProject(d: Dossier, p: Project): Match {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 0;
  const min = Number(d.data['fin.min'] || 0);
  const max = Number(d.data['fin.max'] || 0);
  const rest = remaining(p);

  if (max && rest) {
    if (max >= rest && min <= rest) { score += 30; reasons.push('Le montant restant à financer entre dans sa fourchette'); }
    else if (max < rest && max >= rest * 0.2) { score += 18; reasons.push('Peut financer une part du montant restant'); }
    else if (min > rest) { score += 5; warnings.push('Son budget minimum dépasse le montant restant'); }
    else warnings.push('Budget trop faible pour ce projet');
  }

  if (d.data['pref.prioritaire'] === p.filiere) { score += 30; reasons.push(`Filière prioritaire : ${p.filiere}`); }
  else if (list(d.data['pref.filieres']).includes(p.filiere)) { score += 20; reasons.push(`Filière retenue : ${p.filiere}`); }

  if (list(d.data['pref.regions']).includes(p.region)) { score += 20; reasons.push(`Région souhaitée : ${p.region}`); }

  if (d.data['obj.duree'] === p.duree) { score += 10; reasons.push('Durée compatible'); }

  const accepted = RISK_LEVEL[String(d.data['obj.risque'] ?? '')];
  const projectRisk = RISK_LEVEL[p.risque];
  if (accepted !== undefined && projectRisk !== undefined) {
    if (projectRisk <= accepted) { score += 10; reasons.push('Niveau de risque accepté'); }
    else warnings.push('Projet plus risqué que ce qu’il accepte');
  }

  if (list(d.data['part.modes']).length && !list(d.data['part.modes']).includes('Apport financier')) warnings.push('Ne prévoit pas d’apport financier');
  if (d.data['fin.deja'] === 'Non' && projectRisk === 2) warnings.push('Première expérience d’investissement agricole');

  return { score: Math.min(100, score), reasons, warnings };
}

/** Projets publiés classés du plus au moins pertinent. */
export const rankProjects = (d: Dossier, projects: Project[]) =>
  projects.filter((p) => p.status === 'publie').map((p) => ({ p, m: matchProject(d, p) })).sort((a, b) => b.m.score - a.m.score);

export const newProposalId = () => `PROP-${Date.now().toString(36).toUpperCase()}`;
export const newProjectId = () => `PRJ-${Date.now().toString(36).toUpperCase()}`;
