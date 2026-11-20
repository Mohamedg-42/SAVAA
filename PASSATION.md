# Passation du front SAVAA

Mise à jour du 20/11/2026.

C'est le front de démonstration de SAVAA, fait à partir de la maquette v2. Il n'y a pas de backend : les données partent de la maquette et tout ce qu'on saisit est gardé dans le navigateur (localStorage). « Remettre la démo à zéro », en bas de l'écran Compte, revient aux données de départ.

## Lancer le projet

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # vérifie aussi les types
npm run lint
```

## Où trouver quoi

La maquette en ligne (32 planches) : https://claude.ai/artifact/TahrNHBEMz7wfapdJ2GTUr. Une copie des écrans est dans `maquette/`, avec les mêmes classes CSS que l'appli, ce qui aide pour comparer. Le cahier des charges est le PDF `SAVAA_Cahier_des_charges_complet_maquette_v2.pdf` (dans Téléchargements) et le dossier de conception technique est ici : https://claude.ai/artifact/MjSbkCEbPcQHHwLJL2P4oQ.

Côté code :

- `src/App.tsx` contient toutes les routes (HashRouter).
- `src/index.css` est la feuille de style de la maquette, reprise telle quelle.
- `src/ui.tsx` regroupe les composants partagés : icônes, en-tête, barre d'onglets, badges, emplacements photo, écran « introuvable »…
- `src/data.ts` porte les données de démo et un petit store maison, `useStore` : cheptel, dossiers sanitaires, annonces, favoris, panier, commandes, boutique, compte, notifications, tickets, et un stockage clé → valeur (`get` / `put`) utilisé par le CRM. C'est là qu'il faudra brancher l'API ; les écrans n'auront normalement pas à changer.
- `src/device.ts` réunit ce qui passe par le navigateur ou le téléphone : photos réduites avant stockage, partage, export CSV, fichier calendrier (.ics), impression en PDF.
- `src/photos.ts` associe les libellés photo de la maquette aux images de `public/images/`.
- `src/toast.ts` gère le petit message qui s'affiche en bas de l'écran.
- `src/guard.tsx` contrôle les accès : connexion, rôle demandé (`Guard`) et code d'équipe du back-office (`StaffGuard`).
- `src/trace.ts` définit les fiches de traçabilité :
  - les 8 catégories du cahier des charges, avec leurs champs, et leur correspondance avec les anciennes catégories d'annonce ;
  - le code SAV-TRACE et les statuts de fiche ;
  - le statut, la vocation, la pesée et l'origine d'un animal ;
  - les fiches des annonces de démonstration.

  Le QR code vient de la seule dépendance ajoutée, `react-qr-code`. Le détail des changements et les guides de test sont dans `CHANGELOG.md`.
- `src/logo.tsx` dessine le logo SAVAA (fichier source `public/logo-savaa.svg`), avec son animation sur l'écran de démarrage.
- `public/` contient l'icône d'onglet (`favicon.svg`), les icônes d'installation sur l'écran d'accueil du téléphone (`icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `manifest.webmanifest`), les photos de démonstration (`images/`) et les logos des moyens de paiement (`images/payments/`).

Les écrans sont rangés par thème dans `src/screens/` :

- `eleveur.tsx` : tableau de bord, cheptel, ajout d'un animal (avec pesée, état, vocation et origine)
- `sante.tsx` : fiche animale (avec identification et état, origine, historique de traçabilité et QR code), dossier sanitaire, nouvelle observation
- `fiche.tsx` : fiche produit (`/fiche/:code`), fenêtre du QR code, frise de traçabilité et légende des niveaux de preuve, réutilisées par la fiche animale
- `achat.tsx` : accueil, catalogue (et son état hors connexion), annonce (avec le lien vers sa fiche produit)
- `commande.tsx` : panier, paiement, reçu, suivi, assistance
- `compte.tsx` : démarrage, connexion par code, choix du rôle, profil, notifications
- `vente.tsx` : boutique (création et vue vendeur), publication d'annonce avec sa fiche de traçabilité (4 étapes, puis un aperçu), campagne et ses statistiques, espace restaurant
- `metiers.tsx` : espaces des autres métiers, vétérinaire (`/veto`), transporteur (`/missions`), producteur agricole (`/recoltes`) et fournisseur (`/fournisseur`)
- `crm.tsx` : back-office (`/admin`) avec ses rubriques tableau de bord, utilisateurs, campagnes, statistiques et prospection (liste, fiche, journal, ajout) ; menu burger sur téléphone

