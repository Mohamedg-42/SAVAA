import { describe, expect, it } from 'vitest';
import {
  EMPTY_DOSSIER, REGIONS_CI, STEPS_ENTREPRISE, STEPS_PARTICULIER, completion, display, newDossierRef, stepErrors, visible,
  type Dossier, type IField,
} from './invest';

const identite = STEPS_PARTICULIER[0];
const finance = STEPS_PARTICULIER[1];

describe('dossier investisseur', () => {
  it('compte les 31 régions et les 2 districts autonomes', () => {
    expect(REGIONS_CI).toHaveLength(33);
    expect(new Set(REGIONS_CI).size).toBe(33);
  });

  it('demande des étapes différentes au particulier et à l’entreprise', () => {
    expect(STEPS_PARTICULIER[0].title).toBe('Informations personnelles');
    expect(STEPS_ENTREPRISE[0].title).toBe('Identification de l’entreprise');
    const keys = STEPS_ENTREPRISE.flatMap((s) => s.fields.map((f) => f.key));
    expect(keys).toContain('ent.rccm');
    expect(keys).toContain('fin.origine');
    expect(STEPS_PARTICULIER.flatMap((s) => s.fields.map((f) => f.key))).not.toContain('fin.origine');
  });

  it('n’a aucune clé en double dans une même étape', () => {
    for (const step of [...STEPS_PARTICULIER, ...STEPS_ENTREPRISE]) {
      const keys = step.fields.map((f) => f.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('signale les champs obligatoires vides', () => {
    const e = stepErrors(identite, {}, {});
    expect(e['id.nom']).toBeDefined();
    expect(e['id.sexe']).toBeDefined();
    expect(e['doc.piece']).toBe('Ajoutez la photo de la pièce.');
    expect(e['id.fonction']).toBeUndefined();
  });

  it('contrôle le format de l’e-mail et du téléphone', () => {
    const e = stepErrors(identite, { 'id.email': 'pas-un-email', 'id.tel': '0700' }, {});
    expect(e['id.email']).toBe('Adresse e-mail invalide.');
    expect(e['id.tel']).toBe('Numéro à 10 chiffres au moins.');
  });

  it('accepte la date d’expiration telle quelle et refuse un investisseur mineur', () => {
    const y = new Date().getFullYear();
    const e = stepErrors(identite, { 'id.expiration': '1985-04-12', 'id.naissance': `${y - 10}-01-01` }, {});
    expect(e['id.expiration']).toBeUndefined();
    expect(e['id.naissance']).toBe('L’investisseur doit être majeur (18 ans au moins).');
    const ok = stepErrors(identite, { 'id.expiration': `${y + 3}-01-01`, 'id.naissance': `${y - 40}-01-01` }, {});
    expect(ok['id.expiration']).toBeUndefined();
    expect(ok['id.naissance']).toBeUndefined();
  });

  it('refuse un montant maximum inférieur au minimum', () => {
    expect(stepErrors(finance, { 'fin.min': '5000000', 'fin.max': '1000000' }, {})['fin.max']).toBe('Le maximum doit être supérieur au minimum.');
  });

  it('n’affiche et n’exige un champ conditionnel que si sa condition est remplie', () => {
    const detail = finance.fields.find((f) => f.key === 'fin.experience') as IField;
    expect(visible(detail, { 'fin.deja': 'Non' })).toBe(false);
    expect(visible(detail, { 'fin.deja': 'Oui' })).toBe(true);
  });

  it('exige les documents obligatoires', () => {
    const docs = STEPS_ENTREPRISE[STEPS_ENTREPRISE.length - 1];
    expect(stepErrors(docs, {}, {})['doc.rccm']).toBeDefined();
    expect(stepErrors(docs, {}, { 'doc.rccm': 'x', 'doc.fiscal': 'x', 'doc.statuts': 'x', 'doc.pieceRep': 'x' })).toEqual({});
  });

  it('calcule la complétude du dossier', () => {
    expect(completion(EMPTY_DOSSIER)).toBe(0);
    const started: Dossier = { ...EMPTY_DOSSIER, type: 'particulier' };
    const pct = completion(started);
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(10);
  });

  it('génère une référence INV-<année>-XXXXXX', () => {
    expect(newDossierRef()).toMatch(new RegExp(`^INV-${new Date().getFullYear()}-\\d{6}$`));
  });

  it('affiche les montants et les dates lisiblement', () => {
    const amount: IField = { key: 'a', label: 'a', kind: 'amount' };
    const date: IField = { key: 'd', label: 'd', kind: 'date' };
    expect(display(amount, '25000000')).toBe('25 000 000 FCFA');
    expect(display(date, '2026-11-21')).toBe('21/11/2026');
    expect(display(amount, '')).toBe('—');
    expect(display({ key: 'c', label: 'c', kind: 'chips' }, ['Cacao', 'Maïs'])).toBe('Cacao, Maïs');
  });
});
