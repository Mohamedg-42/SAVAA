# Passation du front SAVAA

Mise à jour du 19/11/2026.

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

Les écrans sont rangés par thème dans `src/screens/` :

- `eleveur.tsx` : tableau de bord, cheptel, ajout d'un animal
- `sante.tsx` : fiche animale, dossier sanitaire, nouvelle observation
- `achat.tsx` : accueil, catalogue (et son état hors connexion), annonce
- `commande.tsx` : panier, paiement, reçu, suivi, assistance
- `compte.tsx` : démarrage, connexion par code, choix du rôle, profil, notifications
- `vente.tsx` : boutique (création et vue vendeur), publication d'annonce, campagne et ses statistiques, espace restaurant
- `crm.tsx` : prospection terrain (liste, fiche, ajout) et back-office, sur `/admin`

## Où on en est

Les 30 écrans d'application de la maquette sont faits, avec tous leurs textes, onglets et états. Les planches 26 (feuille de route) et 27 (design system) sont des planches de présentation, il n'y a rien à intégrer.

Le front est fonctionnel de bout en bout : recherche, favoris, panier, paiement simulé avec compte à rebours, commande, reçu imprimable, suivi ; publication d'annonce avec photos, modération dans le back-office, boutique ; connexion, rôles, profil, notifications créées par les actions ; observations avec photos ; CRM avec journal ; réclamations ; exports CSV et calendrier.

Il reste trois actions qui affichent seulement un message : appeler le transporteur (pas de numéro réel), et les choix de période « 7 derniers jours » et « 30 j » du back-office (une seule période dans les données, on n'invente pas d'autres chiffres).

La charte : vert `#145C3A`, vert clair `#E8F3EA`, orange `#F28C28`, fond `#F8FAF8`, police IBM Plex Sans (installée localement, pas de Google Fonts).

## Comptes et rôles

Un nouveau compte part de zéro : formulaires vides, cheptel vide, pas de boutique, pas de commande ni de notification. Seules les annonces des autres vendeurs existent déjà.

Sur l'écran de connexion, « Essayer le compte de démonstration » charge les données de la maquette (Adama Koné, Ferme Koné & Fils, cheptel de 46 têtes, commande, notifications). C'est ce compte qu'il faut utiliser pour présenter la maquette telle quelle.

Les accès sont gérés dans `src/guard.tsx` et les onglets du bas suivent les rôles :

- sans compte : accueil, catalogue, annonces, fiches et dossiers sanitaires (traçabilité) ;
- connecté : panier, paiement, commandes, compte, notifications ;
- éleveur : Suivi, cheptel, ajout d'animal, observations (seulement sur ses propres animaux) ;
- éleveur, producteur, vendeur ou fournisseur : Vendre, boutique, campagnes ; la boutique doit être créée avant de publier ; seuls les éleveurs publient des animaux (vendus avec leur fiche) ;
- restaurant : espace professionnel.

La prospection et le back-office sont des outils de l'équipe SAVAA : ils restent accessibles par leur adresse (`/#/prospection`, `/#/admin`) et n'apparaissent dans le profil qu'avec le compte de démonstration.

Se déconnecter efface les données du compte sur l'appareil, puisqu'il n'y a pas de serveur.

## Ce qu'il reste

- Comparer la mise en page à la maquette sur des captures. Les textes ont été vérifiés écran par écran, l'affichage seulement par endroits.
- Ajouter des tests. Il n'y en a aucun pour l'instant ; Vitest serait le plus simple avec Vite.
- Remplacer les photos de démonstration et l'icône d'onglet provisoire quand on aura les vraies images et le logo.
- Brancher une vraie API à la place de `data.ts` (connexion par SMS, paiement, modération côté serveur).

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

- Un bouton fait quelque chose, sinon il est `disabled`. Pour une action pas encore branchée, appeler `simulate('…')` avec une phrase courte propre à ce bouton, pas une formule toute faite.
- Si l'identifiant d'une URL n'existe pas (`/animal/:id`, `/annonce/:id`, `/prospect/:id`), on affiche `NotFound`. On ne montre jamais un autre élément à la place.
- Chaque événement sanitaire est rattaché à un animal par `animalId`. On lit un dossier avec `store.eventsFor(id)`. Le champ `summary` donne la ligne courte affichée dans l'onglet Santé de la fiche ; `false` l'en exclut.
- Le taurillon FK-0142 reprend mot pour mot la fiche et l'annonce de la maquette. Les autres animaux et annonces ont une fiche construite à partir de leurs données.
- Les photos choisies sur l'appareil sont réduites (640 px, JPEG) avant d'être gardées : le stockage du navigateur est limité à quelques Mo.
- Si on change la forme des données dans `data.ts`, changer aussi la clé `KEY` : sinon d'anciennes données gardées dans le navigateur se mélangent aux nouvelles.
