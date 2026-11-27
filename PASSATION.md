# Passation du front SAVAA

Mise à jour du 22/11/2026.

C'est le front de démonstration de SAVAA, fait à partir de la maquette v2. Il n'y a pas de backend : les données partent de la maquette et tout ce qu'on saisit est gardé dans le navigateur (localStorage). « Remettre la démo à zéro », en bas de l'écran Compte, revient aux données de départ.

## Architecture Client-Serveur (Site Web + App Mobile + Serveur API)

```text
savaa-react/
├── apps/
│   ├── web/            # Client 1 : Site Web (Catalogue, Espaces Pro/Investisseur, Fiches QR, Back-office /admin)
│   └── mobile/         # Client 2 : Application Mobile native Android & iOS (sans Back-office /admin)
├── packages/
│   └── shared/         # Logique métier et client API HTTP/SSE partagés entre Site Web et App Mobile
├── backend/            # Serveur API REST central (http://localhost:4000) + Base PostgreSQL (backend/db/schema.sql)
├── docker-compose.yml  # Conteneur PostgreSQL 16 préconfiguré avec schema.sql
├── android/            # Projet natif Android (Capacitor → APK / AAB)
└── ios/                # Projet natif iOS (Capacitor → IPA)
```

## Lancer le projet

```bash
npm install
docker compose up -d   # (Optionnel) Démarre PostgreSQL 16 en local sur le port 5432
npm run db:migrate     # Crée / met à jour toutes les tables PostgreSQL (backend/db/schema.sql)
npm run dev:api        # Serveur Backend API REST + PostgreSQL (http://localhost:4000)
npm run dev:web        # Client 1 — Site Web + Back-office /admin (http://localhost:5173)
npm run dev:mobile     # Client 2 — Application Mobile sans /admin (http://localhost:5174)
npm run build          # Vérifie les types + compile Site Web (apps/web/dist) et App Mobile (apps/mobile/dist)
npm run lint
npm test               # Tests Vitest (src/*.test.ts)
npm run mobile:sync    # Build App Mobile + synchronisation Capacitor (Android & iOS)
npm run mobile:android # Ouvre le projet natif Android Studio (APK / AAB)
npm run mobile:ios     # Ouvre le projet natif Xcode (iOS)
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
  - les 8 catégories du cahier des charges, plus une 9e ajoutée à la demande, « Engrais et produits phytosanitaires » (composition, homologation, lot, péremption), avec leurs champs et leur correspondance avec les anciennes catégories d'annonce ;
  - le code SAV-TRACE et les statuts de fiche ;
  - le statut, la vocation, la pesée et l'origine d'un animal ;
  - les fiches des annonces de démonstration.

  Le QR code vient de la seule dépendance ajoutée, `react-qr-code`. Le détail des changements et les guides de test sont dans `CHANGELOG.md`.
- `src/logo.tsx` dessine le logo SAVAA (fichier source `public/logo-savaa.svg`), avec son animation sur l'écran de démarrage.
- `public/` contient l'icône d'onglet (`favicon.svg`), les icônes (`icon-192.png`, `icon-512.png`, `apple-touch-icon.png`), les photos de démonstration (`images/`) et les logos des moyens de paiement (`images/payments/`).

Les écrans sont rangés par thème dans `src/screens/` :

- `eleveur.tsx` : tableau de bord, cheptel, ajout d'un animal (avec pesée, état, vocation et origine)
- `sante.tsx` : fiche animale (avec identification et état, origine, historique de traçabilité et QR code), dossier sanitaire, nouvelle observation
- `fiche.tsx` : fiche produit (`/fiche/:code`), fenêtre du QR code, frise de traçabilité et légende des niveaux de preuve, réutilisées par la fiche animale
- `achat.tsx` : accueil, catalogue (et son état hors connexion), annonce (avec le lien vers sa fiche produit)
- `commande.tsx` : panier, paiement, reçu, suivi, assistance
- `compte.tsx` : démarrage, connexion par code, choix du rôle, profil, notifications
- `vente.tsx` : boutique (création et vue vendeur), publication d'annonce avec sa fiche de traçabilité (4 étapes, puis un aperçu), campagne et ses statistiques, espace restaurant
- `metiers.tsx` : espaces des autres métiers, vétérinaire (`/veto`), transporteur (`/missions`), producteur agricole (`/recoltes`) et fournisseur (`/fournisseur`)
- `crm.tsx` : back-office (`/admin`) avec ses rubriques tableau de bord, utilisateurs, campagnes, statistiques, prospection, et les rubriques Investisseurs et Projets agricoles (`admin-invest.tsx`, logique dans `invest-admin.ts`) ; menu burger sur téléphone
- `investir.tsx` : espace investisseur (tableau de bord, dossier en étapes, propositions)

## Où on en est

Les 30 écrans d'application de la maquette sont faits, avec tous leurs textes, onglets et états. Les planches 26 (feuille de route) et 27 (design system) sont des planches de présentation, il n'y a rien à intégrer.

Le front est fonctionnel de bout en bout : recherche, favoris, panier, paiement simulé avec compte à rebours, commande, reçu imprimable, suivi ; publication d'annonce avec photos, modération dans le back-office, boutique ; connexion, rôles, profil, notifications créées par les actions ; observations avec photos ; CRM avec journal ; réclamations ; exports CSV et calendrier.

La traçabilité suit le cahier des charges des fiches d'identité.
- **Publication :** chaque annonce publiée depuis l'onglet Vendre reçoit une fiche et un code `SAV-TRACE-2026-XXXXXX`. Le vendeur remplit 4 étapes (produit, origine, prix et vente, vendeur). Chaque champ obligatoire est contrôlé, et un aperçu s'affiche avant l'envoi en modération.
- **Fiche produit :** elle s'ouvre depuis l'annonce ou par son QR code, sans compte. Elle contient les sections Produit, Vendeur, Origine, Prix et vente, et une frise de traçabilité avec un niveau de preuve par événement.
- **Fiche animale :** elle affiche le statut (disponible, réservé, vendu, en élevage, indisponible), la vocation, la pesée, l'origine complète, l'historique de traçabilité et un QR code.
- **Annonces de démonstration :** le taurillon FK-0142, l'igname Kponan et le maïs de Dikodougou ont une fiche. Elle reprend uniquement ce que la maquette dit déjà d'eux.

L'**espace investisseur** est en place.
- **L'investisseur** (rôle « Investisseur ») constitue un dossier en étapes, particulier ou entreprise (`invest.ts`, `investir.tsx`). Il le suit sur une frise, puis consulte les projets qu'on lui propose sous forme de catalogue ; chaque projet a sa page de détail.
- **Le back-office** a deux rubriques, Investisseurs et Projets agricoles (`admin-invest.tsx`, `invest-admin.ts`) :
  - analyse du dossier, avec le contrôle des pièces ;
  - décisions avec historique et notes internes ;
  - rapprochement noté sur 100, qui aide à choisir sans décider ;
  - envoi des propositions ;
  - catalogue de projets avec photo.

Sans serveur, l'administration ne voit que le dossier soumis sur le même appareil, plus des exemples fictifs.

À l'inscription, le choix de l'activité se fait en deux temps.
- **L'intention** d'abord, avec 4 cartes : Acheter, Vendre, Proposer un service, Investir.
- **Le métier** ensuite, dans le groupe choisi. Deux métiers au maximum ; un fournisseur se choisit seul.

Les documents à préparer sont annoncés dès qu'un métier est coché.

Les restaurants et hôtels vérifiés (RCCM renseigné) voient le **prix pro** fixé par le vendeur (`proPrice`, `store.priceFor`), appliqué au panier.

Chaque métier a son accueil et sa **carte du jour** (`dash.tsx`). L'inscription demande un **profil métier** selon le rôle (`profils.ts`).

Aucun bouton n'affiche plus seulement un message. Le contact du transporteur passe par la messagerie de l'assistance (pas de numéro réel), et le back-office indique sa période (« 7 derniers jours », « depuis l'ouverture ») au lieu de proposer d'autres périodes : les données n'en couvrent qu'une, on n'invente pas d'autres chiffres.

La charte : vert `#145C3A`, vert clair `#E8F3EA`, orange `#F28C28`, fond `#F8FAF8`, police IBM Plex Sans (installée localement, pas de Google Fonts).

