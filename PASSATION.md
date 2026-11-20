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
- `src/trace.ts` définit les fiches de traçabilité : les 8 catégories du cahier des charges, leurs champs, le code SAV-TRACE, les statuts de fiche et les fiches des annonces de démonstration. La fiche produit (`/fiche/:code`, avec son QR code) est dans `src/screens/fiche.tsx` ; la fiche animale y reprend la frise et le QR code. Le détail des changements est dans `CHANGELOG.md`.
- `src/logo.tsx` dessine le logo SAVAA (fichier source `public/logo-savaa.svg`), avec son animation sur l'écran de démarrage.
- `public/` contient l'icône d'onglet (`favicon.svg`), les icônes d'installation sur l'écran d'accueil du téléphone (`icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `manifest.webmanifest`), les photos de démonstration (`images/`) et les logos des moyens de paiement (`images/payments/`).

Les écrans sont rangés par thème dans `src/screens/` :

- `eleveur.tsx` : tableau de bord, cheptel, ajout d'un animal
- `sante.tsx` : fiche animale, dossier sanitaire, nouvelle observation
- `achat.tsx` : accueil, catalogue (et son état hors connexion), annonce
- `commande.tsx` : panier, paiement, reçu, suivi, assistance
- `compte.tsx` : démarrage, connexion par code, choix du rôle, profil, notifications
- `vente.tsx` : boutique (création et vue vendeur), publication d'annonce, campagne et ses statistiques, espace restaurant
- `metiers.tsx` : espaces des autres métiers, vétérinaire (`/veto`), transporteur (`/missions`), producteur agricole (`/recoltes`) et fournisseur (`/fournisseur`)
- `crm.tsx` : back-office (`/admin`) avec ses rubriques tableau de bord, utilisateurs, campagnes, statistiques et prospection (liste, fiche, journal, ajout) ; menu burger sur téléphone

## Où on en est

Les 30 écrans d'application de la maquette sont faits, avec tous leurs textes, onglets et états. Les planches 26 (feuille de route) et 27 (design system) sont des planches de présentation, il n'y a rien à intégrer.

Le front est fonctionnel de bout en bout : recherche, favoris, panier, paiement simulé avec compte à rebours, commande, reçu imprimable, suivi ; publication d'annonce avec photos, modération dans le back-office, boutique ; connexion, rôles, profil, notifications créées par les actions ; observations avec photos ; CRM avec journal ; réclamations ; exports CSV et calendrier.

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

Se déconnecter efface les données du compte sur l'appareil, puisqu'il n'y a pas de serveur.

## Ce qu'il reste

- Ajouter des tests. Il n'y en a aucun pour l'instant ; Vitest serait le plus simple avec Vite.
- Comparer la mise en page à la maquette sur des captures. Les textes ont été vérifiés écran par écran, l'affichage seulement par endroits.
- Alléger le premier chargement : le build signale un fichier JavaScript de plus de 500 Ko ; on peut charger les écrans à la demande.
- Remplacer les photos de démonstration par les vraies images.
- Brancher une vraie API à la place de `data.ts` : connexion par SMS, paiement, modération et accès de l'équipe contrôlés par le serveur.

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
- Si on change la forme des données dans `data.ts`, changer aussi la clé `KEY` : sinon d'anciennes données gardées dans le navigateur se mélangent aux nouvelles.
