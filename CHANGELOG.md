# Journal des modifications

## Fiches d'identité et de traçabilité

### Axe 1 : création de la fiche par le vendeur (onglet Vendre)

**Ajouté**

- `src/trace.ts`, un nouveau fichier. Il contient la définition commune au formulaire et à la future fiche produit :
  - les 8 catégories du cahier des charges, avec leurs sous-catégories, leurs champs propres et leur unité de vente par défaut ;
  - la correspondance avec les anciennes catégories d'annonce, pour que le catalogue et ses filtres continuent de fonctionner ;
  - les unités de vente, les modes de remise et les types d'acteur ;
  - le code `SAV-TRACE-<année>-XXXXXX`, unique (`newTraceCode`) ;
  - le statut de la fiche (`sheetStatus`) : Publiée, En modération, Vendue ou Indisponible.
- `src/data.ts` :
  - nouveaux types `TraceSheet` (parties A à E) et `TraceEvent` (historique) ;
  - champ facultatif `sheet` sur `Listing`. Comme il est facultatif, la clé de stockage ne change pas et les données déjà gardées sur l'appareil restent valides.
- `CHANGELOG.md` (ce fichier).

**Modifié**

- `src/screens/vente.tsx`, écran `Publish` : le formulaire est réécrit en 4 étapes, puis un aperçu.
  1. **Le produit.** Catégorie et sous-catégorie, animaux du cheptel s'il s'agit de bovins, ovins ou caprins, photos (au moins une), nom, description courte, marque ou variété, champs propres à la catégorie (facultatifs).
  2. **Origine.** Pays, région, département, commune, localité, exploitation, date de production ou de récolte.
  3. **Prix et vente.** Prix, unité, quantité disponible, commande minimale, prix négociable, mode de remise, date de disponibilité.
  4. **Vendeur.** Nom, type d'acteur, téléphone, attestation obligatoire.

  Autres points :
  - Les champs obligatoires sont contrôlés à chaque « Continuer », avec un message sous le champ et un rappel en bas de l'écran.
  - L'aperçu montre la fiche complète avant l'envoi. Depuis cet écran, on peut aussi garder le formulaire en brouillon sur le téléphone.
  - L'envoi crée l'annonce avec sa fiche et son code SAV-TRACE. L'annonce part en modération (statut existant `review`), et l'historique démarre avec l'événement « Création de la fiche », au niveau Déclaré.
  - Le lieu de l'annonce vient de l'origine saisie. Avant, il était fixé à « …, Poro ».

**Conservé tel quel**

- La modération dans le back-office, la boutique, les campagnes et le catalogue.
- Le parcours d'achat, le cheptel et la fiche animale.
- La règle « un animal du cheptel se vend avec sa fiche » : seul un éleveur peut vendre des bovins, ovins et caprins. Les autres profils ne voient que les volailles dans les catégories d'animaux.
- La charte (couleurs, police IBM Plex Sans) et les icônes SVG existantes.

**Non appliqué, et pourquoi**

- **Vidéo :** il n'y a pas de serveur, et le stockage du navigateur est limité à quelques Mo.
- **Engrais et produits phytosanitaires :** ils n'entrent dans aucune des 8 catégories du cahier des charges. Il faut décider où les ranger.
- **Statut « brouillon » :** le brouillon reste gardé sur le téléphone (bouton Brouillon) et ne devient pas une annonce. Le statut « archivée » arrivera avec l'axe 2.
- **Niveaux Vérifié et Certifié :** le vendeur ne peut que déclarer. Ces niveaux sont attribués par l'équipe, un vétérinaire ou un organisme.

**Dépendances ajoutées :** aucune pour cet axe.

### Axe 2 : fiche produit et QR code

**Ajouté**

