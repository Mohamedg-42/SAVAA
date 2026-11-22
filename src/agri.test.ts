import { describe, expect, it } from 'vitest';
import { volumeKg } from './agri';

describe('volumeKg', () => {
  it('lit les kilos, avec ou sans espace des milliers', () => {
    expect(volumeKg('5 000 kg (min. 200 kg)')).toBe(5000);
    expect(volumeKg('1500 kg')).toBe(1500);
  });
  it('lit les tonnes', () => {
    expect(volumeKg('3 t')).toBe(3000);
    expect(volumeKg('environ 2,5 tonnes')).toBe(2500);
  });
  it('multiplie les sacs par leur poids', () => {
    expect(volumeKg('240 sacs de 100 kg')).toBe(24000);
  });
  it('renvoie 0 quand la quantité n’a pas d’unité de poids', () => {
    expect(volumeKg('12 régimes')).toBe(0);
  });
});
