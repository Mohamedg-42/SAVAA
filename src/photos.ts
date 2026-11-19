/* Images de démonstration (public/images) associées aux libellés photo de la maquette. */

const PHOTO_BY_LABEL: Record<string, string> = {
  'Photo, lot': '/images/lot-taurillons.jpg',
  'Photo, taurillon': '/images/taurillon-goudali.jpg',
  'Photo, taurillon de profil': '/images/taurillon-goudali.jpg',
  'Photo, taurillon de face': '/images/taurillon-goudali-face.jpg',
  'Photo, parc': '/images/taurillon-goudali-troupeau.jpg',
  'Photo, pesée': '/images/pesee-bovin.jpg',
  'Photo, reproducteur': '/images/taureau-reproducteur.jpg',
  'Photo, veau': '/images/veau-ndama.jpg',
  'Photo, bœufs de trait': '/images/boeuf-attelage.jpg',
  'Photo, N’Dama': '/images/vache-ndama.jpg',
  'Photo, métis': '/images/genisse-metisse.jpg',
  'Photo, béliers': '/images/beliers-saheliens.jpg',
  'Photo, bélier de profil': '/images/belier-sahelien-profil.jpg',
  'Photo, brebis': '/images/troupeau-ovins.jpg',
  'Photo, bouc': '/images/bouc-djallonke.jpg',
  'Photo, chèvres': '/images/chevres-saheliennes.jpg',
  'Photo, sacs d’aliment': '/images/aliment-betail.jpg',
  'Photo, tourteau': '/images/tourteau-coton.jpg',
  'Photo, fumier': '/images/fumier-composte.jpg',
  'Photo, poussins': '/images/poussins-chair.jpg',
  'Photo, œufs': '/images/oeufs-plateaux.jpg',
  'Photo, couveuse': '/images/couveuse-oeufs.jpg',
  'Photo, igname': '/images/igname-kponan.jpg',
  'Photo, maïs': '/images/mais-jaune.jpg',
  'Photo, cajou': '/images/noix-cajou.jpg',
  'Photo, vétérinaire': '/images/visite-veterinaire.jpg',
  'Profil gauche': '/images/vache-ndama.jpg',
  'Boucle': '/images/boucle-oreille.jpg',
  'IMG_0412': '/images/brebis-djallonke.jpg',
  'VID_0921': '/images/taurillon-goudali-troupeau.jpg',
  '1': '/images/genisse-metisse.jpg',
  '2': '/images/boucle-oreille.jpg',
  'Vidéo': '/images/genisse-metisse.jpg',
  'Photo 1': '/images/genisse-metisse.jpg',
  'Photo': '/images/taurillon-goudali.jpg',
};

export function photoFor(label = '', tint?: 'w' | 's') {
  return PHOTO_BY_LABEL[label] ?? (tint === 'w' ? '/images/aliment-betail.jpg' : tint === 's' ? '/images/poussins-chair.jpg' : '/images/taurillon-goudali.jpg');
}
