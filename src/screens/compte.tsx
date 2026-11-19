import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge, Check, Header, Icon, TabBar } from '../ui';

/* Bouton retour des en-têtes blancs (connexion, rôle). */
function WhiteHeader({ right }: { right: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="hdr" style={{ background: '#fff', color: '#17201B' }}>
      <button className="iconbtn" aria-label="Retour" onClick={() => navigate(-1)}><Icon name="back" /></button>
      <h1 />
      {right}
    </div>
  );
}

const checkRowStyle: React.CSSProperties = { border: 0, background: 'none', padding: 0, textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', color: 'inherit' };

/* Écran Main : démarrage (barre de chargement simulée). */
export function Splash() {
  const [p, setP] = useState(8);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    timer.current = window.setInterval(() => setP((x) => Math.min(100, x + 23)), 350);
    return () => window.clearInterval(timer.current);
  }, []);

  useEffect(() => {
    if (p >= 100) window.clearInterval(timer.current);
  }, [p]);

  return (
    <div className="app" style={{ background: '#145C3A', color: '#fff' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 14, padding: 32 }}>
        <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: '0.06em', lineHeight: 1 }}>SAVAA</div>
        <div style={{ width: 64, height: 3, background: '#F28C28' }} />
        <div style={{ fontSize: 16, fontWeight: 500, color: '#CFE0D4' }}>Ça va maintenant !</div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={p}
          style={{ width: 120, height: 3, background: 'rgba(255,255,255,.18)', borderRadius: 2, overflow: 'hidden', marginTop: 28 }}
        >
          <div style={{ width: `${p}%`, height: '100%', background: '#F28C28', transition: 'width .3s' }} />
        </div>
        <span className="xs" style={{ color: '#CFE0D4' }}>{p < 100 ? 'Chargement des annonces de votre zone…' : 'Prêt'}</span>
      </div>
      <div style={{ padding: '0 24px 40px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: '#CFE0D4', textAlign: 'center' }}>Acheter et vendre des animaux, des récoltes et des intrants. Chaque animal avec son origine et son suivi sanitaire.</p>
        <Link className="btn btn-block" to="/connexion" style={{ background: '#fff', color: '#145C3A' }}>Commencer</Link>
        <Link className="btn btn-block" to="/accueil" style={{ background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,.4)' }}>Parcourir sans compte</Link>
        <p className="xs" style={{ textAlign: 'center', color: '#A9C2B1' }}>Prototype de démonstration v2.0, données fictives</p>
      </div>
    </div>
  );
}

/* Écran 03 : connexion ou inscription (code simulé). */
export function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'tel' | 'mail'>('tel');
  const [cgu, setCgu] = useState(true);
  const [mkt, setMkt] = useState(false);
  const [code, setCode] = useState('4812');

  return (
    <div className="app" style={{ background: '#fff' }}>
      <WhiteHeader right={<span className="b" style={{ fontSize: 15, letterSpacing: '0.06em', color: '#145C3A', paddingRight: 12 }}>SAVAA</span>} />
      <div className="body" style={{ background: '#fff', padding: '8px 20px 20px', gap: 22 }}>
        <div className="col" style={{ gap: 6 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.25 }}>Connexion ou inscription</h2>
          <p className="muted">Un seul compte pour acheter, vendre et suivre votre cheptel.</p>
        </div>
        <div className="seg">
          <button className={mode === 'tel' ? 'on' : ''} onClick={() => setMode('tel')}>Téléphone</button>
          <button className={mode === 'mail' ? 'on' : ''} onClick={() => setMode('mail')}>E-mail</button>
        </div>
        {mode === 'tel' ? (
          <div className="field">
            <label htmlFor="login-tel">Numéro de téléphone</label>
            <div className="row" style={{ gap: 8 }}>
              <div className="input" style={{ width: 92, flex: 'none', justifyContent: 'center', fontWeight: 500 }}>+225</div>
              <input id="login-tel" className="input num" type="tel" inputMode="tel" autoComplete="tel-national" defaultValue="07 48 12 33 90" style={{ fontWeight: 500, minWidth: 0 }} />
            </div>
            <p className="hint">Nous envoyons un code à 6 chiffres par SMS.</p>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="login-mail">Adresse e-mail</label>
            <input id="login-mail" className="input" type="email" autoComplete="email" defaultValue="adama.kone@exemple.ci" />
            <p className="hint">Nous envoyons un code à 6 chiffres par e-mail.</p>
          </div>
        )}
        <div className="field">
          <div className="row between"><label className="lbl" htmlFor="login-otp">Code reçu</label><span className="link">Renvoyer (0:42)</span></div>
          <label className="otp num" style={{ position: 'relative' }}>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className={i === Math.min(code.length, 5) ? 'on' : ''}>{code[i] ?? ''}</div>
            ))}
            <input
              id="login-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              aria-label="Code à 6 chiffres"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, border: 0, cursor: 'text' }}
            />
          </label>
        </div>
        <div className="col" style={{ gap: 14 }}>
          <button className="row top" role="checkbox" aria-checked={cgu} onClick={() => setCgu(!cgu)} style={checkRowStyle}>
            <Check on={cgu} />
            <span className="small" style={{ lineHeight: 1.45 }}>J’accepte les <span className="link" style={{ fontSize: 'inherit' }}>conditions d’utilisation</span> et la <span className="link" style={{ fontSize: 'inherit' }}>politique de confidentialité</span>.</span>
          </button>
          <button className="row top" role="checkbox" aria-checked={mkt} onClick={() => setMkt(!mkt)} style={checkRowStyle}>
            <Check on={mkt} />
            <span className="small" style={{ lineHeight: 1.45 }}>Recevoir les offres et informations de SAVAA par SMS ou WhatsApp. Facultatif, modifiable à tout moment.</span>
          </button>
        </div>
      </div>
      <div className="foot" style={{ borderTop: 0, paddingBottom: 24 }}>
        <button className="btn btn-p" disabled={!cgu || code.length < 6} onClick={() => navigate('/role')}>Valider le code</button>
      </div>
    </div>
  );
}

