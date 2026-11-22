import { describe, expect, it } from 'vitest';
import { GROUPAGE, VEHICLES, addLoads, deliveryOptions, deliveryPrice, loadLabel, loadOf, payout, placeOf, roadKm } from './livraison';

const v = (id: string) => VEHICLES.find((x) => x.id === id) ?? GROUPAGE;
const SAC = { id: 'ALIM-50', title: 'Aliment bétail engraissement, sac de 50 kg', category: 'Aliments et intrants', unit: 'le sac' };
const TAUREAU = { id: 'FK-0142', title: 'Taurillon Zébu Goudali', category: 'Animaux, Bovins' };
const BELIERS = { id: 'L-BELIERS', title: 'Béliers Sahéliens, lot de 6', category: 'Animaux, Ovins', unit: 'la tête' };
const OEUFS = { id: 'L-OEUFS', title: 'Œufs frais de ferme, plateau de 30', category: 'Volailles et poussins', unit: 'le plateau' };

describe('lieux et distances', () => {
  it('reconnaît le dernier lieu nommé, sans accents ni faux positifs', () => {
    expect(placeOf('Ferme Ouattara, route de Dikodougou, Korhogo')?.name).toBe('Korhogo');
    expect(placeOf('sinematiali, 12 km')?.name).toBe('Sinématiali');
    expect(placeOf('Cocody, Riviera 3')?.name).toBe('Cocody');
    expect(placeOf('Chez Romane, quartier inconnu')).toBeNull();
  });
  it('estime la distance par la route', () => {
    const k = placeOf('Korhogo')!;
    expect(roadKm(k, placeOf('Ferkessédougou')!)).toBeGreaterThan(50);
    expect(roadKm(k, placeOf('Bouaké')!)).toBeGreaterThan(200);
    expect(roadKm(k, k)).toBe(2);
  });
});

describe('charge d’une commande', () => {
  it('compte les sacs, les têtes et les lots', () => {
    expect(loadOf(SAC, 2)).toEqual({ kg: 100, bovins: 0, ovins: 0, fresh: false });
    expect(loadOf(TAUREAU, 1).bovins).toBe(1);
    expect(loadOf(BELIERS, 6).ovins).toBe(6);
    expect(loadOf({ id: 'X', title: 'Brebis, lot de 5', category: 'Animaux, Ovins', unit: 'le lot' }, 1).ovins).toBe(5);
    expect(loadOf(OEUFS, 5).kg).toBe(10);
    expect(loadOf({ id: 'S', title: 'Forfait suivi', category: 'Services' }, 1).kg).toBe(0);
    expect(loadOf({ id: 'P', title: 'Poulets prêts à cuire', category: 'Volailles et poussins', unit: 'le kg' }, 10).fresh).toBe(true);
  });
  it('décrit la charge', () => {
    expect(loadLabel(addLoads([loadOf(SAC, 2)]))).toBe('100 kg');
    expect(loadLabel(loadOf(BELIERS, 6))).toBe('6 petits ruminants');
  });
});

describe('choix du véhicule et prix', () => {
  it('5 plateaux d’œufs en ville : moto', () => {
    expect(deliveryOptions(loadOf(OEUFS, 5), 6)[0].vehicle.id).toBe('moto');
  });
  it('2 sacs à 12 km : tricycle, 4 000 FCFA', () => {
    const [best] = deliveryOptions(loadOf(SAC, 2), 12);
    expect(best.vehicle.id).toBe('tricycle');
    expect(best.price).toBe(4000);
  });
  it('2 sacs jusqu’à Bouaké (230 km) : groupage à 2 500 FCFA, pick-up à 72 000 FCFA', () => {
    const opts = deliveryOptions(loadOf(SAC, 2), 230);
    expect(opts[0].vehicle.id).toBe('groupage');
    expect(opts[0].price).toBe(2500);
    expect(deliveryPrice(v('pickup'), loadOf(SAC, 2), 230)).toBe(72000);
  });
  it('1 taurillon à 25 km : petite bétaillère, 21 000 FCFA', () => {
    const [best] = deliveryOptions(loadOf(TAUREAU, 1), 25);
    expect(best.vehicle.id).toBe('betaillere');
    expect(best.price).toBe(21000);
  });
  it('6 béliers à 54 km : trop loin pour un tricycle, petite bétaillère à 39 500 FCFA', () => {
    const [best] = deliveryOptions(loadOf(BELIERS, 6), 54);
    expect(best.vehicle.id).toBe('betaillere');
    expect(best.price).toBe(39500);
  });
  it('12 bovins à 600 km : camion', () => {
    expect(deliveryOptions(loadOf(TAUREAU, 12), 600)[0].vehicle.id).toBe('camion');
  });
  it('produit frais à 80 km : camion frigorifique seulement', () => {
    const opts = deliveryOptions({ kg: 120, bovins: 0, ovins: 0, fresh: true }, 80);
    expect(opts.map((o) => o.vehicle.id)).toEqual(['frigo']);
  });
  it('20 bovins : aucun véhicule en un voyage', () => {
    expect(deliveryOptions(loadOf(TAUREAU, 20), 30)).toEqual([]);
  });
  it('urgence : +30 %', () => {
    expect(deliveryPrice(v('tricycle'), loadOf(SAC, 2), 12, true)).toBe(5000);
  });
  it('le livreur reçoit le prix moins 5 % de commission', () => {
    expect(payout(21000)).toBe(19950);
  });
});
