import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { today, useStore, type NotifCat, type Session } from '../data';
import { showToast } from '../toast';
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
  const s = useStore();
  const session = s.session();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'tel' | 'mail'>('tel');
  const [cgu, setCgu] = useState(true);
  const [mkt, setMkt] = useState(session.prefs.mkt);
  const [code, setCode] = useState('4812');
  const [phone, setPhone] = useState(session.phone);
  const [mail, setMail] = useState(session.mail ?? 'adama.kone@exemple.ci');
  const [wait, setWait] = useState(42);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);
  const resend = () => {
    setWait(60);
    setCode('');
    showToast(`Nouveau code envoyé ${mode === 'tel' ? 'par SMS' : 'par e-mail'}. En démo, tout code à 6 chiffres est accepté.`);
  };
  const contactOk = mode === 'tel' ? phone.replace(/\D/g, '').length === 10 : /^\S+@\S+\.\S+$/.test(mail);
  const validate = () => {
    s.login(mode === 'tel' ? { phone: phone.trim(), prefs: { ...session.prefs, mkt } } : { mail: mail.trim(), prefs: { ...session.prefs, mkt } });
    navigate('/role');
  };

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
              <input id="login-tel" className="input num" type="tel" inputMode="tel" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, '').slice(0, 14))} style={{ fontWeight: 500, minWidth: 0 }} />
            </div>
            <p className="hint">Nous envoyons un code à 6 chiffres par SMS.</p>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="login-mail">Adresse e-mail</label>
            <input id="login-mail" className="input" type="email" autoComplete="email" value={mail} onChange={(e) => setMail(e.target.value)} />
            <p className="hint">Nous envoyons un code à 6 chiffres par e-mail.</p>
          </div>
        )}
        <div className="field">
          <div className="row between">
            <label className="lbl" htmlFor="login-otp">Code reçu</label>
            {wait > 0
              ? <span className="small muted num">Renvoyer (0:{String(wait).padStart(2, '0')})</span>
              : <button className="link plain" onClick={resend}>Renvoyer le code</button>}
          </div>
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
        <button className="btn btn-p" disabled={!cgu || code.length < 6 || !contactOk} onClick={validate}>Valider le code</button>
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
  const s = useStore();
  const navigate = useNavigate();
  const [sel, setSel] = useState<Record<string, boolean>>(() => Object.fromEntries(s.session().roles.map((r) => [r, true])));
  const count = Object.values(sel).filter(Boolean).length;
  const next = () => {
    s.setSession({ roles: ROLES.filter((r) => sel[r.id]).map((r) => r.id) });
    navigate(sel.resto && !sel.eleveur && !sel.vendeur ? '/restaurant' : sel.vendeur ? '/boutique/creer' : sel.eleveur ? '/suivi' : '/accueil');
  };

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
        <button className="btn btn-p" disabled={count === 0} onClick={next}>Continuer ({count})</button>
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
const DOC_BADGE: Record<Session['docs'][number]['status'], [string, 'green' | 'blue' | 'amber']> = {
  verified: ['Vérifié', 'green'],
  documented: ['Documenté', 'blue'],
  review: ['En revue', 'amber'],
};

