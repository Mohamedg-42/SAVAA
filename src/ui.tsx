import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from './data';
import { readImage } from './device';
import { photoFor } from './photos';
import { clearToast, showToast, useToast } from './toast';

/* Icônes au trait de la maquette (24 × 24, trait 1,75). */
const ICONS = {
  back: <path d="m15 5-7 7 7 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  sell: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M12 8v8M8 12h8" /></>,
  pulse: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  bell: <><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  chevron: <path d="m9 5 7 7-7 7" />,
  down: <path d="m6 9 6 6 6-6" />,
  alert: <><path d="M12 3.5 2.5 20h19z" /><path d="M12 10v4.5M12 17.5v.01" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  file: <><path d="M6 3h8l5 5v13H6z" /><path d="M14 3v5h5" /></>,
  camera: <><path d="M4 7.5h3.5L9 5h6l1.5 2.5H20a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8.5a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.5" /></>,
  share: <><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" /></>,
  download: <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14" />,
  offline: <path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0M12 19h.01M3 3l18 18" />,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8 12.5 2.8 2.8L16.5 9.5" /></>,
  tick: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  scale: <><path d="M5 20h14M7 20V9l5-5 5 5v11" /><path d="M10 14h4" /></>,
  megaphone: <><path d="M4 10v4h3l8 4V6L7 10z" /><path d="M18.5 9.5a3.5 3.5 0 0 1 0 5" /></>,
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  cart: <><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2.5 3.5h3l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.1L21 7.5H6.4" /></>,
  pin: <><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  truck: <><path d="M2.5 6h11v10h-11zM13.5 9.5h4l3 3.5V16h-7" /><circle cx="6.5" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  phone: <path d="M5 4h3.5l1.5 4.5-2 1.5a12 12 0 0 0 6 6l1.5-2 4.5 1.5V19a1.5 1.5 0 0 1-1.5 1.5C10.5 20.5 3.5 13.5 3.5 5.5A1.5 1.5 0 0 1 5 4z" />,
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z" />,
  flag: <path d="M5 21V4h11l-1.5 4L16 12H5" />,
  send: <path d="M4 12 20 4l-6 16-3-7z" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.01" /></>,
  fail: <><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></>,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 'md', style }: { name: IconName; size?: 'sm' | 'md' | 'lg'; style?: React.CSSProperties }) {
  return (
    <svg className={`ic ${size === 'md' ? '' : size}`} viewBox="0 0 24 24" aria-hidden="true" style={style}>
      {ICONS[name]}
    </svg>
  );
}

/** En-tête vert de la maquette. `back` : retour arrière ; `close` : croix. */
export function Header({ title, sub, back, close, actions }: { title: ReactNode; sub?: string; back?: boolean; close?: boolean; actions?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <header className="hdr" style={back || close ? undefined : { paddingLeft: 16 }}>
      {(back || close) && (
        <button className="iconbtn" aria-label={close ? 'Fermer' : 'Retour'} onClick={() => navigate(-1)}>
          <Icon name={close ? 'close' : 'back'} />
        </button>
      )}
      {sub ? (
        <div className="col grow" style={{ gap: 0, padding: back || close ? '0 6px' : 0 }}>
          <span className="b ell" style={{ fontSize: 17 }}>{title}</span>
          <span className="xs muted ell">{sub}</span>
        </div>
      ) : (
        <h1 style={back || close ? undefined : { padding: 0 }}>{title}</h1>
      )}
      {actions}
    </header>
  );
}

/**
 * Onglets selon les rôles : chaque métier dispose de son onglet dédié (5 onglets max).
 */
export function TabBar() {
  const s = useStore();
  const logged = s.session().loggedIn;
  /* « Accueil » mène à l'espace du métier principal ; le visiteur et l'acheteur gardent l'accueil marchand. */
  const home = s.home();
  const hasSpecial = s.canSell() || s.has('resto') || s.has('veto') || s.has('coursier');
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
    if (s.canSell() && s.shop().created) middle.push({ to: '/boutique', label: 'Boutique', icon: 'cart' });
    if (s.has('resto')) {
      middle.push({ to: '/commandes', label: 'Commandes', icon: 'truck' });
      middle.push({ to: '/favoris', label: 'Favoris', icon: 'heart' });
    }
  }
  const extra = middle.filter((t, i) => t.to !== home && middle.findIndex((x) => x.to === t.to) === i);

  const tabs: { to: string; label: string; icon: IconName }[] = [
    { to: home, label: 'Accueil', icon: 'home' },
    { to: '/explorer', label: 'Explorer', icon: 'search' },
    ...extra.slice(0, 2),
    logged ? { to: '/compte', label: 'Compte', icon: 'user' } : { to: '/connexion', label: 'Connexion', icon: 'user' },
  ];
  return (
    <nav className="tabbar">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} className={({ isActive }) => `tab${isActive ? ' on' : ''}`}>
          <Icon name={t.icon} size="lg" />
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}

export type Tone = 'grey' | 'blue' | 'green' | 'cert' | 'sp' | 'red' | 'amber';

