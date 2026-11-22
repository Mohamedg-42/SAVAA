import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CI_REGIONS, frDate, isoToday, useStore, type Species } from '../data';
import { downloadICS } from '../device';
import { showToast } from '../toast';
import { DashHeader } from '../dash';
import { animalStatus } from '../trace';
import { Badge, Foot, Header, Icon, Photo, PhotoAdd, SectionHead, TabBar } from '../ui';

/* Échéances de la maquette : jour, mois, titre, détail, date du calendrier (AAAAMMJJ). */
const DUE = [
  ['20', 'nov.', 'Pesée mensuelle, 18 bovins', 'Parc 2', '20261120'],
  ['22', 'nov.', 'Vaccination PPR, 9 ovins', 'Dr Y. Coulibaly, à confirmer', '20261122'],
  ['03', 'déc.', 'Mise bas prévue, FK-0087', 'Vache N’Dama, gestation documentée', '20261203'],
];

/* Échéances saisies par l'éleveur (gardées dans son compte). */
type Due = { id: string; date: string; type: string; what: string };
const DUE_TYPES = ['Pesée', 'Vaccination', 'Traitement', 'Déparasitage', 'Mise bas prévue', 'Visite du vétérinaire'];
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** Échéances de l'exploitation : celles de la maquette (démo) et celles que l'éleveur ajoute, triées par date. */
export type DueOptions = { kv: string; types: string[]; demoRows: string[][]; title: string; whatLabel: string; whatPlaceholder: string; whatError: string; empty: string; file: string };
const BREEDER_DUE: DueOptions = {
  kv: 'eleveur.due', types: DUE_TYPES, demoRows: DUE, title: 'Échéances', whatLabel: 'Animal ou lot', whatPlaceholder: 'Ex. FK-0087, ou 9 ovins du parc 2',
  whatError: 'Indiquez l’animal ou le lot concerné.', empty: 'Aucune échéance. Ajoutez vos pesées, vaccins et mises bas prévues pour ne rien oublier.', file: 'echeances-savaa.ics',
};

