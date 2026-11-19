import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fcfa, today, useStore } from '../data';
import { downloadCSV } from '../device';
import { LogoInline } from '../logo';
import { showToast, simulate } from '../toast';
import { Badge, Check, Foot, Header, Icon, NotFound } from '../ui';

/* Données de démo (prospection)                                       */

type StageId = 'new' | 'ct' | 'int' | 'acc' | 'ver' | 'act' | 'rel';
type TypeId = 'all' | 'resto' | 'elev' | 'fourn';

const STAGES: { id: StageId; t: string; n: number }[] = [
  { id: 'new', t: 'Nouveau', n: 14 },
  { id: 'ct', t: 'Contacté', n: 9 },
  { id: 'int', t: 'Intérêt confirmé', n: 6 },
  { id: 'acc', t: 'Compte créé', n: 4 },
  { id: 'ver', t: 'Profil vérifié', n: 3 },
  { id: 'act', t: 'Actif', n: 7 },
  { id: 'rel', t: 'À relancer', n: 5 },
];

const STAGE_CLS: Record<StageId, string> = {
  new: 'bd-grey', ct: 'bd-blue', int: 'bd-amber', acc: 'bd-blue', ver: 'bd-green', act: 'bd-green', rel: 'bd-red',
};

const TYPES: { id: TypeId; t: string }[] = [
  { id: 'all', t: 'Tous' },
  { id: 'resto', t: 'Restaurants' },
  { id: 'elev', t: 'Éleveurs' },
  { id: 'fourn', t: 'Fournisseurs' },
];

const TYPE_LABEL: Record<Exclude<TypeId, 'all'>, string> = { resto: 'Restaurant', elev: 'Éleveur', fourn: 'Fournisseur' };

type Prospect = {
  id: number; st: StageId; ty: Exclude<TypeId, 'all'>; ini: string; n: string; d: string; next: string;
  /** Saisie de l'écran 16c, pour un prospect créé pendant la démo. */
  form?: { contact: string; tel: string; needs: string; src: string; consent: boolean };
};

const PROSPECTS: Prospect[] = [
  { id: 1, st: 'int', ty: 'resto', ini: 'LB', n: 'Restaurant Le Baobab', d: 'Restaurant, Korhogo centre, poulets, mouton', next: 'Appel demain 10 h' },
  { id: 2, st: 'int', ty: 'elev', ini: 'TS', n: 'Ferme Tuo Siaka', d: 'Éleveur bovins, Ferkessédougou, 60 têtes', next: 'Visite le 21/11' },
  { id: 3, st: 'int', ty: 'fourn', ini: 'AN', n: 'Agro-Nord Intrants', d: 'Fournisseur aliments, Korhogo', next: 'Envoyer la grille le 22/11' },
  { id: 4, st: 'rel', ty: 'resto', ini: 'HM', n: 'Hôtel Mont Korhogo', d: 'Hôtel-restaurant, achats hebdomadaires', next: 'Sans réponse depuis 9 j' },
  { id: 5, st: 'new', ty: 'elev', ini: 'CO', n: 'GIE des éleveurs de Dikodougou', d: 'Groupement, 14 membres, ovins', next: 'À appeler' },
  { id: 6, st: 'ct', ty: 'resto', ini: 'MC', n: 'Maquis Le Carrefour', d: 'Maquis, Korhogo, quartier Soba', next: 'Rappel le 19/11' },
  { id: 7, st: 'act', ty: 'elev', ini: 'FK', n: 'Ferme Koné & Fils', d: 'Éleveur, 41 ventes', next: 'Client actif' },
];

const avStyle = { background: '#EEF0EE', color: '#3E4943' };

/** Prospects de la maquette + ceux créés pendant la démo (gardés dans le navigateur). */
function useProspects(): Prospect[] {
  const s = useStore();
  return [...PROSPECTS, ...s.get<Prospect[]>('crm.prospects', [])];
}
const shortDate = () => today().slice(0, 5);

/* Écran 16 : prospection (pipeline + filtres) */