## Comptes et rôles

À l’inscription, un compte professionnel complète ensuite son **profil métier** (`/profil-metier`, champs dans `src/profils.ts`) : pièce d’identité pour tous, et selon le métier exploitation, RCCM, numéro d’inscription à l’Ordre, véhicule et permis… avec les photos des justificatifs (obligatoires pour vétérinaire, transporteur et fournisseur). Ils rejoignent les justificatifs du compte, « En revue ». Chaque espace métier commence par l’en-tête avec la photo du compte et une **carte du jour** (`src/dash.tsx`).

Un nouveau compte part de zéro : formulaires vides, cheptel vide, pas de boutique, pas de commande ni de notification. Seules les annonces des autres vendeurs existent déjà. Dans les espaces métiers (`metiers.tsx`), les visites, la mission en cours, les gains, l’historique, les lots, le calendrier, les devis et les factures de la maquette ne s’affichent que pour le compte de démonstration ; un compte neuf voit un message qui explique comment remplir chaque rubrique. Les alertes des éleveurs et les missions disponibles restent visibles pour tous les vétérinaires et transporteurs.

Sur l'écran de connexion, « Essayer le compte de démonstration » charge les données de la maquette (Adama Koné, Ferme Koné & Fils, cheptel de 46 têtes, commande, notifications). C'est ce compte qu'il faut utiliser pour présenter la maquette telle quelle.

