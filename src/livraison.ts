/*
  Livraison : choix du véhicule et prix, selon la nature du produit, la quantité et la distance.
  Les distances sont estimées à vol d'oiseau entre villes, multipliées par 1,2 pour approcher la route.
  Les tarifs sont des valeurs de départ pour la démonstration, à valider avec des transporteurs de Korhogo.
*/

export type Place = { name: string; lat: number; lng: number };

/** Villes et villages de la zone pilote et grandes villes du pays (coordonnées approchées). */
export const PLACES: Place[] = [
  { name: 'Korhogo', lat: 9.458, lng: -5.629 },
  { name: 'Sinématiali', lat: 9.583, lng: -5.383 },
  { name: 'Ferkessédougou', lat: 9.593, lng: -5.197 },
  { name: 'Napiéolédougou', lat: 9.27, lng: -5.57 },
  { name: 'Dikodougou', lat: 9.067, lng: -5.767 },
  { name: 'M’Bengué', lat: 10.002, lng: -5.9 },
  { name: 'Ouangolodougou', lat: 9.968, lng: -5.15 },
  { name: 'Boundiali', lat: 9.522, lng: -6.487 },
  { name: 'Niakaramadougou', lat: 8.66, lng: -5.29 },
  { name: 'Kong', lat: 9.15, lng: -4.61 },
  { name: 'Tengréla', lat: 10.48, lng: -6.41 },
  { name: 'Odienné', lat: 9.51, lng: -7.56 },
  { name: 'Katiola', lat: 8.14, lng: -5.1 },
  { name: 'Bouaké', lat: 7.69, lng: -5.03 },
  { name: 'Yamoussoukro', lat: 6.82, lng: -5.28 },
  { name: 'Daloa', lat: 6.88, lng: -6.45 },
  { name: 'Man', lat: 7.41, lng: -7.55 },
  { name: 'San-Pédro', lat: 4.75, lng: -6.64 },
  { name: 'Abidjan-Plateau', lat: 5.32, lng: -4.02 },
  { name: 'Cocody', lat: 5.36, lng: -3.97 },
  { name: 'Yopougon', lat: 5.34, lng: -4.08 },
  { name: 'Abobo', lat: 5.42, lng: -4.02 },
  { name: 'Bingerville', lat: 5.355, lng: -3.885 },
  { name: 'Anyama', lat: 5.49, lng: -4.05 },
  { name: 'Azaguié', lat: 5.63, lng: -4.08 },
  { name: 'Abidjan', lat: 5.36, lng: -4.01 },
];

const fold = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '').toLowerCase();

/** Lieu reconnu dans un texte libre (« route de Dikodougou, Korhogo » → Korhogo : le dernier nommé). */
export function placeOf(text?: string): Place | null {
  if (!text) return null;
  const t = fold(text);
  let best: Place | null = null;
  let at = -1;
  for (const p of PLACES) {
    /* Mot entier : « Man » ne doit pas être trouvé dans « Romane ». */
    const re = new RegExp(`(^|[^a-z])${fold(p.name.replace(/^Abidjan-/, '')).replace(/-/g, '[- ]?')}(?![a-z])`, 'g');
    let i = -1;
    for (const m of t.matchAll(re)) i = (m.index ?? 0) + m[1].length;
    if (i > at || (i === at && i >= 0 && best && p.name.length > best.name.length)) { best = p; at = i; }
  }
  return at >= 0 ? best : null;
}

/** Distance estimée par la route, en km (vol d'oiseau × 1,2, au km près). */
export function roadKm(a: Place, b: Place): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  const km = 2 * 6371 * Math.asin(Math.sqrt(h));
  return Math.max(2, Math.round(km * 1.2));
}

export type VehicleId = 'moto' | 'tricycle' | 'pickup' | 'betaillere' | 'camion' | 'frigo' | 'groupage';
export type Vehicle = {
  id: VehicleId; label: string; kg: number; km: number; base: number; perKm: number;
  bovins: number; ovins: number; fresh: boolean; zone: number; what: string;
};

/** Ce que chaque véhicule peut faire. `zone` : rayon d'action maximum autour de la base du livreur. */
export const VEHICLES: Vehicle[] = [
  { id: 'moto', label: 'Moto', kg: 60, km: 20, base: 500, perKm: 100, bovins: 0, ovins: 0, fresh: true, zone: 15, what: 'petits produits, volailles en caisse, frais en glacière' },
  { id: 'tricycle', label: 'Tricycle', kg: 500, km: 30, base: 1500, perKm: 200, bovins: 0, ovins: 6, fresh: false, zone: 30, what: 'sacs, récoltes, jusqu’à 6 petits ruminants' },
  { id: 'pickup', label: 'Pick-up bâché', kg: 1500, km: 150, base: 3000, perKm: 300, bovins: 0, ovins: 0, fresh: false, zone: 50, what: 'sacs, récoltes, matériel' },
  { id: 'betaillere', label: 'Petite bétaillère', kg: 2000, km: 200, base: 10000, perKm: 400, bovins: 2, ovins: 10, fresh: false, zone: 100, what: 'jusqu’à 2 bovins ou 10 ovins' },
  { id: 'camion', label: 'Camion (bétail ou marchandises)', kg: 15000, km: 600, base: 25000, perKm: 700, bovins: 15, ovins: 60, fresh: false, zone: 150, what: 'gros lots, jusqu’à 15 bovins ou 60 ovins' },
  { id: 'frigo', label: 'Camion frigorifique', kg: 3000, km: 300, base: 8000, perKm: 450, bovins: 0, ovins: 0, fresh: true, zone: 50, what: 'viande, poulets prêts à cuire' },
];
export const GROUPAGE: Vehicle = { id: 'groupage', label: 'Groupage (camion partagé)', kg: 300, km: 1000, base: 0, perKm: 0, bovins: 0, ovins: 0, fresh: false, zone: 0, what: 'petites quantités qui vont loin' };
export const vehicleOf = (id?: string): Vehicle | undefined => [...VEHICLES, GROUPAGE].find((v) => v.id === id);
/** Véhicules qu'un livreur peut déclarer. */
export const COURIER_VEHICLES = VEHICLES;

