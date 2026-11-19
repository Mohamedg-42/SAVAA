# SAVAA — passation du front React

État au 19/11/2026. Application de démonstration (front seul, données fictives) calquée sur la maquette v2.

## Lancer

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # vérification TypeScript + build
npm run lint
```

## Références

- Maquette en ligne : https://claude.ai/artifact/TahrNHBEMz7wfapdJ2GTUr (32 planches)
- Copie locale des écrans de la maquette : `maquette/*.dc.html` (HTML + classes CSS identiques à l'appli)
- Cahier des charges : `C:\Users\HP\Downloads\SAVAA_Cahier_des_charges_complet_maquette_v2.pdf`
- Dossier de conception technique : https://claude.ai/artifact/MjSbkCEbPcQHHwLJL2P4oQ

## Structure

| Fichier | Rôle |
| --- | --- |
| `src/index.css` | Feuille de style de la maquette, reprise telle quelle (classes `.app`, `.hdr`, `.card`, `.badge`, `.btn`, `.adm`…) |
| `src/ui.tsx` | Icônes, `Header`, `TabBar`, `Badge`, `Photo`, `Foot`, `SectionHead`, `Check`, `NotFound` (écran « introuvable » pour un identifiant d'URL inconnu) |
| `src/data.ts` | Données de démo + store réactif (`useStore`) : animaux, événements sanitaires, panier |
| `src/toast.ts` | Message éphémère global : `showToast(texte)`, et `simulate(action)` pour une action pas encore possible en démo (PDF, appel, photo, export). Affiché par `<Toaster />` dans `App` |
| `src/App.tsx` | Toutes les routes de l'application (HashRouter) |
| `src/screens/eleveur.tsx` | Lot 2 : tableau de bord (`/suivi`), cheptel (`/cheptel`), ajout d'animal (`/cheptel/ajout`) |
| `src/screens/sante.tsx` | Lot 2 : fiche animale (`/animal/:id`), dossier sanitaire (`/animal/:id/sante`), observation (`/animal/:id/observation`) |
| `src/screens/achat.tsx` | Lot 3 : accueil (`/accueil`), catalogue (`/explorer`), erreur réseau (`/explorer/hors-ligne`), annonce (`/annonce/:id`) |
| `src/screens/commande.tsx` | Lot 3 : panier (`/panier`), paiement simulé (`/paiement`), reçu (`/recu`), suivi (`/commande`), assistance (`/assistance`) |
| `src/screens/compte.tsx` | Lot 4 : démarrage (`/demarrage`), connexion OTP (`/connexion`), choix du rôle (`/role`), profil (`/compte`), notifications (`/notifications`) |
| `src/screens/vente.tsx` | Lot 5 : créer ma boutique (`/boutique/creer`), boutique (`/boutique`), publier (`/vendre`), campagne (`/campagne`), statistiques (`/campagne/stats`), espace restaurant (`/restaurant`) |
| `src/screens/crm.tsx` | Lot 6 : prospection (`/prospection`), fiche prospect (`/prospect/:id`), nouveau prospect (`/prospect/nouveau`), back-office large (`/admin`) |

## Fait (Lots 1 à 6 complets)

- **Lot 1** : socle, charte (vert `#145C3A`, vert clair `#E8F3EA`, orange `#F28C28`, fond `#F8FAF8`), police IBM Plex Sans intégrée.
- **Lot 2** : 6 écrans éleveur et santé animale.
- **Lot 3** : 9 écrans achat, commande, paiement simulé et assistance.
- **Lot 4** : 5 écrans démarrage, connexion OTP, choix du rôle, profil/vérification et centre de notifications filtrable.
- **Lot 5** : 6 écrans création de boutique, boutique vendeur, publication d'annonce en 2 étapes, campagne sponsorisée, statistiques et espace restaurant B2B.
- **Lot 6** : 4 écrans CRM de prospection terrain (pipeline, fiche, ajout) et back-office d'administration grand écran (`/admin`).
- Tous les onglets et liens sont branchés (aucun écran `ComingSoon` restant).

## Règles gardées

- Aucun débordement à 320 px : texte dynamique dans une ligne → classe `ell` ou `minWidth: 0` ; groupes de puces → `.wrap` ou `.chips`.
- Aucun faux contact (numéro, horaires) : laisser `[à confirmer]`.
- Paiements, MIRAH, capteurs = simulés ; « Sponsorisé » toujours affiché sur une annonce payée ; une alerte n'est jamais un diagnostic.
- Photos : emplacements `<Photo>` en attendant les vraies images et le logo officiel.
- Pas de « · » comme séparateur dans les textes (virgule à la place).
- Aucun bouton inerte : soit une vraie action, soit `simulate('…')`, soit `disabled`.
- Les blocs directs de `.body` ne rétrécissent pas (`.body>*{flex-shrink:0}`) : sans cette règle, sur un téléphone de moins de 844 px de haut, la photo d'annonce ou les onglets de la fiche animale étaient écrasés. Tester aussi en 390 × 667.
- Un identifiant d'URL inconnu (`/animal/:id`, `/annonce/:id`, `/prospect/:id`) affiche `NotFound`, jamais un autre élément à la place.
- Chaque événement sanitaire porte son `animalId` ; lire un dossier avec `store.eventsFor(id)`. Le champ `summary` règle la ligne courte de l'onglet Santé de la fiche (titre et sous-titre de la maquette, ou `false` pour l'en exclure). Seul FK-0142 a une fiche complète (race, ascendance, mouvements) et seule son annonce a une page de détail ; les autres cartes d'annonce ne sont pas cliquables.
