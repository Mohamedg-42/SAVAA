import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { CI_REGIONS, today, useStore, type NotifCat, type Session } from '../data';
import { Logo, LogoInline } from '../logo';
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

/* Écran Main : démarrage. */
export function Splash() {
  const logged = useStore().session().loggedIn;

  /* Fond frais vert clair → blanc assorti à l'animation « Récolte & Marché ». */
  return (
    <div className="app" style={{ background: 'linear-gradient(180deg, #E8F3EA 0%, #F5FAF6 42%, #FFFFFF 100%)', color: '#17201B' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 18, padding: 32 }}>
        <Logo rising width="min(280px, 76%)" />
        <div className="splash-after col" style={{ alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#145C3A' }}>Le marché agricole de confiance</div>
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
  const parts = session.name.trim().split(/\s+/);
  const [lastName, setLastName] = useState(parts.length > 1 ? parts.slice(1).join(' ') : '');
  const [firstName, setFirstName] = useState(parts[0] ?? '');
  const [town, setTown] = useState(session.town ?? '');
  const [phone, setPhone] = useState(session.phone);
  const [cgu, setCgu] = useState(false);
  const [mkt, setMkt] = useState(false);

  const phoneOk = phone.replace(/\D/g, '').length === 10;
  const ready = cgu && phoneOk && lastName.trim() !== '' && firstName.trim() !== '' && town !== '';

  const validate = () => {
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    s.login({ phone: phone.trim(), name: fullName, town, prefs: { ...session.prefs, mkt } });
    if (!s.shop().created) s.setShop({ town });
    navigate(s.session().roles.length ? next ?? '/accueil' : `/role${next ? `?next=${encodeURIComponent(next)}` : ''}`, { replace: true });
  };
  const demo = () => {
    s.loginDemo();
    navigate(next ?? '/accueil', { replace: true });
  };

  return (
    <div className="app" style={{ background: '#fff' }}>
      <WhiteHeader right={<span style={{ paddingRight: 12 }}><LogoInline height={30} name={false} /></span>} />
      <div className="body" style={{ background: '#fff', padding: '8px 20px 20px', gap: 18 }}>
        <div className="col" style={{ gap: 6 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.25 }}>Connexion ou inscription</h2>
          <p className="muted">Un seul compte pour acheter, vendre et suivre votre cheptel partout en Côte d’Ivoire.</p>
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="login-last">Nom</label>
            <input id="login-last" className="input" autoComplete="family-name" placeholder="Ex. Traoré" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="login-first">Prénom</label>
            <input id="login-first" className="input" autoComplete="given-name" placeholder="Ex. Awa" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="login-town">Commune ou ville</label>
          <select
            id="login-town"
            className="input"
            value={town}
            onChange={(e) => setTown(e.target.value)}
            style={{ color: town ? '#17201B' : '#5D6862' }}
          >
            <option value="" disabled>Choisir votre commune ou ville…</option>
            {CI_REGIONS.map((g) => (
              <optgroup key={g.region} label={g.region}>
                {g.towns.map((t) => <option key={t} value={t}>{t}</option>)}
              </optgroup>
            ))}
          </select>
          <p className="hint">Disponible sur toute l’étendue de la Côte d’Ivoire (14 districts).</p>
        </div>
        <div className="field">
          <label htmlFor="login-tel">Numéro de téléphone</label>
          <div className="row" style={{ gap: 8 }}>
            <div className="input" style={{ width: 92, flex: 'none', justifyContent: 'center', fontWeight: 500 }}>+225</div>
            <input id="login-tel" className="input num" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="07 00 00 00 00" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, '').slice(0, 14))} style={{ fontWeight: 500, minWidth: 0 }} />
          </div>
          <p className="hint">Numéro à 10 chiffres en Côte d’Ivoire.</p>
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
        <div className="col" style={{ gap: 8, width: '100%' }}>
          <button className="btn btn-p btn-block" style={{ flex: 'none' }} disabled={!ready} onClick={validate}>Continuer</button>
          <button className="btn btn-ghost btn-block small" style={{ flex: 'none', height: 40 }} onClick={demo}>Essayer le compte de démonstration</button>
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
    const target =
      sel.eleveur ? '/suivi'
        : sel.agri ? '/recoltes'
          : sel.fourn ? '/fournisseur'
            : sel.vendeur ? (s.shop().created ? '/boutique' : '/boutique/creer')
              : sel.resto ? '/restaurant'
                : sel.veto ? '/veto'
                  : sel.coursier ? '/missions'
                    : '/accueil';
    navigate(back ?? target, { replace: true });
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
  const [confirmKind, setConfirmKind] = useState<'logout' | 'reset' | null>(null);
  const doLogout = () => {
    setConfirmKind(null);
    s.logout();
    showToast('Vous êtes déconnecté.');
    navigate('/demarrage', { replace: true });
  };
  const doReset = () => {
    setConfirmKind(null);
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
          {s.has('agri') && <Link className="li" to="/recoltes"><span className="grow small b">Mes récoltes et disponibilités</span><Icon name="chevron" size="sm" /></Link>}
          {s.has('fourn') && <Link className="li" to="/fournisseur"><span className="grow small b">Espace fournisseur (devis B2B)</span><Icon name="chevron" size="sm" /></Link>}
          {s.has('resto') && <Link className="li" to="/restaurant"><span className="grow small b">Espace restaurant (B2B)</span><Icon name="chevron" size="sm" /></Link>}
          {s.has('veto') && <Link className="li" to="/veto"><span className="grow small b">Espace vétérinaire</span><Icon name="chevron" size="sm" /></Link>}
          {s.has('coursier') && <Link className="li" to="/missions"><span className="grow small b">Espace transporteur (missions)</span><Icon name="chevron" size="sm" /></Link>}
          {/* Outils internes : montrés seulement avec le compte de démonstration, pour la présentation. */}
          {session.demo && <Link className="li" to="/admin"><span className="grow small b">Back-office et prospection (équipe SAVAA)</span><Icon name="chevron" size="sm" /></Link>}
          <button className="li" onClick={() => setConfirmKind('logout')}><span className="grow small b" style={{ color: '#A0221A' }}>Se déconnecter</span></button>
        </div>
        <button className="btn btn-ghost btn-block small" onClick={() => setConfirmKind('reset')}>Remettre la démo à zéro</button>
      </div>
      {confirmKind && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          onClick={() => setConfirmKind(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(23, 32, 27, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 40,
          }}
        >
          <div
            className="card pad col"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 340, gap: 14, borderRadius: 14, boxShadow: '0 12px 32px rgba(0,0,0,.24)', textAlign: 'center' }}
          >
            <div className="col" style={{ gap: 6, alignItems: 'center' }}>
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  background: confirmKind === 'logout' ? '#FDECEA' : '#E8F3EA',
                  color: confirmKind === 'logout' ? '#A0221A' : '#145C3A',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={confirmKind === 'logout' ? 'alert' : 'info'} />
              </span>
              <span id="confirm-title" className="b" style={{ fontSize: 17 }}>
                {confirmKind === 'logout' ? 'Se déconnecter ?' : 'Remettre la démo à zéro ?'}
              </span>
              <p className="small muted" style={{ lineHeight: 1.5 }}>
                {confirmKind === 'logout'
                  ? 'Vous allez quitter votre session sur cet appareil. Vous pourrez vous reconnecter à tout moment.'
                  : 'Toutes les modifications saisies pendant votre essai seront effacées pour revenir aux données initiales de la démo.'}
              </p>
            </div>
            <div className="row" style={{ gap: 10, marginTop: 2 }}>
              <button className="btn btn-s grow" onClick={() => setConfirmKind(null)}>Annuler</button>
              <button
                className={confirmKind === 'logout' ? 'btn btn-danger grow' : 'btn btn-p grow'}
                onClick={confirmKind === 'logout' ? doLogout : doReset}
              >
                {confirmKind === 'logout' ? 'Se déconnecter' : 'Réinitialiser'}
              </button>
            </div>
          </div>
        </div>
      )}
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