Les accès sont gérés dans `src/guard.tsx`. La barre du bas montre au plus 5 onglets (`TabBar` dans `src/ui.tsx`). L’onglet **Accueil mène à l’espace du métier principal** (`store.home()`) : seuls le visiteur et l’acheteur ont l’accueil marchand (bannière sponsorisée, catégories, catalogue). Le catalogue reste ouvert à tous par l’onglet Explorer, car presque tous les métiers achètent aussi (aliment, semences, intrants). Après la connexion, le choix du rôle ou « Continuer » sur l’écran de démarrage, on arrive sur cet accueil.

| Profil | Accueil | Autres onglets | Ce qui lui est réservé |
| --- | --- | --- | --- |
| Sans compte | Accueil marchand | Explorer, Connexion | Accueil, catalogue, annonces, fiches produit et animales (traçabilité) |
| Acheteur | Accueil marchand | Explorer, Favoris, Commandes | Panier, paiement, commandes (`/commandes`), favoris (`/favoris`) |
| Éleveur | Tableau de bord (`/suivi`) | Explorer, Vendre, Boutique | Cheptel, ajout d’animal, observations sur ses propres animaux ; seul profil qui publie des bovins, ovins et caprins (vendus avec leur fiche) |
| Producteur agricole | Récoltes (`/recoltes`) | Explorer, Vendre, Boutique | Récoltes et disponibilités |
| Vendeur | Tableau de bord (`/vendeur`, ou la création de boutique) | Explorer, Vendre, Boutique | Boutique, publication, campagnes |
| Fournisseur | Devis B2B (`/fournisseur`) | Explorer, Vendre, Boutique | Devis, catalogue de gros, factures |
| Restaurant | Espace Pro (`/restaurant`) | Explorer, Commandes, Favoris | Demandes de devis, achats en volume |
| Vétérinaire | Véto (`/veto`) | Explorer | Alertes et validations sanitaires, visites |
| Transporteur | Missions (`/missions`) | Explorer | Missions de livraison |
| Investisseur | Espace investisseur (`/investir`) | Explorer, Dossier, Projets | Dossier d’investissement particulier ou entreprise (`invest.ts`), suivi, propositions de projets |

L’onglet Boutique n’apparaît qu’une fois la boutique créée. Pour un compte à plusieurs métiers, l’accueil suit l’ordre éleveur, producteur, fournisseur, vendeur, restaurant, vétérinaire, transporteur, et les espaces des autres métiers prennent les places libres de la barre.

Tout compte connecté a aussi panier, compte et notifications. Un vendeur doit créer sa boutique avant de publier.

Le back-office (`/#/admin`) est réservé à l'équipe SAVAA. Sans le compte de démonstration, il demande le code d'équipe **SAVAA-EQUIPE**, qui ouvre l'accès sur l'appareil jusqu'à la déconnexion. C'est une protection de démonstration : en production, l'accès doit être contrôlé par le serveur. La prospection est une rubrique du back-office ; les anciennes adresses `/#/prospection` et `/#/prospect/…` y renvoient.

Se déconnecter efface les données du compte sur l'appareil, puisqu'il n'y a pas de serveur. La déconnexion et la remise à zéro passent par l'écran de démarrage, qui affiche « Vous êtes déconnecté ». Elles se font une fois sorti de l'écran Compte : faites depuis l'écran Compte, la garde d'accès renvoyait vers la connexion avec un retour prévu sur Mon compte.

## Liaisons entre les rôles (réseau de l’appareil)

Sans serveur, les comptes d’un même appareil échangent par un espace commun, `savaa-reseau-v1` (dans `data.ts` : `store.net()`, `answerAlert`, `moveMission`, `askQuote`, `offerQuote`, `closeQuote`). Il survit à la déconnexion, comme un vrai serveur ; « Réinitialiser la démo » le vide.

