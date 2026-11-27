import { lazy, Suspense, type ComponentType } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Guard, StaffGuard } from './guard';
import { DesktopNav } from './nav';
import { Splash } from './screens/compte';
import { OfflineBanner, Toaster } from './ui';

/** Charge un composant nommé à la demande (découpage du bundle JS par écran). */
function load<M extends Record<string, unknown>, K extends keyof M>(loader: () => Promise<M>, key: K) {
  return lazy(() => loader().then((m) => ({ default: m[key] as ComponentType<Record<string, unknown>> })));
}

const Catalog = load(() => import('./screens/achat'), 'Catalog');
const CatalogOffline = load(() => import('./screens/achat'), 'CatalogOffline');
const Home = load(() => import('./screens/achat'), 'Home');
const ListingDetail = load(() => import('./screens/achat'), 'ListingDetail');
const PublicShop = load(() => import('./screens/achat'), 'PublicShop');

const Cart = load(() => import('./screens/commande'), 'Cart');
const Orders = load(() => import('./screens/commande'), 'Orders');
const Payment = load(() => import('./screens/commande'), 'Payment');
const Receipt = load(() => import('./screens/commande'), 'Receipt');
const Support = load(() => import('./screens/commande'), 'Support');
const Tracking = load(() => import('./screens/commande'), 'Tracking');

const Login = load(() => import('./screens/compte'), 'Login');
const Notifications = load(() => import('./screens/compte'), 'Notifications');
const ProDetails = load(() => import('./screens/compte'), 'ProDetails');
const Profile = load(() => import('./screens/compte'), 'Profile');
const RolePicker = load(() => import('./screens/compte'), 'RolePicker');

const VendorHome = load(() => import('./screens/tableaux'), 'VendorHome');
const InvestDossier = load(() => import('./screens/investir'), 'InvestDossier');
const InvestHome = load(() => import('./screens/investir'), 'InvestHome');
const InvestProposalDetail = load(() => import('./screens/investir'), 'InvestProposalDetail');
const InvestProposals = load(() => import('./screens/investir'), 'InvestProposals');

const BackOffice = load(() => import('./screens/crm'), 'BackOffice');
const ProspectRedirect = load(() => import('./screens/crm'), 'ProspectRedirect');

const AddAnimal = load(() => import('./screens/eleveur'), 'AddAnimal');
const Dashboard = load(() => import('./screens/eleveur'), 'Dashboard');
const Herd = load(() => import('./screens/eleveur'), 'Herd');

const ProductSheet = load(() => import('./screens/fiche'), 'ProductSheet');
const QuotePage = load(() => import('./screens/devis'), 'QuotePage');
const Messages = load(() => import('./screens/messages'), 'Messages');
const ThreadView = load(() => import('./screens/messages'), 'ThreadView');
const QrScanner = load(() => import('./screens/scanner'), 'QrScanner');

const AgriSpace = load(() => import('./screens/metiers'), 'AgriSpace');
const CourierSpace = load(() => import('./screens/metiers'), 'CourierSpace');
const SupplierSpace = load(() => import('./screens/metiers'), 'SupplierSpace');
const VetSpace = load(() => import('./screens/metiers'), 'VetSpace');

const AnimalSheet = load(() => import('./screens/sante'), 'AnimalSheet');
const HealthRecord = load(() => import('./screens/sante'), 'HealthRecord');
const Observation = load(() => import('./screens/sante'), 'Observation');

const Campaign = load(() => import('./screens/vente'), 'Campaign');
const CampaignStats = load(() => import('./screens/vente'), 'CampaignStats');
const CreateShop = load(() => import('./screens/vente'), 'CreateShop');
const Publish = load(() => import('./screens/vente'), 'Publish');
const Restaurant = load(() => import('./screens/vente'), 'Restaurant');
const Shop = load(() => import('./screens/vente'), 'Shop');

function PageFallback() {
  return (
    <div className="app" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <span className="small muted">Chargement…</span>
    </div>
  );
}

/*
  Accès : sans compte, on parcourt l'accueil, le catalogue, les annonces et les fiches de traçabilité.
  Le reste demande d'être connecté, et certains espaces un rôle (voir guard.tsx).
*/
export default function App() {
  return (
    <HashRouter>
      {/* Ordinateur : barre de navigation commune à toutes les pages (masquée sur téléphone et tablette). */}
      <DesktopNav />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/demarrage" replace />} />

          {/* Lot 4, compte */}
          <Route path="/demarrage" element={<Splash />} />
          <Route path="/connexion" element={<Login />} />
          <Route path="/role" element={<RolePicker />} />
          <Route path="/profil-metier" element={<ProDetails />} />
          <Route path="/compte" element={<Guard need="login"><Profile /></Guard>} />
          <Route path="/notifications" element={<Guard need="login"><Notifications /></Guard>} />
          <Route path="/messages" element={<Guard need="login"><Messages /></Guard>} />
          <Route path="/messages/:id" element={<Guard need="login"><ThreadView /></Guard>} />

          {/* Lot 3, achat */}
          <Route path="/accueil" element={<Home />} />
          <Route path="/explorer" element={<Catalog />} />
          <Route path="/explorer/hors-ligne" element={<CatalogOffline />} />
          <Route path="/favoris" element={<Catalog favorites />} />
          <Route path="/commandes" element={<Guard need="login"><Orders /></Guard>} />
          <Route path="/annonce/:id" element={<ListingDetail />} />
          <Route path="/boutique-publique/:seller" element={<PublicShop />} />
          <Route path="/fiche/:code" element={<ProductSheet />} />
          <Route path="/scanner" element={<QrScanner />} />
          <Route path="/panier" element={<Guard need="login"><Cart /></Guard>} />
          <Route path="/paiement" element={<Guard need="login"><Payment /></Guard>} />
          <Route path="/recu" element={<Guard need="login"><Receipt /></Guard>} />
          <Route path="/commande" element={<Guard need="login"><Tracking /></Guard>} />
          <Route path="/assistance" element={<Support />} />
          <Route path="/devis" element={<Guard need="login"><QuotePage /></Guard>} />

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
      </Suspense>
      <OfflineBanner />
      <Toaster />
    </HashRouter>
  );
}
