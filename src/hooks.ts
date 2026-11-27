import { useEffect, useState } from 'react';
import { useStore } from './data';
import { showToast } from './toast';
import type { IconName } from './ui';

/** Onglets selon les rôles : chaque métier dispose de son onglet dédié (5 onglets max). */
export type NavTab = { to: string; label: string; icon: IconName };

/** Onglets du compte : les mêmes pour la barre du bas (téléphone) et la barre du haut (ordinateur). Le dernier est Compte ou Connexion. */
export function useNavTabs(maxExtra = 2): NavTab[] {
  const s = useStore();
  const logged = s.session().loggedIn;
  /* « Accueil » mène à l'espace du métier principal ; le visiteur et l'acheteur gardent l'accueil marchand. */
  const home = s.home();
  const hasSpecial = s.canSell() || s.has('resto') || s.has('veto') || s.has('coursier') || s.has('invest');
  const pureBuyer = logged && !hasSpecial;
  const middle: { to: string; label: string; icon: IconName }[] = [];

  if (pureBuyer) {
    middle.push({ to: '/favoris', label: 'Favoris', icon: 'heart' });
    middle.push({ to: '/commandes', label: 'Commandes', icon: 'truck' });
  } else if (logged) {
    if (s.canSell()) middle.push({ to: '/vendre', label: 'Vendre', icon: 'sell' });
    /* Pour un compte à plusieurs métiers, l'espace des autres métiers. */
    if (s.has('agri')) middle.push({ to: '/recoltes', label: 'Récoltes', icon: 'calendar' });
    if (s.has('fourn')) middle.push({ to: '/fournisseur', label: 'Devis B2B', icon: 'file' });
    if (s.has('resto')) middle.push({ to: '/restaurant', label: 'Pro', icon: 'calendar' });
    if (s.has('veto')) middle.push({ to: '/veto', label: 'Véto', icon: 'pulse' });
    if (s.has('coursier')) middle.push({ to: '/missions', label: 'Missions', icon: 'truck' });
    if (s.has('invest')) {
      middle.push({ to: '/investir', label: 'Investir', icon: 'flag' });
      middle.push({ to: '/investir/dossier', label: 'Dossier', icon: 'file' });
      middle.push({ to: '/investir/propositions', label: 'Projets', icon: 'flag' });
    }
    if (s.canSell() && s.shop().created) middle.push({ to: '/boutique', label: 'Boutique', icon: 'cart' });
    if (s.has('resto')) {
      middle.push({ to: '/commandes', label: 'Commandes', icon: 'truck' });
      middle.push({ to: '/favoris', label: 'Favoris', icon: 'heart' });
    }
  }
  const extra = middle.filter((t, i) => t.to !== home && middle.findIndex((x) => x.to === t.to) === i);

  return [
    { to: home, label: 'Accueil', icon: 'home' },
    { to: '/explorer', label: 'Explorer', icon: 'search' },
    ...extra.slice(0, maxExtra),
    logged ? { to: '/compte', label: 'Compte', icon: 'user' } : { to: '/connexion', label: 'Connexion', icon: 'user' },
  ];
}

/** État réseau du navigateur / téléphone, mis à jour en temps réel. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => { setOnline(true); showToast('Connexion rétablie.'); };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}