/** Commission de SAVAA sur chaque livraison. */
export const COMMISSION = 0.05;
export const payout = (fee: number) => Math.round(fee * (1 - COMMISSION));

export type Load = { kg: number; bovins: number; ovins: number; fresh: boolean };
export const EMPTY_LOAD: Load = { kg: 0, bovins: 0, ovins: 0, fresh: false };

/** Poids de quelques annonces sans unité de poids (matériel). */
const WEIGHT: Record<string, number> = { 'L-COUVEUSE': 60, 'L-BASCULE': 250, 'L-TOURTEAU': 30 };
const FRESH = /viande|pr[eê]ts? à cuire|carcasse|poisson|abats/i;

/** Ce que représente une ligne de commande : poids, têtes de bétail, produit frais. Un service ne se livre pas. */
export function loadOf(l: { id: string; title: string; category: string; unit?: string }, qty: number): Load {
  if (l.category.startsWith('Services')) return EMPTY_LOAD;
  const fresh = FRESH.test(l.title);
  if (l.category.startsWith('Animaux')) {
    const lot = /lot de (\d+)/i.exec(l.title);
    const per = l.unit === 'la paire' ? 2 : l.unit === 'le lot' && lot ? Number(lot[1]) : 1;
    const heads = per * qty;
    return l.category.includes('Bovins') ? { kg: heads * 300, bovins: heads, ovins: 0, fresh } : { kg: heads * 40, bovins: 0, ovins: heads, fresh };
  }
  const bag = /(\d+)\s*kg/i.exec(l.title);
  const unitKg = WEIGHT[l.id]
    ?? (l.unit === 'le kg' ? 1 : l.unit === 'le plateau' ? 2 : l.unit === 'le poussin' ? 0.05 : l.unit === 'le pack' ? 25 : bag && /sac|bidon|seau/i.test(l.title) ? Number(bag[1]) : 20);
  return { kg: Math.round(unitKg * qty * 10) / 10, bovins: 0, ovins: 0, fresh };
}
export const addLoads = (loads: Load[]): Load => loads.reduce((a, b) => ({ kg: a.kg + b.kg, bovins: a.bovins + b.bovins, ovins: a.ovins + b.ovins, fresh: a.fresh || b.fresh }), EMPTY_LOAD);

/** Le véhicule peut-il faire ce transport (nature, quantité, distance) ? */
export function canCarry(v: Vehicle, load: Load, km: number): boolean {
  if (v.id === 'groupage') return !load.bovins && !load.ovins && !load.fresh && load.kg <= v.kg && km > 30;
  if (km > v.km || load.kg > v.kg) return false;
  if (load.bovins > v.bovins || load.ovins > v.ovins) return false;
  if (load.fresh && !v.fresh) return false;
  if (load.fresh && v.id === 'moto' && km > 20) return false;
  return true;
}

const round500 = (x: number) => Math.max(500, Math.round(x / 500) * 500);

/** Prix d'une livraison : prise en charge + km, majoré si le véhicule est rempli à plus de moitié, plus la manutention des animaux. */
export function deliveryPrice(v: Vehicle, load: Load, km: number, urgent = false): number {
  let p: number;
  if (v.id === 'groupage') p = Math.max(1500, (load.kg * 10 * km) / 100);
  else {
    p = v.base + v.perKm * km;
    const fill = Math.max(load.kg / v.kg, v.bovins ? load.bovins / v.bovins : 0, v.ovins ? load.ovins / v.ovins : 0);
    if (fill > 0.5) p *= 1.2;
    p += load.bovins * 1000 + load.ovins * 300;
  }
  return round500(urgent ? p * 1.3 : p);
}

export type DeliveryOption = { vehicle: Vehicle; price: number };

/** Véhicules possibles, du moins cher au plus cher. Vide si aucun ne peut faire le transport en un voyage. */
export function deliveryOptions(load: Load, km: number, urgent = false): DeliveryOption[] {
  return [...VEHICLES, GROUPAGE]
    .filter((v) => canCarry(v, load, km))
    .map((vehicle) => ({ vehicle, price: deliveryPrice(vehicle, load, km, urgent && vehicle.id !== 'groupage') }))
    .sort((a, b) => a.price - b.price);
}

/** Raison lisible du choix : « Tricycle : 100 kg sur 12 km ». */
export function loadLabel(load: Load): string {
  const parts = [
    load.bovins ? `${load.bovins} bovin${load.bovins > 1 ? 's' : ''}` : '',
    load.ovins ? `${load.ovins} petit${load.ovins > 1 ? 's' : ''} ruminant${load.ovins > 1 ? 's' : ''}` : '',
    !load.bovins && !load.ovins ? (load.kg >= 1000 ? `${String(Math.round(load.kg / 100) / 10).replace('.', ',')} t` : `${Math.round(load.kg)} kg`) : '',
  ].filter(Boolean);
  return `${parts.join(' et ')}${load.fresh ? ', produit frais' : ''}`;
}