## Où on en est

Les 30 écrans d'application de la maquette sont faits, avec tous leurs textes, onglets et états. Les planches 26 (feuille de route) et 27 (design system) sont des planches de présentation, il n'y a rien à intégrer.

Le front est fonctionnel de bout en bout : recherche, favoris, panier, paiement simulé avec compte à rebours, commande, reçu imprimable, suivi ; publication d'annonce avec photos, modération dans le back-office, boutique ; connexion, rôles, profil, notifications créées par les actions ; observations avec photos ; CRM avec journal ; réclamations ; exports CSV et calendrier.

La traçabilité suit le cahier des charges des fiches d'identité.
- **Publication :** chaque annonce publiée depuis l'onglet Vendre reçoit une fiche et un code `SAV-TRACE-2026-XXXXXX`. Le vendeur remplit 4 étapes (produit, origine, prix et vente, vendeur). Chaque champ obligatoire est contrôlé, et un aperçu s'affiche avant l'envoi en modération.
- **Fiche produit :** elle s'ouvre depuis l'annonce ou par son QR code, sans compte. Elle contient les sections Produit, Vendeur, Origine, Prix et vente, et une frise de traçabilité avec un niveau de preuve par événement.
- **Fiche animale :** elle affiche le statut (disponible, réservé, vendu, en élevage, indisponible), la vocation, la pesée, l'origine complète, l'historique de traçabilité et un QR code.
- **Annonces de démonstration :** le taurillon FK-0142, l'igname Kponan et le maïs de Dikodougou ont une fiche. Elle reprend uniquement ce que la maquette dit déjà d'eux.

