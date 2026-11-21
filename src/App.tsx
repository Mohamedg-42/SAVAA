import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Guard, StaffGuard } from './guard';
import { Catalog, CatalogOffline, Home, ListingDetail } from './screens/achat';
import { Cart, Orders, Payment, Receipt, Support, Tracking } from './screens/commande';
import { Login, Notifications, ProDetails, Profile, RolePicker, Splash } from './screens/compte';
import { VendorHome } from './screens/tableaux';
import { InvestDossier, InvestHome, InvestProposalDetail, InvestProposals } from './screens/investir';
import { BackOffice, ProspectRedirect } from './screens/crm';
import { AddAnimal, Dashboard, Herd } from './screens/eleveur';
import { ProductSheet } from './screens/fiche';
import { AgriSpace, CourierSpace, SupplierSpace, VetSpace } from './screens/metiers';
import { AnimalSheet, HealthRecord, Observation } from './screens/sante';
import { Campaign, CampaignStats, CreateShop, Publish, Restaurant, Shop } from './screens/vente';
import { Toaster } from './ui';

/*
  Accès : sans compte, on parcourt l'accueil, le catalogue, les annonces et les fiches de traçabilité.
  Le reste demande d'être connecté, et certains espaces un rôle (voir guard.tsx).
*/
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/demarrage" replace />} />

        {/* Lot 4, compte */}
        <Route path="/demarrage" element={<Splash />} />
        <Route path="/connexion" element={<Login />} />
        <Route path="/role" element={<RolePicker />} />
        <Route path="/profil-metier" element={<ProDetails />} />
        <Route path="/compte" element={<Guard need="login"><Profile /></Guard>} />
        <Route path="/notifications" element={<Guard need="login"><Notifications /></Guard>} />

        {/* Lot 3, achat */}
        <Route path="/accueil" element={<Home />} />
        <Route path="/explorer" element={<Catalog />} />
        <Route path="/explorer/hors-ligne" element={<CatalogOffline />} />
        <Route path="/favoris" element={<Catalog favorites />} />
        <Route path="/commandes" element={<Guard need="login"><Orders /></Guard>} />
        <Route path="/annonce/:id" element={<ListingDetail />} />
        <Route path="/fiche/:code" element={<ProductSheet />} />
        <Route path="/panier" element={<Guard need="login"><Cart /></Guard>} />
        <Route path="/paiement" element={<Guard need="login"><Payment /></Guard>} />
        <Route path="/recu" element={<Guard need="login"><Receipt /></Guard>} />
        <Route path="/commande" element={<Guard need="login"><Tracking /></Guard>} />
        <Route path="/assistance" element={<Support />} />

        {/* Lot 2, éleveur (les fiches et dossiers restent lisibles par tous : traçabilité des annonces) */}
        <Route path="/suivi" element={<Guard need="breeder"><Dashboard /></Guard>} />
        <Route path="/cheptel" element={<Guard need="breeder"><Herd /></Guard>} />
        <Route path="/cheptel/ajout" element={<Guard need="breeder"><AddAnimal /></Guard>} />
        <Route path="/animal/:id" element={<AnimalSheet />} />
        <Route path="/animal/:id/sante" element={<HealthRecord />} />
        <Route path="/animal/:id/observation" element={<Guard need="breeder"><Observation /></Guard>} />

        {/* Lot 5, vente */}
        <Route path="/vendre" element={<Guard need="seller" shop><Publish /></Guard>} />
        <Route path="/boutique" element={<Guard need="seller" shop><Shop /></Guard>} />
        <Route path="/vendeur" element={<Guard need="seller" shop><VendorHome /></Guard>} />
        <Route path="/boutique/creer" element={<Guard need="seller"><CreateShop /></Guard>} />
        <Route path="/campagne" element={<Guard need="seller" shop><Campaign /></Guard>} />
        <Route path="/campagne/stats" element={<Guard need="seller" shop><CampaignStats /></Guard>} />
        <Route path="/restaurant" element={<Guard need="resto"><Restaurant /></Guard>} />

        {/* Espaces métiers dédiés (vétérinaire, transporteur, producteur agricole, fournisseur B2B) */}
        <Route path="/veto" element={<Guard need="veto"><VetSpace /></Guard>} />
        <Route path="/missions" element={<Guard need="coursier"><CourierSpace /></Guard>} />
        <Route path="/recoltes" element={<Guard need="agri"><AgriSpace /></Guard>} />
        <Route path="/fournisseur" element={<Guard need="fourn"><SupplierSpace /></Guard>} />

        {/* Espace investisseur (dossier particulier ou entreprise, suivi, propositions de projets) */}
        <Route path="/investir" element={<Guard need="invest"><InvestHome /></Guard>} />
        <Route path="/investir/dossier" element={<Guard need="invest"><InvestDossier /></Guard>} />
        <Route path="/investir/propositions" element={<Guard need="invest"><InvestProposals /></Guard>} />
        <Route path="/investir/propositions/:id" element={<Guard need="invest"><InvestProposalDetail /></Guard>} />

        {/* Lot 6, outils de l’équipe SAVAA : code d’accès d’équipe ; les anciennes adresses de prospection renvoient au back-office */}
        <Route path="/prospection" element={<ProspectRedirect />} />
        <Route path="/prospect/:id" element={<ProspectRedirect />} />
        <Route path="/admin" element={<StaffGuard><BackOffice /></StaffGuard>} />

        <Route path="*" element={<Navigate to="/accueil" replace />} />
      </Routes>
      <Toaster />
    </HashRouter>
  );
}
