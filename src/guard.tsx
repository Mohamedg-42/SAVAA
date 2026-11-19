import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useStore } from './data';
import { Header, Icon } from './ui';

/* Accès selon la connexion et les rôles choisis à l'inscription. */

type Need = 'login' | 'breeder' | 'seller' | 'resto';

const LABEL: Record<Exclude<Need, 'login'>, [string, string]> = {
  breeder: ['Réservé aux éleveurs', 'Le suivi du cheptel et des soins est ouvert aux comptes « Éleveur ».'],
  seller: ['Réservé aux vendeurs', 'Publier des annonces et tenir une boutique demande un profil éleveur, producteur, vendeur ou fournisseur.'],
  resto: ['Réservé aux restaurants', 'L’espace professionnel est ouvert aux comptes « Restaurant / hôtel ».'],
};

/**
 * `login` : connexion demandée. `breeder`, `seller`, `resto` : rôle demandé en plus.
 * `shop` : un vendeur doit d'abord créer sa boutique.
 */
export function Guard({ need, shop, children }: { need: Need; shop?: boolean; children: ReactNode }) {
  const s = useStore();
  const { pathname, search } = useLocation();
  const here = encodeURIComponent(pathname + search);

  if (!s.session().loggedIn) return <Navigate to={`/connexion?next=${here}`} replace />;
  if (!s.session().roles.length) return <Navigate to={`/role?next=${here}`} replace />;

  const ok = need === 'login' || (need === 'breeder' && s.isBreeder()) || (need === 'seller' && s.canSell()) || (need === 'resto' && s.has('resto'));
  if (!ok) {
    const [title, text] = LABEL[need as Exclude<Need, 'login'>];
    return (
      <div className="app">
        <Header back title={title} />
        <div className="body" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 12, padding: 32 }}>
          <Icon name="info" style={{ width: 52, height: 52, color: '#5D6862', strokeWidth: 1.4 }} />
          <h2 style={{ fontSize: 19, fontWeight: 600 }}>{title}</h2>
          <p className="small muted" style={{ lineHeight: 1.5 }}>{text}</p>
          <Link className="btn btn-p btn-block" to={`/role?next=${here}`}>Ajouter ce profil à mon compte</Link>
          <Link className="btn btn-ghost btn-block" to="/accueil" replace>Retour à l’accueil</Link>
        </div>
      </div>
    );
  }
  if (shop && !s.shop().created) return <Navigate to={`/boutique/creer?next=${here}`} replace />;
  return <>{children}</>;
}