export function Prospection() {
  const [type, setType] = useState<TypeId>('all');
  const [stage, setStage] = useState<StageId>('int');
  const [q, setQ] = useState('');
  const all = useProspects();

  const query = q.trim().toLowerCase();
  const rows = all.filter(
    (p) => p.st === stage && (type === 'all' || p.ty === type) && (!query || `${p.n} ${p.d}`.toLowerCase().includes(query)),
  );
  const stageTitle = STAGES.find((s) => s.id === stage)?.t ?? '';

  return (
    <div className="app">
      <header className="hdr" style={{ paddingLeft: 16 }}>
        <div className="col grow" style={{ gap: 0 }}>
          <span className="xs muted ell">Équipe SAVAA, Korhogo</span>
          <span className="b ell" style={{ fontSize: 17 }}>Prospection</span>
        </div>
        <Link className="iconbtn" to="/prospect/nouveau" aria-label="Nouveau prospect"><Icon name="plus" /></Link>
      </header>
      <div style={{ background: '#fff', borderBottom: '1px solid #E3E7E4', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, flex: 'none' }}>
        <label className="search">
          <Icon name="search" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nom, téléphone pro, commune"
            aria-label="Rechercher un prospect"
            style={{ border: 0, outline: 'none', background: 'transparent', font: 'inherit', color: '#17201B', flex: 1, minWidth: 0, height: '100%', padding: 0 }}
          />
        </label>
        <div className="chips">
          {TYPES.map((t) => (
            <button key={t.id} className={type === t.id ? 'chip on' : 'chip'} onClick={() => setType(t.id)}>{t.t}</button>
          ))}
        </div>
      </div>
      <div className="body" style={{ gap: 14 }}>
        <div className="sec" style={{ gap: 8 }}>
          <div className="sech"><h2>Pipeline</h2><span className="xs muted">48 prospects</span></div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {STAGES.map((s) => {
              const on = s.id === stage;
              return (
                <button
                  key={s.id}
                  onClick={() => setStage(s.id)}
                  className="card col"
                  aria-pressed={on}
                  style={{ flex: 'none', width: 96, padding: 10, gap: 2, textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', color: 'inherit', background: on ? '#E8F3EA' : '#fff', borderColor: on ? '#145C3A' : '#E3E7E4' }}
                >
                  <span className="b num" style={{ fontSize: 20 }}>{s.n}</span>
                  <span className="xs muted" style={{ lineHeight: 1.25 }}>{s.t}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="sec" style={{ gap: 8 }}>
          <div className="sech"><h2>{stageTitle}</h2><span className="xs muted">relance la plus proche d’abord</span></div>
          {rows.length > 0 && (
            <div className="card list">
              {rows.map((p) => (
                <Link key={p.id} className="li" to={`/prospect/${p.id}`} style={{ alignItems: 'flex-start' }}>
                  <span className="av" style={{ width: 36, height: 36, fontSize: 12, ...avStyle }}>{p.ini}</span>
                  <span className="col grow" style={{ gap: 2 }}>
                    <span className="small b ell">{p.n}</span>
                    <span className="xs muted ell">{p.d}</span>
                    <span className="row xs" style={{ gap: 6, marginTop: 2, minWidth: 0 }}>
                      <span className={`badge ${STAGE_CLS[p.st]}`}>{STAGES.find((s) => s.id === p.st)?.t}</span>
                      <span className="muted ell">{p.next}</span>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
          {rows.length === 0 && <div className="card pad small muted" style={{ textAlign: 'center' }}>Aucun prospect à cette étape pour ce filtre.</div>}
        </div>
        <div className="grid2">
          <div className="card stat" style={{ padding: 12 }}><span className="v">62 %</span><span className="l">taux de contact (30 j)</span></div>
          <div className="card stat" style={{ padding: 12 }}><span className="v">11</span><span className="l">comptes activés en nov.</span></div>
        </div>
      </div>
    </div>
  );
}

/* Écran 16b : fiche prospect */

type Entry = { t: string; d: string; x: string };

const BAOBAB_JOURNAL: Entry[] = [
  { t: 'Appel', d: '14/11', x: 'Demande un devis poulets de chair. Rappel prévu après réception des offres.' },
  { t: 'Visite terrain', d: '07/11', x: 'Présentation de SAVAA à la gérante. Achats actuels au marché de Korhogo.' },
];

const KINDS = ['Appel', 'Visite', 'Message', 'RDV'];

export function ProspectSheet() {
  const { id } = useParams();
  const p = useProspects().find((x) => String(x.id) === id);
  if (!p) return <NotFound title="Fiche prospect" text="Ce prospect n’existe pas ou a été supprimé." to="/prospection" cta="Retour à la prospection" />;
  return <ProspectSheetInner key={p.id} p={p} />;
}

/** Date de relance : dans 7 jours, à 10 h. */
const followUp = () => {
  const d = new Date(Date.now() + 7 * 86400000);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

function ProspectSheetInner({ p }: { p: Prospect }) {
  const s = useStore();
  const isBaobab = p.id === 1;
  const [kind, setKind] = useState('Appel');
  const [note, setNote] = useState('');
  const journal = s.get<Entry[]>(`crm.journal.${p.id}`, isBaobab ? BAOBAB_JOURNAL : []);
  const next = s.get<string | null>(`crm.next.${p.id}`, null);
  const converted = s.get<number[]>('crm.converted', []).includes(p.id);

  const log = () => {
    if (!note.trim()) return;
    s.put(`crm.journal.${p.id}`, [{ t: kind, d: shortDate(), x: note.trim() }, ...journal]);
    s.put(`crm.next.${p.id}`, followUp());
    setNote('');
    showToast('Interaction ajoutée au journal.');
  };
  const convert = () => {
    s.put('crm.converted', [...s.get<number[]>('crm.converted', []), p.id]);
    s.notify({ c: 'pro', title: 'Invitation envoyée', text: `${p.n} : compte en attente de validation du numéro.`, to: `/prospect/${p.id}` });
  };
  const tel = p.form?.tel.replace(/[^\d+]/g, '');
  const call = () => {
    if (tel && !tel.includes('•')) window.location.href = `tel:${tel}`;
    else showToast('Numéro masqué en démo : appel depuis le téléphone de l’équipe.');
  };

  const stage = converted ? 'Invitation envoyée' : STAGES.find((x) => x.id === p.st)?.t;
  const stageCls = converted ? 'bd-blue' : STAGE_CLS[p.st];
  const nextT = next ? `Relance le ${next} à 10 h` : isBaobab ? 'Appel de suivi demain, 10 h' : p.next;
  const nextD = next ? 'Planifiée par Koffi B.' : isBaobab ? 'Présenter les 3 offres reçues' : 'Koffi B. (SAVAA)';

  return (
    <div className="app">
      <Header back title="Fiche prospect" actions={<button className="iconbtn" aria-label="Appeler" onClick={call}><Icon name="phone" /></button>} />
      <div className="body">
        <div className="card pad col" style={{ gap: 10 }}>
          <div className="row">
            <span className="av" style={avStyle}>{p.ini}</span>
            <div className="col grow"><span className="b ell">{p.n}</span><span className="xs muted ell">{isBaobab ? 'Restaurant, Korhogo centre' : p.d}</span></div>
            <span className={`badge ${stageCls}`}>{stage}</span>
          </div>
          {isBaobab ? (
            <dl className="kv">
              <dt>Contact</dt><dd>Mme Soro, gérante</dd>
              <dt>Tél. pro</dt><dd className="num">27 36 •• •• 18</dd>
              <dt>Besoins</dt><dd>Poulets 80 kg / sem., 2 moutons / mois</dd>
              <dt>Source</dt><dd>Visite terrain, 07/11/2026</dd>
              <dt>Responsable</dt><dd>Koffi B. (SAVAA)</dd>
              <dt>Consentement</dt><dd><Badge tone="green">Oral, noté le 07/11</Badge></dd>
            </dl>
          ) : (
            <dl className="kv">
              <dt>Contact</dt><dd>{p.form?.contact || '[à confirmer]'}</dd>
              <dt>Tél. pro</dt><dd className="num">{p.form?.tel || '[à confirmer]'}</dd>
              {p.form?.needs ? <><dt>Besoins</dt><dd>{p.form.needs}</dd></> : <><dt>Activité</dt><dd>{p.d}</dd></>}
              <dt>Source</dt><dd>{p.form?.src || '[à confirmer]'}</dd>
              <dt>Responsable</dt><dd>Koffi B. (SAVAA)</dd>
              <dt>Consentement</dt><dd>{p.form ? (p.form.consent ? <Badge tone="green">Accepte d’être recontacté</Badge> : <Badge tone="red">Refusé, ne pas relancer</Badge>) : <Badge>[à confirmer]</Badge>}</dd>
            </dl>
          )}
        </div>

        <div className="sec" style={{ gap: 8 }}>
          <div className="sech"><h2>Prochaine action</h2></div>
          <div className="card pad row">
            <Icon name="calendar" style={{ color: '#F28C28' }} />
            <div className="col grow"><span className="small b">{nextT}</span><span className="xs muted">{nextD}</span></div>
          </div>
        </div>

        <div className="sec" style={{ gap: 8 }}>
          <div className="sech"><h2>Enregistrer une interaction</h2></div>
          <div className="seg">
            {KINDS.map((k) => <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{k}</button>)}
          </div>
          <textarea className="input" style={{ minHeight: 64 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Résumé de l’échange" aria-label="Résumé de l’interaction" />
          <button className="btn btn-s btn-block" onClick={log} disabled={!note.trim()} style={{ whiteSpace: 'normal', lineHeight: 1.25 }}>Ajouter au journal et planifier la relance</button>
        </div>

        <div className="sec" style={{ gap: 8 }}>
          <div className="sech"><h2>Journal</h2></div>
          <div className="card pad">
            {journal.length === 0 ? (
              <span className="small muted">Aucune interaction enregistrée.</span>
            ) : (
              <div className="tl">
                {journal.map((j, i) => (
                  <div key={`${j.d}-${i}`} className="tli">
                    <span className="tld f" />
                    <div className="col">
                      <span className="row between"><span className="b small">{j.t}</span><span className="xs muted num">{j.d}</span></span>
                      <span className="small muted">{j.x}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {converted && (
          <div className="notice n-info">
            <Icon name="check" size="sm" />
            <span><b>Invitation envoyée par SMS.</b> Le compte sera créé quand {isBaobab ? 'Mme Soro' : 'le contact'} validera son numéro. Profil pré-rempli : {TYPE_LABEL[p.ty]}.</span>
          </div>
        )}
      </div>
      <Foot>
        <button className="btn btn-p" disabled={converted} onClick={convert}>{converted ? 'Invitation envoyée' : 'Convertir en compte'}</button>
      </Foot>
    </div>
  );
}

/* Écran 16c : nouveau prospect */

const ACTOR_TYPES = ['Éleveur', 'Producteur', 'Restaurant', 'Fournisseur', 'Grossiste', 'Transformateur'];
const SOURCES = ['Visite', 'Appel', 'Recomm.', 'Salon'];
/* Rattache chaque type d'acteur du formulaire à un filtre du pipeline. */
const ACTOR_TYPE_ID: Record<string, Prospect['ty']> = { Éleveur: 'elev', Producteur: 'elev', Restaurant: 'resto', Fournisseur: 'fourn', Grossiste: 'fourn', Transformateur: 'fourn' };
const COMMUNES = ['Korhogo, centre', 'Korhogo, Soba', 'Ferkessédougou', 'Sinématiali', 'Dikodougou', 'M’Bengué'];

export function NewProspect() {
  const s = useStore();
  const all = useProspects();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [contact, setContact] = useState('');
  const [tel, setTel] = useState('');
  const [commune, setCommune] = useState(COMMUNES[0]);
  const [needs, setNeeds] = useState('');
  const [src, setSrc] = useState('Visite');
  const [consent, setConsent] = useState(true);
  const [action, setAction] = useState('Appel');
  const [when, setWhen] = useState('');

  const valid = name.trim().length > 0 && type !== '';

  /* Formulaire pré-rempli avec le Baobab (maquette) : on rouvre sa fiche au lieu de créer un doublon. */
  const save = () => {
    const n = name.trim();
    const existing = all.find((p) => p.n.toLowerCase() === n.toLowerCase());
    if (existing) return navigate(`/prospect/${existing.id}`, { replace: true });
    const id = Math.max(...all.map((p) => p.id)) + 1;
    const words = n.split(/\s+/).filter((w) => /^\p{L}/u.test(w));
    s.put('crm.prospects', [...s.get<Prospect[]>('crm.prospects', []), {
      id,
      st: 'new',
      ty: ACTOR_TYPE_ID[type],
      ini: (words.length > 1 ? words[0][0] + words[1][0] : n.slice(0, 2)).toUpperCase(),
      n,
      d: `${type}, ${commune}`,
      next: when.trim() ? `${action} le ${when.trim()}` : `${action} à planifier`,
      form: { contact: contact.trim(), tel: tel.trim(), needs: needs.trim(), src, consent },
    } satisfies Prospect]);
    navigate(`/prospect/${id}`, { replace: true });
  };

  return (
    <div className="app">
      <Header close title="Nouveau prospect" />
      <div className="body" style={{ gap: 18 }}>
        <div className="field">
          <label htmlFor="np-name">Nom ou entreprise</label>
          <input id="np-name" className="input" placeholder="Ex. Maquis Chez Awa" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <span className="lbl">Type d’acteur</span>
          <div className="wrap" style={{ gap: 8 }}>
            {ACTOR_TYPES.map((t) => <button key={t} className={type === t ? 'chip on' : 'chip'} onClick={() => setType(t)}>{t}</button>)}
          </div>
        </div>
        <div className="grid2">
          <div className="field" style={{ minWidth: 0 }}>
            <label htmlFor="np-contact">Contact</label>
            <input id="np-contact" className="input" placeholder="Nom de la personne" value={contact} onChange={(e) => setContact(e.target.value)} />
          </div>
          <div className="field" style={{ minWidth: 0 }}>
            <label htmlFor="np-tel">Tél. professionnel</label>
            <input id="np-tel" className="input num" type="tel" inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} placeholder="27 36 •• •• 18" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="np-commune">Commune</label>
          <select id="np-commune" className="input" value={commune} onChange={(e) => setCommune(e.target.value)}>
            {COMMUNES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="np-needs">Besoins exprimés</label>
          <textarea id="np-needs" className="input" style={{ minHeight: 64 }} placeholder="Produits, volumes, fréquence…" value={needs} onChange={(e) => setNeeds(e.target.value)} />
        </div>
        <div className="field">
          <span className="lbl">Source</span>
          <div className="seg">
            {SOURCES.map((s) => <button key={s} className={src === s ? 'on' : ''} onClick={() => setSrc(s)}>{s}</button>)}
          </div>
        </div>
        <button className="row top plain" onClick={() => setConsent((c) => !c)} aria-pressed={consent}>
          <Check on={consent} />
          <span className="small" style={{ lineHeight: 1.45 }}>Le contact accepte d’être recontacté par SAVAA.</span>
        </button>
        <div className="grid2">
          <div className="field" style={{ minWidth: 0 }}>
            <label htmlFor="np-action">Prochaine action</label>
            <select id="np-action" className="input" value={action} onChange={(e) => setAction(e.target.value)}>
              {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="field" style={{ minWidth: 0 }}>
            <label htmlFor="np-when">Le</label>
            <input id="np-when" className="input num" placeholder="JJ/MM, heure" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
        </div>
      </div>
      <Foot>
        <button className="btn btn-p" disabled={!valid} onClick={save}>Enregistrer le prospect</button>
      </Foot>
    </div>
  );
}

/* Écran 25 : back-office (page large) */

type Sec = 'dash' | 'users' | 'camp' | 'stats';
type Res = 'ok' | 'ko';

const NAV: { id: Sec; t: string; c: number | string }[] = [
  { id: 'dash', t: 'Tableau de bord', c: 0 },
  { id: 'users', t: 'Utilisateurs', c: '1 284' },
  { id: 'camp', t: 'Campagnes', c: 3 },
  { id: 'stats', t: 'Statistiques', c: 0 },
];

const QUEUE = [
  { id: 1, t: 'Génisse métisse, 19 mois', c: 'Animaux, Bovins, fiche liée', v: 'Ferme Koné & Fils', s: 'RAS', sc: 'bd-grey' },
  { id: 2, t: 'Vaccin PPR, flacon 100 doses', c: 'Intrants, produit réglementé', v: 'Agro-Nord Intrants', s: 'Autorisation requise', sc: 'bd-red' },
  { id: 3, t: 'Poussins chair J1, par 100', c: 'Animaux, Volailles', v: 'Couvoir du Nord', s: 'Prix inhabituel', sc: 'bd-amber' },
  { id: 4, t: 'Couveuse 528 œufs', c: 'Matériel, Élevage', v: 'Équip’Agri CI', s: 'RAS', sc: 'bd-grey' },
];

type RoleId = 'all' | 'elev' | 'vend' | 'resto' | 'veto' | 'cour' | 'ach';

const USERS: { n: string; id: string; r: string; z: string; v: string; vc: string; s: number; st: string; sc: string; d: string; k: RoleId }[] = [
  { n: 'Ferme Koné & Fils', id: 'U-00412', r: 'Éleveur, vendeur', z: 'Sinématiali', v: 'Niveau 2', vc: 'bd-green', s: 41, st: 'Actif', sc: 'bd-green', d: '02/03/2025', k: 'elev' },
  { n: 'La Terrasse du Plateau', id: 'U-00977', r: 'Restaurant', z: 'Abidjan', v: 'Niveau 2', vc: 'bd-green', s: 0, st: 'Actif', sc: 'bd-green', d: '14/09/2026', k: 'resto' },
  { n: 'Dr Y. Coulibaly', id: 'U-01033', r: 'Vétérinaire', z: 'Korhogo', v: 'Déclaré', vc: 'bd-grey', s: 0, st: 'En attente', sc: 'bd-amber', d: '30/10/2026', k: 'veto' },
  { n: 'Transports Ouattara', id: 'U-00861', r: 'Coursier', z: 'Korhogo', v: 'Documenté', vc: 'bd-blue', s: 0, st: 'Actif', sc: 'bd-green', d: '21/08/2026', k: 'cour' },
  { n: 'Volailles du Sud', id: 'U-01190', r: 'Vendeur', z: 'Yopougon', v: 'Niveau 1', vc: 'bd-grey', s: 2, st: 'Actif', sc: 'bd-green', d: '09/11/2026', k: 'vend' },
  { n: 'Compte « BoviPro225 »', id: 'U-01201', r: 'Vendeur', z: 'Bouaké', v: 'Niveau 1', vc: 'bd-grey', s: 0, st: 'Suspendu', sc: 'bd-red', d: '12/11/2026', k: 'vend' },
  { n: 'Fatou Ouattara', id: 'U-01115', r: 'Acheteur', z: 'Korhogo', v: 'Niveau 1', vc: 'bd-grey', s: 0, st: 'Actif', sc: 'bd-green', d: '28/10/2026', k: 'ach' },
];

const ROLES: { id: RoleId; t: string; n: number | string }[] = [
  { id: 'all', t: 'Tous', n: '1 284' },
  { id: 'elev', t: 'Éleveurs', n: 318 },
  { id: 'vend', t: 'Vendeurs', n: 241 },
  { id: 'resto', t: 'Restaurants', n: 37 },
  { id: 'veto', t: 'Vétérinaires', n: 12 },
  { id: 'cour', t: 'Coursiers', n: 19 },
  { id: 'ach', t: 'Acheteurs', n: 657 },
];

type CampSt = 'run' | 'wait' | 'stop' | 'ok' | 'ko';

const CAMPS: { id: number; t: string; v: string; f: string; p: string; b: string; st: CampSt }[] = [
  { id: 1, t: 'Béliers Sahéliens, lot de 6', v: 'Ferme Koné & Fils', f: 'En tête des résultats', p: '10/11 – 24/11', b: '15 000', st: 'run' },
  { id: 2, t: 'Aliment engraissement 50 kg', v: 'Provenderie du Nord', f: 'Bannière catégorie', p: '20/11 – 04/12', b: '40 000', st: 'wait' },
  { id: 3, t: 'Poussins chair J1', v: 'Couvoir du Nord', f: 'Offre du jour', p: '22/11', b: '5 000', st: 'wait' },
  { id: 4, t: 'Taurillons Zébu, lot de 3', v: 'Ranch Tuo', f: 'Campagne locale', p: '01/11 – 30/11', b: '60 000', st: 'run' },
  { id: 5, t: 'Fumier composté', v: 'Ferme Koné & Fils', f: 'En tête des résultats', p: '05/11 – 19/11', b: '8 000', st: 'stop' },
];

const CAMP_LABEL: Record<CampSt, [string, string]> = {
  run: ['En cours', 'bd-green'], wait: ['À valider', 'bd-amber'], stop: ['Suspendue, rupture', 'bd-red'], ok: ['Validée', 'bd-green'], ko: ['Refusée', 'bd-red'],
};

const WEEKS = [12, 19, 24, 31, 38, 56, 41, 44, 47, 49, 51];

/* .adm-grid impose des colonnes de 420 px minimum : on borne à 100 % pour ne pas déborder sur mobile. */
const gridStyle = { gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))' };
const PAYMENTS: [string, string, number, string, 'green' | 'red' | 'amber' | 'grey'][] = [
  ['TX-7Q4K-21983', 'Orange Money', 733000, 'Confirmé', 'green'],
  ['TX-7Q4H-21977', 'Wave', 96000, 'Confirmé', 'green'],
  ['TX-7Q4F-21970', 'MTN MoMo', 240000, 'Échoué', 'red'],
  ['TX-7Q49-21962', 'Carte', 1680000, 'Contesté', 'amber'],
  ['TX-7Q41-21955', 'Moov Money', 14500, 'Expiré', 'grey'],
];
const colStyle = { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 } as const;

export function BackOffice() {
  const s = useStore();
  /* Ce qui a été fait dans l'appli pendant la démo remonte ici. */
  const toModerate = s.myListings().filter((l) => l.status === 'review');
  const realOrders = s.orders().filter((o) => !o.demo);
  const openTickets = s.tickets().filter((t) => t.status === 'open');
  const [sec, setSec] = useState<Sec>('dash');
  const [res, setRes] = useState<Record<number, Res>>({});
  const [role, setRole] = useState<RoleId>('all');
  const [camp, setCamp] = useState<Record<number, CampSt>>({});
  const [uq, setUq] = useState('');

  const pending = 12 - Object.keys(res).length + toModerate.length;
  const exportDash = () => downloadCSV(`savaa-tableau-de-bord-${today().replace(/\//g, '-')}.csv`, [
    ['Indicateur', 'Valeur'],
    ['Vendeurs actifs', 209], ['Acheteurs actifs', 583], ['Transactions (7 j)', 96], ['Volume confirmé (FCFA, 7 j)', 38400000],
    ['Fiches animales vérifiées', '61 %'], ['1re réponse support', '1 h 40'],
    [], ['Transaction', 'Moyen', 'Montant (FCFA)', 'Statut'],
    ...realOrders.map((o) => [o.tx, o.method, o.total, 'Confirmé']),
    ...PAYMENTS.map((p) => [p[0], p[1], p[2], p[3]]),
  ]);
  const uquery = uq.trim().toLowerCase();
  const users = USERS.filter((u) => (role === 'all' || u.k === role) && (!uquery || `${u.n} ${u.id}`.toLowerCase().includes(uquery)));
  const camps = CAMPS.map((c) => ({ ...c, cur: camp[c.id] ?? c.st }));
  const campPending = camps.filter((c) => c.cur === 'wait').length;

  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="brand"><LogoInline tone="white" height={40} name={false} /><small>Back-office, administration</small></div>
        {NAV.map((n) => {
          const on = sec === n.id;
          return (
            <button
              key={n.id}
              className={`adm-nav${on ? ' on' : ''}`}
              onClick={(e) => { setSec(n.id); e.currentTarget.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' }); }}
              aria-current={on ? 'page' : undefined}
              style={{ border: 0, backgroundColor: on ? 'rgba(255,255,255,.16)' : 'transparent', color: 'inherit', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left', width: '100%' }}
            >
              {n.t}
              {n.c ? <span className="c">{n.c}</span> : null}
            </button>
          );
        })}
        <Link className="adm-nav" to="/prospection">Prospection</Link>
        <Link className="adm-nav" to="/accueil">Application mobile</Link>
      </aside>
      <main className="adm-main">
        {sec === 'dash' && (
          <>
            <div className="adm-top">
              <div style={colStyle}><h1>Tableau de bord</h1><span className="small muted">Mardi 18 novembre 2026, zone pilote Poro et Tchologo</span></div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="btn btn-s btn-sm" onClick={() => simulate('Une seule période dans les données de test.')}>7 derniers jours</button><button className="btn btn-p btn-sm" onClick={exportDash}>Exporter</button></div>
            </div>
            <div className="adm-kpis">
              <div className="card pad stat"><span className="l">Vendeurs actifs</span><span className="v">209</span><span className="xs" style={{ color: '#145C3A' }}>+14 sur 7 j</span></div>
              <div className="card pad stat"><span className="l">Acheteurs actifs</span><span className="v">583</span><span className="xs" style={{ color: '#145C3A' }}>+41 sur 7 j</span></div>
              <div className="card pad stat"><span className="l">Transactions</span><span className="v">96</span><span className="xs muted">dont 9 échouées</span></div>
              <div className="card pad stat"><span className="l">Volume confirmé</span><span className="v">38,4 M</span><span className="xs muted">FCFA sur 7 j</span></div>
              <div className="card pad stat"><span className="l">Fiches animales vérifiées</span><span className="v">61 %</span><span className="xs muted">sur 1 930 fiches</span></div>
              <div className="card pad stat"><span className="l">1re réponse support</span><span className="v">1 h 40</span><span className="xs muted">objectif 2 h</span></div>
            </div>
            <div className="adm-grid" style={gridStyle}>
              <section className="card" style={{ minWidth: 0 }}>
                <div className="cardh"><h2>Annonces à modérer</h2><span className="small muted">{pending} en attente</span></div>
                <div className="scroll">
                  <table className="tbl">
                    <thead><tr><th>Annonce</th><th>Vendeur</th><th>Signal</th><th className="r">Action</th></tr></thead>
                    <tbody>
                      {toModerate.map((l) => (
                        <tr key={l.id}>
                          <td><div style={{ display: 'flex', flexDirection: 'column' }}><span className="b">{l.title}</span><span className="xs muted">{l.category}, publiée le {l.date}</span></div></td>
                          <td>{l.seller}</td>
                          <td><span className="badge bd-blue">Nouvelle</span></td>
                          <td className="r" style={{ whiteSpace: 'nowrap' }}>
                            <button className="btn btn-s btn-sm" onClick={() => { s.updateListing(l.id, { status: 'out' }); showToast('Annonce refusée.'); }}>Refuser</button>{' '}
                            <button className="btn btn-p btn-sm" onClick={() => { s.updateListing(l.id, { status: 'online' }); showToast('Annonce validée et mise en ligne.'); }}>Valider</button>
                          </td>
                        </tr>
                      ))}
                      {QUEUE.map((q) => {
                        const r = res[q.id];
                        return (
                          <tr key={q.id}>
                            <td><div style={{ display: 'flex', flexDirection: 'column' }}><span className="b">{q.t}</span><span className="xs muted">{q.c}</span></div></td>
                            <td>{q.v}</td>
                            <td><span className={`badge ${q.sc}`}>{q.s}</span></td>
                            <td className="r" style={{ whiteSpace: 'nowrap' }}>
                              {r ? (
                                <span className={`badge ${r === 'ok' ? 'bd-green' : 'bd-red'}`}>{r === 'ok' ? 'Validée' : 'Refusée'}</span>
                              ) : (
                                <>
                                  <button className="btn btn-s btn-sm" onClick={() => setRes({ ...res, [q.id]: 'ko' })}>Refuser</button>{' '}
                                  <button className="btn btn-p btn-sm" onClick={() => setRes({ ...res, [q.id]: 'ok' })}>Valider</button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="card" style={{ minWidth: 0 }}>
                <div className="cardh"><h2>Paiements récents</h2><span className="small muted">rapprochement prestataire</span></div>
                <div className="scroll">
                  <table className="tbl num">
                    <thead><tr><th>Transaction</th><th>Moyen</th><th className="r">Montant</th><th>Statut</th></tr></thead>
                    <tbody>
                      {realOrders.map((o) => <tr key={o.ref}><td>{o.tx}</td><td>{o.method}</td><td className="r">{fcfa(o.total)}</td><td><Badge tone="green">Confirmé</Badge></td></tr>)}
                      {PAYMENTS.map(([tx, m, amount, st, tone]) => <tr key={tx}><td>{tx}</td><td>{m}</td><td className="r">{fcfa(amount)}</td><td><Badge tone={tone}>{st}</Badge></td></tr>)}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="card" style={{ minWidth: 0 }}>
                <div className="cardh"><h2>Litiges et support</h2><span className="small muted">par priorité</span></div>
                <table className="tbl"><tbody>
                  {openTickets.map((t) => (
                    <tr key={t.id}><td><span className="b">{t.id}, {t.motif.toLowerCase()}</span><br /><span className="xs muted">{t.order || 'Sans commande'}, ouvert le {t.date}</span></td><td className="r"><Badge tone={t.urgent ? 'red' : 'amber'}>{t.urgent ? 'Urgent' : 'Normale'}</Badge></td></tr>
                  ))}
                  <tr><td><span className="b">TK-1093, animal blessé à la livraison</span><br /><span className="xs muted">SAV-2026-11-004812, paiement vendeur suspendu</span></td><td className="r"><Badge tone="red">Urgent</Badge></td></tr>
                  <tr><td><span className="b">TK-1090, paiement contesté (carte)</span><br /><span className="xs muted">Ranch Tuo, en attente du prestataire</span></td><td className="r"><Badge tone="amber">Haute</Badge></td></tr>
                  <tr><td><span className="b">TK-1088, faux vendeur signalé</span><br /><span className="xs muted">3 signalements, compte suspendu à titre préventif</span></td><td className="r"><Badge tone="amber">Haute</Badge></td></tr>
                </tbody></table>
              </section>
              <section className="card" style={{ minWidth: 0 }}>
                <div className="cardh"><h2>Vérifications en attente</h2></div>
                <table className="tbl"><tbody>
                  <tr><td><span className="b">Ferme Koné &amp; Fils</span><br /><span className="xs muted">Exploitation, visite agent le 25/11</span></td><td className="r"><Badge tone="blue">Documenté</Badge></td></tr>
                  <tr><td><span className="b">Dr Y. Coulibaly</span><br /><span className="xs muted">Vétérinaire, numéro d’ordre à contrôler</span></td><td className="r"><Badge>Déclaré</Badge></td></tr>
                  <tr><td><span className="b">Transports Ouattara</span><br /><span className="xs muted">Coursier, agrément transport d’animaux</span></td><td className="r"><Badge tone="blue">Documenté</Badge></td></tr>
                </tbody></table>
              </section>
            </div>
          </>
        )}

        {sec === 'users' && (
          <>
            <div className="adm-top">
              <div style={colStyle}><h1>Utilisateurs</h1><span className="small muted">1 284 comptes, dont 47 en attente de vérification</span></div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', minWidth: 0, maxWidth: '100%' }}>
                <input
                  className="search"
                  style={{ height: 36, minWidth: 0, width: 240, maxWidth: '100%', font: 'inherit', color: '#17201B' }}
                  value={uq}
                  onChange={(e) => setUq(e.target.value)}
                  placeholder="Nom, téléphone, n° de compte"
                  aria-label="Rechercher un compte"
                />
                <button className="btn btn-s btn-sm" onClick={() => downloadCSV('savaa-utilisateurs.csv', [['Nom', 'N° de compte', 'Rôle', 'Zone', 'Vérification', 'Statut', 'Inscrit le'], ...users.map((u) => [u.n, u.id, u.r, u.z, u.v, u.st, u.d])])}>Exporter ({users.length})</button>
              </div>
            </div>
            <div className="wrap" style={{ gap: 8 }}>
              {ROLES.map((r) => (
                <button key={r.id} className={role === r.id ? 'chip on' : 'chip'} onClick={() => setRole(r.id)}>{r.t} <span className="n">{r.n}</span></button>
              ))}
            </div>
            <section className="card">
              <div className="scroll">
                <table className="tbl">
                  <thead><tr><th>Compte</th><th>Rôles</th><th>Zone</th><th>Vérification</th><th className="r">Ventes</th><th>Statut</th><th className="r">Inscrit le</th></tr></thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td><span className="b">{u.n}</span><br /><span className="xs muted num">{u.id}</span></td>
                        <td>{u.r}</td>
                        <td>{u.z}</td>
                        <td><span className={`badge ${u.vc}`}>{u.v}</span></td>
                        <td className="r num">{u.s}</td>
                        <td><span className={`badge ${u.sc}`}>{u.st}</span></td>
                        <td className="r num">{u.d}</td>
                      </tr>
                    ))}
                    {users.length === 0 && <tr><td colSpan={7} className="small muted" style={{ textAlign: 'center' }}>Aucun compte pour ce filtre.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {sec === 'camp' && (
          <>
            <div className="adm-top">
              <div style={colStyle}><h1>Campagnes sponsorisées</h1><span className="small muted">Validation avant diffusion et suivi des dépenses</span></div>
            </div>
            <div className="adm-kpis">
              <div className="card pad stat"><span className="l">En cours</span><span className="v">11</span></div>
              <div className="card pad stat"><span className="l">À valider</span><span className="v">{campPending}</span></div>
              <div className="card pad stat"><span className="l">Dépenses sur 7 j</span><span className="v">94 350</span><span className="xs muted">FCFA</span></div>
              <div className="card pad stat"><span className="l">Suspendues (rupture)</span><span className="v">2</span></div>
            </div>
            <section className="card">
              <div className="scroll">
                <table className="tbl">
                  <thead><tr><th>Campagne</th><th>Vendeur</th><th>Format</th><th>Période</th><th className="r">Budget</th><th>Statut</th><th className="r">Action</th></tr></thead>
                  <tbody>
                    {camps.map((c) => (
                      <tr key={c.id}>
                        <td><span className="b">{c.t}</span></td>
                        <td>{c.v}</td>
                        <td>{c.f}</td>
                        <td className="num">{c.p}</td>
                        <td className="r num">{c.b}</td>
                        <td><span className={`badge ${CAMP_LABEL[c.cur][1]}`}>{CAMP_LABEL[c.cur][0]}</span></td>
                        <td className="r" style={{ whiteSpace: 'nowrap' }}>
                          {c.cur === 'wait' && (
                            <>
                              <button className="btn btn-s btn-sm" onClick={() => setCamp({ ...camp, [c.id]: 'ko' })}>Refuser</button>{' '}
                              <button className="btn btn-p btn-sm" onClick={() => setCamp({ ...camp, [c.id]: 'ok' })}>Valider</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <p className="small muted">Une campagne n’est jamais présentée comme une garantie de qualité. Elle est suspendue automatiquement si l’annonce passe en rupture.</p>
          </>
        )}

        {sec === 'stats' && (
          <>
            <div className="adm-top">
              <div style={colStyle}><h1>Statistiques du pilote</h1><span className="small muted">Depuis l’ouverture le 1er septembre 2026</span></div>
              <div className="seg" style={{ minWidth: 0, width: 260, maxWidth: '100%' }}><button onClick={() => simulate('Chiffres sur 30 jours pas encore chargés.')}>30 j</button><button className="on">Depuis le début</button></div>
            </div>
            <div className="adm-kpis">
              <div className="card pad stat"><span className="l">Annonces publiées</span><span className="v">1 146</span></div>
              <div className="card pad stat"><span className="l">Transactions confirmées</span><span className="v">412</span></div>
              <div className="card pad stat"><span className="l">Volume de ventes</span><span className="v">163 M</span><span className="xs muted">FCFA</span></div>
              <div className="card pad stat"><span className="l">Rétention vendeurs à 60 j</span><span className="v">58 %</span></div>
              <div className="card pad stat"><span className="l">Tickets résolus</span><span className="v">91 %</span></div>
            </div>
            <div className="adm-grid" style={gridStyle}>
              <section className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
                <h2 style={{ fontSize: 15, fontWeight: 600 }}>Transactions par semaine</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, minmax(0, 1fr))', gap: 8, alignItems: 'end', height: 160, borderBottom: '1px solid #E3E7E4' }}>
                  {WEEKS.map((x, i) => (
                    <div key={i} title={`Semaine ${36 + i} : ${x}`} style={{ height: Math.round((x / 56) * 150), background: x === 56 ? '#F28C28' : '#145C3A', borderRadius: '3px 3px 0 0' }} />
                  ))}
                </div>
                <span className="xs muted">Semaines 36 à 46. Pic en semaine 41, avant la fête de fin d’année.</span>
              </section>
              <section className="card" style={{ minWidth: 0 }}>
                <div className="cardh"><h2>Ventes par filière</h2></div>
                <table className="tbl num"><tbody>
                  <tr><td>Bovins</td><td style={{ width: '45%' }}><div className="bar"><i style={{ width: '100%' }} /></div></td><td className="r">71 M</td></tr>
                  <tr><td>Ovins et caprins</td><td><div className="bar"><i style={{ width: '62%' }} /></div></td><td className="r">44 M</td></tr>
                  <tr><td>Volailles</td><td><div className="bar"><i style={{ width: '38%' }} /></div></td><td className="r">27 M</td></tr>
                  <tr><td>Aliments et intrants</td><td><div className="bar"><i style={{ width: '21%' }} /></div></td><td className="r">15 M</td></tr>
                  <tr><td>Récoltes</td><td><div className="bar"><i style={{ width: '8%' }} /></div></td><td className="r">6 M</td></tr>
                </tbody></table>
              </section>
            </div>
          </>
        )}
        <p className="xs muted">Données de démonstration.</p>
      </main>
    </div>
  );
}
