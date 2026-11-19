import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { today, useStore, type NotifCat, type Session } from '../data';
import { Logo } from '../logo';
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

  const logged = useStore().session().loggedIn;

  /* Ciel d'aube : le soleil du logo se lève derrière les reliefs. */
  return (
    <div className="app" style={{ background: 'linear-gradient(180deg, #FDE9D3 0%, #FFF7EF 42%, #FFFFFF 100%)', color: '#17201B' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 18, padding: 32 }}>
        <Logo rising width="min(280px, 76%)" />
        <div className="splash-after col" style={{ alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#145C3A' }}>Ça va maintenant !</div>
          <div
            role="progressbar"
            aria-label="Chargement"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={p}
            style={{ width: 120, height: 3, background: '#E3E7E4', borderRadius: 2, overflow: 'hidden', marginTop: 10 }}
          >
            <div style={{ width: `${p}%`, height: '100%', background: '#F28C28', transition: 'width .3s' }} />
          </div>
          <span className="xs muted">{p < 100 ? 'Chargement des annonces de votre zone…' : 'Prêt'}</span>
        </div>
      </div>
      <div className="splash-after" style={{ padding: '0 24px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p className="muted" style={{ fontSize: 14, lineHeight: 1.5, textAlign: 'center' }}>Acheter et vendre des animaux, des récoltes et des intrants. Chaque animal avec son origine et son suivi sanitaire.</p>
        <Link className="btn btn-p btn-block" to={logged ? '/accueil' : '/connexion'}>{logged ? 'Continuer' : 'Commencer'}</Link>
        {!logged && <Link className="btn btn-s btn-block" to="/accueil">Parcourir sans compte</Link>}
        <p className="xs muted" style={{ textAlign: 'center' }}>Prototype de démonstration v2.0, données fictives</p>
      </div>
    </div>
  );
}

/* Écran 03 : connexion ou inscription (code simulé). */
/** Page demandée avant la connexion (`?next=`), seulement si c'est un chemin interne. */
function useNext() {
  const [params] = useSearchParams();
  const next = params.get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

export function Login() {
  const s = useStore();
  const session = s.session();
  const navigate = useNavigate();
  const next = useNext();
  const [mode, setMode] = useState<'tel' | 'mail'>('tel');
  const [cgu, setCgu] = useState(false);
  const [mkt, setMkt] = useState(false);
  const [name, setName] = useState(session.name);
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState(session.phone);
  const [mail, setMail] = useState(session.mail ?? '');
  /* Le code n'est « envoyé » qu'une fois le numéro ou l'e-mail saisi. */
  const [sent, setSent] = useState(false);
  const [wait, setWait] = useState(0);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);
  const contactOk = mode === 'tel' ? phone.replace(/\D/g, '').length === 10 : /^\S+@\S+\.\S+$/.test(mail);
  const sendCode = () => {
    setSent(true);
    setWait(60);
    setCode('');
    showToast(`Code envoyé ${mode === 'tel' ? 'par SMS' : 'par e-mail'}. En démo, tout code à 6 chiffres est accepté.`);
  };
  const validate = () => {
    const contact = mode === 'tel' ? { phone: phone.trim() } : { mail: mail.trim() };
    s.login({ ...contact, name: name.trim(), prefs: { ...session.prefs, mkt } });
    navigate(s.session().roles.length ? next ?? '/accueil' : `/role${next ? `?next=${encodeURIComponent(next)}` : ''}`, { replace: true });
  };
  const demo = () => {
    s.loginDemo();
    navigate(next ?? '/accueil', { replace: true });
  };

  return (
    <div className="app" style={{ background: '#fff' }}>
      <WhiteHeader right={<span className="b" style={{ fontSize: 15, letterSpacing: '0.06em', color: '#145C3A', paddingRight: 12 }}>SAVAA</span>} />
      <div className="body" style={{ background: '#fff', padding: '8px 20px 20px', gap: 22 }}>
        <div className="col" style={{ gap: 6 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.25 }}>Connexion ou inscription</h2>
          <p className="muted">Un seul compte pour acheter, vendre et suivre votre cheptel.</p>
        </div>
        <div className="field">
          <label htmlFor="login-name">Nom et prénom</label>
          <input id="login-name" className="input" autoComplete="name" placeholder="Ex. Awa Traoré" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="seg">
          <button className={mode === 'tel' ? 'on' : ''} onClick={() => { setMode('tel'); setSent(false); }}>Téléphone</button>
          <button className={mode === 'mail' ? 'on' : ''} onClick={() => { setMode('mail'); setSent(false); }}>E-mail</button>
        </div>
        {mode === 'tel' ? (
          <div className="field">
            <label htmlFor="login-tel">Numéro de téléphone</label>
            <div className="row" style={{ gap: 8 }}>
              <div className="input" style={{ width: 92, flex: 'none', justifyContent: 'center', fontWeight: 500 }}>+225</div>
              <input id="login-tel" className="input num" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="07 00 00 00 00" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, '').slice(0, 14))} style={{ fontWeight: 500, minWidth: 0 }} />
            </div>
            <p className="hint">Nous envoyons un code à 6 chiffres par SMS.</p>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="login-mail">Adresse e-mail</label>
            <input id="login-mail" className="input" type="email" autoComplete="email" placeholder="nom@exemple.ci" value={mail} onChange={(e) => setMail(e.target.value)} />
            <p className="hint">Nous envoyons un code à 6 chiffres par e-mail.</p>
          </div>
        )}
        {!sent ? (
          <button className="btn btn-s btn-block" disabled={!contactOk} onClick={sendCode}>Recevoir le code</button>
        ) : (
        <div className="field">
          <div className="row between">
            <label className="lbl" htmlFor="login-otp">Code reçu</label>
            {wait > 0
              ? <span className="small muted num">Renvoyer (0:{String(wait).padStart(2, '0')})</span>
              : <button className="link plain" onClick={sendCode}>Renvoyer le code</button>}
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
        )}
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
        <div className="col" style={{ gap: 8, width: '100%' }}>
          <button className="btn btn-p btn-block" disabled={!cgu || code.length < 6 || !contactOk || !name.trim()} onClick={validate}>Valider le code</button>
          <button className="btn btn-ghost btn-block small" onClick={demo}>Essayer le compte de démonstration</button>
        </div>
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
  const back = useNext();
  const [sel, setSel] = useState<Record<string, boolean>>(() => Object.fromEntries(s.session().roles.map((r) => [r, true])));
  const count = Object.values(sel).filter(Boolean).length;
  if (!s.session().loggedIn) return <Navigate to={`/connexion?next=${encodeURIComponent('/role')}`} replace />;
  const next = () => {
    s.setSession({ roles: ROLES.filter((r) => sel[r.id]).map((r) => r.id) });
    const sells = ['eleveur', 'agri', 'vendeur', 'fourn'].some((r) => sel[r]);
    navigate(back ?? (sel.eleveur ? '/suivi' : sells ? '/boutique/creer' : sel.resto ? '/restaurant' : '/accueil'), { replace: true });
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
  const idSent = session.docs.length > 0;
  const level = session.demo ? 2 : 1;
  const logout = () => {
    if (!window.confirm('Se déconnecter ? Sans serveur, les données de ce compte sont effacées de cet appareil.')) return;
    s.logout();
    navigate('/demarrage', { replace: true });
  };
  const reset = () => {
    if (!window.confirm('Effacer tout ce qui a été saisi dans la démo et revenir aux données de départ ?')) return;
    s.reset();
    showToast('Démo remise à zéro.');
    navigate('/demarrage', { replace: true });
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
            <span className="small muted ell">{s.shop().created ? `${s.shop().name}, ${s.shop().town}` : session.phone ? `+225 ${session.phone}` : session.mail}</span>
            <div className="wrap" style={{ marginTop: 4 }}>
              {roles.map((r) => <Badge key={r.id} tone={r.v ? 'amber' : 'green'}>{r.t.split(' / ')[0]}</Badge>)}
              <Link to="/role" className="badge bd-grey">+ Ajouter un rôle</Link>
            </div>
          </div>
        </div>

        <div className="sec">
          <div className="sech"><h2>Niveau de vérification</h2><span className="small b num">{level} / 3</span></div>
          <div className="card">
            <div style={{ padding: '14px 14px 4px' }}><div className="bar"><i style={{ width: `${Math.round((level / 3) * 100)}%` }} /></div></div>
            <div className="list">
              <div className="li">
                <Icon name="check" style={{ color: '#145C3A' }} />
                <div className="col grow" style={{ minWidth: 0 }}>
                  <span className="b small">{session.phone ? 'Téléphone confirmé' : 'E-mail confirmé'}</span>
                  <span className="xs muted">{session.phone ? `+225 ${session.phone.replace(/\D/g, '').replace(/^(\d{2})\d{4}(\d{2})(\d{2})$/, '$1 •• •• $3')}` : session.mail}{session.demo ? ', le 02/03/2025' : ''}</span>
                </div>
                <Badge tone="green">Vérifié</Badge>
              </div>
              {session.demo ? (
                <>
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
                </>
              ) : (
                <>
                  <div className="li">
                    <ClockIcon color={idSent ? '#F28C28' : '#5D6862'} />
                    <div className="col grow" style={{ minWidth: 0 }}><span className="b small">Pièce d’identité</span><span className="xs muted">{idSent ? 'Justificatif reçu, contrôle par l’équipe SAVAA' : 'Ajoutez votre CNI dans Justificatifs'}</span></div>
                    <Badge tone={idSent ? 'amber' : 'grey'}>{idSent ? 'En revue' : 'À fournir'}</Badge>
                  </div>
                  {s.isBreeder() && (
                    <div className="li">
                      <ClockIcon color="#5D6862" />
                      <div className="col grow" style={{ minWidth: 0 }}><span className="b small">Exploitation</span><span className="xs muted">Visite d’un agent après contrôle de la pièce d’identité</span></div>
                      <Badge>À planifier</Badge>
                    </div>
                  )}
                </>
              )}
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
          {s.orders().length > 0 && <Link className="li" to="/recu"><span className="grow small b">Paiements et reçus</span><Icon name="chevron" size="sm" /></Link>}
          {s.canSell() && <Link className="li" to="/boutique"><span className="grow small b">{s.shop().created ? 'Ma boutique' : 'Créer ma boutique'}</span><Icon name="chevron" size="sm" /></Link>}
          {s.has('resto') && <Link className="li" to="/restaurant"><span className="grow small b">Espace restaurant (B2B)</span><Icon name="chevron" size="sm" /></Link>}
          {/* Outils internes : montrés seulement avec le compte de démonstration, pour la présentation. */}
          {session.demo && <Link className="li" to="/prospection"><span className="grow small b">Prospection (équipe SAVAA)</span><Icon name="chevron" size="sm" /></Link>}
          {session.demo && <Link className="li" to="/admin"><span className="grow small b">Back-office administration</span><Icon name="chevron" size="sm" /></Link>}
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
                  <Link key={n.id} className="li" to={n.to} onClick={() => s.markRead(n.id)} style={{ alignItems: 'flex-start' }} aria-label={n.unread ? `Non lue : ${n.title}` : undefined}>
                    <span className="mono" style={{ color: ink, borderColor: tint }}>{k}</span>
                    <span className="col grow" style={{ gap: 2, minWidth: 0 }}>
                      <span className="row between" style={{ gap: 8 }}>
                        <span className="b small ell">{n.title}</span>
                        <span className="row" style={{ gap: 6, flex: 'none' }}>
                          <span className="xs muted num">{n.time}</span>
                          {n.unread && <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 4, background: '#F28C28' }} />}
                        </span>
                      </span>
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