- `src/screens/fiche.tsx`, avec la route `/fiche/:code` :
  - **En-tête de la fiche :** photo, nom, code SAV-TRACE, statut de la fiche, catégorie, bouton « Afficher le QR code » et lien vers l'annonce.
  - **Sections repliables :**
    - Produit : identifiant SAVAA, catégorie, sous-catégorie, champs propres, description, liens vers les fiches animales ;
    - Vendeur : type d'acteur, statut du compte, téléphone masqué ;
    - Origine ;
    - Prix et vente ;
    - Traçabilité.
  - **Section Traçabilité :** une frise des événements, du plus récent au plus ancien, avec un badge de preuve par événement et la légende des 4 niveaux. Pour un animal du cheptel, elle reprend aussi son dossier sanitaire (vaccinations, traitements, observations).
  - **Fenêtre du QR code (`QrDialog`) :** le QR code mène à `/#/fiche/<code>`, avec un bouton Partager (partage du téléphone, ou copie du lien).
  - **Code inconnu :** l'écran « Fiche introuvable » s'affiche, jamais une autre fiche.
- `src/ui.tsx` : composant `Section`, une section repliable réutilisable (elle servira aussi à l'axe 3).
- `src/trace.ts` :
  - `sheetOf(listing)` renvoie la fiche saisie par le vendeur, ou celle d'une annonce de démonstration ;
  - `ficheUrl(code)` construit l'adresse de la fiche ;
  - fiches de démonstration pour FK-0142, l'igname Kponan et le maïs de Dikodougou. Elles reprennent uniquement ce que la maquette dit déjà de ces annonces : fiche animale de FK-0142, descriptions des lots.
- **Dépendance :** `react-qr-code` 2.0.15 (petite, sans autre dépendance), validée avant l'ajout.

**Modifié**

- `src/screens/achat.tsx` : un bloc « Fiche produit » apparaît sur l'annonce, avec le code, le statut, l'origine et « Voir la fiche produit ». Il ne s'affiche que si l'annonce a une fiche.
- `src/App.tsx` : route `/fiche/:code`, ouverte à tous comme les fiches animales, puisqu'un acheteur doit pouvoir scanner le QR code sans compte.

**Non appliqué, et pourquoi**

- **Fiches pour les autres annonces de démonstration :** inventer leurs origines ou leurs dates irait contre la règle « pas de données inventées ». Elles n'affichent donc pas de bloc Fiche produit.
- **Statut « archivée » :** il n'existe pas encore d'action pour archiver une annonce.

### Guide de test de l'axe 1

Compte de démonstration ou compte vendeur avec boutique, puis l'onglet Vendre.

1. **Test 1, publication complète.**
   - Choisir « Produits végétaux frais et maraîchers », ajouter une photo, donner un nom, puis Continuer.
   - Remplir le département et l'exploitation, puis Continuer.
   - Indiquer prix, unité et quantité, puis Continuer.
   - Cocher l'attestation, puis « Voir l'aperçu », puis « Envoyer en relecture ».
   - Résultat attendu : le code `SAV-TRACE-2026-XXXXXX` et le statut « En modération » s'affichent. « Voir l'annonce » ouvre l'annonce, qui apparaît aussi dans la boutique et dans le back-office (annonces à modérer).
2. **Test 2, champs manquants.** Appuyer sur Continuer sans rien remplir à chaque étape. Résultat attendu : un message rouge sous chaque champ obligatoire et « Complétez les champs signalés en rouge » en bas de l'écran. On ne peut pas passer à l'étape suivante.
3. **Test 3, animal du cheptel.** Choisir « Animaux vivants et reproducteurs », puis « Bovin ». Résultat attendu : il faut choisir un animal du cheptel, l'unité est fixée à la tête, et l'annonce porte « Fiche liée ».
4. **Test 4, non-régression.** L'annonce FK-0142, l'ajout au panier, le cheptel et la fiche animale fonctionnent comme avant.

### Guide de test de l'axe 2

1. **Test 3, fiche produit et QR code.**
   - Sans compte, ouvrir l'annonce du taurillon FK-0142, puis « Voir la fiche produit ».
   - Résultat attendu : la fiche porte le code SAV-TRACE-2026-014217, le statut Publiée et la catégorie « Animaux vivants et reproducteurs ». La section Traçabilité montre la naissance, le retour de transhumance, la pesée et la mise en vente, chacun avec son niveau de preuve.
   - « Afficher le QR code » ouvre la fenêtre du QR code, et « Fermer » la referme.
2. **Fiche d'une annonce créée.** Publier une annonce (test 1), puis « Voir l'annonce », puis « Voir la fiche produit ». Résultat attendu : la fiche porte le statut « En modération » et l'événement « Création de la fiche », au niveau Déclaré.
3. **Code inconnu.** Ouvrir `/#/fiche/SAV-TRACE-2026-000000`. Résultat attendu : « Fiche introuvable ».
4. **Annonce sans fiche.** Ouvrir l'annonce de la vache N'Dama. Résultat attendu : il n'y a pas de bloc Fiche produit.

### Axe 3 : fiche animale enrichie

**Ajouté**

- `src/data.ts` : deux champs facultatifs sur `Animal`, donc la clé de stockage ne change pas :
  - `measure` : poids, date de pesée, mensurations, état général et vocation (reproducteur ou viande) ;
  - `origin` : pays, région, département, commune et localité.
- `src/trace.ts` :
  - `animalStatus` déduit le statut de l'animal de ses annonces et des commandes : Disponible, Réservé, Vendu, En élevage, ou Indisponible si une alerte sanitaire est ouverte ;
  - `animalPurpose` donne la vocation saisie, sinon la catégorie de l'annonce liée ;
  - `animalMeasure` et `animalOrigin` donnent la pesée et l'origine ;
  - `animalUrl` construit l'adresse de la fiche animale ;
  - les données de pesée et d'origine de FK-0142 sont reprises de sa fiche de maquette (312 kg le 04/11/2026, Sinématiali).

**Modifié**

- `src/screens/sante.tsx` (fiche animale) :
  - **Onglet Identité :** trois sections repliables sont ajoutées sous le contenu existant :
    - « Identification et état » : statut, vocation, poids actuel, dernière pesée, mensurations, état général observé, plus la mention « le numéro SAVAA ne remplace pas le numéro officiel » ;
    - « Origine » : pays, région, département, commune, localité, exploitation et éleveur ;
    - « Historique de traçabilité » : une frise qui réunit les événements de la fiche produit liée, le dossier sanitaire et la pesée, chacun avec son niveau de preuve.
  - **Bouton « QR code » :** il ouvre la fiche produit liée si l'animal est en vente, sinon la fiche animale.
- `src/screens/eleveur.tsx` (Nouvel animal) :
  - nouvelle partie « Pesée et état » : poids, date de pesée, mensurations, état général et vocation ;
  - la partie « Origine et ascendance » reçoit le département et la localité. La commune est reprise de la boutique ou du compte.

**Conservé tel quel**

- Les 5 onglets de la fiche animale (Identité, Santé, Ascendance, Mouvements, Historique) et tous les textes de maquette de FK-0142.
- Le dossier sanitaire et les observations.

**Non appliqué, et pourquoi**

- **État général et mensurations de FK-0142 :** la maquette ne les donne pas. Ils s'affichent « — » plutôt que d'être inventés.
- **Statut « Réservé » de FK-0142 :** il est juste. Le taurillon figure dans la commande de démonstration en cours de livraison.

### Guide de test de l'axe 3

1. **Test 4, historique de FK-0142.**
   - Avec le compte de démonstration, ouvrir la fiche animale de FK-0142, onglet Identité.
   - Résultat attendu : « Identification et état » affiche Réservé, 312 kg et 04/11/2026.
   - Ouvrir « Historique de traçabilité ». Résultat attendu : 10 événements, dont la mise en vente (Vérifié), la pesée (Documenté), les vaccinations, le retour de transhumance et la naissance.
   - « QR code » ouvre le QR de la fiche SAV-TRACE-2026-014217.
2. **Nouvel animal.**
   - Avec un compte éleveur neuf, ajouter un animal avec son poids, sa date de pesée, son état, sa vocation, son département et sa localité.
   - Résultat attendu : la fiche les affiche avec le statut « En élevage », et l'historique contient la pesée (Déclaré).
3. **Test 5, non-régression.** Le parcours d'achat (annonce, panier), le cheptel et la publication fonctionnent comme avant.

## Tableaux de bord métier, photo de profil et profil métier à l'inscription

**Ajouté**

- **`src/dash.tsx`** : les éléments communs des tableaux de bord :
  - `DashHeader` : l'en-tête avec la photo du compte, le métier et le nom ;
  - `TodayCard` : la carte du jour, ce qu'il faut faire maintenant, en rouge pour une urgence sanitaire ;
  - `Kpis` (les chiffres clés), `QuickActions` (les actions rapides) et `Avatar` (la photo ou les initiales).
- **`src/screens/tableaux.tsx`** : le tableau de bord du vendeur, sur la route `/vendeur`. C'est son nouvel accueil une fois sa boutique créée. Il affiche :
  - la carte du jour ;
  - les ventes, les commandes, les annonces et le stock bas ;
  - les éléments à traiter (annonces en revue, indisponibles, stock bas) et les actions rapides.
- **`src/profils.ts`** : les informations demandées à l'inscription selon le métier.
  - Tout compte professionnel donne le numéro de sa pièce d'identité.
  - La photo de la pièce est obligatoire pour le vétérinaire, le transporteur et le fournisseur.
  - Les autres informations dépendent du métier :

  | Métier | Informations demandées |
  | --- | --- |
  | Éleveur | Exploitation, localité, animaux élevés, effectif |
  | Producteur | Exploitation ou coopérative, cultures, superficie |
  | Vendeur | Commerce, emplacement, RCCM facultatif |
  | Fournisseur | Raison sociale, RCCM (obligatoire), NCC, siège, activité, extrait RCCM |
  | Restaurant | Nom et type d'établissement, adresse de livraison |
  | Vétérinaire | Numéro d'inscription à l'Ordre ou d'agrément, statut, structure, zone, carte professionnelle |
  | Transporteur | Véhicule, immatriculation, capacité, permis, zone, carte grise et photo du permis |

- **Écran « Complétez votre profil »** (`/profil-metier`, étape 3 de l'inscription) :
  - il s'ouvre après le choix d'un rôle professionnel ;
  - il permet d'ajouter la photo de profil et les photos des justificatifs ;
  - les champs obligatoires sont contrôlés ;
  - « Plus tard » n'est pas proposé aux métiers vérifiés (vétérinaire, transporteur, fournisseur) ;
  - les photos rejoignent les justificatifs du compte, au statut « En revue ».
- **Session** (`data.ts`) : champs facultatifs `photo`, `pro` et `proPhotos`. La clé de stockage ne change pas.

**Modifié**

- **Espaces vétérinaire, transporteur, producteur et fournisseur** (`metiers.tsx`) : ils reçoivent l'en-tête avec photo et une carte du jour :
  - vétérinaire : l'alerte la plus urgente ;
  - transporteur : la mission en cours ou acceptée ;
  - producteur : le lot à mettre en vente ;
  - fournisseur : les devis à traiter.

  Un vétérinaire ne voit plus ses propres animaux dans les alertes et les validations.
- **Espace restaurant** (`vente.tsx`) : en-tête avec photo, carte du jour (commande en cours, demande de devis), dépenses du mois, et origine des produits commandés avec le lien vers leur fiche SAV-TRACE. L'exemple de lieu de livraison ne cite plus Korhogo.
- **Tableau de bord éleveur** (`eleveur.tsx`) : en-tête avec photo, et statut des animaux en vente (Disponible, Réservé, Vendu).
- **Compte** : photo de profil modifiable, et section « Profil métier » (Complet ou À compléter, avec un lien pour le modifier).
- **Accueil du vendeur** : `store.home()` le mène à `/vendeur` une fois sa boutique créée.

## Catégorie « Engrais et produits phytosanitaires »

Une 9e catégorie de traçabilité, hors des 8 du cahier des charges, est ajoutée dans `src/trace.ts`, avec ses champs propres. Elle rejoint le filtre « Aliments et intrants » du catalogue.

- **Sous-catégories :** engrais minéraux, engrais organiques et compost, herbicides, insecticides, fongicides.
- **Champs :** fabricant ou marque, composition ou matière active, numéro d'homologation, numéro de lot, date de péremption.
