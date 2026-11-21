import { describe, expect, it } from 'vitest';
import { EMPTY_DOSSIER, type Dossier } from './invest';
import { SEED_PROJECTS, matchProject, rankProjects, remaining, type Project } from './invest-admin';

const investor = (data: Dossier['data']): Dossier => ({ ...EMPTY_DOSSIER, type: 'particulier', data });
const project = (patch: Partial<Project>): Project => ({ ...SEED_PROJECTS[0], ...patch });

describe('rapprochement investisseur / projet', () => {
  const volailles = project({ filiere: 'Élevage de volailles', region: 'Agnéby-Tiassa', recherche: 25_000_000, finance: 12_000_000, duree: 'Moyen terme (2 à 5 ans)', risque: 'Risque modéré' });

  it('calcule le montant restant à financer', () => {
    expect(remaining(volailles)).toBe(13_000_000);
    expect(remaining(project({ recherche: 10, finance: 20 }))).toBe(0);
  });

  it('donne la note maximale quand tous les critères concordent', () => {
    const m = matchProject(investor({
      'fin.min': '5000000', 'fin.max': '15000000', 'pref.prioritaire': 'Élevage de volailles', 'pref.regions': ['Agnéby-Tiassa'],
      'obj.duree': 'Moyen terme (2 à 5 ans)', 'obj.risque': 'Risque modéré',
    }), volailles);
    expect(m.score).toBe(100);
    expect(m.warnings).toEqual([]);
  });

  it('explique chaque point gagné', () => {
    const m = matchProject(investor({ 'pref.filieres': ['Élevage de volailles'], 'pref.regions': ['Agnéby-Tiassa'] }), volailles);
    expect(m.reasons).toContain('Filière retenue : Élevage de volailles');
    expect(m.reasons).toContain('Région souhaitée : Agnéby-Tiassa');
  });

  it('signale un projet plus risqué que ce que l’investisseur accepte', () => {
    const m = matchProject(investor({ 'obj.risque': 'Non, risque faible' }), project({ risque: 'Risque élevé' }));
    expect(m.warnings).toContain('Projet plus risqué que ce qu’il accepte');
  });

  it('signale un budget trop faible', () => {
    const m = matchProject(investor({ 'fin.min': '100000', 'fin.max': '500000' }), volailles);
    expect(m.warnings).toContain('Budget trop faible pour ce projet');
  });

  it('ne classe que les projets publiés, du plus au moins pertinent', () => {
    const ranked = rankProjects(investor({ 'pref.prioritaire': 'Cacao', 'pref.regions': ['Nawa'] }), SEED_PROJECTS);
    expect(ranked.every(({ p }) => p.status === 'publie')).toBe(true);
    expect(ranked[0].p.filiere).toBe('Cacao');
    for (let i = 1; i < ranked.length; i++) expect(ranked[i - 1].m.score).toBeGreaterThanOrEqual(ranked[i].m.score);
  });
});
