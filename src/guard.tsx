import { useState, type ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useStore } from './data';
import { Header, Icon } from './ui';

/* Accès selon la connexion et les rôles choisis à l'inscription. */

type Need = 'login' | 'breeder' | 'seller' | 'resto' | 'veto' | 'coursier' | 'agri' | 'fourn';

const LABEL: Record<Exclude<Need, 'login'>, [string, string]> = {
  breeder: ['Réservé aux éleveurs', 'Le suivi du cheptel et des soins est ouvert aux comptes « Éleveur ».'],
  seller: ['Réservé aux vendeurs', 'Publier des annonces et tenir une boutique demande un profil éleveur, producteur, vendeur ou fournisseur.'],
  resto: ['Réservé aux restaurants', 'L’espace professionnel est ouvert aux comptes « Restaurant / hôtel ».'],
  veto: ['Réservé aux vétérinaires', 'Les alertes et validations sanitaires sont ouvertes aux comptes « Vétérinaire / agent habilité ».'],
  coursier: ['Réservé aux transporteurs', 'Les missions de livraison sont ouvertes aux comptes « Coursier / transporteur ».'],
  agri: ['Réservé aux producteurs', 'Le suivi des récoltes et disponibilités est ouvert aux comptes « Producteur agricole ».'],
  fourn: ['Réservé aux fournisseurs', 'Les devis et tarifs B2B sont ouverts aux comptes « Fournisseur / entreprise ».'],
};

/**
 * `login` : connexion demandée. `breeder`, `seller`, `resto`, `veto`, `coursier`, `agri`, `fourn` : rôle demandé en plus.
 * `shop` : un vendeur doit d'abord créer sa boutique.
 */
export function Guard({ need, shop, children }: { need: Need; shop?: boolean; children: ReactNode }) {
  const s = useStore();
  const { pathname, search } = useLocation();
  const here = encodeURIComponent(pathname + search);

  if (!s.session().loggedIn) return <Navigate to={`/connexion?next=${here}`} replace />;
  if (!s.session().roles.length) return <Navigate to={`/role?next=${here}`} replace />;

  const ok =
    need === 'login' ||
    (need === 'breeder' && s.isBreeder()) ||
    (need === 'seller' && s.canSell()) ||
    (need === 'resto' && s.has('resto')) ||
    (need === 'veto' && s.has('veto')) ||
    (need === 'coursier' && s.has('coursier')) ||
    (need === 'agri' && s.has('agri')) ||
    (need === 'fourn' && s.has('fourn'));
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
          <Link className="btn btn-ghost btn-block" to={s.home()} replace>Retour à l’accueil</Link>
        </div>
      </div>
    );
  }
  if (shop && !s.shop().created) return <Navigate to={`/boutique/creer?next=${here}`} replace />;
  return <>{children}</>;
}

/*
  Back-office et prospection : réservés à l'équipe SAVAA.
  Démo sans serveur : un code d'accès d'équipe (voir PASSATION.md) ouvre l'accès sur cet appareil ;
  le compte de démonstration y a accès d'office pour la présentation.
  En production, ce contrôle doit être fait côté serveur, jamais seulement dans le navigateur.
*/
const STAFF_CODE = 'SAVAA-EQUIPE';

export function StaffGuard({ children }: { children: ReactNode }) {
  const s = useStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  if (s.session().demo || s.get<boolean>('staff', false)) return <>{children}</>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().toUpperCase() === STAFF_CODE) s.put('staff', true);
    else setError(true);
  };

  return (
    <div className="app">
      <Header back title="Équipe SAVAA" />
      <form className="body" onSubmit={submit} style={{ justifyContent: 'center', gap: 14, padding: 32 }}>
        <div className="col" style={{ alignItems: 'center', textAlign: 'center', gap: 8 }}>
          <Icon name="info" style={{ width: 48, height: 48, color: '#5D6862', strokeWidth: 1.4 }} />
          <h2 style={{ fontSize: 19, fontWeight: 600 }}>Accès réservé à l’équipe</h2>
          <p className="small muted" style={{ lineHeight: 1.5 }}>Le back-office et la prospection servent à l’équipe SAVAA. Saisissez le code d’accès d’équipe.</p>
        </div>
        <div className="field">
          <label htmlFor="staff-code">Code d’accès</label>
          <input id="staff-code" className="input" autoComplete="off" value={code} onChange={(e) => { setCode(e.target.value); setError(false); }} aria-invalid={error} aria-describedby={error ? 'staff-err' : undefined} />
          {error && <span id="staff-err" className="hint" style={{ color: '#A0221A' }}>Code incorrect.</span>}
        </div>
        <button className="btn btn-p btn-block" type="submit" disabled={!code.trim()}>Entrer</button>
        <Link className="btn btn-ghost btn-block" to={s.home()} replace>Retour à l’application</Link>
      </form>
    </div>
  );
}