- **Éleveur → vétérinaire :** une observation (« Enregistrer et alerter ») crée une alerte chez tous les vétérinaires, avec le texte, les photos et le numéro de l’éleveur. Le vétérinaire la prend en charge puis la clôture ; l’éleveur voit « Prise en charge par Dr … » sur son tableau de bord.
- **Acheteur → transporteur :** une commande payée avec livraison crée une mission (enlèvement, livraison, destinataire, rémunération = frais de livraison). Le transporteur l’accepte, la fait avancer, et la remise n’est confirmée qu’avec le code à 4 chiffres de l’acheteur. Le suivi de commande de l’acheteur suit ces étapes.
- **Restaurant → fournisseurs :** la demande de devis du restaurant arrive chez les fournisseurs ; leur prix au kg revient dans l’espace du restaurant, à la place des offres de démonstration.
- **Acheteur → vendeur :** chaque commande crée une vente chez le vendeur concerné (boutique et tableau de bord, « Commandes reçues »). Il la marque « prête », puis « remise faite » si l’acheteur vient la chercher ; avec une livraison, la vente passe à « remise » dès que le transporteur l’enlève.
- **Éleveur → vétérinaire (fiches) :** sur la fiche d’un animal, « Demander la vérification » envoie la fiche dans l’onglet Validations des vétérinaires. Une fois validée, l’éleveur voit « Vérifié », avec le nom du vétérinaire et la date.
- **Annonces partagées :** une annonce publiée par un vrai compte est visible par les autres comptes de l’appareil. L’archiver la retire du catalogue ; « Remettre en vente » la renvoie en relecture.

Dans l’espace de l’éleveur, le bloc **Échéances** (vaccination, pesée, vermifuge…) s’enregistre par compte : ajout avec contrôle des champs, « Fait » pour la retirer, export vers l’agenda (.ics).

- **Devis et factures :** tout compte demande un devis (`/devis`, lien sur le tableau de bord de l’éleveur) avec quantité et unité. Les fournisseurs répondent avec un prix unitaire ; le demandeur retient une offre, la demande se ferme pour les autres. Le fournisseur émet la facture (échéance à 15 jours), le client la règle (paiement simulé).
- **Commandes récurrentes :** le restaurant (ou tout client) programme l’offre retenue chaque semaine, toutes les deux ou quatre semaines, un jour donné. Le fournisseur « livre et facture » chaque échéance ; le client peut suspendre et reprendre.
- **Visites du vétérinaire :** l’éleveur demande une visite (motif, animaux, date souhaitée) ; un vétérinaire fixe la date, puis la déclare faite. Le vétérinaire peut aussi planifier ses propres visites.
- **Justificatifs :** l’enregistrement du profil métier envoie au back-office les informations et les photos des justificatifs. L’équipe valide ou refuse avec un motif ; le compte affiche « Vérifié » (niveau 2 / 3) ou « Justificatifs à refaire ».
- **Transporteur & livraison intelligente :** calcul du véhicule adapté (moto, tricycle, pick-up, bétaillère, camion, frigo, groupage), estimation de distance et prix selon la charge (`src/livraison.ts`, `src/livraison.test.ts`), carte interactive OpenStreetMap/Leaflet (`src/carte.tsx`) dans le suivi de commande et chez le transporteur, gestion de la zone et du désistement ; les missions des commandes passées sur ses propres annonces ne lui sont pas proposées (`sellerPhones` sur la mission).

Règles de rôles depuis le compte : deux métiers professionnels au plus en tout (éleveur, producteur, commerçant, fournisseur, vétérinaire, transporteur), et le fournisseur reste seul. Acheter et investir ne comptent pas.

Producteur agricole : calendrier des cultures (même composant que les échéances de l’éleveur, clé `agri.cal`), statut des lots (épuisé ou disponible), statistiques de ventes par produit tirées des ventes reçues, volume disponible lu dans les quantités (`src/agri.ts`).

Back-office investisseurs : trois graphiques calculés sur les dossiers (reçus par semaine, budgets par filière, statuts), filtrables sur 30 jours, 90 jours ou depuis l’ouverture.

Pour une démonstration : faire l’observation et la commande avec le compte de démonstration, se déconnecter, créer un compte vétérinaire puis un compte transporteur, et revenir.

## Livraison : véhicule, prix, zones des livreurs

Le calcul est dans `src/livraison.ts` (testé par `livraison.test.ts`). Les tarifs et capacités sont des valeurs de départ, à valider avec des transporteurs de Korhogo.