export function Echeances({ demo, o = BREEDER_DUE }: { demo: boolean; o?: DueOptions }) {
  const s = useStore();
  const mine = s.get<Due[]>(o.kv, []);
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState(o.types[0]);
  const [what, setWhat] = useState('');
  const [date, setDate] = useState('');
  const [tried, setTried] = useState(false);
  type Row = { key: string; day: string; d: string; m: string; title: string; text: string; own?: Due };
  const rows: Row[] = [
    ...(demo ? o.demoRows.map(([d, m, t, x, day]) => ({ key: t, day, d, m, title: t, text: x })) : []),
    ...mine.map((e) => ({ key: e.id, day: e.date.replace(/-/g, ''), d: e.date.slice(8, 10), m: MONTHS[Number(e.date.slice(5, 7)) - 1] ?? '', title: `${e.type}, ${e.what}`, text: 'Ajoutée par vous', own: e })),
  ].sort((a, b) => a.day.localeCompare(b.day));

  const add = () => {
    setTried(true);
    if (!what.trim() || !date) return;
    s.put(o.kv, [...mine, { id: `DU-${Date.now().toString(36)}`, date, type, what: what.trim() }]);
    showToast(`Échéance ajoutée : ${type.toLowerCase()} le ${date.slice(8, 10)}/${date.slice(5, 7)}.`);
    setAdding(false); setWhat(''); setDate(''); setTried(false);
  };
  const exportAll = () => {
    downloadICS(o.file, rows.map((r) => ({ day: r.day, title: r.title, text: r.text })));
    showToast('Échéances exportées : ouvrez le fichier pour les ajouter à votre agenda.');
  };

  return (
    <div className="sec">
      <div className="sech">
        <h2>{o.title}</h2>
        <span className="row" style={{ gap: 14 }}>
          {rows.length > 0 && <button className="link plain" onClick={exportAll}>Calendrier</button>}
          <button className="link plain" aria-expanded={adding} onClick={() => setAdding(!adding)}>{adding ? 'Fermer' : '+ Ajouter'}</button>
        </span>
      </div>
      {adding && (
        <div className="card pad col" style={{ gap: 10 }}>
          <div className="field">
            <label htmlFor="due-type">Type</label>
            <select id="due-type" className="input" value={type} onChange={(e) => setType(e.target.value)}>{o.types.map((t) => <option key={t}>{t}</option>)}</select>
          </div>
          <div className="field">
            <label htmlFor="due-what">{o.whatLabel}</label>
            <input id="due-what" className="input" placeholder={o.whatPlaceholder} value={what} onChange={(e) => setWhat(e.target.value)} aria-invalid={tried && !what.trim()} />
            {tried && !what.trim() && <span className="xs" role="alert" style={{ color: '#A0221A' }}>{o.whatError}</span>}
          </div>
          <div className="field">
            <label htmlFor="due-date">Date</label>
            <input id="due-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={tried && !date} />
            {tried && !date && <span className="xs" role="alert" style={{ color: '#A0221A' }}>Choisissez la date.</span>}
          </div>
          <button className="btn btn-p" onClick={add}>Ajouter l’échéance</button>
        </div>
      )}
      {rows.length === 0 && !adding ? (
        <div className="card pad"><span className="small muted">{o.empty}</span></div>
      ) : rows.length > 0 && (
        <div className="card list">
          {rows.map((r) => (
            <div className="li" key={r.key}>
              <span className="col" style={{ width: 40, alignItems: 'center', gap: 0 }}><span className="b num" style={{ fontSize: 17 }}>{r.d}</span><span className="xs muted">{r.m}</span></span>
              <div className="col grow" style={{ minWidth: 0 }}><span className="small b">{r.title}</span><span className="xs muted ell">{r.text}</span></div>
              {r.own && (
                <button className="btn btn-s btn-sm" style={{ flex: 'none' }} onClick={() => { s.put(o.kv, mine.filter((e) => e.id !== r.own?.id)); showToast('Échéance marquée comme faite.'); }}>Fait</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const VISIT_REASONS = ['Vaccination', 'Contrôle sanitaire', 'Animal malade ou blessé', 'Suivi de gestation', 'Vérification de l’exploitation'];

/** Visites du vétérinaire : l'éleveur en demande une, le vétérinaire fixe la date (réseau de l'appareil). */
function VetVisits() {
  const s = useStore();
  const mine = s.net().visits.filter((v) => v.from.phone === s.session().phone);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(VISIT_REASONS[0]);
  const [animals, setAnimals] = useState('');
  const [wish, setWish] = useState('');
  const [tried, setTried] = useState(false);
  const send = () => {
    setTried(true);
    if (!wish) return;
    s.askVisit({ reason, animals: animals.trim(), wish });
    showToast('Demande envoyée aux vétérinaires de la zone. Vous verrez ici la date qu’ils fixent.');
    setOpen(false); setAnimals(''); setWish(''); setTried(false);
  };
  return (
    <div className="sec">
      <div className="sech"><h2>Visites du vétérinaire</h2><button className="link plain" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Fermer' : '+ Demander'}</button></div>
      {open && (
        <div className="card pad col" style={{ gap: 10 }}>
          <div className="field"><label htmlFor="vis-reason">Motif</label><select id="vis-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)}>{VISIT_REASONS.map((r) => <option key={r}>{r}</option>)}</select></div>
          <div className="field"><label htmlFor="vis-animals">Animaux concernés <span className="muted">(facultatif)</span></label><input id="vis-animals" className="input" placeholder="Ex. 9 ovins du parc 2, ou FK-0087" value={animals} onChange={(e) => setAnimals(e.target.value)} /></div>
          <div className="field">
            <label htmlFor="vis-wish">Date souhaitée</label>
            <input id="vis-wish" className="input" type="date" min={isoToday()} value={wish} onChange={(e) => setWish(e.target.value)} aria-invalid={tried && !wish} />
            {tried && !wish && <span className="xs" role="alert" style={{ color: '#A0221A' }}>Choisissez une date.</span>}
          </div>
          <button className="btn btn-p" onClick={send}>Envoyer la demande</button>
        </div>
      )}
      {mine.length === 0 && !open ? (
        <div className="card pad"><span className="small muted">Aucune visite demandée. Un vétérinaire de la zone fixe la date et vient sur place.</span></div>
      ) : mine.length > 0 && (
        <div className="card list">
          {mine.map((v) => (
            <div className="li" key={v.id} style={{ alignItems: 'flex-start' }}>
              <div className="col grow" style={{ gap: 2, minWidth: 0 }}>
                <span className="small b">{v.reason}{v.animals ? `, ${v.animals}` : ''}</span>
                <span className="xs muted">
                  {v.status === 'open' ? `Souhaitée le ${frDate(v.wish)}, en attente d’un vétérinaire`
                    : v.status === 'planned' ? `Le ${frDate(v.when ?? v.wish)} avec ${v.vet?.name}, +225 ${v.vet?.phone}`
                      : `Faite le ${v.doneAt} par ${v.vet?.name}`}
                </span>
              </div>
              <Badge tone={v.status === 'done' ? 'green' : v.status === 'planned' ? 'blue' : 'amber'}>{v.status === 'done' ? 'Faite' : v.status === 'planned' ? 'Fixée' : 'Envoyée'}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* Écran 08 : tableau de bord de l'exploitation. */
export function Dashboard() {
  const s = useStore();
  const unread = s.unread();
  const online = s.myListings().filter((l) => l.status === 'online').length;
  /* Compte de démonstration : contenu de la maquette. Sinon, tout vient du cheptel saisi. */
  const demo = !!s.session().demo;
  const herd = s.animals();
  const alerts = herd.flatMap((a) => s.eventsFor(a.id).filter((e) => e.kind === 'obs' && e.pending).slice(0, 1).map((e) => ({ a, e })));
  const first = herd[0]?.id;
  /* Alertes envoyées aux vétérinaires et leur réponse (réseau de l'appareil) ; la plus récente par animal. */
  const myAlerts = s.net().alerts.filter((x) => x.from.phone === s.session().phone);
  const netOf = (animalId: string) => myAlerts.find((x) => x.animalId === animalId);
  /* En démo, les alertes de la maquette sont fixes : on ajoute celles envoyées depuis ce compte. */
  const sentAlerts = demo ? myAlerts.filter((x, i) => myAlerts.findIndex((y) => y.animalId === x.animalId) === i) : [];
  const vetBadge = (animalId: string) => {
    const n = netOf(animalId);
    return n?.status === 'done' ? <Badge tone="green">Clôturée</Badge> : n?.status === 'taken' ? <Badge tone="blue">Prise en charge</Badge> : <Badge tone="amber">Envoyée</Badge>;
  };
  const vetLine = (animalId: string) => {
    const n = netOf(animalId);
    if (!n?.vet || n.status === 'open') return null;
    return <span className="xs" style={{ color: '#145C3A' }}>{n.status === 'done' ? 'Clôturée' : 'Prise en charge'} par {n.vet.name}, +225 {n.vet.phone}</span>;
  };
  /* Animaux en vente, réservés ou vendus (statut déduit des annonces et commandes). */
  const selling = herd.filter((a) => a.mine).map((a) => ({ a, st: animalStatus(a, s.listings(), s.orders()) })).filter(({ st }) => st.label !== 'En élevage' && st.label !== 'Indisponible').slice(0, 4);
  return (
    <div className="app">
      <DashHeader
        label="Mon exploitation"
        name={s.shop().created ? s.shop().name : s.session().pro?.['eleveur.ferme'] || s.session().name}
        action={<Link className="iconbtn" to="/notifications" aria-label={`Notifications, ${unread} non lue${unread > 1 ? 's' : ''}`}><Icon name="bell" />{unread > 0 && <span className="dot">{unread}</span>}</Link>}
      />
      <div className="body">
        <span className="sync"><i></i>{demo ? 'Synchronisé il y a 12 min, hors connexion disponible' : 'Données gardées sur ce téléphone, hors connexion disponible'}</span>
        {!demo && herd.length === 0 && (
          <div className="notice n-info"><Icon name="info" size="sm" /><span>Votre cheptel est vide. Commencez par <Link className="link" to="/cheptel/ajout">ajouter un animal</Link>.</span></div>
        )}

        <div className="card grid3" style={{ gap: 0 }}>
          <Link to="/cheptel" className="stat" style={{ padding: 14, borderRight: '1px solid #E3E7E4' }}><span className="v">{s.count('bovin')}</span><span className="l">Bovins</span></Link>
          <Link to="/cheptel" className="stat" style={{ padding: 14, borderRight: '1px solid #E3E7E4' }}><span className="v">{s.count('ovin')}</span><span className="l">Ovins</span></Link>
          <Link to="/cheptel" className="stat" style={{ padding: 14 }}><span className="v">{s.count('caprin')}</span><span className="l">Caprins</span></Link>
        </div>

        <div className="sec">
          <div className="sech"><h2>Alertes ouvertes</h2><Badge tone={demo || alerts.length ? 'red' : 'grey'}>{demo ? 2 : alerts.length}</Badge></div>
          {!demo && (alerts.length === 0 ? (
            <div className="card pad"><span className="small muted">Aucune alerte ouverte.</span></div>
          ) : (
            <div className="card list">
              {alerts.map(({ a, e }) => (
                <Link key={a.id} className="li" to={`/animal/${a.id}/sante`} style={{ alignItems: 'flex-start' }}>
                  <Icon name="alert" style={{ color: '#B42318', marginTop: 2 }} />
                  <div className="col grow" style={{ gap: 2, minWidth: 0 }}><span className="b small ell">{a.id}, {a.name}</span><span className="xs muted ell">{e.title}, {e.date}</span>{vetLine(a.id)}</div>
                  {vetBadge(a.id)}
                </Link>
              ))}
            </div>
          ))}
          {demo && <div className="card list">
            <Link className="li" to="/animal/FK-0119/sante" style={{ alignItems: 'flex-start' }}>
              <Photo w={44} h={44} radius={6} src="images/brebis-djallonke.jpg" />
              <div className="col grow" style={{ gap: 2 }}><span className="b small ell">FK-0119, Brebis Djallonké</span><span className="xs muted">Boiterie antérieure gauche, signalée ce matin par A. Koné</span></div>
              <Badge tone="amber">Moyenne</Badge>
            </Link>
            <Link className="li" to="/cheptel" style={{ alignItems: 'flex-start' }}>
              <Photo w={44} h={44} radius={6} src="images/troupeau-ovins.jpg" />
              <div className="col grow" style={{ gap: 2 }}><span className="b small ell">Rappel vaccinal PPR, 9 ovins</span><span className="xs muted">Échéance le 22/11/2026</span></div>
              <Badge>4 j</Badge>
            </Link>
            {sentAlerts.map((n) => (
              <Link key={n.id} className="li" to={`/animal/${n.animalId}/sante`} style={{ alignItems: 'flex-start' }}>
                <Photo w={44} h={44} radius={6} src={n.photo ?? 'images/visite-veterinaire.jpg'} />
                <div className="col grow" style={{ gap: 2, minWidth: 0 }}><span className="b small ell">{n.animalId}, {n.animal}</span><span className="xs muted ell">{n.sign}, {n.date}</span>{vetLine(n.animalId)}</div>
                {vetBadge(n.animalId)}
              </Link>
            ))}
          </div>}
        </div>

        <div className="sec">
          <SectionHead title="Actions rapides" />
          <div className="grid4">
            <Link className="tile" to="/cheptel/ajout"><Icon name="sell" size="lg" />Animal</Link>
            <Link className="tile" to={demo ? '/animal/FK-0142/observation' : first ? `/animal/${first}/observation` : '/cheptel/ajout'}><Icon name="pulse" size="lg" />Observation</Link>
            <Link className="tile" to={demo ? '/animal/FK-0142/sante' : first ? `/animal/${first}/sante` : '/cheptel/ajout'}><Icon name="scale" size="lg" />Pesée</Link>
            <Link className="tile" to="/vendre"><Icon name="megaphone" size="lg" />Vendre</Link>
          </div>
        </div>

        <Echeances demo={demo} />
        <VetVisits />

        <Link className="card pad row" to="/devis" style={{ gap: 12 }}>
          <Icon name="cart" />
          <span className="col grow" style={{ gap: 2, minWidth: 0 }}><span className="small b">Aliment, intrants, matériel</span><span className="xs muted">Demandez un devis aux fournisseurs et comparez leurs prix.</span></span>
          <Icon name="chevron" size="sm" />
        </Link>

        <div className="sec">
          <SectionHead title="Ventes" link={s.shop().created ? 'Ma boutique' : 'Créer ma boutique'} to="/boutique" />
          <div className="grid2">
            <Link className="card pad stat" to="/boutique"><span className="v">{(demo ? 3 : 0) + online}</span><span className="l">Annonces en ligne</span></Link>
            <div className="card pad stat"><span className="v">{(demo ? 1 : 0) + s.mySales().filter((x) => x.status === 'new').length}</span><span className="l">Commande à préparer</span></div>
          </div>
          {selling.length > 0 && (
            <div className="card list">
              {selling.map(({ a, st }) => (
                <Link key={a.id} className="li" to={`/animal/${a.id}`}>
                  <div className="col grow" style={{ minWidth: 0 }}><span className="small b ell">{a.id}, {a.name}</span></div>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <TabBar />
    </div>
  );
}

/* Écran 09 : cheptel filtrable. */
export function Herd() {
  const s = useStore();
  const [filter, setFilter] = useState<Species | 'all'>('all');
  const [q, setQ] = useState('');
  const rows = s
    .animals()
    .filter((a) => filter === 'all' || a.species === filter)
    .filter((a) => !q || (a.id + a.name).toLowerCase().includes(q.toLowerCase()));
  const chips: [Species | 'all', string, number][] = [
    ['all', 'Tous', s.total()],
    ['bovin', 'Bovins', s.count('bovin')],
    ['ovin', 'Ovins', s.count('ovin')],
    ['caprin', 'Caprins', s.count('caprin')],
  ];
  return (
    <div className="app">
      <Header back title={`Cheptel (${s.total()})`} actions={<Link className="iconbtn" to="/cheptel/ajout" aria-label="Ajouter un animal"><Icon name="plus" /></Link>} />
      <div style={{ background: '#fff', borderBottom: '1px solid #E3E7E4', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, flex: 'none' }}>
        <label className="search">
          <Icon name="search" />
          <input className="plain grow" placeholder="N° interne, identifiant officiel, nom" value={q} onChange={(e) => setQ(e.target.value)} style={{ outline: 'none' }} />
        </label>
        <div className="chips">
          {chips.map(([id, t, n]) => (
            <button key={id} className={`chip${filter === id ? ' on' : ''}`} onClick={() => setFilter(id)}>{t} <span className="n">{n}</span></button>
          ))}
        </div>
      </div>
      <div className="body" style={{ padding: '12px 16px', gap: 8 }}>
        <span className="xs muted">{rows.length} affichés, tri par n° interne</span>
        {rows.length === 0 ? (
          <div className="card pad small muted" style={{ textAlign: 'center' }}>Aucun animal ne correspond.</div>
        ) : (
          <div className="card list">
            {rows.map((a) => (
              <Link className="li" key={a.id} to={a.status === 'Alerte' ? `/animal/${a.id}/sante` : `/animal/${a.id}`}>
                <Photo w={48} h={48} radius={6} src={a.photo} />
                <div className="col grow" style={{ gap: 2 }}>
                  <span className="row" style={{ gap: 6, minWidth: 0 }}><span className="b small num" style={{ whiteSpace: 'nowrap', flex: 'none' }}>{a.id}</span><span className="small ell">{a.name}</span></span>
                  <span className="xs muted ell">{a.details}</span>
                </div>
                <Badge tone={a.tone}>{a.status}</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Foot><Link className="btn btn-p" to="/cheptel/ajout">Ajouter un animal</Link></Foot>
    </div>
  );
}

/* Écran 09b : identification d'un nouvel animal. */
export function AddAnimal() {
  const s = useStore();
  const navigate = useNavigate();
  const [species, setSpecies] = useState<Species>('bovin');
  const [sex, setSex] = useState('Femelle');
  const [f, setF] = useState({ officialId: '', breed: '', birth: '', coat: '', marks: '', entry: '', mother: '', father: '', weight: '', weighedOn: '', size: '', condition: '', department: '', locality: '' });
  const [purpose, setPurpose] = useState<'repro' | 'viande' | ''>('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const [photos, setPhotos] = useState<string[]>([]);
  const [docs, setDocs] = useState<string[]>([]);
  const addDocs = (e: React.ChangeEvent<HTMLInputElement>) => {
    const names = Array.from(e.target.files ?? []).map((x) => x.name);
    e.target.value = '';
    setDocs((d) => [...d, ...names]);
  };
  /* Origine : commune de la boutique ou du compte (données de l'éleveur), région déduite. */
  const town = s.shop().town || s.session().town || '';
  const region = CI_REGIONS.find((g) => g.towns.includes(town))?.region ?? '';
  /* Prochain n° interne libre (FK-0151 au départ, comme dans la maquette). */
  const id = s.nextAnimalId();

  const save = () => {
    const label = { bovin: 'Bovin', ovin: 'Ovin', caprin: 'Caprin' }[species];
    const defaultPhoto: Record<Species, string> = {
      bovin: 'images/vache-ndama.jpg',
      ovin: 'images/brebis-djallonke.jpg',
      caprin: 'images/chevre-djallonke.jpg',
    };
    s.addAnimal({
      id,
      species,
      name: `${label} ${f.breed.trim()}`,
      details: f.birth.trim() ? `${sex}, ${sex === 'Mâle' ? 'né' : 'née'} le ${f.birth.trim()}` : `${sex}, âge non renseigné`,
      status: f.officialId ? 'ID à vérifier' : 'ID manquant',
      tone: f.officialId ? 'amber' : 'grey',
      officialId: f.officialId || undefined,
      photo: photos[0] ?? defaultPhoto[species],
      docs,
      info: { breed: f.breed, coat: f.coat, marks: f.marks, entry: f.entry, mother: f.mother, father: f.father },
      measure: {
        weight: Number(f.weight.replace(',', '.')) || undefined,
        weighedOn: f.weighedOn ? f.weighedOn.split('-').reverse().join('/') : undefined,
        size: f.size.trim() || undefined,
        condition: f.condition.trim() || undefined,
        purpose: purpose || undefined,
      },
      origin: { country: 'Côte d’Ivoire', region, department: f.department.trim() || undefined, town, locality: f.locality.trim() || undefined },
    });
    navigate(`/animal/${id}`, { replace: true });
  };

  return (
    <div className="app">
      <Header close title="Nouvel animal" actions={<span className="small muted" style={{ paddingRight: 12 }}>Brouillon local</span>} />
      <div className="body" style={{ gap: 20 }}>
        <div className="field">
          <span className="lbl">Espèce</span>
          <div className="seg">
            {(['bovin', 'ovin', 'caprin'] as Species[]).map((sp) => (
              <button key={sp} className={species === sp ? 'on' : ''} onClick={() => setSpecies(sp)}>{{ bovin: 'Bovin', ovin: 'Ovin', caprin: 'Caprin' }[sp]}</button>
            ))}
          </div>
        </div>

        <div className="sec" style={{ gap: 12 }}>
          <span className="eyebrow">Identification</span>
          <div className="field">
            <label htmlFor="oid">Identifiant officiel</label>
            <input id="oid" className="input" placeholder="Ex. CI-BOV-2026-000000" value={f.officialId} onChange={set('officialId')} />
            <span className="hint">Numéro de la boucle officielle, s’il existe. Il sera contrôlé par un agent.</span>
          </div>
          <div className="grid2">
            <div className="field"><label>N° interne</label><div className="input num" style={{ background: '#EEF0EE' }} title="Attribué automatiquement">{id}</div></div>
            <div className="field"><label htmlFor="breed">Race / type</label><input id="breed" className="input" placeholder="Ex. N’Dama" value={f.breed} onChange={set('breed')} /></div>
          </div>
          <div className="field">
            <span className="lbl">Sexe</span>
            <div className="seg">
              {['Femelle', 'Mâle'].map((x) => <button key={x} className={sex === x ? 'on' : ''} onClick={() => setSex(x)}>{x}</button>)}
            </div>
          </div>
          <div className="grid2">
            <div className="field"><label htmlFor="birth">Naissance</label><input id="birth" className="input num" placeholder="JJ/MM/AAAA" value={f.birth} onChange={set('birth')} /><span className="hint">ou âge estimé</span></div>
            <div className="field"><label htmlFor="coat">Robe</label><input id="coat" className="input" placeholder="Ex. fauve" value={f.coat} onChange={set('coat')} /></div>
          </div>
          <div className="field"><label htmlFor="marks">Signes distinctifs</label><textarea id="marks" className="input" placeholder="Taches, encoches, cicatrices…" value={f.marks} onChange={set('marks')} /></div>
        </div>

        <div className="sec" style={{ gap: 12 }}>
          <span className="eyebrow">Pesée et état</span>
          <div className="grid2">
            <div className="field"><label htmlFor="weight">Poids (kg)</label><input id="weight" className="input num" inputMode="decimal" value={f.weight} onChange={set('weight')} /></div>
            <div className="field"><label htmlFor="weighed">Date de pesée</label><input id="weighed" className="input" type="date" value={f.weighedOn} onChange={set('weighedOn')} /></div>
          </div>
          <div className="field"><label htmlFor="size">Taille ou mensurations</label><input id="size" className="input" placeholder="Ex. 1,30 m au garrot" value={f.size} onChange={set('size')} /></div>
          <div className="field"><label htmlFor="cond">État général observé</label><input id="cond" className="input" placeholder="Ex. bon état, vif" value={f.condition} onChange={set('condition')} /></div>
          <div className="field">
            <span className="lbl">Vocation</span>
            <div className="seg">
              {([['repro', 'Reproducteur'], ['viande', 'Viande'], ['', 'Non précisée']] as const).map(([v, t]) => <button key={t} className={purpose === v ? 'on' : ''} onClick={() => setPurpose(v)}>{t}</button>)}
            </div>
          </div>
        </div>

        <div className="sec" style={{ gap: 12 }}>
          <span className="eyebrow">Photos et justificatifs</span>
          <div className="grid3">
            {photos.length === 0 && <><Photo label="Profil gauche" h={96} radius={8} /><Photo label="Boucle" h={96} radius={8} /></>}
            {photos.map((p, i) => <Photo key={i} src={p} label={`Photo ${i + 1}`} h={96} radius={8} onRemove={() => setPhotos(photos.filter((_, j) => j !== i))} />)}
            {photos.length < 6 && <PhotoAdd height={96} onAdd={(p) => setPhotos((x) => [...x, p])} />}
          </div>
          <label className="row card pad" style={{ width: '100%', cursor: 'pointer', position: 'relative' }}>
            <input type="file" accept="image/*,application/pdf" multiple onChange={addDocs} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
            <Icon name="file" />
            <span className="col grow"><span className="small b">Joindre un document</span><span className="xs muted">Certificat, carnet de vaccination, facture d’achat</span></span>
          </label>
          {docs.map((d, i) => (
            <div className="row small" key={i} style={{ gap: 8 }}>
              <Icon name="file" size="sm" /><span className="grow ell">{d}</span>
              <button className="iconbtn" style={{ width: 32, height: 32 }} aria-label={`Retirer ${d}`} onClick={() => setDocs(docs.filter((_, j) => j !== i))}><Icon name="close" size="sm" /></button>
            </div>
          ))}
        </div>

        <div className="sec" style={{ gap: 12 }}>
          <span className="eyebrow">Origine et ascendance</span>
          <div className="field">
            <span className="lbl">Commune</span>
            <div className="input" style={{ background: '#EEF0EE' }}>{town ? `${town}${region ? `, ${region}` : ''}` : 'Commune de votre boutique'}</div>
          </div>
          <div className="grid2">
            <div className="field"><label htmlFor="dep">Département</label><input id="dep" className="input" value={f.department} onChange={set('department')} /></div>
            <div className="field"><label htmlFor="loc">Village ou localité</label><input id="loc" className="input" value={f.locality} onChange={set('locality')} /></div>
          </div>
          <div className="field"><label htmlFor="entry">Date d’entrée sur l’exploitation</label><input id="entry" className="input num" placeholder="Ex. née sur place" value={f.entry} onChange={set('entry')} /></div>
          <div className="grid2">
            <div className="field"><label htmlFor="mother">Mère</label><input id="mother" className="input num" placeholder="N° ou inconnue" value={f.mother} onChange={set('mother')} /></div>
            <div className="field"><label htmlFor="father">Père</label><input id="father" className="input" placeholder="Inconnu" value={f.father} onChange={set('father')} /></div>
          </div>
        </div>
      </div>
      <Foot>
        <button className="btn btn-s" style={{ flex: '0 0 auto' }} onClick={() => navigate(-1)}>Annuler</button>
        <button className="btn btn-p" disabled={!f.breed.trim()} onClick={save}>Enregistrer la fiche</button>
      </Foot>
    </div>
  );
}
