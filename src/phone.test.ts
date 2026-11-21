import { describe, expect, it } from 'vitest';
import { formatPhone, nameOk, phoneDigits, phoneError } from './phone';

describe('numéro de téléphone', () => {
  it('retire l’indicatif collé avec le numéro', () => {
    expect(phoneDigits('+225 07 01 02 03 04')).toBe('0701020304');
    expect(phoneDigits('00225 0701020304')).toBe('0701020304');
    expect(phoneDigits('225 07 01 02 03 04')).toBe('0701020304');
  });
  it('garde un numéro qui commence par 25 sans le prendre pour l’indicatif', () => {
    expect(phoneDigits('25 20 30 40 50')).toBe('2520304050');
  });
  it('ignore les lettres et coupe à 10 chiffres', () => {
    expect(phoneDigits('abc07def01')).toBe('0701');
    expect(phoneDigits('07 01 02 03 04 05')).toBe('0701020304');
  });
  it('met en forme par paires', () => {
    expect(formatPhone('0701020304')).toBe('07 01 02 03 04');
    expect(formatPhone('0701')).toBe('07 01');
  });
  it('explique ce qui ne va pas', () => {
    expect(phoneError('')).toMatch(/Indiquez/);
    expect(phoneError('07 01 02')).toMatch(/10 chiffres \(6/);
    expect(phoneError('12 34 56 78 90')).toMatch(/ivoirien/);
    expect(phoneError('05 11 22 33 44')).toBeNull();
  });
});

describe('nom', () => {
  it('demande au moins une lettre', () => {
    expect(nameOk('Awa')).toBe(true);
    expect(nameOk('N’Guessan')).toBe(true);
    expect(nameOk('1234')).toBe(false);
    expect(nameOk('@@')).toBe(false);
  });
});