export function Badge({ tone = 'grey', children, style }: { tone?: Tone; children: ReactNode; style?: React.CSSProperties }) {
  return <span className={`badge bd-${tone}`} style={style}>{children}</span>;
}

/** Photo : affiche l'image `src` ou l'image correspondant au libellé / teinte. */
export function Photo({ label = '', w, h, radius, tint, src, onRemove }: { label?: string; w?: number | string; h?: number; radius?: number; tint?: 'w' | 's'; src?: string; onRemove?: () => void }) {
  const img = src ?? photoFor(label, tint);
  const showTag = Boolean(label && !label.startsWith('Photo'));
  return (
    <div
      className={`ph${tint ? ' ' + tint : ''}`}
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        padding: showTag ? undefined : 0,
        backgroundImage: `url(${img})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {showTag && <span>{label}</span>}
      {onRemove && (
        <button className="iconbtn" aria-label="Retirer la photo" onClick={onRemove} style={{ position: 'absolute', top: 2, right: 2, width: 28, height: 28, borderRadius: 14, background: 'rgba(23,32,27,.7)', color: '#fff' }}>
          <Icon name="close" size="sm" />
        </button>
      )}
    </div>
  );
}

/** Bouton « Ajouter » qui ouvre l'appareil photo ou la galerie et rend l'image réduite. */
export function PhotoAdd({ onAdd, height, label = 'Ajouter', icon = 'camera', style, video }: { onAdd: (dataUrl: string) => void; height: number; label?: string; icon?: IconName; style?: React.CSSProperties; video?: boolean }) {
  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    for (const f of files) {
      if (!f.type.startsWith('image/')) {
        showToast('Seules les photos sont gardées dans cette démo.');
        continue;
      }
      try {
        onAdd(await readImage(f));
      } catch {
        showToast('Cette image n’a pas pu être lue.');
      }
    }
  };
  return (
    <label className="addph" style={{ height, cursor: 'pointer', position: 'relative', overflow: 'hidden', ...style }}>
      <input type="file" accept={video ? 'image/*,video/*' : 'image/*'} multiple onChange={pick} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
      <Icon name={icon} />{label}
    </label>
  );
}

/** Barre d'action fixe en bas d'écran. */
export function Foot({ children }: { children: ReactNode }) {
  return <div className="foot">{children}</div>;
}

export function SectionHead({ title, link, to, onClick }: { title: string; link?: string; to?: string; onClick?: () => void }) {
  return (
    <div className="sech">
      <h2>{title}</h2>
      {link && (to ? (
        <Link className="link" to={to}>{link}</Link>
      ) : onClick ? (
        <button className="link" onClick={onClick} style={{ background: 'none', border: 0, padding: 0, font: 'inherit', cursor: 'pointer' }}>{link}</button>
      ) : (
        <span className="link">{link}</span>
      ))}
    </div>
  );
}

/** Section repliable (fiche produit, fiche animale) : un titre cliquable, le contenu en dessous. */
export function Section({ title, aside, open: initial = false, children }: { title: string; aside?: ReactNode; open?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(initial);
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <button
        className="row between"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        style={{ width: '100%', border: 0, background: 'none', padding: '14px 16px', font: 'inherit', color: 'inherit', cursor: 'pointer', textAlign: 'left', gap: 10 }}
      >
        <span className="b" style={{ fontSize: 15 }}>{title}</span>
        <span className="row" style={{ gap: 8, flex: 'none' }}>
          {aside}
          <Icon name="chevron" size="sm" style={{ transform: open ? 'rotate(90deg)' : undefined, transition: 'transform .15s' }} />
        </span>
      </button>
      {open && <div className="col" style={{ gap: 12, padding: '0 16px 16px' }}>{children}</div>}
    </div>
  );
}

/** Écran affiché quand l'identifiant de l'URL ne correspond à rien (lien périmé, saisie manuelle). */
export function NotFound({ title, text, to, cta }: { title: string; text: string; to: string; cta: string }) {
  return (
    <div className="app">
      <Header back title={title} />
      <div className="body" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 12, padding: 32 }}>
        <Icon name="info" style={{ width: 52, height: 52, color: '#5D6862', strokeWidth: 1.4 }} />
        <h2 style={{ fontSize: 19, fontWeight: 600 }}>Introuvable</h2>
        <p className="small muted" style={{ lineHeight: 1.5 }}>{text}</p>
        <Link className="btn btn-p btn-block" to={to} replace style={{ marginTop: 8 }}>{cta}</Link>
      </div>
    </div>
  );
}

/** Affiche le message de `showToast` / `simulate` (monté une seule fois, dans App). */
export function Toaster() {
  const msg = useToast();
  /* Un message concerne l'écran où il est apparu : on l'efface quand on change d'écran. */
  const { pathname, search } = useLocation();
  useEffect(() => clearToast(), [pathname, search]);
  return msg ? <div className="toast" role="status">{msg}</div> : null;
}

export function Check({ on }: { on: boolean }) {
  return (
    <span className={`check${on ? ' on' : ''}`}>
      <Icon name="tick" size="sm" style={{ strokeWidth: 3 }} />
    </span>
  );
}