export function Profile() {
  const s = useStore();
  const session = s.session();
  const navigate = useNavigate();
  const { push, mkt } = session.prefs;
  const setPref = (k: 'push' | 'mkt') => s.setSession({ prefs: { ...session.prefs, [k]: !session.prefs[k] } });
  const initials = session.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const roles = ROLES.filter((r) => session.roles.includes(r.id));
  const addDoc = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    s.setSession({ docs: [...session.docs, { name: f.name, date: today(), status: 'review' }] });
    showToast('Justificatif reçu, il sera contrôlé par l’équipe SAVAA.');
  };
  const logout = () => {
    s.logout();
    navigate('/demarrage', { replace: true });
  };
  const reset = () => {
    if (!window.confirm('Effacer tout ce qui a été saisi dans la démo et revenir aux données de départ ?')) return;
    s.reset();
    showToast('Démo remise à zéro.');
  };

  return (
    <div className="app">
      <Header
        title="Mon compte"
        actions={<Link className="iconbtn" to="/assistance" aria-label="Assistance"><Icon name="chat" /></Link>}
      />
      <div className="body">
        <div className="card pad row" style={{ gap: 14 }}>
          <span className="av" style={{ width: 56, height: 56, fontSize: 18 }}>{initials}</span>
          <div className="col grow" style={{ gap: 3, minWidth: 0 }}>
            <span className="b" style={{ fontSize: 16 }}>{session.name}</span>
            <span className="small muted ell">{s.shop().name}, {s.shop().town}</span>
            <div className="wrap" style={{ marginTop: 4 }}>
              {roles.map((r) => <Badge key={r.id} tone={r.v ? 'amber' : 'green'}>{r.t.split(' / ')[0]}</Badge>)}
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
                <div className="col grow" style={{ minWidth: 0 }}><span className="b small">Téléphone confirmé</span><span className="xs muted">+225 {session.phone.replace(/\D/g, '').replace(/^(\d{2})\d{4}(\d{2})(\d{2})$/, '$1 •• •• $3')}, le 02/03/2025</span></div>
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
          <div className="sech">
            <h2>Justificatifs</h2>
            <label className="link" style={{ cursor: 'pointer', position: 'relative' }}>
              Ajouter
              <input type="file" accept="image/*,application/pdf" onChange={addDoc} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
            </label>
          </div>
          <div className="card list">
            {session.docs.map((d) => {
              const [label, tone] = DOC_BADGE[d.status];
              return <div className="li" key={d.name + d.date}><Icon name="file" /><div className="col grow" style={{ minWidth: 0 }}><span className="small b ell">{d.name}</span><span className="xs muted">Ajouté le {d.date}</span></div><Badge tone={tone}>{label}</Badge></div>;
            })}
          </div>
        </div>

        <div className="sec">
          <div className="sech"><h2>Préférences</h2></div>
          <div className="card list">
            <button className="li" role="switch" aria-checked={push} onClick={() => setPref('push')}>
              <span className="grow small b">Alertes sanitaires et commandes</span>
              <span className={`toggle${push ? ' on' : ''}`} />
            </button>
            <button className="li" role="switch" aria-checked={mkt} onClick={() => setPref('mkt')}>
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
          <button className="li" onClick={logout}><span className="grow small b" style={{ color: '#A0221A' }}>Se déconnecter</span></button>
        </div>
        <button className="btn btn-ghost btn-block small" onClick={reset}>Remettre la démo à zéro</button>
      </div>
      <TabBar />
    </div>
  );
}

const CAT_STYLE: Record<NotifCat, [string, string, string]> = {
  cmd: ['CMD', '#E8F3EA', '#145C3A'],
  pay: ['PAY', '#E7EEF7', '#1D4E89'],
  cmp: ['PUB', '#FCEBD9', '#7F430A'],
  pro: ['CRM', '#EEF0EE', '#3E4943'],
  alr: ['!', '#FDECEA', '#A0221A'],
};

const FILTERS: [NotifCat | 'all', string][] = [['all', 'Tout'], ['cmd', 'Commandes'], ['pay', 'Paiements'], ['cmp', 'Campagnes'], ['pro', 'Prospects'], ['alr', 'Alertes']];

/* Écran 22 : notifications (filtres, lecture). */
export function Notifications() {
  const s = useStore();
  const all = s.notifs();
  const [filter, setFilter] = useState<NotifCat | 'all'>('all');
  const unreadCount = s.unread();

  const shown = all.filter((n) => filter === 'all' || n.c === filter);
  /* Groupes dans l'ordre d'apparition : « Aujourd'hui » pour ce qui arrive pendant la démo. */
  const label = (n: (typeof all)[number]) => n.g ?? (n.date === today() ? 'Aujourd’hui' : n.date ?? '');
  const groups = [...new Set(shown.map(label))].map((t) => ({ t, items: shown.filter((n) => label(n) === t) }));

  return (
    <div className="app">
      <Header
        back
        title="Notifications"
        actions={
          <button className="plain link" style={{ paddingRight: 10, opacity: unreadCount ? 1 : 0.6 }} disabled={unreadCount === 0} onClick={() => s.markAllRead()}>
            Tout marquer lu
          </button>
        }
      />
      <div style={{ background: '#fff', borderBottom: '1px solid #E3E7E4', padding: '10px 16px', flex: 'none' }}>
        <div className="chips">
          {FILTERS.map(([id, t]) => (
            <button key={id} className={`chip${filter === id ? ' on' : ''}`} onClick={() => setFilter(id)}>
              {t} <span className="n">{id === 'all' ? all.length : all.filter((n) => n.c === id).length}</span>
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
                  <Link key={n.id} className="li" to={n.to} onClick={() => s.markRead(n.id)} style={{ alignItems: 'flex-start', background: n.unread ? '#E8F3EA' : '#fff' }}>
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
