import { useSyncExternalStore } from 'react';
import type { Tone } from './ui';

/* Données fictives de la maquette. À remplacer par l'API sans toucher aux écrans. */

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
};

export type EventKind = 'obs' | 'trt' | 'vac';

export type HealthEvent = {
  kind: EventKind;
  date: string;
  title: string;
  text: string;
  proof: Proof;
  file?: string;
  /** Saisi hors connexion, pas encore envoyé. */
  pending?: boolean;
};

let animals: Animal[] = [
  { id: 'FK-0142', species: 'bovin', name: 'Taurillon Zébu Goudali', details: 'Mâle, 26 mois, 312 kg', status: 'En vente', tone: 'sp', officialId: 'CI-BOV-2024-•••4817' },
  { id: 'FK-0087', species: 'bovin', name: 'Vache N’Dama', details: 'Femelle, 5 ans, gestante', status: 'À jour', tone: 'green' },
  { id: 'FK-0091', species: 'bovin', name: 'Génisse métisse', details: 'Femelle, 19 mois, 241 kg', status: 'À jour', tone: 'green' },
  { id: 'FK-0119', species: 'ovin', name: 'Brebis Djallonké', details: 'Femelle, 3 ans, alerte ouverte', status: 'Alerte', tone: 'red' },
  { id: 'FK-0124', species: 'ovin', name: 'Bélier Sahélien', details: 'Mâle, 2 ans, 58 kg', status: 'Rappel dû', tone: 'amber' },
  { id: 'FK-0125', species: 'ovin', name: 'Bélier Sahélien', details: 'Mâle, 2 ans, 61 kg', status: 'Sous traitement', tone: 'blue' },
  { id: 'FK-0133', species: 'caprin', name: 'Chèvre Djallonké', details: 'Femelle, 2 ans', status: 'À jour', tone: 'green' },
  { id: 'FK-0150', species: 'bovin', name: 'Veau N’Dama', details: 'Mâle, 3 mois, ID à renseigner', status: 'ID manquant', tone: 'grey' },
];

/* Dossier sanitaire du taurillon FK-0142 (modèle partagé par les autres animaux en démo). */
let events: HealthEvent[] = [
  { kind: 'vac', date: '02/10/2026', title: 'Vaccination péripneumonie (PPCB)', text: 'Dr Y. Coulibaly, vétérinaire mandaté. Voie sous-cutanée. Lot PB-2291.', proof: 'verified', file: 'Attestation_PPCB.pdf' },
  { kind: 'trt', date: '15/08/2026', title: 'Déparasitage interne', text: 'Ivermectine 1 %, 1 ml / 50 kg. Administré par A. Koné.', proof: 'documented', file: 'Facture_pharmacie_vet.jpg' },
  { kind: 'obs', date: '03/08/2026', title: 'Observation clôturée', text: 'Toux disparue après 6 jours. Appétit normal.', proof: 'declared' },
  { kind: 'trt', date: '29/07/2026', title: 'Traitement prescrit', text: 'Oxytétracycline LA, 1 injection. Prescription du Dr Coulibaly après examen.', proof: 'verified', file: 'Ordonnance_0729.pdf' },
  { kind: 'obs', date: '28/07/2026', title: 'Observation : toux légère', text: 'Toux sèche le matin, appétit conservé. Priorité faible.', proof: 'declared' },
  { kind: 'vac', date: '10/03/2026', title: 'Vaccination dermatose nodulaire', text: 'Campagne départementale, Dr Y. Coulibaly.', proof: 'verified' },
];

/* Effectifs de la maquette (18, 22, 6) : animaux non listés + animaux listés. */
const UNLISTED: Record<Species, number> = { bovin: 14, ovin: 19, caprin: 5 };

const listeners = new Set<() => void>();
let version = 0;
const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

export const store = {
  animals: () => animals,
  events: () => events,
  animal: (id: string) => animals.find((a) => a.id === id) ?? animals[0],
  count: (s: Species) => UNLISTED[s] + animals.filter((a) => a.species === s).length,
  total: () => (['bovin', 'ovin', 'caprin'] as Species[]).reduce((n, s) => n + store.count(s), 0),
  addAnimal(a: Animal) {
    animals = [a, ...animals];
    emit();
  },
  addEvent(e: HealthEvent) {
    events = [e, ...events];
    emit();
  },

  /* Panier de la maquette : taurillon (650 000) + sacs d'aliment (14 500 l'unité). */
  cart: () => cart,
  setCart(c: Partial<Cart>) {
    cart = { ...cart, ...c };
    emit();
  },
  cartTotals() {
    const feed = cart.bags * 14500;
    const items = 650000 + feed;
    const shipping = cart.delivery ? 25000 : 0;
    return { feed, items, shipping, total: items + shipping };
  },
};

export type Cart = { bags: number; delivery: boolean; method: string };
let cart: Cart = { bags: 4, delivery: true, method: 'Orange Money' };

/** 733000 → « 733 000 » */
export const fcfa = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

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