const ROLES: { id: string; t: string; d: string; v?: boolean }[] = [
  { id: 'eleveur', t: 'Éleveur', d: 'Cheptel, fiches animales, santé, ventes' },
  { id: 'agri', t: 'Producteur agricole', d: 'Récoltes, quantités, disponibilités' },
  { id: 'vendeur', t: 'Vendeur / commerçant', d: 'Boutique, stock, mise en avant' },
  { id: 'fourn', t: 'Fournisseur / entreprise', d: 'Aliments, intrants, équipements, devis' },
  { id: 'resto', t: 'Restaurant / hôtel', d: 'Achats en volume, commandes récurrentes' },
  { id: 'achat', t: 'Acheteur particulier', d: 'Rechercher, comparer, commander' },
  { id: 'veto', t: 'Vétérinaire / agent habilité', d: 'Consultations et validations sanitaires', v: true },
  { id: 'coursier', t: 'Coursier / transporteur', d: 'Missions de livraison', v: true },
];

/* Écran 04 : choix du ou des rôles. */
export function RolePicker() {
  const navigate = useNavigate();
  const [sel, setSel] = useState<Record<string, boolean>>({ eleveur: true, vendeur: true });
  const count = Object.values(sel).filter(Boolean).length;

  return (
    <div className="app" style={{ background: '#fff' }}>
      <WhiteHeader right={<span className="small muted" style={{ paddingRight: 12 }}>Étape 2 sur 3</span>} />
      <div className="body" style={{ background: '#fff', padding: '4px 20px 20px', gap: 18 }}>
        <div className="col" style={{ gap: 6 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.25 }}>Que faites-vous sur SAVAA ?</h2>
          <p className="muted">Choisissez un ou plusieurs profils. Vous pourrez en ajouter plus tard depuis votre compte.</p>
        </div>
        <div className="card list">
          {ROLES.map((r) => (
            <button
              key={r.id}
              className="li"
              role="checkbox"
              aria-checked={!!sel[r.id]}
              onClick={() => setSel({ ...sel, [r.id]: !sel[r.id] })}
              style={{ background: sel[r.id] ? '#E8F3EA' : '#fff' }}
            >
              <Check on={!!sel[r.id]} />
              <span className="col grow" style={{ gap: 2, minWidth: 0 }}>
                <span className="b" style={{ fontSize: 14.5 }}>{r.t}</span>
                <span className="small muted">{r.d}</span>
              </span>
              {r.v && <Badge tone="amber">Vérification</Badge>}
            </button>
          ))}
        </div>
        <p className="hint">Les profils marqués « Vérification » demandent un justificatif avant d’accéder aux fonctions réservées.</p>
      </div>
      <div className="foot" style={{ borderTop: 0, paddingBottom: 24 }}>
        <button className="btn btn-p" disabled={count === 0} onClick={() => navigate(sel.resto && !sel.eleveur && !sel.vendeur ? '/restaurant' : '/boutique/creer')}>Continuer ({count})</button>
      </div>
    </div>
  );
}

