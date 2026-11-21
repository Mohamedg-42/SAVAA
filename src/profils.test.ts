import { describe, expect, it } from 'vitest';
import { ID_FIELD, PRO_SECTIONS, idPhotoRequired, missingProfile, needsProfile, sectionsFor } from './profils';

/* Remplit tous les champs et justificatifs obligatoires des rôles donnés. */
function complete(roles: string[]) {
  const pro: Record<string, string> = { [ID_FIELD.key]: 'C 0123 4567' };
  const photos: Record<string, string> = { 'id.photo': 'data:image/jpeg;base64,x' };
  for (const sec of sectionsFor(roles)) {
    for (const f of sec.fields) if (f.required) pro[f.key] = f.options?.[0] ?? 'valeur';
    for (const d of sec.docs) if (d.required) photos[d.key] = 'data:image/jpeg;base64,x';
  }
  return { pro, photos };
}

describe('profil métier', () => {
  it('n’est pas demandé à l’acheteur', () => {
    expect(needsProfile(['achat'])).toBe(false);
    expect(missingProfile(['achat'])).toEqual([]);
  });

  it('est demandé à chaque métier professionnel', () => {
    for (const role of ['eleveur', 'agri', 'vendeur', 'fourn', 'resto', 'veto', 'coursier']) expect(needsProfile([role])).toBe(true);
  });

  it('exige la photo de la pièce d’identité pour les métiers vérifiés seulement', () => {
    expect(idPhotoRequired(['veto'])).toBe(true);
    expect(idPhotoRequired(['coursier'])).toBe(true);
    expect(idPhotoRequired(['fourn'])).toBe(true);
    expect(idPhotoRequired(['eleveur', 'vendeur'])).toBe(false);
  });

  it('liste ce qui manque à un vétérinaire qui n’a rien rempli', () => {
    const missing = missingProfile(['veto']);
    expect(missing).toContain(ID_FIELD.label);
    expect(missing).toContain('Photo de la pièce d’identité');
    expect(missing).toContain('Numéro d’inscription à l’Ordre ou d’agrément');
    expect(missing).toContain('Carte professionnelle ou diplôme');
  });

  it('ne réclame plus rien une fois tout rempli', () => {
    for (const roles of [['veto'], ['coursier'], ['fourn'], ['eleveur', 'vendeur'], ['agri'], ['resto']]) {
      const { pro, photos } = complete(roles);
      expect(missingProfile(roles, pro, photos)).toEqual([]);
    }
  });

  it('ne compte pas un champ rempli d’espaces', () => {
    const { pro, photos } = complete(['vendeur']);
    pro['vendeur.commerce'] = '   ';
    expect(missingProfile(['vendeur'], pro, photos)).toEqual(['Nom du commerce']);
  });

  it('a des clés uniques, préfixées par le rôle', () => {
    const keys = PRO_SECTIONS.flatMap((s) => [...s.fields.map((f) => f.key), ...s.docs.map((d) => d.key)]);
    expect(new Set(keys).size).toBe(keys.length);
    for (const s of PRO_SECTIONS) for (const f of [...s.fields, ...s.docs]) expect(f.key.startsWith(`${s.role}.`)).toBe(true);
  });
});
