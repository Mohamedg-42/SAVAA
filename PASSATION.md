# Passation du front SAVAA

Mise à jour du 19/11/2026.

C'est le front de démonstration de SAVAA, fait à partir de la maquette v2. Il n'y a pas de backend : les données sont fictives et tout ce qu'on saisit est perdu au rechargement de la page.

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
- `src/data.ts` porte les données de démo (animaux, dossiers sanitaires, panier) et un petit store maison, `useStore`. C'est là qu'il faudra brancher l'API ; les écrans n'auront normalement pas à changer.
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

Aucun bouton n'est mort. Ce qui demanderait un serveur ou le téléphone (PDF, appel, appareil photo, export) affiche un court message qui dit que ce n'est pas encore disponible.

La charte : vert `#145C3A`, vert clair `#E8F3EA`, orange `#F28C28`, fond `#F8FAF8`, police IBM Plex Sans (installée localement, pas de Google Fonts).

## Ce qu'il reste

- Comparer la mise en page à la maquette sur des captures. Les textes ont été vérifiés écran par écran, l'affichage seulement par endroits.
- Ajouter des tests. Il n'y en a aucun pour l'instant ; Vitest serait le plus simple avec Vite.
- Remplacer les emplacements photo et l'icône d'onglet provisoire quand on aura les vraies images et le logo.

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
- Seul le taurillon FK-0142 a une fiche complète (race, ascendance, mouvements), et c'est la seule annonce qui a une page de détail. Les autres cartes du catalogue ne sont donc pas cliquables.
