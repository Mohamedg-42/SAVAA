import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Catalog, CatalogOffline, Home, ListingDetail } from './screens/achat';
import { Cart, Payment, Receipt, Support, Tracking } from './screens/commande';
import { Login, Notifications, Profile, RolePicker, Splash } from './screens/compte';
import { BackOffice, NewProspect, Prospection, ProspectSheet } from './screens/crm';
import { AddAnimal, Dashboard, Herd } from './screens/eleveur';
import { AnimalSheet, HealthRecord, Observation } from './screens/sante';
import { Campaign, CampaignStats, CreateShop, Publish, Restaurant, Shop } from './screens/vente';
import { Toaster } from './ui';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/demarrage" replace />} />

        {/* Lot 4, compte */}
        <Route path="/demarrage" element={<Splash />} />
        <Route path="/connexion" element={<Login />} />
        <Route path="/role" element={<RolePicker />} />
        <Route path="/compte" element={<Profile />} />
        <Route path="/notifications" element={<Notifications />} />

        {/* Lot 3, achat */}
        <Route path="/accueil" element={<Home />} />
        <Route path="/explorer" element={<Catalog />} />
        <Route path="/explorer/hors-ligne" element={<CatalogOffline />} />
        <Route path="/annonce/:id" element={<ListingDetail />} />
        <Route path="/panier" element={<Cart />} />
        <Route path="/paiement" element={<Payment />} />
        <Route path="/recu" element={<Receipt />} />
        <Route path="/commande" element={<Tracking />} />
        <Route path="/assistance" element={<Support />} />

        {/* Lot 2, éleveur */}
        <Route path="/suivi" element={<Dashboard />} />
        <Route path="/cheptel" element={<Herd />} />
        <Route path="/cheptel/ajout" element={<AddAnimal />} />
        <Route path="/animal/:id" element={<AnimalSheet />} />
        <Route path="/animal/:id/sante" element={<HealthRecord />} />
        <Route path="/animal/:id/observation" element={<Observation />} />

        {/* Lot 5, vente */}
        <Route path="/vendre" element={<Publish />} />
        <Route path="/boutique" element={<Shop />} />
        <Route path="/boutique/creer" element={<CreateShop />} />
        <Route path="/campagne" element={<Campaign />} />
        <Route path="/campagne/stats" element={<CampaignStats />} />
        <Route path="/restaurant" element={<Restaurant />} />

        {/* Lot 6, prospection et back-office */}
        <Route path="/prospection" element={<Prospection />} />
        <Route path="/prospect/nouveau" element={<NewProspect />} />
        <Route path="/prospect/:id" element={<ProspectSheet />} />
        <Route path="/admin" element={<BackOffice />} />

        <Route path="*" element={<Navigate to="/accueil" replace />} />
      </Routes>
      <Toaster />
    </HashRouter>
  );
}
