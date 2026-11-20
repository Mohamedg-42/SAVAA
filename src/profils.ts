/*
  Informations demandées à l'inscription selon le métier, pour la sécurité des échanges et le suivi.
  Le numéro de pièce d'identité est demandé à tout compte professionnel ; la photo de la pièce et les justificatifs
  sont obligatoires pour les métiers vérifiés (vétérinaire, transporteur, fournisseur). L'équipe SAVAA les contrôle.
*/

export type ProField = {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  numeric?: boolean;
  hint?: string;
};

export type ProDoc = { key: string; label: string; required?: boolean };

export type ProSection = { role: string; title: string; fields: ProField[]; docs: ProDoc[] };

export const PRO_SECTIONS: ProSection[] = [
  {
    role: 'eleveur', title: 'Votre exploitation',
    fields: [
      { key: 'eleveur.ferme', label: 'Nom de l’exploitation', placeholder: 'Ex. Ferme Traoré', required: true },
      { key: 'eleveur.localite', label: 'Village ou localité de l’exploitation', required: true },
      { key: 'eleveur.especes', label: 'Animaux élevés', placeholder: 'Ex. bovins, ovins, volailles', required: true },
      { key: 'eleveur.effectif', label: 'Effectif approximatif', placeholder: 'Ex. 40 têtes', numeric: false },
      { key: 'eleveur.codeEleveur', label: 'Numéro d’éleveur ou de cheptel, s’il existe' },
    ],
    docs: [{ key: 'eleveur.photoFerme', label: 'Photo de l’exploitation ou du troupeau' }],
  },
  {
    role: 'agri', title: 'Votre production',
    fields: [
      { key: 'agri.exploitation', label: 'Exploitation, groupement ou coopérative', required: true },
      { key: 'agri.localite', label: 'Village ou localité des parcelles', required: true },
      { key: 'agri.cultures', label: 'Cultures principales', placeholder: 'Ex. maïs, igname, riz', required: true },
      { key: 'agri.superficie', label: 'Superficie cultivée (ha)', numeric: true },
    ],
    docs: [{ key: 'agri.photoParcelle', label: 'Photo d’une parcelle ou de la récolte' }],
  },
  {
    role: 'vendeur', title: 'Votre commerce',
    fields: [
      { key: 'vendeur.commerce', label: 'Nom du commerce', required: true },
      { key: 'vendeur.emplacement', label: 'Marché ou adresse du point de vente', required: true },
      { key: 'vendeur.rccm', label: 'Numéro RCCM, si l’activité est enregistrée' },
    ],
    docs: [{ key: 'vendeur.photoBoutique', label: 'Photo du point de vente' }],
  },
  {
    role: 'fourn', title: 'Votre entreprise',
    fields: [
      { key: 'fourn.raison', label: 'Raison sociale', required: true },
      { key: 'fourn.rccm', label: 'Numéro RCCM', required: true },
      { key: 'fourn.ncc', label: 'Numéro de compte contribuable (NCC)' },
      { key: 'fourn.siege', label: 'Adresse du siège ou du dépôt', required: true },
      { key: 'fourn.activite', label: 'Activité', options: ['Aliments pour animaux', 'Intrants agricoles', 'Matériel et équipements', 'Produits vétérinaires', 'Plusieurs activités'], required: true },
    ],
    docs: [{ key: 'fourn.docRccm', label: 'Extrait RCCM', required: true }],
  },
  {
    role: 'resto', title: 'Votre établissement',
    fields: [
      { key: 'resto.nom', label: 'Nom de l’établissement', required: true },
      { key: 'resto.type', label: 'Type d’établissement', options: ['Restaurant', 'Hôtel', 'Maquis', 'Cantine ou traiteur', 'Boucherie'], required: true },
      { key: 'resto.adresse', label: 'Adresse de livraison habituelle', required: true },
      { key: 'resto.rccm', label: 'Numéro RCCM, si l’activité est enregistrée' },
    ],
    docs: [],
  },
  {
    role: 'veto', title: 'Votre exercice vétérinaire',
    fields: [
      { key: 'veto.ordre', label: 'Numéro d’inscription à l’Ordre ou d’agrément', required: true },
      { key: 'veto.statut', label: 'Statut', options: ['Docteur vétérinaire', 'Technicien d’élevage', 'Agent habilité des services vétérinaires'], required: true },
      { key: 'veto.structure', label: 'Cabinet, clinique ou service', required: true },
      { key: 'veto.zone', label: 'Zone d’intervention', placeholder: 'Ex. Bouaké et 60 km autour', required: true },
    ],
    docs: [{ key: 'veto.carte', label: 'Carte professionnelle ou diplôme', required: true }],
  },
  {
    role: 'coursier', title: 'Votre véhicule',
    fields: [
      { key: 'coursier.vehicule', label: 'Type de véhicule', options: ['Moto', 'Tricycle', 'Pick-up ou bâché', 'Camion', 'Bétaillère'], required: true },
      { key: 'coursier.immat', label: 'Immatriculation', placeholder: 'Ex. 1234 AB 01', required: true },
      { key: 'coursier.capacite', label: 'Capacité', placeholder: 'Ex. 6 têtes, 2 tonnes' },
      { key: 'coursier.permis', label: 'Numéro du permis de conduire', required: true },
      { key: 'coursier.zone', label: 'Zone de travail', required: true },
    ],
    docs: [{ key: 'coursier.carteGrise', label: 'Carte grise du véhicule', required: true }, { key: 'coursier.photoPermis', label: 'Photo du permis de conduire', required: true }],
  },
];

/** Pièce d'identité : demandée à tout compte professionnel. Sa photo est obligatoire pour les métiers vérifiés. */
export const ID_FIELD: ProField = { key: 'id.numero', label: 'Numéro de la pièce d’identité (CNI, passeport)', required: true };
const STRICT = ['veto', 'coursier', 'fourn'];
export const idPhotoRequired = (roles: string[]) => roles.some((r) => STRICT.includes(r));

export const sectionsFor = (roles: string[]) => PRO_SECTIONS.filter((p) => roles.includes(p.role));
/** Un compte professionnel (tout rôle autre qu'acheteur) complète son profil métier après le choix du rôle. */
export const needsProfile = (roles: string[]) => sectionsFor(roles).length > 0;

/** Champs et justificatifs obligatoires encore vides pour ces rôles (libellés). */
export function missingProfile(roles: string[], pro: Record<string, string> = {}, photos: Record<string, string> = {}): string[] {
  const missing: string[] = [];
  if (!needsProfile(roles)) return missing;
  if (!pro[ID_FIELD.key]?.trim()) missing.push(ID_FIELD.label);
  if (idPhotoRequired(roles) && !photos['id.photo']) missing.push('Photo de la pièce d’identité');
  for (const sec of sectionsFor(roles)) {
    for (const f of sec.fields) if (f.required && !pro[f.key]?.trim()) missing.push(f.label);
    for (const d of sec.docs) if (d.required && !photos[d.key]) missing.push(d.label);
  }
  return missing;
}
