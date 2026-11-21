import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CI_REGIONS, today, useStore, type NotifCat, type Session } from '../data';
import { readImage } from '../device';
import { Logo, LogoInline } from '../logo';
import { showToast } from '../toast';
import { Avatar } from '../dash';
import { DEMO_CODE, formatPhone, nameOk, phoneDigits, phoneError } from '../phone';
import { ID_FIELD, PRO_SECTIONS, idPhotoRequired, missingProfile, needsProfile, sectionsFor } from '../profils';
import { Badge, Check, Header, Icon, Photo, PhotoAdd, TabBar, type IconName } from '../ui';

/* Bouton retour des en-têtes blancs (connexion, rôle). */
function WhiteHeader({ right, onBack }: { right: React.ReactNode; onBack?: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="hdr" style={{ background: '#fff', color: '#17201B' }}>
      <button className="iconbtn" aria-label="Retour" onClick={onBack ?? (() => navigate(-1))}><Icon name="back" /></button>
      <h1 />
      {right}
    </div>
  );
}

const checkRowStyle: React.CSSProperties = { border: 0, background: 'none', padding: 0, textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', color: 'inherit' };

/* Écran Main : démarrage. */
export function Splash() {
  const s = useStore();
  const logged = s.session().loggedIn;
  const pending = s.session();
  const step = s.signupStep();
  /* Déconnexion ou remise à zéro demandée depuis l'écran Compte. Elle se fait ici, une fois sorti de l'écran protégé :
     faite là-bas, la garde renvoyait vers la connexion avec « next=/compte », et on revenait sur Mon compte en se reconnectant. */
  const navigate = useNavigate();
  const sortie = (useLocation().state as { sortie?: 'logout' | 'reset' } | null)?.sortie;
  const [bye, setBye] = useState<'logout' | 'reset' | null>(null);
  useEffect(() => {
    if (!sortie) return;
    if (s.session().loggedIn) {
      if (sortie === 'reset') s.reset();
      else s.logout();
      setBye(sortie);
    }
    /* On efface la demande de l'historique : un retour arrière ne doit pas déconnecter une seconde fois. */
    navigate('/demarrage', { replace: true, state: null });
  }, [sortie, s, navigate]);

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
        {bye && !logged && <p className="small" role="status" style={{ textAlign: 'center', color: '#145C3A', fontWeight: 500 }}>{bye === 'reset' ? 'Démo remise à zéro.' : 'Vous êtes déconnecté.'}</p>}
        {step ? (
          /* Inscription commencée puis quittée : le compte n'existe pas encore, on propose de la finir ou de repartir de zéro. */
          <>
            <div className="card pad col" role="status" style={{ gap: 4, textAlign: 'center' }}>
              <span className="b">Inscription en cours</span>
              <span className="small muted">{pending.name}, +225 {pending.phone}. Il reste {pending.onboarding === 'profil' ? 'à compléter votre profil métier' : 'à choisir votre activité'}.</span>
            </div>
            <Link className="btn btn-p btn-block" to={step}>Reprendre mon inscription</Link>
            <button className="btn btn-s btn-block" onClick={() => { s.logout(); navigate('/connexion'); }}>Recommencer l’inscription</button>
          </>
        ) : (
          <>
            <p className="muted" style={{ fontSize: 14, lineHeight: 1.5, textAlign: 'center' }}>Acheter et vendre des animaux, des récoltes et des intrants. Chaque animal avec son origine et son suivi sanitaire.</p>
            <Link className="btn btn-p btn-block" to={logged ? s.home() : '/connexion'}>{logged ? 'Continuer' : 'Commencer'}</Link>
            {!logged && <Link className="btn btn-s btn-block" to="/accueil">Parcourir sans compte</Link>}
          </>
        )}
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

/* Connexion en trois temps : le numéro, le code reçu par SMS (simulé), puis, pour un nouveau compte seulement,
   le nom et la ville. Un numéro déjà utilisé sur cet appareil retrouve son compte tel qu'il était. */
export function Login() {
  const s = useStore();
  const session = s.session();
  const navigate = useNavigate();
  const next = useNext();
  const [step, setStep] = useState<'tel' | 'code' | 'profil'>('tel');
  const [phone, setPhone] = useState('');
  const [telTried, setTelTried] = useState(false);
  const [code, setCode] = useState('');
  const [codeErr, setCodeErr] = useState<string | null>(null);
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [town, setTown] = useState('');
  const [cgu, setCgu] = useState(false);
  const [mkt, setMkt] = useState(false);
  const [legal, setLegal] = useState(false);
  const [tried, setTried] = useState(false);
  /* Déjà connecté en arrivant sur la page : rien à refaire ici. Lu une seule fois, sinon la connexion
     qu'on vient de faire renverrait vers l'accueil avant le choix du métier. */
  const [already] = useState(session.loggedIn);
  if (already) return <Navigate to={next ?? s.home()} replace />;

  const digits = phoneDigits(phone);
  const telErr = phoneError(phone);
  const known = digits.length === 10 ? s.knownAccount(digits) : null;
  const pendingStep = s.signupStep();
  const afterLogin = () => navigate(s.session().roles.length ? next ?? s.home() : `/role${next ? `?next=${encodeURIComponent(next)}` : ''}`, { replace: true });

  const sendCode = () => {
    setTelTried(true);
    if (telErr) return;
    setCode('');
    setCodeErr(null);
    setStep('code');
  };
  const checkCode = () => {
    if (code.length < 4) { setCodeErr('Le code a 4 chiffres.'); return; }
    if (code !== DEMO_CODE) { setCodeErr('Code incorrect. Vérifiez le SMS reçu, ou demandez un nouveau code.'); return; }
    if (known && s.resumeAccount(digits)) {
      showToast(`Bon retour, ${known.split(/\s+/)[0]}.`);
      afterLogin();
      return;
    }
    setStep('profil');
  };

  const errors = {
    last: !lastName.trim() ? 'Indiquez votre nom.' : !nameOk(lastName) ? 'Le nom doit contenir des lettres.' : null,
    first: !firstName.trim() ? 'Indiquez votre prénom.' : !nameOk(firstName) ? 'Le prénom doit contenir des lettres.' : null,
    town: !town ? 'Choisissez votre commune ou ville.' : null,
    cgu: !cgu ? 'Acceptez les conditions pour créer votre compte.' : null,
  };
  const create = () => {
    setTried(true);
    if (Object.values(errors).some(Boolean)) return;
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    /* Le compte n'est créé qu'à la fin de l'inscription (métier et profil métier) : voir RolePicker et ProDetails. */
    s.startSignup({ phone: formatPhone(digits), name: fullName, town, prefs: { ...session.prefs, mkt }, roles: [], pro: undefined, proPhotos: undefined, photo: undefined, docs: [] });
    if (!s.shop().created) s.setShop({ town });
    navigate(`/role${next ? `?next=${encodeURIComponent(next)}` : ''}`, { replace: true });
  };
  const demo = () => {
    s.loginDemo();
    navigate(next ?? s.home(), { replace: true });
  };
  const fieldErr = (msg: string | null) => tried && msg ? <span className="xs" role="alert" style={{ color: '#A0221A' }}>{msg}</span> : null;

  const header = (
    <div className="hdr" style={{ background: '#fff', color: '#17201B' }}>
      <button className="iconbtn" aria-label="Retour" onClick={() => (step === 'tel' ? navigate(-1) : setStep('tel'))}><Icon name="back" /></button>
      <h1 />
      <span style={{ paddingRight: 12 }}><LogoInline height={30} name={false} /></span>
    </div>
  );

  if (step === 'code') {
    return (
      <div className="app" style={{ background: '#fff' }}>
        {header}
        <div className="body" style={{ background: '#fff', padding: '8px 20px 20px', gap: 18 }}>
          <div className="col" style={{ gap: 6 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.25 }}>Entrez le code reçu par SMS</h2>
            <p className="muted">Envoyé au <span className="b num" style={{ color: '#17201B' }}>+225 {formatPhone(digits)}</span>. <button className="link" style={{ background: 'none', border: 0, padding: 0, font: 'inherit', cursor: 'pointer' }} onClick={() => setStep('tel')}>Modifier le numéro</button></p>
          </div>
          <div className="field">
            <label htmlFor="login-code">Code à 4 chiffres</label>
            <input id="login-code" className="input num" inputMode="numeric" autoComplete="one-time-code" maxLength={4} placeholder="• • • •" value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setCodeErr(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') checkCode(); }}
              aria-invalid={!!codeErr} style={{ fontSize: 22, letterSpacing: 8, fontWeight: 600 }} />
            {codeErr && <span className="xs" role="alert" style={{ color: '#A0221A' }}>{codeErr}</span>}
          </div>
          <div className="notice"><Icon name="info" size="sm" /><span>Démonstration : aucun SMS n’est envoyé, le code est <b>{DEMO_CODE}</b>.</span></div>
          <button className="link small" style={{ background: 'none', border: 0, padding: 0, alignSelf: 'flex-start', cursor: 'pointer', font: 'inherit' }} onClick={() => { setCode(''); setCodeErr(null); showToast('Nouveau code envoyé.'); }}>Je n’ai pas reçu le code</button>
        </div>
        <div className="foot" style={{ borderTop: 0, paddingBottom: 24 }}>
          <button className="btn btn-p btn-block" onClick={checkCode}>{known ? 'Me connecter' : 'Valider le code'}</button>
        </div>
      </div>
    );
  }

  if (step === 'profil') {
    return (
      <div className="app" style={{ background: '#fff' }}>
        {header}
        <div className="body" style={{ background: '#fff', padding: '8px 20px 20px', gap: 18 }}>
          <div className="col" style={{ gap: 6 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.25 }}>Créez votre compte</h2>
            <p className="muted">Numéro vérifié : <span className="num">+225 {formatPhone(digits)}</span>. Encore quelques informations.</p>
          </div>
          <div className="grid2">
            <div className="field">
              <label htmlFor="login-last">Nom</label>
              <input id="login-last" className="input" autoComplete="family-name" placeholder="Ex. Traoré" value={lastName} onChange={(e) => setLastName(e.target.value)} aria-invalid={tried && !!errors.last} />
              {fieldErr(errors.last)}
            </div>
            <div className="field">
              <label htmlFor="login-first">Prénom</label>
              <input id="login-first" className="input" autoComplete="given-name" placeholder="Ex. Awa" value={firstName} onChange={(e) => setFirstName(e.target.value)} aria-invalid={tried && !!errors.first} />
              {fieldErr(errors.first)}
            </div>
          </div>
          <div className="field">
            <label htmlFor="login-town">Commune ou ville</label>
            <select id="login-town" className="input" value={town} onChange={(e) => setTown(e.target.value)} aria-invalid={tried && !!errors.town} style={{ color: town ? '#17201B' : '#5D6862' }}>
              <option value="" disabled>Choisir votre commune ou ville…</option>
              {CI_REGIONS.map((g) => (
                <optgroup key={g.region} label={g.region}>
                  {g.towns.map((t) => <option key={t} value={t}>{t}</option>)}
                </optgroup>
              ))}
            </select>
            {fieldErr(errors.town)}
          </div>
          <div className="col" style={{ gap: 14 }}>
            <div className="col" style={{ gap: 6 }}>
              <button className="row top" role="checkbox" aria-checked={cgu} onClick={() => setCgu(!cgu)} style={checkRowStyle}>
                <Check on={cgu} />
                <span className="small" style={{ lineHeight: 1.45 }}>J’accepte les conditions d’utilisation et la politique de confidentialité.</span>
              </button>
              <button className="link xs" style={{ background: 'none', border: 0, padding: '0 0 0 34px', alignSelf: 'flex-start', cursor: 'pointer', font: 'inherit' }} aria-expanded={legal} onClick={() => setLegal(!legal)}>{legal ? 'Masquer' : 'Lire les conditions'}</button>
              {legal && <p className="xs muted" style={{ paddingLeft: 34, lineHeight: 1.5 }}>Version de démonstration : les conditions d’utilisation et la politique de confidentialité complètes seront publiées avant l’ouverture du service. Vos données ne servent qu’au fonctionnement de SAVAA et ne sont pas vendues.</p>}
              {fieldErr(errors.cgu)}
            </div>
            <button className="row top" role="checkbox" aria-checked={mkt} onClick={() => setMkt(!mkt)} style={checkRowStyle}>
              <Check on={mkt} />
              <span className="small" style={{ lineHeight: 1.45 }}>Recevoir les offres et informations de SAVAA par SMS ou WhatsApp. Facultatif, modifiable à tout moment.</span>
            </button>
          </div>
        </div>
        <div className="foot" style={{ borderTop: 0, paddingBottom: 24 }}>
          <button className="btn btn-p btn-block" onClick={create}>Créer mon compte</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app" style={{ background: '#fff' }}>
      {header}
      <div className="body" style={{ background: '#fff', padding: '8px 20px 20px', gap: 18 }}>
        <div className="col" style={{ gap: 6 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.25 }}>Connexion ou inscription</h2>
          <p className="muted">Un seul compte pour acheter, vendre et suivre votre cheptel partout en Côte d’Ivoire.</p>
        </div>
        {pendingStep && (
          <div className="notice n-info">
            <Icon name="info" size="sm" />
            <span>Inscription en cours pour {session.name} (+225 {session.phone}). <Link className="link" to={pendingStep}>Reprendre mon inscription</Link>, ou saisissez un numéro pour recommencer.</span>
          </div>
        )}
        <div className="field">
          <label htmlFor="login-tel">Numéro de téléphone</label>
          <div className="row" style={{ gap: 8 }}>
            <div className="input" style={{ width: 80, flex: 'none', justifyContent: 'center', fontWeight: 500 }}>+225</div>
            <input id="login-tel" className="input num" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="07 00 00 00 00" value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              onKeyDown={(e) => { if (e.key === 'Enter') sendCode(); }}
              aria-invalid={telTried && !!telErr} style={{ fontWeight: 500, minWidth: 0 }} />
          </div>
          {telTried && telErr
            ? <span className="xs" role="alert" style={{ color: '#A0221A' }}>{telErr}</span>
            : <p className="hint">{known ? `Compte trouvé sur cet appareil : ${known}.` : 'Nous vous envoyons un code par SMS pour vérifier ce numéro.'}</p>}
        </div>
      </div>
      <div className="foot" style={{ borderTop: 0, paddingBottom: 24 }}>
        <div className="col" style={{ gap: 8, width: '100%' }}>
          <button className="btn btn-p btn-block" style={{ flex: 'none' }} onClick={sendCode}>Recevoir le code</button>
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
  { id: 'invest', t: 'Investisseur', d: 'Particulier ou entreprise : financer des projets agricoles', v: true },
];

/* Écran 04 : activité. D'abord l'intention (4 cartes), puis le métier dans ce groupe, avec les règles de combinaison. */
type Intent = 'acheter' | 'vendre' | 'service' | 'investir';
const INTENTS: { id: Intent; t: string; d: string; icon: IconName; roles: string[]; max: number }[] = [
  { id: 'acheter', t: 'Acheter', d: 'Pour moi, ma famille, mon restaurant ou mon hôtel', icon: 'cart', roles: ['achat', 'resto'], max: 1 },
  { id: 'vendre', t: 'Vendre', d: 'Mes animaux, mes récoltes, mes produits ou mon matériel', icon: 'sell', roles: ['eleveur', 'agri', 'vendeur', 'fourn'], max: 2 },
  { id: 'service', t: 'Proposer un service', d: 'Vétérinaire, transporteur', icon: 'truck', roles: ['veto', 'coursier'], max: 1 },
  { id: 'investir', t: 'Investir dans l’agriculture', d: 'Particulier ou entreprise, projets sélectionnés par SAVAA', icon: 'flag', roles: ['invest'], max: 1 },
];
const ROLE_TEXT: Record<string, [string, string]> = {
  achat: ['Particulier', 'J’achète pour moi ou ma famille'],
  resto: ['Restaurant ou hôtel', 'J’achète en volume, avec des commandes récurrentes'],
  eleveur: ['Éleveur', 'Je vends les animaux que j’élève, avec leur fiche'],
  agri: ['Producteur agricole', 'Je vends mes récoltes'],
  vendeur: ['Commerçant', 'Je revends au détail'],
  fourn: ['Fournisseur (entreprise)', 'Je vends en gros aux professionnels : aliments, intrants, matériel'],
  veto: ['Vétérinaire ou agent habilité', 'Consultations et validations sanitaires'],
  coursier: ['Transporteur', 'Missions de livraison'],
};
/** Ce qu'il faudra fournir, annoncé dès le choix du métier. */
const toPrepare = (role: string) => {
  const sec = PRO_SECTIONS.find((p) => p.role === role);
  if (!sec) return '';
  const docs = sec.docs.filter((d) => d.required).map((d) => d.label.toLowerCase());
  const main = sec.fields.find((f) => f.required)?.label.toLowerCase();
  return ['pièce d’identité', ...(main ? [main] : []), ...docs].join(', ');
};

export function RolePicker() {
  const s = useStore();
  const navigate = useNavigate();
  const back = useNext();
  const existing = s.session().roles;
  const [intent, setIntent] = useState<Intent | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  /* Accès : un compte connecté (ajout d'un métier) ou une inscription en cours. */
  const signingUp = !s.session().loggedIn && !!s.session().onboarding;
  if (!s.session().loggedIn && !signingUp) return <Navigate to={`/connexion?next=${encodeURIComponent('/role')}`} replace />;
  const group = INTENTS.find((g) => g.id === intent);

  const finish = (chosen: string[], g: (typeof INTENTS)[number]) => {
    /* On garde les métiers d'autres groupes déjà présents (ajout d'un rôle depuis le compte). */
    const roles = [...existing.filter((r) => !g.roles.includes(r)), ...chosen];
    s.setSession({ roles });
    const sess = s.session();
    if (!sess.demo && needsProfile(roles) && missingProfile(roles, sess.pro, sess.proPhotos).length) {
      if (signingUp) s.setSession({ onboarding: 'profil' });
      navigate(`/profil-metier${back ? `?next=${encodeURIComponent(back)}` : ''}`, { replace: true });
      return;
    }
    /* Inscription : le compte est créé maintenant que le métier est choisi. */
    if (signingUp) s.finishSignup();
    navigate(back ?? s.home(), { replace: true });
  };

  /* Raison pour laquelle un métier ne peut pas être ajouté au choix en cours. */
  const blocked = (role: string): string | null => {
    if (!group || picked.includes(role)) return null;
    if (group.max === 1) return null;
    if (role === 'fourn' && picked.length) return 'Un compte entreprise se choisit seul.';
    if (picked.includes('fourn')) return 'Un compte entreprise se choisit seul.';
    if (picked.length >= group.max) return 'Deux métiers maximum : décochez-en un pour choisir celui-ci.';
    return null;
  };
  const toggle = (role: string) => {
    if (!group) return;
    if (group.max === 1) { setPicked([role]); return; }
    if (blocked(role)) return;
    setPicked(picked.includes(role) ? picked.filter((r) => r !== role) : [...picked, role]);
  };

  const steps = (
    <div style={{ display: 'flex', gap: 6, padding: '0 20px', flex: 'none' }}>
      {[0, 1, 2].map((i) => <span key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < 2 ? '#145C3A' : '#E3E7E4' }} />)}
    </div>
  );

  if (!group) {
    return (
      <div className="app" style={{ background: '#fff' }}>
        <WhiteHeader onBack={signingUp ? () => navigate('/demarrage') : undefined} right={<span className="small" style={{ paddingRight: 12, color: '#5D6862' }}>2. Votre activité</span>} />
        {steps}
        <div className="body" style={{ background: '#fff', padding: '16px 20px 20px', gap: 12 }}>
          <div className="col" style={{ gap: 6 }}>
            <h2 style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.25 }}>Que voulez-vous faire sur SAVAA ?</h2>
            <p className="muted">Choisissez ce qui vous correspond le mieux. Vous pourrez ajouter une activité plus tard.</p>
          </div>
          {INTENTS.map((g) => (
            <button key={g.id} className="card row" onClick={() => { if (g.id === 'investir') { finish(['invest'], g); return; } setIntent(g.id); setPicked(existing.filter((r) => g.roles.includes(r)).slice(0, g.max)); }} style={{ padding: 16, gap: 14, textAlign: 'left', font: 'inherit', color: 'inherit', cursor: 'pointer', borderWidth: 1.5 }}>
              <span style={{ width: 48, height: 48, borderRadius: 12, background: '#E8F3EA', color: '#145C3A', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name={g.icon} /></span>
              <span className="col grow" style={{ gap: 2, minWidth: 0 }}><span className="b" style={{ fontSize: 16 }}>{g.t}</span><span className="small muted">{g.d}</span></span>
              <Icon name="chevron" size="sm" />
            </button>
          ))}
          <p className="xs muted" style={{ textAlign: 'center' }}>Tout compte peut acheter sur SAVAA, quelle que soit son activité.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app" style={{ background: '#fff' }}>
      <div className="hdr" style={{ background: '#fff', color: '#17201B' }}>
        <button className="iconbtn" aria-label="Retour" onClick={() => setIntent(null)}><Icon name="back" /></button>
        <h1 />
        <span className="small" style={{ paddingRight: 12, color: '#5D6862' }}>2. Votre activité</span>
      </div>
      {steps}
      <div className="body" style={{ background: '#fff', padding: '16px 20px 20px', gap: 10 }}>
        <div className="col" style={{ gap: 6 }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.25 }}>{group.id === 'acheter' ? 'Vous achetez en tant que…' : group.id === 'vendre' ? 'Que vendez-vous ?' : 'Quel service proposez-vous ?'}</h2>
          <p className="small muted">{group.max > 1 ? 'Un métier, ou deux au maximum.' : 'Choisissez une option.'}</p>
        </div>
        {group.roles.map((r) => {
          const on = picked.includes(r);
          const why = blocked(r);
          const prep = on ? toPrepare(r) : '';
          return (
            <button key={r} className="card row top" role={group.max > 1 ? 'checkbox' : 'radio'} aria-checked={on} aria-disabled={!!why} onClick={() => toggle(r)}
              style={{ padding: '12px 14px', gap: 12, textAlign: 'left', font: 'inherit', color: 'inherit', cursor: why ? 'not-allowed' : 'pointer', borderWidth: 1.5, borderColor: on ? '#145C3A' : undefined, background: on ? '#E8F3EA' : why ? '#F4F6F4' : '#fff', opacity: why ? 0.6 : 1 }}>
              <Check on={on} />
              <span className="col grow" style={{ gap: 2, minWidth: 0 }}>
                <span className="b">{ROLE_TEXT[r][0]}</span>
                <span className="small muted">{ROLE_TEXT[r][1]}</span>
                {why && <span className="xs muted" style={{ marginTop: 2 }}>{why}</span>}
                {prep && <span className="xs" style={{ color: '#8A4B00', marginTop: 2 }}>À préparer : {prep}</span>}
              </span>
            </button>
          );
        })}
        {group.id !== 'acheter' && (
          <div className="notice"><Icon name="info" size="sm" /><span>Vous pourrez aussi acheter sur SAVAA : aliment, semences, matériel…</span></div>
        )}
      </div>
      <div className="foot" style={{ borderTop: 0, paddingBottom: 24 }}>
        <button className="btn btn-p" disabled={!picked.length} onClick={() => finish(picked, group)}>{picked.length > 1 ? `Continuer avec ${picked.length} métiers` : 'Continuer'}</button>
      </div>
    </div>
  );
}

/* Écran 04b : profil métier. Les informations demandées dépendent du ou des rôles choisis (voir profils.ts). */
export function ProDetails() {
  const s = useStore();
  const session = s.session();
  const navigate = useNavigate();
  const back = useNext();
  const roles = session.roles;
  const sections = sectionsFor(roles);
  const strict = idPhotoRequired(roles);
  const [pro, setPro] = useState<Record<string, string>>(session.pro ?? {});
  const [photos, setPhotos] = useState<Record<string, string>>(session.proPhotos ?? {});
  const [avatar, setAvatar] = useState(session.photo);
  const [tried, setTried] = useState(false);
  /* Accès : un compte connecté, ou une inscription en cours arrivée à cette étape. */
  const signingUp = !session.loggedIn && session.onboarding === 'profil';
  if (!session.loggedIn && !signingUp) return <Navigate to={s.signupStep() ?? `/connexion?next=${encodeURIComponent('/profil-metier')}`} replace />;
  if (!sections.length) return <Navigate to={back ?? s.home()} replace />;

  const missing = missingProfile(roles, pro, photos);
  const err = (key: string, required?: boolean) => tried && required && !(pro[key] ?? '').trim();
  const errPhoto = (key: string, required?: boolean) => tried && required && !photos[key];
  const set = (key: string, v: string) => setPro({ ...pro, [key]: v });
  const setPhoto = (key: string, v?: string) => {
    const next = { ...photos };
    if (v) next[key] = v;
    else delete next[key];
    setPhotos(next);
  };

  const save = () => {
    if (missing.length) {
      setTried(true);
      showToast(`Il manque ${missing.length} information${missing.length > 1 ? 's' : ''} obligatoire${missing.length > 1 ? 's' : ''}.`);
      return;
    }
    /* Chaque justificatif photographié rejoint la liste des justificatifs, en revue par l'équipe SAVAA. */
    const labels: Record<string, string> = { 'id.photo': 'Pièce d’identité' };
    for (const sec of sections) for (const d of sec.docs) labels[d.key] = d.label;
    const known = new Set(session.docs.map((d) => d.name));
    const newDocs = Object.keys(photos).filter((k) => labels[k] && !known.has(labels[k])).map((k) => ({ name: labels[k], date: today(), status: 'review' as const }));
    s.setSession({ pro, proPhotos: photos, photo: avatar, docs: [...session.docs, ...newDocs] });
    if (signingUp) s.finishSignup();
    showToast(signingUp ? 'Compte créé. L’équipe SAVAA contrôle vos justificatifs.' : 'Profil enregistré. L’équipe SAVAA contrôle vos justificatifs.');
    navigate(back ?? s.home(), { replace: true });
  };

  const photoSlot = (key: string, label: string, required?: boolean) => (
    <div className="field" key={key}>
      <span className="lbl">{label}{!required && <span className="muted"> (facultatif)</span>}</span>
      <div className="row" style={{ gap: 10 }}>
        {photos[key]
          ? <Photo src={photos[key]} label={label} w={96} h={72} radius={8} onRemove={() => setPhoto(key)} />
          : <PhotoAdd height={72} label="Photo" style={{ width: 96, flex: 'none' }} onAdd={(p) => setPhoto(key, p)} />}
        <span className="xs muted" style={{ lineHeight: 1.45 }}>Photo nette, en entier, lisible. Elle n’est vue que par l’équipe SAVAA.</span>
      </div>
      {errPhoto(key, required) && <span className="xs" role="alert" style={{ color: '#A0221A' }}>Ajoutez cette photo.</span>}
    </div>
  );

  return (
    <div className="app" style={{ background: '#fff' }}>
      <WhiteHeader right={<span className="small" style={{ paddingRight: 12, color: '#5D6862' }}>Étape 3 sur 3</span>} />
      <div className="body" style={{ background: '#fff', padding: '4px 20px 20px', gap: 20 }}>
        <div className="col" style={{ gap: 6 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.25 }}>Complétez votre profil</h2>
          <p className="muted">Ces informations protègent les acheteurs et les vendeurs. L’équipe SAVAA les contrôle avant d’afficher le badge « Vérifié ».</p>
        </div>

        <div className="row" style={{ gap: 14 }}>
          {avatar
            ? <span className="av" style={{ width: 72, height: 72, backgroundImage: `url(${avatar})`, backgroundSize: 'cover', backgroundPosition: 'center' }} aria-hidden="true" />
            : <span className="av" style={{ width: 72, height: 72, fontSize: 22 }} aria-hidden="true">{session.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</span>}
          <div className="col" style={{ gap: 6 }}>
            <span className="b small">Photo de profil</span>
            <PhotoAdd height={40} label={avatar ? 'Changer la photo' : 'Ajouter une photo'} style={{ padding: '0 12px' }} onAdd={setAvatar} />
          </div>
        </div>

        <div className="sec" style={{ gap: 12 }}>
          <span className="eyebrow">Identité</span>
          <div className="field">
            <label htmlFor="pro-id">{ID_FIELD.label}</label>
            <input id="pro-id" className="input" value={pro[ID_FIELD.key] ?? ''} onChange={(e) => set(ID_FIELD.key, e.target.value)} aria-invalid={!!err(ID_FIELD.key, true)} />
            {err(ID_FIELD.key, true) && <span className="xs" role="alert" style={{ color: '#A0221A' }}>Indiquez le numéro de votre pièce.</span>}
          </div>
          {photoSlot('id.photo', 'Photo de la pièce d’identité', strict)}
        </div>

        {sections.map((sec) => (
          <div className="sec" style={{ gap: 12 }} key={sec.role}>
            <span className="eyebrow">{sec.title}</span>
            {sec.fields.map((f) => (
              <div className="field" key={f.key}>
                <label htmlFor={`pro-${f.key}`}>{f.label}{!f.required && <span className="muted"> (facultatif)</span>}</label>
                {f.options ? (
                  <select id={`pro-${f.key}`} className="input" value={pro[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} aria-invalid={!!err(f.key, f.required)} style={{ color: pro[f.key] ? '#17201B' : '#5D6862' }}>
                    <option value="" disabled>Choisir…</option>
                    {f.options.map((o) => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input id={`pro-${f.key}`} className="input" inputMode={f.numeric ? 'decimal' : undefined} placeholder={f.placeholder} value={pro[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} aria-invalid={!!err(f.key, f.required)} />
                )}
                {err(f.key, f.required) && <span className="xs" role="alert" style={{ color: '#A0221A' }}>Ce champ est obligatoire.</span>}
              </div>
            ))}
            {sec.docs.map((d) => photoSlot(d.key, d.label, d.required))}
          </div>
        ))}
        <p className="hint">Vos justificatifs ne sont jamais montrés aux autres utilisateurs. Vous pourrez les modifier depuis votre compte.</p>
      </div>
      <div className="foot" style={{ borderTop: 0, paddingBottom: 24 }}>
        {!strict && <button className="btn btn-s" style={{ flex: '0 0 auto' }} onClick={() => { if (signingUp) s.finishSignup(); navigate(back ?? s.home(), { replace: true }); }}>Plus tard</button>}
        <button className="btn btn-p" onClick={save}>Enregistrer</button>
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
  const changePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    try {
      s.setSession({ photo: await readImage(file) });
      showToast('Photo de profil mise à jour.');
    } catch {
      showToast('Cette image n’a pas pu être lue.');
    }
  };
  const proMissing = missingProfile(session.roles, session.pro, session.proPhotos);
  const proSections = sectionsFor(session.roles);
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
  /* La déconnexion elle-même est faite par l'écran de démarrage (voir Splash). */
  const doLogout = () => {
    setConfirmKind(null);
    navigate('/demarrage', { replace: true, state: { sortie: 'logout' } });
  };
  const doReset = () => {
    setConfirmKind(null);
    navigate('/demarrage', { replace: true, state: { sortie: 'reset' } });
  };

  return (
    <div className="app">
      <Header
        title="Mon compte"
        actions={<Link className="iconbtn" to="/assistance" aria-label="Assistance"><Icon name="chat" /></Link>}
      />
      <div className="body">
        <div className="card pad row" style={{ gap: 14 }}>
          <div className="col" style={{ gap: 6, alignItems: 'center', flex: 'none' }}>
            <Avatar size={56} name={session.name} />
            <label className="link xs" style={{ cursor: 'pointer', position: 'relative' }}>
              {session.photo ? 'Changer' : 'Ajouter une photo'}
              <input type="file" accept="image/*" onChange={changePhoto} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} aria-label="Photo de profil" />
            </label>
          </div>
          <div className="col grow" style={{ gap: 3, minWidth: 0 }}>
            <span className="b" style={{ fontSize: 16 }}>{session.name}</span>
            <span className="small muted ell">{s.shop().created ? `${s.shop().name}, ${s.shop().town}` : session.phone ? `+225 ${session.phone}` : session.mail}</span>
            <div className="wrap" style={{ marginTop: 4 }}>
              {roles.map((r) => <Badge key={r.id} tone={r.v ? 'amber' : 'green'}>{r.t.split(' / ')[0]}</Badge>)}
              <Link to="/role" className="badge bd-grey">+ Ajouter un rôle</Link>
            </div>
          </div>
        </div>

        {!session.demo && needsProfile(session.roles) && (
          <div className="sec">
            <div className="sech"><h2>Profil métier</h2><Badge tone={proMissing.length ? 'amber' : 'green'}>{proMissing.length ? 'À compléter' : 'Complet'}</Badge></div>
            <Link className="card pad col" to={`/profil-metier?next=${encodeURIComponent('/compte')}`} style={{ gap: 8 }}>
              {proSections.map((sec) => {
                const main = sec.fields.find((x) => x.required);
                return <div className="row between" key={sec.role} style={{ gap: 10 }}><span className="small muted">{sec.title}</span><span className="small b ell" style={{ minWidth: 0 }}>{(main && session.pro?.[main.key]) || '—'}</span></div>;
              })}
              <div className="row between" style={{ gap: 10 }}><span className="small muted">Pièce d’identité</span><span className="small b">{session.pro?.[ID_FIELD.key] ? 'Renseignée' : '—'}</span></div>
              {proMissing.length > 0 && <span className="xs" style={{ color: '#8A4B00' }}>Il manque {proMissing.length} information{proMissing.length > 1 ? 's' : ''} : {proMissing.slice(0, 2).join(', ')}{proMissing.length > 2 ? '…' : ''}</span>}
              <div className="divider" />
              <span className="link row between">{proMissing.length ? 'Compléter mon profil' : 'Modifier mon profil'}<Icon name="chevron" size="sm" /></span>
            </Link>
          </div>
        )}

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