- **Charge :** chaque ligne du panier est convertie en kg, bovins, petits ruminants, produit frais (sac de 50 kg, plateau 2 kg, bovin 300 kg, ovin 40 kg, lot de N têtes…). Un service ne se livre pas.
- **Distance :** entre villes connues (`PLACES`), à vol d’oiseau × 1,2. Plusieurs vendeurs : trajet le plus long + 5 km par arrêt. Lieu inconnu : 15 km, affiché « estimée ».
- **Véhicule :** moto, tricycle, pick-up, petite bétaillère, camion, camion frigorifique, groupage. Un véhicule n’est proposé que s’il peut porter la charge, sur cette distance, pour ce type de produit (animal vivant → bétaillère, frais → frigorifique au-delà de 20 km). Le moins cher est choisi par défaut ; l’acheteur peut en prendre un autre.
- **Prix :** prise en charge + prix au km ; +20 % si le véhicule est rempli à plus de moitié ; manutention 1 000 FCFA par bovin et 300 par petit ruminant ; +30 % pour une livraison dans la journée ; groupage à 10 FCFA par kg et par 100 km (minimum 1 500). Arrondi à 500 FCFA.
- **Commission SAVAA : 5 %.** Le livreur voit ce qui lui revient avant d’accepter.
- **Livreurs :** véhicule, ville de base, rayon (plafonné par véhicule : moto 15 km, bétaillère 100 km…) et bouton « En service », partagés sur le réseau de l’appareil (`couriers`). Une mission n’est proposée qu’aux livreurs en service, dont le véhicule convient et dont la zone couvre l’enlèvement, de la plus proche à la plus lointaine. Le livreur peut se désister avant l’enlèvement.
- **Panier :** ville de livraison obligatoire, choix du véhicule avec prix, option « dans la journée », nombre de livreurs compatibles en service. Si aucun véhicule ne peut faire le transport en un voyage, l’appli propose le retrait sur place.
- **Carte :** Leaflet avec le fond OpenStreetMap (`src/carte.tsx`), dans l’espace livreur (zone et missions), sur chaque mission et dans le suivi de l’acheteur. Sans connexion, la carte le dit et les distances restent calculées. En production, il faudra un service d’itinéraire pour la vraie distance par la route.

## Ce qu'il reste

À faire dans le front :

- **Tests des écrans :** `npm test` (Vitest, 71 tests) couvre la logique métier (`trace`, `profils`, `invest`, `invest-admin`, `phone`, `agri`, `livraison`).
- **Comparaison visuelle :** comparer la mise en page à la maquette sur des captures.
- **Photos :** remplacer les photos de démonstration par les vraies, y compris celles des projets agricoles d'exemple.

À décider :

- **Combinaisons de rôles :** les règles sont codées (voir plus haut). À confirmer avec l’équipe : faut-il permettre un troisième métier, par exemple éleveur, commerçant et transporteur ?
- **Prix pro :** en production, le RCCM doit être contrôlé par l'équipe avant d'ouvrir les prix pro.
- **Plan financier :** à refaire à partir de `SAVAA_Devis_Revise_Synthese.pdf` (Téléchargements), en ajoutant un devis terrain, les revenus, le résultat et le besoin de financement, avec peu de commentaires.
- **Documents demandés à l'inscription et au dossier investisseur** (RCCM, compte contribuable, inscription à l'Ordre, origine des fonds) : à valider par l'équipe ou un juriste.
- **Fiches de traçabilité des autres annonces de démonstration :** il faut leurs vraies informations.
- **Cahier des charges de traçabilité :** il s'arrête à la section 2.2. Les parties III à VIII n'ont que leurs champs principaux.

Pour la production :

- **API :** brancher une vraie API à la place de `data.ts`. Elle doit couvrir la connexion par SMS, le paiement Mobile Money, la modération, le contrôle des justificatifs, l'accès de l'équipe, les dossiers investisseurs, l'envoi d'e-mails et le journal d'audit.
- **Stockage des fichiers :** photos et justificatifs sur un serveur sécurisé ; le navigateur est limité à quelques Mo.
- **Cadre légal :**
  - déclaration à l'ARTCI (loi 2013-450 sur les données personnelles) ;
  - lutte contre le blanchiment, pour l'espace investisseur ;
  - avis d'un juriste sur l'intermédiation financière.

En pause : le plan financier (`Plan_Financier_SAVAA_v2.pdf`, hors dépôt).

## À respecter

Sur le contenu :

- On n'invente pas de contact. Un numéro ou des horaires qu'on n'a pas restent `[à confirmer]`.
- Le paiement, MIRAH et les capteurs sont simulés, et l'appli ne doit pas laisser croire le contraire.
- L'espace investisseur n'est jamais une offre d'investissement. Une proposition n'engage aucun versement. Les montants et prévisions d'un projet sont ceux de son porteur. On ne demande jamais de mot de passe bancaire, de numéro de carte ni de code Mobile Money.
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