Aucun bouton n'affiche plus seulement un message. Le contact du transporteur passe par la messagerie de l'assistance (pas de numéro réel), et le back-office indique sa période (« 7 derniers jours », « depuis l'ouverture ») au lieu de proposer d'autres périodes : les données n'en couvrent qu'une, on n'invente pas d'autres chiffres.

La charte : vert `#145C3A`, vert clair `#E8F3EA`, orange `#F28C28`, fond `#F8FAF8`, police IBM Plex Sans (installée localement, pas de Google Fonts).

## Comptes et rôles

Un nouveau compte part de zéro : formulaires vides, cheptel vide, pas de boutique, pas de commande ni de notification. Seules les annonces des autres vendeurs existent déjà.

Sur l'écran de connexion, « Essayer le compte de démonstration » charge les données de la maquette (Adama Koné, Ferme Koné & Fils, cheptel de 46 têtes, commande, notifications). C'est ce compte qu'il faut utiliser pour présenter la maquette telle quelle.

Les accès sont gérés dans `src/guard.tsx`. La barre du bas montre au plus 5 onglets : Accueil, Explorer, deux onglets selon le métier, Compte (`TabBar` dans `src/ui.tsx`).

| Profil | Onglets du milieu | Ce qui lui est réservé |
| --- | --- | --- |
| Sans compte | (Connexion à la place de Compte) | Accueil, catalogue, annonces, fiches et dossiers sanitaires (traçabilité) |
| Acheteur | Favoris, Commandes | Panier, paiement, commandes (`/commandes`), favoris (`/favoris`) |
| Éleveur | Vendre, Suivi | Cheptel, ajout d'animal, observations sur ses propres animaux ; seul profil qui publie des animaux (vendus avec leur fiche) |
| Producteur agricole | Vendre, Récoltes | Récoltes et disponibilités (`/recoltes`) |
| Vendeur, fournisseur | Vendre, Devis B2B pour le fournisseur | Boutique, publication, campagnes ; devis B2B (`/fournisseur`) |
| Restaurant | Commandes, Pro | Espace professionnel (`/restaurant`) |
| Vétérinaire | Véto | Alertes et validations sanitaires (`/veto`) |
| Transporteur | Missions | Missions de livraison (`/missions`) |

Tout compte connecté a aussi panier, compte et notifications. Un vendeur doit créer sa boutique avant de publier.

Le back-office (`/#/admin`) est réservé à l'équipe SAVAA. Sans le compte de démonstration, il demande le code d'équipe **SAVAA-EQUIPE**, qui ouvre l'accès sur l'appareil jusqu'à la déconnexion. C'est une protection de démonstration : en production, l'accès doit être contrôlé par le serveur. La prospection est une rubrique du back-office ; les anciennes adresses `/#/prospection` et `/#/prospect/…` y renvoient.

Se déconnecter efface les données du compte sur l'appareil, puisqu'il n'y a pas de serveur. La déconnexion et la remise à zéro passent par l'écran de démarrage, qui affiche « Vous êtes déconnecté ». Elles se font une fois sorti de l'écran Compte : faites depuis l'écran Compte, la garde d'accès renvoyait vers la connexion avec un retour prévu sur Mon compte.

## Ce qu'il reste

- Ajouter des tests. Il n'y en a aucun pour l'instant ; Vitest serait le plus simple avec Vite.
- Comparer la mise en page à la maquette sur des captures. Les textes ont été vérifiés écran par écran, l'affichage seulement par endroits.
- Alléger le premier chargement : le build signale un fichier JavaScript de plus de 500 Ko ; on peut charger les écrans à la demande.
- Remplacer les photos de démonstration par les vraies images.
- Brancher une vraie API à la place de `data.ts` : connexion par SMS, paiement, modération et accès de l'équipe contrôlés par le serveur.

Décisions et corrections en attente, vues lors de la revue des comptes du 20/11/2026 :

- **Espaces métiers :** pour un compte neuf, plusieurs espaces affichent des données de la démo qui ne sont pas à lui :
  - le producteur agricole voit 3 lots et « 4 acheteurs pros » ;
  - le fournisseur voit 3 devis et 1,8 M FCFA de factures ;
  - le transporteur voit une mission en cours et 40 000 FCFA gagnés ;
  - le vétérinaire voit 3 visites prévues.

  Ces données ne devraient apparaître que pour le compte de démonstration (`metiers.tsx`).
- **Korhogo par défaut :** Korhogo apparaît encore alors que l'appli est nationale, à trois endroits : l'accueil sans compte (« Korhogo, Savanes »), le back-office (« zone pilote Poro et Tchologo ») et l'exemple du champ de livraison du restaurant.
- **Écrans métiers :** l'espace vétérinaire, transporteur, producteur et fournisseur utilisent le même gabarit. Il faudrait un premier écran propre à chaque métier, par exemple la mission en cours pour le transporteur ou l'alerte la plus urgente pour le vétérinaire.
- **Combinaisons de rôles :** les règles sont proposées mais pas codées.
  - Éleveur, producteur et vendeur vont ensemble.
  - Fournisseur et restaurant se choisissent seuls.
  - Le vétérinaire peut être éleveur, mais ne valide pas ses propres animaux.
  - Le transporteur ne prend pas de mission sur ses propres ventes.
  - Deux métiers au maximum.
- **Engrais et produits phytosanitaires :** ils n'entrent dans aucune des 8 catégories de traçabilité. Il faut décider où les ranger.
- **Fiches des autres annonces de démonstration :** il faut leurs vraies informations (origine, dates) avant de leur créer une fiche.
- **Statut « archivée » :** il n'existe pas encore d'action pour archiver une annonce.
- **Cahier des charges de traçabilité :** il s'arrête à la section 2.2.
  - Les sections 2.3 à 2.7 (santé, alimentation, reproduction, mouvements, historique commercial) s'appuient sur les onglets existants de la fiche animale.
  - Les parties III à VIII ont seulement leurs champs principaux dans `trace.ts`. Les références réglementaires (agréments, certification des semences) restent à confirmer avec le texte officiel.

## À respecter

Sur le contenu :

- On n'invente pas de contact. Un numéro ou des horaires qu'on n'a pas restent `[à confirmer]`.
- Le paiement, MIRAH et les capteurs sont simulés, et l'appli ne doit pas laisser croire le contraire.
- Une annonce payée affiche toujours « Sponsorisé ».
- Une alerte sanitaire n'est jamais présentée comme un diagnostic.
- Pas de « · » comme séparateur dans les textes, on met une virgule.

Sur l'affichage :

- Rien ne doit déborder à 320 px de large. Pour un texte variable sur une ligne, utiliser la classe `ell` ou `minWidth: 0` ; pour une rangée de puces, `.wrap` ou `.chips`.
- Tester aussi en 390 × 667. Les blocs directs de `.body` ont `flex-shrink: 0` : sans ça, sur un écran moins haut que la maquette (844 px), la photo de l'annonce et les onglets de la fiche animale se retrouvaient écrasés.

Sur le code :

- Un bouton fait quelque chose, sinon il est `disabled`. Pour une action qui ne peut pas encore être branchée, `simulate('…')` (dans `src/toast.ts`) affiche une phrase courte propre à ce bouton, pas une formule toute faite.
- Si l'identifiant d'une URL n'existe pas (`/animal/:id`, `/annonce/:id`, `/prospect/:id`), on affiche `NotFound`. On ne montre jamais un autre élément à la place.
- Chaque événement sanitaire est rattaché à un animal par `animalId`. On lit un dossier avec `store.eventsFor(id)`. Le champ `summary` donne la ligne courte affichée dans l'onglet Santé de la fiche ; `false` l'en exclut.
- Le taurillon FK-0142 reprend mot pour mot la fiche et l'annonce de la maquette. Les autres animaux et annonces ont une fiche construite à partir de leurs données.
- Les photos choisies sur l'appareil sont réduites (640 px, JPEG) avant d'être gardées : le stockage du navigateur est limité à quelques Mo.
- Si on change la forme des données dans `data.ts`, changer aussi la clé `KEY` : sinon d'anciennes données gardées dans le navigateur se mélangent aux nouvelles. Ajouter un champ facultatif ne demande pas de changer la clé. C'est ce qui a été fait pour `sheet` (annonce), `measure` et `origin` (animal).

Sur la traçabilité :

- Le vendeur ne fait que déclarer. « Documenté » demande un justificatif joint. « Vérifié » est attribué par l'équipe SAVAA ou un vétérinaire. « Certifié » est réservé à un organisme officiel. Le formulaire ne propose jamais ces niveaux au vendeur.
- Les codes de traçabilité suivent le format `SAV-TRACE-<année>-XXXXXX` et sont uniques (`newTraceCode`).
- On lit la fiche d'une annonce avec `sheetOf(annonce)`. Elle renvoie la fiche saisie par le vendeur, ou celle d'une annonce de démonstration.
- Une fiche de démonstration ne reprend que ce que la maquette dit déjà. Une information inconnue s'affiche « — », on ne l'invente pas.
- Le statut d'un animal n'est pas saisi : `animalStatus` le déduit de ses annonces, des commandes et des alertes sanitaires.
- Si le code de `/fiche/:code` n'existe pas, on affiche `NotFound`, comme pour les autres identifiants d'URL.
