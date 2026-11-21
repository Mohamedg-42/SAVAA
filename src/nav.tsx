import { Link, NavLink, useLocation } from 'react-router-dom';
import { useStore } from './data';
import { Avatar } from './dash';
import { LogoInline } from './logo';
import { Icon, useNavTabs } from './ui';

/* Pages sans barre du haut : l'écran de démarrage (plein écran) et le back-office (sa propre navigation). */
const WITHOUT_NAV = [/^\/$/, /^\/demarrage/, /^\/prospection/, /^\/prospect\//, /^\/admin/];

/**
 * Barre de navigation de l'ordinateur : logo, onglets du compte à gauche, notifications, panier et compte à droite.
 * Présente sur toutes les pages ; masquée sur téléphone et tablette, qui gardent la barre d'onglets du bas.
 */
export function DesktopNav() {
  const s = useStore();
  const { pathname } = useLocation();
  const tabs = useNavTabs(6);
  if (WITHOUT_NAV.some((r) => r.test(pathname))) return null;

  const session = s.session();
  const logged = session.loggedIn;
  const unread = s.unread();
  const cart = s.cartLines().length;
  const main = tabs.slice(0, -1);
  const first = session.name.trim().split(/\s+/)[0];

  return (
    <header className="dnav">
      <div className="dnav-in">
        <Link className="dnav-brand" to={s.home()} aria-label="SAVAA, accueil"><LogoInline height={36} name={false} /></Link>
        <nav className="dnav-tabs" aria-label="Navigation principale">
          {main.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.to === '/investir'} className={({ isActive }) => `dnav-tab${isActive ? ' on' : ''}`}>
              <Icon name={t.icon} />
              {t.label}
            </NavLink>
          ))}
        </nav>
        <div className="dnav-side">
          {logged && (
            <Link className="dnav-icon" to="/notifications" aria-label={`Notifications, ${unread} non lue${unread > 1 ? 's' : ''}`}>
              <Icon name="bell" />{unread > 0 && <span className="dot">{unread}</span>}
            </Link>
          )}
          <Link className="dnav-icon" to="/panier" aria-label={`Panier, ${cart} article${cart > 1 ? 's' : ''}`}>
            <Icon name="cart" />{cart > 0 && <span className="dot">{cart}</span>}
          </Link>
          {logged ? (
            <NavLink to="/compte" className={({ isActive }) => `dnav-account${isActive ? ' on' : ''}`}>
              <Avatar size={32} name={session.name} />
              <span className="ell">{first || 'Mon compte'}</span>
            </NavLink>
          ) : (
            <Link className="btn btn-p dnav-login" to="/connexion">Se connecter</Link>
          )}
        </div>
      </div>
    </header>
  );
}