/* Icône horloge (en attente), absente de ui.tsx. */
function ClockIcon({ color }: { color: string }) {
  return (
    <svg className="ic" viewBox="0 0 24 24" aria-hidden="true" style={{ color }}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

/* Écran 23 : profil, vérification et préférences. */
export function Profile() {
  const [push, setPush] = useState(true);
  const [mkt, setMkt] = useState(false);

  return (
    <div className="app">
      <Header
        title="Mon compte"
        actions={<Link className="iconbtn" to="/assistance" aria-label="Assistance"><Icon name="chat" /></Link>}
      />
      <div className="body">
        <div className="card pad row" style={{ gap: 14 }}>
          <span className="av" style={{ width: 56, height: 56, fontSize: 18 }}>AK</span>
          <div className="col grow" style={{ gap: 3, minWidth: 0 }}>
            <span className="b" style={{ fontSize: 16 }}>Adama Koné</span>
            <span className="small muted ell">Ferme Koné &amp; Fils, Sinématiali</span>
            <div className="wrap" style={{ marginTop: 4 }}>
              <Badge tone="green">Éleveur</Badge>
              <Badge tone="green">Vendeur</Badge>
              <Link to="/role" className="badge bd-grey">+ Ajouter un rôle</Link>
            </div>
          </div>
        </div>

        <div className="sec">
          <div className="sech"><h2>Niveau de vérification</h2><span className="small b num">2 / 3</span></div>
          <div className="card">
            <div style={{ padding: '14px 14px 4px' }}><div className="bar"><i style={{ width: '66%' }} /></div></div>
            <div className="list">
              <div className="li">
                <Icon name="check" style={{ color: '#145C3A' }} />
                <div className="col grow" style={{ minWidth: 0 }}><span className="b small">Téléphone confirmé</span><span className="xs muted">+225 07 48 •• •• 90, le 02/03/2025</span></div>
                <Badge tone="green">Vérifié</Badge>
              </div>
              <div className="li">
                <Icon name="check" style={{ color: '#145C3A' }} />
                <div className="col grow" style={{ minWidth: 0 }}><span className="b small">Pièce d’identité</span><span className="xs muted">CNI contrôlée par l’équipe SAVAA</span></div>
                <Badge tone="green">Vérifié</Badge>
              </div>
              <div className="li">
                <ClockIcon color="#F28C28" />
                <div className="col grow" style={{ minWidth: 0 }}><span className="b small">Exploitation</span><span className="xs muted">Visite d’un agent prévue le 25/11/2026</span></div>
                <Badge tone="amber">En attente</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="sec">
          <div className="sech"><h2>Justificatifs</h2><span className="link">Ajouter</span></div>
          <div className="card list">
            <div className="li"><Icon name="file" /><div className="col grow" style={{ minWidth: 0 }}><span className="small b ell">CNI recto-verso.pdf</span><span className="xs muted">Ajouté le 03/03/2025</span></div><Badge tone="green">Vérifié</Badge></div>
            <div className="li"><Icon name="file" /><div className="col grow" style={{ minWidth: 0 }}><span className="small b ell">Attestation d’exploitation, mairie.jpg</span><span className="xs muted">Ajouté le 10/11/2026</span></div><Badge tone="blue">Documenté</Badge></div>
          </div>
        </div>

        <div className="sec">
          <div className="sech"><h2>Préférences</h2></div>
          <div className="card list">
            <button className="li" role="switch" aria-checked={push} onClick={() => setPush(!push)}>
              <span className="grow small b">Alertes sanitaires et commandes</span>
              <span className={`toggle${push ? ' on' : ''}`} />
            </button>
            <button className="li" role="switch" aria-checked={mkt} onClick={() => setMkt(!mkt)}>
              <span className="col grow" style={{ minWidth: 0 }}><span className="small b">Offres et informations SAVAA</span><span className="xs muted">SMS ou WhatsApp, désinscription à tout moment</span></span>
              <span className={`toggle${mkt ? ' on' : ''}`} />
            </button>
            <div className="li"><span className="grow small b">Langue</span><span className="small muted">Français</span></div>
          </div>
        </div>

        <div className="card list">
          <Link className="li" to="/recu"><span className="grow small b">Paiements et reçus</span><Icon name="chevron" size="sm" /></Link>
          <Link className="li" to="/boutique"><span className="grow small b">Ma boutique</span><Icon name="chevron" size="sm" /></Link>
          <Link className="li" to="/restaurant"><span className="grow small b">Espace restaurant (B2B)</span><Icon name="chevron" size="sm" /></Link>
          <Link className="li" to="/prospection"><span className="grow small b">Prospection (équipe SAVAA)</span><Icon name="chevron" size="sm" /></Link>
          <Link className="li" to="/admin"><span className="grow small b">Back-office administration</span><Icon name="chevron" size="sm" /></Link>
          <Link className="li" to="/demarrage" replace><span className="grow small b" style={{ color: '#A0221A' }}>Se déconnecter</span></Link>
        </div>
      </div>
      <TabBar />
    </div>
  );
}

type NotifCat = 'cmd' | 'pay' | 'cmp' | 'pro' | 'alr';

const CAT_STYLE: Record<NotifCat, [string, string, string]> = {
  cmd: ['CMD', '#E8F3EA', '#145C3A'],
  pay: ['PAY', '#E7EEF7', '#1D4E89'],
  cmp: ['PUB', '#FCEBD9', '#7F430A'],
  pro: ['CRM', '#EEF0EE', '#3E4943'],
  alr: ['!', '#FDECEA', '#A0221A'],
};

const NOTIFS: { id: number; g: string; c: NotifCat; title: string; text: string; time: string; to: string; unread: boolean }[] = [
  { id: 1, g: 'Aujourd’hui', c: 'alr', title: 'Alerte sanitaire, FK-0119', text: 'Boiterie signalée sur la brebis FK-0119. Priorité moyenne. Contactez un vétérinaire si l’état persiste.', time: '09:58', to: '/animal/FK-0119/observation', unread: true },
  { id: 2, g: 'Aujourd’hui', c: 'pay', title: 'Paiement confirmé (simulation)', text: 'SAV-2026-11-004812, 733 000 FCFA, statut transmis par le prestataire.', time: '09:42', to: '/recu', unread: true },
  { id: 3, g: 'Aujourd’hui', c: 'cmd', title: 'Commande prise en charge', text: 'Transports Ouattara a accepté la livraison du taurillon FK-0142.', time: '09:15', to: '/commande', unread: true },
  { id: 4, g: 'Hier', c: 'cmp', title: 'Campagne validée', text: '« Béliers Sahéliens, lot de 6 » est diffusée jusqu’au 24 novembre.', time: '17:20', to: '/campagne/stats', unread: true },
  { id: 5, g: 'Hier', c: 'pro', title: 'Relance prévue demain', text: 'Restaurant Le Baobab, appel de suivi du devis poulets de chair.', time: '16:05', to: '/prospect/1', unread: false },
  { id: 6, g: 'Hier', c: 'alr', title: 'Rappel vaccinal PPR', text: '9 ovins arrivent à échéance le 22 novembre.', time: '07:00', to: '/suivi', unread: false },
];

const FILTERS: [NotifCat | 'all', string][] = [['all', 'Tout'], ['cmd', 'Commandes'], ['pay', 'Paiements'], ['cmp', 'Campagnes'], ['pro', 'Prospects'], ['alr', 'Alertes']];

/* Écran 22 : notifications (filtres, lecture). */
export function Notifications() {
  const [filter, setFilter] = useState<NotifCat | 'all'>('all');
  const [unread, setUnread] = useState<Set<number>>(() => new Set(NOTIFS.filter((n) => n.unread).map((n) => n.id)));

  const shown = NOTIFS.filter((n) => filter === 'all' || n.c === filter);
  const groups = ['Aujourd’hui', 'Hier'].map((t) => ({ t, items: shown.filter((n) => n.g === t) })).filter((g) => g.items.length > 0);

  const markRead = (id: number) => {
    if (!unread.has(id)) return;
    const next = new Set(unread);
    next.delete(id);
    setUnread(next);
  };

  return (
    <div className="app">
      <Header
        back
        title="Notifications"
        actions={
          <button className="plain link" style={{ paddingRight: 10, opacity: unread.size ? 1 : 0.6 }} disabled={unread.size === 0} onClick={() => setUnread(new Set())}>
            Tout marquer lu
          </button>
        }
      />
      <div style={{ background: '#fff', borderBottom: '1px solid #E3E7E4', padding: '10px 16px', flex: 'none' }}>
        <div className="chips">
          {FILTERS.map(([id, t]) => (
            <button key={id} className={`chip${filter === id ? ' on' : ''}`} onClick={() => setFilter(id)}>
              {t} <span className="n">{id === 'all' ? NOTIFS.length : NOTIFS.filter((n) => n.c === id).length}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="body" style={{ gap: 10 }}>
        {groups.map((g) => (
          <div className="sec" style={{ gap: 8 }} key={g.t}>
            <span className="eyebrow">{g.t}</span>
            <div className="card list">
              {g.items.map((n) => {
                const [k, tint, ink] = CAT_STYLE[n.c];
                return (
                  <Link key={n.id} className="li" to={n.to} onClick={() => markRead(n.id)} style={{ alignItems: 'flex-start', background: unread.has(n.id) ? '#E8F3EA' : '#fff' }}>
                    <span className="mono" style={{ background: tint, color: ink, border: 0 }}>{k}</span>
                    <span className="col grow" style={{ gap: 2, minWidth: 0 }}>
                      <span className="row between" style={{ gap: 8 }}><span className="b small ell">{n.title}</span><span className="xs muted num" style={{ flex: 'none' }}>{n.time}</span></span>
                      <span className="small muted" style={{ lineHeight: 1.4 }}>{n.text}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <div className="card pad col" style={{ alignItems: 'center', textAlign: 'center', gap: 6, padding: '32px 20px' }}>
            <span className="b">Rien dans cette rubrique</span>
            <span className="small muted">Les nouvelles notifications apparaîtront ici.</span>
          </div>
        )}
      </div>
    </div>
  );
}
