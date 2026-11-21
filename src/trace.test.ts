import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Animal, Listing, Order, TraceSheet } from './data';
import {
  TRACE_CATEGORIES, animalPurpose, animalStatus, newTraceCode, sheetOf, sheetStatus, subsFor, traceCategory, unitPrice, unitQty,
} from './trace';

/* Objets minimaux pour les tests. */
const listing = (patch: Partial<Listing> = {}): Listing => ({
  id: 'L-TEST', title: 'Test', details: '', price: 1000, place: 'Bouaké', seller: 'Vendeur', sellerVerified: true,
  category: 'Récoltes', photo: 'Photo', trace: ['Fiche déclarée', 'grey'], delivery: true, status: 'online', date: '20/11/2026', ...patch,
});
const animal = (patch: Partial<Animal> = {}): Animal => ({ id: 'A-1', species: 'bovin', name: 'Taurillon', details: '', status: 'À jour', tone: 'green', mine: true, ...patch });
const order = (listingId: string): Order => ({
  ref: 'SAV-1', tx: 'TX', date: '20/11/2026', time: '10:00', lines: [{ listingId, title: 'x', seller: 'y', qty: 1, price: 1 }],
  method: 'om', delivery: true, shipping: 0, total: 1, code: '1234',
});
const sheet = (patch: Partial<TraceSheet> = {}): TraceSheet => ({
  code: 'SAV-TRACE-2026-000001', category: 'frais', sub: 'Légumes', extra: {},
  origin: { country: 'Côte d’Ivoire', region: 'R', department: 'D', town: 'T', farm: 'F' },
  sale: { unit: 'kg', minQty: 1, handover: 'Retrait sur place' },
  seller: { name: 'S', phone: '0700000000', actor: 'Producteur', attested: true }, events: [], ...patch,
});

afterEach(() => vi.restoreAllMocks());

describe('code de traçabilité', () => {
  it('suit le format SAV-TRACE-<année>-XXXXXX', () => {
    expect(newTraceCode([])).toMatch(new RegExp(`^SAV-TRACE-${new Date().getFullYear()}-\\d{6}$`));
  });

  it('ne réutilise jamais un code déjà pris', () => {
    const year = new Date().getFullYear();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.123456).mockReturnValueOnce(0.123456).mockReturnValueOnce(0.5);
    const taken = listing({ sheet: sheet({ code: `SAV-TRACE-${year}-123456` }) });
    expect(newTraceCode([taken])).toBe(`SAV-TRACE-${year}-500000`);
  });
});

describe('statut de la fiche', () => {
  it.each([
    ['online', 'Publiée'],
    ['review', 'En modération'],
    ['sold', 'Vendue'],
    ['out', 'Indisponible'],
  ] as const)('annonce %s → %s', (status, label) => {
    expect(sheetStatus(listing({ status })).label).toBe(label);
  });
});

describe('unités de vente', () => {
  it('accorde le pluriel, sauf pour le kg', () => {
    expect(unitQty(1, 'sac')).toBe('1 sac');
    expect(unitQty(3, 'sac')).toBe('3 sacs');
    expect(unitQty(5, 'kg')).toBe('5 kg');
  });
  it('donne le libellé du prix', () => {
    expect(unitPrice('sac')).toBe('le sac');
    expect(unitPrice('tête')).toBe('la tête');
    expect(unitPrice('inconnue')).toBe('l’unité');
  });
});

describe('catégories', () => {
  it('ont des identifiants uniques et au moins une sous-catégorie', () => {
    const ids = TRACE_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of TRACE_CATEGORIES) expect(c.subs.length).toBeGreaterThan(0);
  });

  it('gardent la correspondance avec les anciennes catégories du catalogue', () => {
    expect(traceCategory('vivant')?.legacy('Bovin')).toBe('Animaux, Bovins');
    expect(traceCategory('vivant')?.legacy('Volaille')).toBe('Volailles');
    expect(traceCategory('cereales')?.legacy('Maïs')).toBe('Récoltes');
    expect(traceCategory('intrants')?.legacy('Herbicides')).toBe('Aliments et intrants');
    expect(traceCategory('equipement')?.legacy('Autre')).toBe('Matériel');
  });

  it('réservent les bovins, ovins et caprins aux éleveurs', () => {
    const vivant = traceCategory('vivant');
    if (!vivant) throw new Error('catégorie manquante');
    expect(subsFor(vivant, false)).toEqual(['Volaille']);
    expect(subsFor(vivant, true)).toContain('Bovin');
    const frais = traceCategory('frais');
    if (!frais) throw new Error('catégorie manquante');
    expect(subsFor(frais, false)).toEqual(frais.subs);
  });
});

describe('fiche d’une annonce', () => {
  it('renvoie la fiche saisie par le vendeur', () => {
    const s = sheet();
    expect(sheetOf(listing({ sheet: s }))).toBe(s);
  });
  it('renvoie la fiche de démonstration de FK-0142', () => {
    expect(sheetOf(listing({ id: 'FK-0142' }))?.code).toBe('SAV-TRACE-2026-014217');
  });
  it('ne fabrique pas de fiche pour une annonce qui n’en a pas', () => {
    expect(sheetOf(listing({ id: 'L-NDAMA' }))).toBeUndefined();
  });
});

describe('statut de l’animal', () => {
  const a = animal();
  const linked = (status: Listing['status']) => listing({ id: 'L-A', animalIds: [a.id], status });

  it('est indisponible en cas d’alerte sanitaire', () => {
    expect(animalStatus(animal({ tone: 'red' }), [linked('online')], []).label).toBe('Indisponible');
  });
  it('est vendu quand son annonce est vendue', () => {
    expect(animalStatus(a, [linked('sold')], []).label).toBe('Vendu');
  });
  it('est réservé quand une commande le contient', () => {
    expect(animalStatus(a, [linked('online')], [order('L-A')]).label).toBe('Réservé');
  });
  it('est disponible quand il est en vente', () => {
    expect(animalStatus(a, [linked('online')], []).label).toBe('Disponible');
    expect(animalStatus(a, [linked('review')], []).label).toBe('Disponible');
  });
  it('est en élevage sans annonce', () => {
    expect(animalStatus(a, [], []).label).toBe('En élevage');
  });
});

describe('vocation de l’animal', () => {
  it('reprend la vocation saisie', () => {
    expect(animalPurpose(animal({ measure: { purpose: 'repro' } }), [])).toBe('Reproducteur');
  });
  it('se déduit de la catégorie de l’annonce liée', () => {
    const a = animal();
    const l = listing({ animalIds: [a.id], sheet: sheet({ category: 'abattage' }) });
    expect(animalPurpose(a, [l])).toBe('Destiné à la viande');
  });
  it('reste inconnue sans information', () => {
    expect(animalPurpose(animal(), [])).toBe('—');
  });
});
