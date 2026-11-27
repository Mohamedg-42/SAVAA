import { describe, expect, it } from 'vitest';
import { resolveQrCode } from './scanner-code';

describe('résolution des QR codes et codes manuels', () => {
  it('reconnaît un code SAV-TRACE saisi directement ou dans une URL', () => {
    expect(resolveQrCode('SAV-TRACE-2026-014217')).toBe('/fiche/SAV-TRACE-2026-014217');
    expect(resolveQrCode('  sav-trace-2026-008341  ')).toBe('/fiche/SAV-TRACE-2026-008341');
    expect(resolveQrCode('https://savaa.ci/#/fiche/SAV-TRACE-2026-014217')).toBe('/fiche/SAV-TRACE-2026-014217');
  });

  it('reconnaît une fiche animale FK-xxxx directement ou via URL', () => {
    expect(resolveQrCode('FK-0142')).toBe('/animal/FK-0142');
    expect(resolveQrCode('fk-0087')).toBe('/animal/FK-0087');
    expect(resolveQrCode('https://savaa.ci/#/animal/FK-0142')).toBe('/animal/FK-0142');
  });

  it('reconnaît une URL d’annonce', () => {
    expect(resolveQrCode('https://savaa.ci/#/annonce/L-MAIS')).toBe('/annonce/L-MAIS');
    expect(resolveQrCode('/annonce/ALIM-50')).toBe('/annonce/ALIM-50');
  });

  it('rejette les chaînes vides ou non reconnues', () => {
    expect(resolveQrCode('')).toBeNull();
    expect(resolveQrCode('   ')).toBeNull();
    expect(resolveQrCode('bonjour')).toBeNull();
    expect(resolveQrCode('https://example.com/autre/123')).toBeNull();
  });
});
