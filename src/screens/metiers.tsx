import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DAYS, FREQ, fcfa, frDate, isoToday, today, useStore, type NetAlert, type NetCourier, type NetMission, type NetQuote, type NetValidation, type NetVisit } from '../data';
import { Echeances, type DueOptions } from './eleveur';
import { volumeKg } from '../agri';
import { DeliveryMap } from '../carte';
import { COMMISSION, COURIER_VEHICLES, PLACES, canCarry, loadLabel, payout, placeOf, roadKm, vehicleOf, type Place, type VehicleId } from '../livraison';
import { downloadCSV } from '../device';
import { showToast } from '../toast';
import type { ReactNode } from 'react';
import { DashHeader, TodayCard } from '../dash';
import { Badge, Icon, Photo, TabBar, type Tone } from '../ui';

/*
  Les données de la maquette (visites, mission en cours, gains, lots, devis, factures) appartiennent au compte de démonstration.
  Un compte neuf part de zéro. Les alertes des éleveurs et les missions disponibles sont des demandes ouvertes à tous les vétérinaires
  et transporteurs : elles restent visibles pour tous.
*/

/** Carte affichée quand une rubrique est vide, avec ce qu'il faut faire pour la remplir. */
function EmptyState({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className="card pad col" style={{ gap: 6 }}>
      <span className="small b">{title}</span>
      <span className="xs muted" style={{ lineHeight: 1.45 }}>{text}</span>
      {children}
    </div>
  );
}

/* ================================================================== */
/* 1. ESPACE VÉTÉRINAIRE / AGENT HABILITÉ (/veto)                     */
/* ================================================================== */

type VetAlert = {
  id: string;
  animalId: string;
  animal: string;
  farm: string;
  sign: string;
  urgency: 'Moyenne' | 'Élevée' | 'Faible';
  date: string;
  photo: string;
  /** Alerte envoyée par un éleveur depuis son compte (réseau de l'appareil). */
  net?: NetAlert;
};

const INITIAL_VET_ALERTS: VetAlert[] = [
  {
    id: 'VA-1',
    animalId: 'FK-0119',
    animal: 'Brebis Djallonké',
    farm: 'Ferme Koné & Fils, Sinématiali',
    sign: 'Boiterie antérieure gauche signalée ce matin par A. Koné',
    urgency: 'Moyenne',
    date: '18/11/2026, 09:58',
    photo: 'images/brebis-djallonke.jpg',
  },
  {
    id: 'VA-2',
    animalId: 'FK-0125',
    animal: 'Bélier Sahélien',
    farm: 'Ferme Koné & Fils, Sinématiali',
    sign: 'Suivi post-traitement antiparasitaire et vitamines B',
    urgency: 'Faible',
    date: '16/11/2026, 14:20',
    photo: 'images/beliers-saheliens.jpg',
  },
];

const VET_VALIDATIONS = [
  { id: 'FK-0142', name: 'Taurillon Zébu Goudali', officialId: 'CI-BOV-2024-•••4817', farm: 'Ferme Koné & Fils', type: 'Boucle officielle & PPCB', photo: 'images/taurillon-goudali.jpg' },
  { id: 'FK-0087', name: 'Vache N’Dama', officialId: 'CI-BOV-2021-•••1904', farm: 'Ferme Koné & Fils', type: 'Suivi gestation 7 mois', photo: 'images/vache-ndama.jpg' },
  { id: 'FK-0136', name: 'Bouc reproducteur Djallonké', officialId: 'CI-CAP-2023-•••1145', farm: 'Élevage Ouattara, Boundiali', type: 'Vaccination PPR', photo: 'images/bouc-djallonke.jpg' },
];

const VET_VISITS = [
  { id: 'VV-1', day: '22', month: 'nov.', title: 'Vaccination PPR, 9 ovins', place: 'Ferme Koné & Fils, Sinématiali', photo: 'images/troupeau-ovins.jpg' },
  { id: 'VV-2', day: '25', month: 'nov.', title: 'Visite de vérification d’exploitation', place: 'Ferme Koné & Fils, Sinématiali', photo: 'images/visite-veterinaire.jpg' },
  { id: 'VV-3', day: '28', month: 'nov.', title: 'Contrôle bouclage et pesée, 12 bovins', place: 'Ranch Tuo, Ferkessédougou', photo: 'images/pesee-bovin.jpg' },
];

type OwnVisit = { id: string; date: string; title: string; place: string; done?: boolean };
type PlannedVisit = { id: string; date: string; title: string; place: string; net?: NetVisit; own?: boolean; done?: boolean };
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const dayOf = (d: string) => [d.slice(8, 10), MONTHS[Number(d.slice(5, 7)) - 1] ?? ''];

/** Demande de visite d'un éleveur : le vétérinaire choisit la date (par défaut, celle souhaitée). */
function VisitAsk({ v }: { v: NetVisit }) {
  const s = useStore();
  const [when, setWhen] = useState(v.wish >= isoToday() ? v.wish : isoToday());
  return (
    <div className="card pad col" style={{ gap: 8 }}>
      <div className="row between top" style={{ gap: 8 }}>
        <div className="col" style={{ gap: 2, minWidth: 0 }}>
          <span className="b small">{v.reason}</span>
          <span className="xs muted">{v.animals || 'Exploitation entière'}, {v.farm}</span>
          <span className="xs muted">Souhaitée le {frDate(v.wish)}, demandée le {v.date}</span>
        </div>
        <Badge tone="blue">Demande</Badge>
      </div>
      <span className="xs"><b>Éleveur :</b> {v.from.name}, <span className="num">+225 {v.from.phone}</span></span>
      <div className="row" style={{ gap: 8 }}>
        <input className="input grow" type="date" aria-label="Date de la visite" min={isoToday()} value={when} onChange={(e) => setWhen(e.target.value)} />
        <button className="btn btn-p btn-sm" disabled={!when} onClick={() => { s.planVisit(v.id, when); showToast(`Visite fixée au ${frDate(when)} : l’éleveur est prévenu.`); }}>Fixer la visite</button>
      </div>
    </div>
  );
}

/** Le vétérinaire planifie lui-même une visite (tournée, contrôle, vaccination). */
function PlanVisitForm({ onDone }: { onDone: () => void }) {
  const s = useStore();
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [date, setDate] = useState('');
  const [tried, setTried] = useState(false);
  const save = () => {
    setTried(true);
    if (!title.trim() || !place.trim() || !date) return;
    s.put('vet.visits', [...s.get<OwnVisit[]>('vet.visits', []), { id: `VO-${Date.now().toString(36)}`, title: title.trim(), place: place.trim(), date }]);
    showToast(`Visite planifiée le ${frDate(date)}.`);
    onDone();
  };
  const err = (msg: string) => <span className="xs" role="alert" style={{ color: '#A0221A' }}>{msg}</span>;
  return (
    <div className="card pad col" style={{ gap: 10 }}>
      <div className="field"><label htmlFor="vv-title">Objet</label><input id="vv-title" className="input" placeholder="Ex. vaccination PPR, 12 ovins" value={title} onChange={(e) => setTitle(e.target.value)} />{tried && !title.trim() && err('Indiquez l’objet de la visite.')}</div>
      <div className="field"><label htmlFor="vv-place">Exploitation et lieu</label><input id="vv-place" className="input" placeholder="Ex. Ranch Tuo, Ferkessédougou" value={place} onChange={(e) => setPlace(e.target.value)} />{tried && !place.trim() && err('Indiquez l’exploitation.')}</div>
      <div className="field"><label htmlFor="vv-date">Date</label><input id="vv-date" className="input" type="date" min={isoToday()} value={date} onChange={(e) => setDate(e.target.value)} />{tried && !date && err('Choisissez la date.')}</div>
      <button className="btn btn-p" onClick={save}>Planifier la visite</button>
    </div>
  );
}

export function VetSpace() {
  const s = useStore();
  const [tab, setTab] = useState<'alerts' | 'validations' | 'visits'>('alerts');
  const handled = s.get<Record<string, string>>('vet.handled', {});
  const validated = s.get<Record<string, boolean>>('vet.validated', {});
  const confirmed = s.get<Record<string, boolean>>('vet.confirmed', {});
  const unread = s.unread();
  /* Visites : demandes des éleveurs (réseau de l'appareil), visites qu'il a fixées, visites qu'il planifie lui-même, puis la maquette. */
  const myPhone = s.session().phone;
  const visitAsks = s.net().visits.filter((v) => v.status === 'open' && v.from.phone !== myPhone);
  const ownVisits = s.get<OwnVisit[]>('vet.visits', []);
  const planned: PlannedVisit[] = [
    ...s.net().visits.filter((v) => v.status !== 'open' && v.vet?.phone === myPhone).map((v) => ({ id: v.id, date: v.when ?? v.wish, title: `${v.reason}${v.animals ? `, ${v.animals}` : ''}`, place: `${v.farm}, ${v.from.name} +225 ${v.from.phone}`, net: v })),
    ...ownVisits.map((v) => ({ id: v.id, date: v.date, title: v.title, place: v.place, own: true, done: v.done })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = planned.filter((v) => !(v.net ? v.net.status === 'done' : v.done));
  const demoVisits = s.session().demo ? VET_VISITS : [];
  const visitCount = upcoming.length + demoVisits.length + visitAsks.length;
  const [planning, setPlanning] = useState(false);
  const visitDone = (v: PlannedVisit) => {
    if (v.net) s.doneVisit(v.id);
    else s.put('vet.visits', ownVisits.map((x) => (x.id === v.id ? { ...x, done: true } : x)));
    showToast('Visite enregistrée comme faite.');
  };

  /* Un vétérinaire ne traite ni ne valide ses propres animaux : ils passent à un autre vétérinaire. */
  const own = new Set(s.animals().filter((a) => a.mine).map((a) => a.id));
  /* Alertes reçues des éleveurs (les siennes n'y figurent pas), puis celles de la maquette. */
  const received: VetAlert[] = s.net().alerts.filter((a) => a.from.phone !== s.session().phone).map((a) => ({
    id: a.id, animalId: a.animalId, animal: a.animal, farm: a.farm, sign: a.sign, urgency: a.urgency, date: a.date, photo: a.photo ?? 'images/visite-veterinaire.jpg', net: a,
  }));
  const alerts = [...received, ...INITIAL_VET_ALERTS.filter((a) => !own.has(a.animalId))];
  const statusOf = (a: VetAlert) => (a.net ? (a.net.status === 'open' ? undefined : a.net.status) : handled[a.id]);
  /* Demandes de vérification envoyées par les éleveurs (réseau de l'appareil), puis celles de la maquette. */
  type Val = { id: string; animalId: string; name: string; officialId: string; farm: string; type: string; photo: string; net?: NetValidation };
  const validations: Val[] = [
    ...s.net().validations.filter((v) => v.from.phone !== s.session().phone).map((v) => ({
      id: v.id, animalId: v.animalId, name: v.animal, officialId: v.officialId ?? 'Identifiant non saisi', farm: v.farm, type: v.care, photo: v.photo ?? 'images/visite-veterinaire.jpg', net: v,
    })),
    ...VET_VALIDATIONS.filter((v) => !own.has(v.id)).map((v) => ({ ...v, animalId: v.id })),
  ];
  const isValidated = (v: Val) => (v.net ? v.net.status === 'verified' : !!validated[v.id]);
  const openAlerts = alerts.filter((a) => statusOf(a) !== 'done').length;
  const pendingVal = validations.filter((v) => !isValidated(v)).length;
  const RANK = { Élevée: 0, Moyenne: 1, Faible: 2 } as const;
  const urgent = alerts.filter((a) => !statusOf(a)).sort((x, y) => RANK[x.urgency] - RANK[y.urgency])[0];

  const markAlert = (id: string, status: 'taken' | 'done', label: string) => {
    if (alerts.find((a) => a.id === id)?.net) s.answerAlert(id, status);
    else s.put('vet.handled', { ...handled, [id]: status });
    showToast(label);
  };
  const validateSheet = (id: string, name: string) => {
    const v = validations.find((x) => x.id === id);
    if (v?.net) { s.answerValidation(id); showToast(`Fiche ${v.animalId} vérifiée : l’éleveur est prévenu.`); return; }
    s.put('vet.validated', { ...validated, [id]: true });
    s.notify({ c: 'alr', title: `Fiche ${id} vérifiée`, text: `${name} validée par le vétérinaire mandaté.`, to: `/animal/${id}` });
    showToast(`Fiche ${id} passée au statut « Vérifié ».`);
  };
  const confirmVisit = (id: string, title: string) => {
    s.put('vet.confirmed', { ...confirmed, [id]: true });
    showToast(`Passage confirmé : ${title}`);
  };

  return (
    <div className="app">
      <DashHeader label="Espace vétérinaire" name={s.session().name || 'Vétérinaire'} action={<Link className="iconbtn" to="/notifications" aria-label="Notifications">
          <Icon name="bell" />
          {unread > 0 && <span className="dot">{unread}</span>}
        </Link>} />
      <div className="utabs" role="tablist">
        <button role="tab" aria-selected={tab === 'alerts'} className={tab === 'alerts' ? 'on' : ''} onClick={() => setTab('alerts')}>Alertes ({openAlerts})</button>
        <button role="tab" aria-selected={tab === 'validations'} className={tab === 'validations' ? 'on' : ''} onClick={() => setTab('validations')}>Validations ({pendingVal})</button>
        <button role="tab" aria-selected={tab === 'visits'} className={tab === 'visits' ? 'on' : ''} onClick={() => setTab('visits')}>Visites ({visitCount})</button>
      </div>
      <div className="body">
        {urgent ? (
          <TodayCard alert eyebrow="Alerte la plus urgente" title={`${urgent.animalId}, ${urgent.animal}`} text={`${urgent.sign}. ${urgent.farm}, ${urgent.date}.`}>
            <button className="btn btn-p" onClick={() => markAlert(urgent.id, 'taken', 'Prise en charge signalée à l’éleveur.')}>Prendre en charge</button>
            {urgent.net ? <button className="btn btn-s" onClick={() => setTab('alerts')}>Détails</button> : <Link className="btn btn-s" to={`/animal/${urgent.animalId}/sante`}>Dossier</Link>}
          </TodayCard>
        ) : pendingVal ? (
          <TodayCard eyebrow="Aujourd’hui" title={`${pendingVal} fiche${pendingVal > 1 ? 's' : ''} à valider`} text="Aucune alerte en attente de prise en charge. Les éleveurs attendent la validation de leurs fiches.">
            <button className="btn btn-p" onClick={() => setTab('validations')}>Voir les fiches</button>
          </TodayCard>
        ) : (
          <TodayCard eyebrow="Aujourd’hui" title="Rien d’urgent" text="Les nouvelles alertes des éleveurs de votre zone apparaîtront ici en premier." />
        )}
        <div className="card grid3" style={{ gap: 0 }}>
          <div className="stat" style={{ padding: 12, borderRight: '1px solid #E3E7E4' }}><span className="v">{openAlerts}</span><span className="l">Alertes ouvertes</span></div>
          <div className="stat" style={{ padding: 12, borderRight: '1px solid #E3E7E4' }}><span className="v">{pendingVal}</span><span className="l">À valider</span></div>
          <div className="stat" style={{ padding: 12 }}><span className="v">{upcoming.length + demoVisits.length}</span><span className="l">Visites prévues</span></div>
        </div>

        {tab === 'alerts' && (
          <div className="col" style={{ gap: 10 }}>
            {alerts.length === 0 && <div className="card pad"><span className="small muted">Aucune alerte dans votre zone.</span></div>}
            {alerts.map((a) => {
              const st = statusOf(a);
              return (
                <div key={a.id} className="card pad col" style={{ gap: 10 }}>
                  <div className="row top" style={{ gap: 12 }}>
                    <Photo w={56} h={56} radius={8} src={a.photo} />
                    <div className="col grow" style={{ gap: 2 }}>
                      <div className="row between" style={{ gap: 6 }}>
                        <span className="b small ell">{a.animalId}, {a.animal}</span>
                        {st === 'done' ? <Badge tone="green">Clôturée</Badge> : st === 'taken' ? <Badge tone="blue">En cours</Badge> : <Badge tone={a.urgency === 'Élevée' ? 'red' : 'amber'}>{a.urgency}</Badge>}
                      </div>
                      <span className="xs muted">{a.farm}</span>
                      <span className="xs muted num">{a.date}</span>
                    </div>
                  </div>
                  <p className="small" style={{ lineHeight: 1.45 }}>{a.sign}</p>
                  {a.net && (
                    <div className="col" style={{ gap: 6 }}>
                      {a.net.text.trim() && <p className="xs muted" style={{ lineHeight: 1.45 }}>{a.net.text}</p>}
                      {!!a.net.photos?.length && <div className="row" style={{ gap: 6 }}>{a.net.photos.map((p, i) => <Photo key={i} w={56} h={44} radius={6} src={p} />)}</div>}
                      <span className="xs"><b>Éleveur :</b> {a.net.from.name}, <span className="num" style={{ userSelect: 'all' }}>+225 {a.net.from.phone}</span></span>
                      <Badge tone="grey" style={{ alignSelf: 'flex-start' }}>Reçue par SAVAA</Badge>
                    </div>
                  )}
                  <div className="row" style={{ gap: 8 }}>
                    {!a.net && <Link className="btn btn-s btn-sm grow" to={`/animal/${a.animalId}/sante`}>Dossier</Link>}
                    {st !== 'done' && (
                      <button
                        className="btn btn-p btn-sm grow"
                        onClick={() => markAlert(a.id, st === 'taken' ? 'done' : 'taken', st === 'taken' ? `Alerte ${a.animalId} clôturée.` : `Prise en charge signalée à l’éleveur.`)}
                      >
                        {st === 'taken' ? 'Clôturer' : 'Prendre en charge'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'validations' && (
          <div className="col" style={{ gap: 10 }}>
            {validations.length === 0 && <div className="card pad"><span className="small muted">Aucune fiche à valider.</span></div>}
            {validations.map((v) => {
              const ok = isValidated(v);
              return (
                <div key={v.id} className="card pad col" style={{ gap: 10 }}>
                  <div className="row" style={{ gap: 12 }}>
                    <Photo w={52} h={52} radius={8} src={v.photo} />
                    <div className="col grow" style={{ gap: 2 }}>
                      <span className="b small ell">{v.animalId}, {v.name}</span>
                      <span className="xs muted num">{v.officialId}</span>
                      <span className="xs muted">{v.farm} · {v.type}</span>
                    </div>
                    <Badge tone={ok ? 'green' : 'amber'}>{ok ? 'Vérifié' : 'À vérifier'}</Badge>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    {v.net ? <span className="xs grow" style={{ alignSelf: 'center' }}><b>Éleveur :</b> {v.net.from.name}, <span className="num">+225 {v.net.from.phone}</span></span> : <Link className="btn btn-s btn-sm grow" to={`/animal/${v.id}`}>Voir la fiche</Link>}
                    <button className="btn btn-p btn-sm grow" disabled={ok} onClick={() => validateSheet(v.id, v.name)}>
                      {ok ? 'Validée' : 'Valider la fiche'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'visits' && visitAsks.length > 0 && (
          <div className="sec">
            <div className="sech"><h2>Demandes des éleveurs</h2><Badge tone="blue">{visitAsks.length}</Badge></div>
            {visitAsks.map((v) => <VisitAsk key={v.id} v={v} />)}
          </div>
        )}
        {tab === 'visits' && (
          <div className="sec">
            <div className="sech"><h2>Visites prévues</h2><button className="link plain" aria-expanded={planning} onClick={() => setPlanning(!planning)}>{planning ? 'Fermer' : '+ Planifier'}</button></div>
            {planning && <PlanVisitForm onDone={() => setPlanning(false)} />}
            {!upcoming.length && !demoVisits.length && !planning && (
              <EmptyState title="Aucune visite prévue" text="Les visites que vous fixez à la demande d’un éleveur, ou que vous planifiez vous-même, apparaissent ici par date." />
            )}
            {upcoming.length > 0 && (
              <div className="card list">
                {upcoming.map((v) => {
                  const [d, m] = dayOf(v.date);
                  return (
                    <div className="li" key={v.id}>
                      <span className="col" style={{ width: 38, alignItems: 'center', gap: 0 }}><span className="b num" style={{ fontSize: 17 }}>{d}</span><span className="xs muted">{m}</span></span>
                      <div className="col grow" style={{ gap: 2, minWidth: 0 }}><span className="small b">{v.title}</span><span className="xs muted">{v.place}</span></div>
                      <button className="btn btn-s btn-sm" style={{ flex: 'none' }} onClick={() => visitDone(v)}>Visite faite</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {tab === 'visits' && !!demoVisits.length && (
          <div className="card list">
            {demoVisits.map((v) => {
              const ok = !!confirmed[v.id];
              return (
                <div className="li" key={v.id}>
                  <span className="col" style={{ width: 38, alignItems: 'center', gap: 0 }}>
                    <span className="b num" style={{ fontSize: 17 }}>{v.day}</span>
                    <span className="xs muted">{v.month}</span>
                  </span>
                  <Photo w={44} h={44} radius={6} src={v.photo} />
                  <div className="col grow" style={{ gap: 2 }}>
                    <span className="small b ell">{v.title}</span>
                    <span className="xs muted ell">{v.place}</span>
                  </div>
                  {ok ? (
                    <Badge tone="green">Confirmé</Badge>
                  ) : (
                    <button className="btn btn-s btn-sm" style={{ flex: 'none' }} onClick={() => confirmVisit(v.id, v.title)}>Confirmer</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <TabBar />
    </div>
  );
}

/* ================================================================== */
/* 2. ESPACE COURSIER / TRANSPORTEUR (/missions)                      */
/* ================================================================== */

type MissionOffer = {
  id: string;
  title: string;
  route: string;
  vehicle: string;
  fee: number;
  when: string;
  photo: string;
};

const MISSION_OFFERS: MissionOffer[] = [
  { id: 'MS-204', title: 'Lot de 6 béliers Sahéliens', route: 'Ferkessédougou → Korhogo (54 km)', vehicle: 'Bétaillère', fee: 30000, when: 'Demain, 08:00', photo: 'images/beliers-saheliens.jpg' },
  { id: 'MS-205', title: '10 sacs aliment bétail + tourteau', route: 'Korhogo ZI → Sinématiali (12 km)', vehicle: 'Pick-up / bâché', fee: 12000, when: 'Aujourd’hui, 15:00', photo: 'images/aliment-betail.jpg' },
  { id: 'MS-206', title: 'Bouc reproducteur Djallonké', route: 'Boundiali → Korhogo (98 km)', vehicle: 'Bétaillère', fee: 18000, when: '21/11, 07:30', photo: 'images/bouc-djallonke.jpg' },
];

const MISSION_HISTORY = [
  { id: 'SAV-2026-11-004501', title: '2 génisses métisses', route: 'Napiéolédougou → Korhogo', date: '15/11/2026', fee: 25000, photo: 'images/genisse-metisse.jpg' },
  { id: 'SAV-2026-11-004218', title: '20 plateaux d’œufs frais', route: 'Korhogo Soba → Plateau', date: '12/11/2026', fee: 15000, photo: 'images/oeufs-plateaux.jpg' },
];

const MISSION_STEP: Record<NetMission['status'], [string, Tone]> = {
  open: ['Disponible', 'grey'], accepted: ['Acceptée', 'blue'], picked: ['Prise en charge', 'blue'], route: ['En route', 'blue'], delivered: ['Livrée', 'green'],
};

/** Ce que représente la mission pour le livreur : véhicule demandé, charge, distance. */
const missionLine = (m: NetMission) => [vehicleOf(m.vehicle)?.label, m.load ? loadLabel(m.load) : '', m.km ? `trajet ${m.km} km` : ''].filter(Boolean).join(' · ');

/** Mission venue d'une vraie commande (réseau de l'appareil) : étapes et code de remise de l'acheteur. */
function NetMissionCard({ m }: { m: NetMission }) {
  const s = useStore();
  const [code, setCode] = useState('');
  const [label, tone] = MISSION_STEP[m.status];
  const net = payout(m.fee);
  const deliver = () => {
    if (code !== m.code) { showToast('Code incorrect. Demandez à l’acheteur le code à 4 chiffres de sa commande.'); return; }
    s.moveMission(m.id, 'delivered');
    s.notify({ c: 'cmd', title: 'Livraison confirmée', text: `${m.orderRef} remise avec le code de l’acheteur. ${fcfa(net)} FCFA vous reviennent.`, to: '/missions' });
    showToast('Remise horodatée et confirmée.');
  };
  return (
    <div className="card pad col" style={{ gap: 10 }}>
      <div className="row between" style={{ gap: 8 }}><span className="b small num">{m.orderRef}</span><Badge tone={tone}>{label}</Badge></div>
      <div className="row" style={{ gap: 10 }}>
        {m.photo && <Photo w={56} h={44} radius={6} src={m.photo} />}
        <div className="col grow" style={{ gap: 2, minWidth: 0 }}><span className="small b">{m.title}</span>{missionLine(m) && <span className="xs muted">{missionLine(m)}</span>}</div>
      </div>
      {m.from && m.status !== 'delivered' && <DeliveryMap label={`Trajet de ${m.from.name} à ${m.to?.name ?? 'l’acheteur'}`} height={160} routes={[{ id: m.id, from: m.from, to: m.to, label: `Enlèvement : ${m.from.name}` }]} />}
      <dl className="kv">
        <dt>Enlèvement</dt><dd>{m.pickup}</dd>
        <dt>Livraison</dt><dd>{m.dropoff}</dd>
        <dt>Destinataire</dt><dd>{m.buyer.name}, <a className="num link" href={`tel:+225${m.buyer.phone.replace(/\D/g, '')}`}>+225 {m.buyer.phone}</a></dd>
        <dt>Pour vous</dt><dd><b className="num">{fcfa(net)} FCFA</b> <span className="muted">sur {fcfa(m.fee)} payés par l’acheteur (commission SAVAA {COMMISSION * 100} %)</span></dd>
      </dl>
      {m.status === 'delivered' ? (
        <div className="notice n-info"><Icon name="check" size="sm" /><span>Livrée le {m.deliveredAt}. {fcfa(net)} FCFA vous reviennent.</span></div>
      ) : (
        <>
          <div className="seg">
            <button className={m.status === 'picked' ? 'on' : ''} onClick={() => { s.moveMission(m.id, 'picked'); showToast('Statut : prise en charge'); }}>Pris en charge</button>
            <button className={m.status === 'route' ? 'on' : ''} onClick={() => { s.moveMission(m.id, 'route'); showToast('Statut : en route'); }}>En route</button>
          </div>
          <div className="field">
            <label htmlFor={`code-${m.id}`}>Code de remise de l’acheteur</label>
            <div className="row" style={{ gap: 8 }}>
              <input id={`code-${m.id}`} className="input num grow" inputMode="numeric" maxLength={4} placeholder="4 chiffres" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))} />
              <button className="btn btn-p" disabled={code.length < 4} onClick={deliver}>Confirmer la remise</button>
            </div>
            <span className="hint">L’acheteur trouve ce code dans le suivi de sa commande. Le paiement du vendeur est libéré à la remise.</span>
          </div>
          {m.status === 'accepted' && (
            <button className="link plain" style={{ alignSelf: 'flex-start' }} onClick={() => { s.releaseMission(m.id); showToast('Mission rendue : elle repart chez les autres livreurs de la zone.'); }}>Je ne peux plus la faire, me désister</button>
          )}
        </>
      )}
    </div>
  );
}

/** Ancien libellé du profil métier → véhicule du calcul de livraison. */
const OLD_VEHICLE: Record<string, VehicleId> = { 'Pick-up ou bâché': 'pickup', Camion: 'camion', Bétaillère: 'betaillere' };

/** Véhicule, base, rayon d'action et disponibilité du livreur. Enregistré sur le réseau de l'appareil : les acheteurs voient combien de livreurs couvrent leur zone. */
function CourierSettings({ c, onSave }: { c: Omit<NetCourier, 'name' | 'phone'>; onSave: (c: Omit<NetCourier, 'name' | 'phone'>) => void }) {
  const [v, setV] = useState(c);
  const max = vehicleOf(v.vehicle)?.zone ?? 30;
  const radius = Math.min(v.radius, max);
  return (
    <div className="card pad col" style={{ gap: 12 }}>
      <span className="b small">Mon véhicule et ma zone</span>
      <div className="field">
        <label htmlFor="cr-vehicle">Véhicule</label>
        <select id="cr-vehicle" className="input" value={v.vehicle} onChange={(e) => { const id = e.target.value as VehicleId; setV({ ...v, vehicle: id, radius: Math.min(v.radius, vehicleOf(id)?.zone ?? 30) }); }}>
          {COURIER_VEHICLES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
        <span className="hint">{vehicleOf(v.vehicle)?.what}. Jusqu’à {vehicleOf(v.vehicle)?.km} km par trajet.</span>
      </div>
      <div className="field">
        <label htmlFor="cr-base">Ville ou village de base</label>
        <select id="cr-base" className="input" value={v.base} onChange={(e) => setV({ ...v, base: e.target.value })}>{PLACES.map((p) => <option key={p.name}>{p.name}</option>)}</select>
      </div>
      <div className="field">
        <label htmlFor="cr-radius">Je prends les enlèvements jusqu’à <b className="num">{radius} km</b> de ma base</label>
        <input id="cr-radius" type="range" min={5} max={max} step={5} value={radius} onChange={(e) => setV({ ...v, radius: Number(e.target.value) })} />
        <span className="hint">Maximum {max} km pour ce véhicule.</span>
      </div>
      <button className="btn btn-p" onClick={() => onSave({ ...v, radius })}>Enregistrer</button>
    </div>
  );
}

export function CourierSpace() {
  const s = useStore();
  const [tab, setTab] = useState<'active' | 'offers' | 'history'>('active');
  const accepted = s.get<Record<string, boolean>>('courier.accepted', {});
  const step = s.get<'picked' | 'route' | 'delivered'>('courier.step', 'route');
  const [codeInput, setCodeInput] = useState('');
  const unread = s.unread();
  const demo = !!s.session().demo;

  /* Profil de livreur : enregistré, sinon déduit du profil métier (véhicule, zone de travail). */
  const saved = s.myCourier();
  const pro = s.session().pro ?? {};
  const fromPro = COURIER_VEHICLES.find((x) => x.label === pro['coursier.vehicule'])?.id ?? OLD_VEHICLE[pro['coursier.vehicule'] ?? ''] ?? 'pickup';
  const me = saved ?? { vehicle: fromPro, base: (placeOf(pro['coursier.zone']) ?? placeOf(s.session().town) ?? PLACES[0]).name, radius: Math.min(30, vehicleOf(fromPro)?.zone ?? 30), online: false };
  const [editing, setEditing] = useState(false);
  const vehicle = vehicleOf(me.vehicle);
  const base = placeOf(me.base);

  /* Missions créées par les vraies commandes livrées (réseau de l'appareil). */
  const myPhone = s.session().phone;
  /* Ni ses propres commandes, ni les commandes passées sur ses annonces : un transporteur ne livre pas ses propres ventes. */
  const ownSale = (m: NetMission) => !!m.sellerPhones?.includes(myPhone);
  const open = s.net().missions.filter((m) => m.status === 'open' && m.buyer.phone !== myPhone && !ownSale(m));
  const skipped = s.net().missions.filter((m) => m.status === 'open' && ownSale(m)).length;
  /* Proposées : son véhicule peut faire le transport et l'enlèvement est dans sa zone. Triées de la plus proche à la plus lointaine. */
  const away = (m: NetMission) => (m.from && base ? roadKm(base, m.from) : 0);
  const fits = (m: NetMission) => !!vehicle && (!m.load || canCarry(vehicle, m.load, m.km ?? 0)) && away(m) <= me.radius;
  const netOpen = me.online ? open.filter(fits).sort((a, b) => away(a) - away(b)) : [];
  const elsewhere = me.online ? open.length - netOpen.length : 0;
  const mine = s.net().missions.filter((m) => m.status !== 'open' && m.courier?.phone === myPhone);
  const myActive = mine.filter((m) => m.status !== 'delivered');
  const myDone = mine.filter((m) => m.status === 'delivered');
  /* Les missions d'exemple ne concernent que le compte de démonstration. */
  const offers = demo ? MISSION_OFFERS : [];
  const availableCount = offers.filter((m) => !accepted[m.id]).length + netOpen.length;
  const acceptedOffers = offers.filter((m) => accepted[m.id]);
  const activeCount = (demo ? (step === 'delivered' ? 0 : 1) : 0) + myActive.length;
  const deliveredCount = (demo ? MISSION_HISTORY.length + (step === 'delivered' ? 1 : 0) : 0) + myDone.length;
  const earned = (demo ? 40000 + (step === 'delivered' ? 25000 : 0) : 0) + myDone.reduce((t, m) => t + payout(m.fee), 0);

  const save = (c: Omit<NetCourier, 'name' | 'phone'>) => { s.setCourier(c); setEditing(false); showToast(`Enregistré : ${vehicleOf(c.vehicle)?.label}, ${c.radius} km autour de ${c.base}.`); };
  const toggleOnline = () => { s.setCourier({ ...me, online: !me.online }); showToast(me.online ? 'Hors service : vous ne recevez plus de missions.' : 'En service : les missions de votre zone vous sont proposées.'); };

  const validateCode = () => {
    if (codeInput.trim() !== '4827') {
      showToast('Code incorrect. En démo, saisissez le code 4827.');
      return;
    }
    s.put('courier.step', 'delivered');
    s.notify({ c: 'cmd', title: 'Livraison confirmée', text: 'SAV-2026-11-004812 remise avec code 4827. Paiement débloqué.', to: '/missions' });
    showToast('Remise horodatée et confirmée !');
  };

  return (
    <div className="app">
      <DashHeader label="Espace transporteur" name={s.session().name || 'Transporteur'} action={<Link className="iconbtn" to="/notifications" aria-label="Notifications">
          <Icon name="bell" />
          {unread > 0 && <span className="dot">{unread}</span>}
        </Link>} />
      <div className="utabs" role="tablist">
        <button role="tab" aria-selected={tab === 'active'} className={tab === 'active' ? 'on' : ''} onClick={() => setTab('active')}>En cours ({activeCount})</button>
        <button role="tab" aria-selected={tab === 'offers'} className={tab === 'offers' ? 'on' : ''} onClick={() => setTab('offers')}>Disponibles ({availableCount})</button>
        <button role="tab" aria-selected={tab === 'history'} className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}>Historique ({deliveredCount})</button>
      </div>
      <div className="body">
        <div className="card pad row" style={{ gap: 12 }}>
          <div className="col grow" style={{ gap: 2, minWidth: 0 }}>
            <span className="small b">{me.online ? 'En service' : 'Hors service'}</span>
            <span className="xs muted">{vehicle?.label}, {me.radius} km autour de {me.base}{saved ? '' : ' (à confirmer)'}</span>
            <button className="link plain xs" style={{ alignSelf: 'flex-start' }} aria-expanded={editing} onClick={() => setEditing(!editing)}>{editing ? 'Fermer' : 'Modifier véhicule et zone'}</button>
          </div>
          <button className="li" role="switch" aria-checked={me.online} aria-label="En service" onClick={toggleOnline} style={{ flex: 'none', padding: 0, border: 0, background: 'none', minHeight: 0 }}>
            <span className={`toggle${me.online ? ' on' : ''}`} />
          </button>
        </div>
        {editing && <CourierSettings c={me} onSave={save} />}

        {myActive[0] ? (
          <TodayCard eyebrow="Mission en cours" title={myActive[0].title} text={`${myActive[0].pickup} → ${myActive[0].dropoff}. À la remise, demandez le code à 4 chiffres à ${myActive[0].buyer.name}.`}>
            <button className="btn btn-p" onClick={() => setTab('active')}>Voir la mission</button>
          </TodayCard>
        ) : demo && step !== 'delivered' ? (
          <TodayCard eyebrow="Mission en cours" title="Taurillon FK-0142 et 4 sacs d’aliment" text="Livrer à Fatou Ouattara, route de Dikodougou. À la remise, demandez le code à 4 chiffres à l’acheteur.">
            <button className="btn btn-p" onClick={() => setTab('active')}>Voir la mission</button>
          </TodayCard>
        ) : !me.online ? (
          <TodayCard eyebrow="Aujourd’hui" title="Vous êtes hors service" text="Passez en service pour recevoir les missions que votre véhicule peut faire, dans votre zone.">
            <button className="btn btn-p" onClick={toggleOnline}>Passer en service</button>
          </TodayCard>
        ) : (
          <TodayCard eyebrow="Aujourd’hui" title="Aucune mission en cours" text={availableCount ? `${availableCount} mission${availableCount > 1 ? 's' : ''} dans votre zone.` : 'Aucune mission dans votre zone pour l’instant. Elles arrivent dès qu’un acheteur paie une livraison.'}>
            <button className="btn btn-p" onClick={() => setTab('offers')}>Voir les missions</button>
          </TodayCard>
        )}
        <div className="card grid3" style={{ gap: 0 }}>
          <div className="stat" style={{ padding: 12, borderRight: '1px solid #E3E7E4' }}><span className="v">{activeCount}</span><span className="l">En cours</span></div>
          <div className="stat" style={{ padding: 12, borderRight: '1px solid #E3E7E4' }}><span className="v">{availableCount}</span><span className="l">Dans ma zone</span></div>
          <div className="stat" style={{ padding: 12 }}><span className="v">{fcfa(earned)}</span><span className="l">FCFA gagnés</span></div>
        </div>

        {tab === 'active' && myActive.map((m) => <NetMissionCard key={m.id} m={m} />)}
        {tab === 'active' && !demo && !myActive.length && (
          <EmptyState title="Aucune mission en cours" text="Acceptez une mission dans l’onglet Disponibles : elle apparaîtra ici jusqu’à la livraison.">
            <button className="btn btn-s btn-sm" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={() => setTab('offers')}>Voir les missions disponibles</button>
          </EmptyState>
        )}

        {tab === 'active' && demo && (
          <div className="card pad col" style={{ gap: 12 }}>
            <div className="row between">
              <span className="b num">SAV-2026-11-004812</span>
              <Badge tone={step === 'delivered' ? 'green' : 'blue'}>
                {step === 'delivered' ? 'Livrée' : step === 'route' ? 'En route' : 'Prise en charge'}
              </Badge>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <Photo w={56} h={44} radius={6} src="images/taurillon-goudali.jpg" />
              <Photo w={56} h={44} radius={6} src="images/aliment-betail.jpg" />
              <div className="col grow">
                <span className="small b">Taurillon FK-0142 + 4 sacs aliment</span>
                <span className="xs muted">Bétaillère · Rémunération 25 000 FCFA</span>
              </div>
            </div>
            <dl className="kv">
              <dt>Enlèvement</dt><dd>Ferme Koné &amp; Fils, Sinématiali</dd>
              <dt>Livraison</dt><dd>Ferme Ouattara, route de Dikodougou</dd>
              <dt>Destinataire</dt><dd>Fatou Ouattara</dd>
            </dl>
            {step !== 'delivered' ? (
              <>
                <div className="seg">
                  <button className={step === 'picked' ? 'on' : ''} onClick={() => { s.put('courier.step', 'picked'); showToast('Statut : prise en charge'); }}>Pris en charge</button>
                  <button className={step === 'route' ? 'on' : ''} onClick={() => { s.put('courier.step', 'route'); showToast('Position partagée : en route'); }}>En route</button>
                </div>
                <div className="field">
                  <label htmlFor="remise-code">Code de remise de l’acheteur</label>
                  <div className="row" style={{ gap: 8 }}>
                    <input id="remise-code" className="input num grow" inputMode="numeric" maxLength={4} placeholder="Ex. 4827" value={codeInput} onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 4))} />
                    <button className="btn btn-p" disabled={codeInput.length < 4} onClick={validateCode}>Valider</button>
                  </div>
                  <span className="hint">Demandez le code à 4 chiffres à l’acheteur après vérification (démo : 4827).</span>
                </div>
              </>
            ) : (
              <div className="notice n-info">
                <Icon name="check" size="sm" />
                <span>Livraison horodatée avec le code 4827. Votre virement de 25 000 FCFA est validé.</span>
              </div>
            )}
          </div>
        )}

        {tab === 'offers' && (
          <div className="col" style={{ gap: 10 }}>
            {base && <DeliveryMap label={`Votre zone : ${me.radius} km autour de ${base.name}, ${netOpen.length} mission${netOpen.length > 1 ? 's' : ''}`} zone={{ center: base, km: me.radius }} routes={netOpen.filter((m) => m.from).map((m) => ({ id: m.id, from: m.from as Place, to: m.to, label: `${m.title}, ${fcfa(payout(m.fee))} FCFA pour vous` }))} />}
            {!me.online && <div className="notice"><Icon name="info" size="sm" /><span>Vous êtes hors service : aucune mission ne vous est proposée. Activez « En service » en haut de la page.</span></div>}
            {elsewhere > 0 && <span className="xs muted">{elsewhere === 1 ? 'Une autre mission est' : `${elsewhere} autres missions sont`} hors de votre zone ou demande{elsewhere > 1 ? 'nt' : ''} un autre véhicule.</span>}
            {skipped > 0 && (
              <div className="notice"><Icon name="info" size="sm" /><span>{skipped === 1 ? 'Une livraison n’est pas proposée ici : c’est une de vos ventes.' : `${skipped} livraisons ne sont pas proposées ici : ce sont vos ventes.`} Un autre transporteur s’en charge, pour que l’acheteur ait un témoin indépendant à la remise.</span></div>
            )}
            {me.online && !netOpen.length && !offers.length && <EmptyState title="Aucune mission dans votre zone" text={`Les commandes livrées à moins de ${me.radius} km de ${me.base}, que votre ${vehicle?.label.toLowerCase()} peut transporter, apparaîtront ici.`} />}
            {netOpen.map((m) => (
              <div key={m.id} className="card pad col" style={{ gap: 10 }}>
                <div className="row" style={{ gap: 12 }}>
                  <Photo w={56} h={56} radius={8} src={m.photo ?? 'images/aliment-betail.jpg'} />
                  <div className="col grow" style={{ gap: 2, minWidth: 0 }}>
                    <span className="b small">{m.title}</span>
                    <span className="xs muted">{m.pickup} → {m.dropoff}</span>
                    <span className="xs muted">{m.from && base ? `À ${away(m)} km de vous · ` : ''}{missionLine(m)}</span>
                  </div>
                </div>
                <div className="row between" style={{ gap: 8 }}>
                  <span className="col" style={{ gap: 0 }}><span className="price">{fcfa(payout(m.fee))} FCFA</span><span className="xs muted">pour vous, sur {fcfa(m.fee)} FCFA</span></span>
                  <button className="btn btn-p btn-sm" onClick={() => { s.moveMission(m.id, 'accepted'); showToast(`Mission ${m.orderRef} acceptée. L’acheteur est prévenu.`); setTab('active'); }}>Accepter la mission</button>
                </div>
              </div>
            ))}
            {offers.map((m) => {
              const ok = !!accepted[m.id];
              return (
                <div key={m.id} className="card pad col" style={{ gap: 10 }}>
                  <div className="row" style={{ gap: 12 }}>
                    <Photo w={56} h={56} radius={8} src={m.photo} />
                    <div className="col grow" style={{ gap: 2 }}>
                      <span className="b small ell">{m.title}</span>
                      <span className="xs muted">{m.route}</span>
                      <span className="xs muted">{m.vehicle} · {m.when}</span>
                    </div>
                  </div>
                  <div className="row between">
                    <span className="price">{fcfa(m.fee)} FCFA</span>
                    {ok ? <Badge tone="green">Mission acceptée</Badge> : (
                      <button className="btn btn-p btn-sm" onClick={() => { s.put('courier.accepted', { ...accepted, [m.id]: true }); showToast(`Mission ${m.id} acceptée.`); }}>Accepter la mission</button>
                    )}
                  </div>
                </div>
              );
            })}
            {acceptedOffers.length > 0 && <span className="xs muted">Missions d’exemple du compte de démonstration.</span>}
          </div>
        )}

        {tab === 'history' && myDone.map((m) => (
          <div className="card list" key={m.id}><div className="li">{m.photo && <Photo w={48} h={48} radius={6} src={m.photo} />}<div className="col grow"><span className="small b">{m.title}</span><span className="xs muted">{m.pickup} → {m.dropoff}, {m.deliveredAt}</span></div><span className="small b num" style={{ color: '#145C3A' }}>+{fcfa(payout(m.fee))}</span></div></div>
        ))}
        {tab === 'history' && !demo && !myDone.length && (
          <EmptyState title="Aucune livraison pour l’instant" text="Vos livraisons terminées et ce qui vous revient (prix payé moins 5 % de commission) apparaîtront ici." />
        )}

        {tab === 'history' && demo && (
          <div className="card list">
            {step === 'delivered' && (
              <div className="li">
                <Photo w={48} h={48} radius={6} src="images/taurillon-goudali.jpg" />
                <div className="col grow"><span className="small b">SAV-2026-11-004812</span><span className="xs muted">Sinématiali → Korhogo, {today()}</span></div>
                <span className="small b num" style={{ color: '#145C3A' }}>+25 000</span>
              </div>
            )}
            {MISSION_HISTORY.map((h) => (
              <div className="li" key={h.id}>
                <Photo w={48} h={48} radius={6} src={h.photo} />
                <div className="col grow"><span className="small b">{h.title}</span><span className="xs muted">{h.route}, {h.date}</span></div>
                <span className="small b num" style={{ color: '#145C3A' }}>+{fcfa(h.fee)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <TabBar />
    </div>
  );
}

/* ================================================================== */
/* 3. ESPACE PRODUCTEUR AGRICOLE (/recoltes)                          */
/* ================================================================== */

type HarvestLot = {
  id: string;
  crop: string;
  qty: string;
  price: number;
  unit: string;
  status: 'Disponible' | 'Récolte en cours' | 'Épuisé';
  photo: string;
  listingId?: string;
};

const INITIAL_LOTS: HarvestLot[] = [
  { id: 'REC-1', crop: 'Igname Kponan', qty: '5 000 kg (min. 200 kg)', price: 425, unit: 'le kg', status: 'Disponible', photo: 'images/igname-kponan.jpg', listingId: 'IGNAME' },
  { id: 'REC-2', crop: 'Maïs grain jaune séché', qty: '240 sacs de 100 kg', price: 18500, unit: 'le sac', status: 'Disponible', photo: 'images/mais-jaune.jpg', listingId: 'L-MAIS' },
  { id: 'REC-3', crop: 'Noix de cajou brutes (KOR 49)', qty: '4 000 kg séchés', price: 420, unit: 'le kg', status: 'Récolte en cours', photo: 'images/noix-cajou.jpg', listingId: 'L-CAJOU' },
];

const LOT_TONE: Record<HarvestLot['status'], Tone> = {
  Disponible: 'green',
  'Récolte en cours': 'amber',
  Épuisé: 'red',
};

const AGRI_CAL: DueOptions = {
  kv: 'agri.cal', types: ['Semis', 'Récolte', 'Collecte', 'Traitement', 'Séchage', 'Livraison'],
  demoRows: [
    ['24', 'nov.', 'Collecte coopérative maïs jaune', 'Magasin Dikodougou, 120 sacs', '20261124'],
    ['02', 'déc.', 'Récolte parcelle igname Kponan', 'Secteur Nord, environ 3 tonnes', '20261202'],
    ['15', 'déc.', 'Contrôle KOR anacarde brute', 'Union du Poro, Sinématiali', '20261215'],
  ],
  title: 'Calendrier des cultures', whatLabel: 'Culture ou parcelle', whatPlaceholder: 'Ex. maïs, parcelle du bas-fond', whatError: 'Indiquez la culture ou la parcelle.',
  empty: 'Calendrier vide. Ajoutez vos semis, récoltes et collectes pour prévenir vos acheteurs à temps.', file: 'calendrier-cultures-savaa.ics',
};

export function AgriSpace() {
  const s = useStore();
  const [tab, setTab] = useState<'lots' | 'add' | 'cal' | 'stats'>('lots');
  const demo = !!s.session().demo;
  const extraLots = s.get<HarvestLot[]>('agri.lots', []);
  const lotStatus = s.get<Record<string, HarvestLot['status']>>('agri.lotStatus', {});
  const lots = [...extraLots, ...(demo ? INITIAL_LOTS : [])].map((l) => ({ ...l, status: lotStatus[l.id] ?? l.status }));
  const setLot = (id: string, status: HarvestLot['status']) => { s.put('agri.lotStatus', { ...lotStatus, [id]: status }); showToast(`Lot passé à « ${status} ».`); };
  /* Statistiques : ventes reçues sur ses annonces (réseau de l'appareil) et volume déclaré dans ses lots. */
  const sales = s.mySales();
  const revenue = sales.reduce((t, x) => t + x.price * x.qty, 0);
  const buyers = new Set(sales.map((x) => x.buyer.phone)).size;
  const byProduct = Object.values(sales.reduce<Record<string, { title: string; amount: number; qty: number; orders: number }>>((acc, x) => {
    const p = acc[x.title] ?? { title: x.title, amount: 0, qty: 0, orders: 0 };
    acc[x.title] = { ...p, amount: p.amount + x.price * x.qty, qty: p.qty + x.qty, orders: p.orders + 1 };
    return acc;
  }, {})).sort((a, b) => b.amount - a.amount);
  const active = lots.filter((l) => l.status !== 'Épuisé');
  const volume = active.reduce((t, l) => t + volumeKg(l.qty), 0);
  const [crop, setCrop] = useState('');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');

  const addLot = () => {
    if (!crop.trim() || !qty.trim()) return;
    const lot: HarvestLot = {
      id: `REC-${lots.length + 1}`,
      crop: crop.trim(),
      qty: qty.trim(),
      price: Number(price.replace(/\D/g, '')),
      unit: 'le kg',
      status: 'Disponible',
      photo: '',
    };
    s.put('agri.lots', [lot, ...extraLots]);
    setCrop('');
    setQty('');
    setPrice('');
    setTab('lots');
    showToast('Lot de récolte ajouté à vos disponibilités.');
  };

  return (
    <div className="app">
      <DashHeader label="Producteur agricole" name={s.shop().created ? s.shop().name : s.session().name || 'Mes récoltes'} action={<Link className="iconbtn" to="/vendre" aria-label="Publier une récolte"><Icon name="plus" /></Link>} />
      <div className="utabs" role="tablist">
        <button role="tab" aria-selected={tab === 'lots'} className={tab === 'lots' ? 'on' : ''} onClick={() => setTab('lots')}>Disponibilités ({lots.length})</button>
        <button role="tab" aria-selected={tab === 'add'} className={tab === 'add' ? 'on' : ''} onClick={() => setTab('add')}>Déclarer un lot</button>
        <button role="tab" aria-selected={tab === 'cal'} className={tab === 'cal' ? 'on' : ''} onClick={() => setTab('cal')}>Calendrier</button>
        <button role="tab" aria-selected={tab === 'stats'} className={tab === 'stats' ? 'on' : ''} onClick={() => setTab('stats')}>Statistiques</button>
      </div>
      <div className="body">
        {demo ? (
          <TodayCard eyebrow="Prochaine collecte" title="Maïs jaune, le 24/11" text="Magasin de Dikodougou, environ 120 sacs. Prévenez vos acheteurs et réservez le séchage.">
            <button className="btn btn-p" onClick={() => setTab('cal')}>Voir le calendrier</button>
          </TodayCard>
        ) : active[0] ? (
          <TodayCard eyebrow="Aujourd’hui" title={`Mettez en vente : ${active[0].crop}`} text={`${active[0].qty}. La fiche de traçabilité se remplit en 4 étapes.`}>
            <Link className="btn btn-p" to="/vendre">Mettre en vente</Link>
          </TodayCard>
        ) : (
          <TodayCard eyebrow="Pour commencer" title="Déclarez votre première récolte" text="Culture, quantité et prix indicatif : vous suivez vos disponibilités et les mettez en vente quand vous voulez.">
            <button className="btn btn-p" onClick={() => setTab('add')}>Déclarer un lot</button>
          </TodayCard>
        )}
        <div className="card grid3" style={{ gap: 0 }}>
          <div className="stat" style={{ padding: 12, borderRight: '1px solid #E3E7E4' }}><span className="v">{active.length}</span><span className="l">Lots actifs</span></div>
          <div className="stat" style={{ padding: 12, borderRight: '1px solid #E3E7E4' }}><span className="v">{volume ? `${fcfa(Math.round(volume / 100) / 10)} t` : '—'}</span><span className="l">Volume disponible</span></div>
          <div className="stat" style={{ padding: 12 }}><span className="v">{buyers}</span><span className="l">Acheteurs</span></div>
        </div>

        {tab === 'lots' && !lots.length && (
          <EmptyState title="Aucune récolte déclarée" text="Déclarez vos lots (culture, quantité, prix indicatif) pour suivre vos disponibilités, puis mettez-les en vente avec leur fiche de traçabilité.">
            <button className="btn btn-p btn-sm" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={() => setTab('add')}>Déclarer un lot</button>
          </EmptyState>
        )}
        {tab === 'lots' && !!lots.length && (
          <div className="col" style={{ gap: 10 }}>
            {lots.map((l) => (
              <div key={l.id} className="card pad col" style={{ gap: 10 }}>
                <div className="row" style={{ gap: 12 }}>
                  {l.photo && <Photo w={56} h={56} radius={8} src={l.photo} />}
                  <div className="col grow" style={{ gap: 2, minWidth: 0 }}>
                    <div className="row between" style={{ gap: 6 }}>
                      <span className="b small ell">{l.crop}</span>
                      <Badge tone={LOT_TONE[l.status]}>{l.status}</Badge>
                    </div>
                    <span className="xs muted">{l.qty}</span>
                    {l.price ? <span className="price">{fcfa(l.price)} FCFA <span className="xs muted" style={{ fontWeight: 400 }}>{l.unit}</span></span> : <span className="xs muted">Prix à définir</span>}
                  </div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn btn-s btn-sm grow" onClick={() => setLot(l.id, l.status === 'Épuisé' ? 'Disponible' : 'Épuisé')}>{l.status === 'Épuisé' ? 'Remettre disponible' : 'Marquer épuisé'}</button>
                  {l.listingId && <Link className="btn btn-s btn-sm grow" to={`/annonce/${l.listingId}`}>Voir l’annonce</Link>}
                  <Link className="btn btn-p btn-sm grow" to="/vendre">Mettre en vente</Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'add' && (
          <div className="card pad col" style={{ gap: 14 }}>
            <span className="b">Nouvelle disponibilité de récolte</span>
            <div className="field">
              <label htmlFor="ag-crop">Culture / variété</label>
              <input id="ag-crop" className="input" placeholder="Ex. Riz local, Mangues Kent, Arachide…" value={crop} onChange={(e) => setCrop(e.target.value)} />
            </div>
            <div className="grid2">
              <div className="field">
                <label htmlFor="ag-qty">Quantité disponible</label>
                <input id="ag-qty" className="input" placeholder="Ex. 1 500 kg" value={qty} onChange={(e) => setQty(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="ag-price">Prix indicatif (FCFA)</label>
                <input id="ag-price" className="input num" inputMode="numeric" placeholder="450" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
            </div>
            <button className="btn btn-p btn-block" disabled={!crop.trim() || !qty.trim()} onClick={addLot}>Enregistrer le lot</button>
          </div>
        )}

        {tab === 'cal' && <Echeances demo={demo} o={AGRI_CAL} />}

        {tab === 'stats' && (
          <>
            <div className="card grid3" style={{ gap: 0 }}>
              <div className="stat" style={{ padding: 12, borderRight: '1px solid #E3E7E4' }}><span className="v">{fcfa(revenue)}</span><span className="l">FCFA vendus</span></div>
              <div className="stat" style={{ padding: 12, borderRight: '1px solid #E3E7E4' }}><span className="v">{sales.length}</span><span className="l">Ventes</span></div>
              <div className="stat" style={{ padding: 12 }}><span className="v">{byProduct.length}</span><span className="l">Produits vendus</span></div>
            </div>
            <div className="sec">
              <div className="sech"><h2>Ventes par produit</h2></div>
              {byProduct.length === 0 ? (
                <EmptyState title="Aucune vente pour l’instant" text="Quand un acheteur commande une de vos récoltes en ligne, le montant et la quantité s’ajoutent ici, produit par produit." />
              ) : (
                <div className="card list">
                  {byProduct.map((p) => (
                    <div className="li" key={p.title} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                      <div className="row between" style={{ gap: 8 }}><span className="small b ell">{p.title}</span><span className="small b num" style={{ flex: 'none' }}>{fcfa(p.amount)} FCFA</span></div>
                      <div className="bar" aria-hidden="true"><i style={{ width: `${Math.max(4, Math.round((p.amount / byProduct[0].amount) * 100))}%` }} /></div>
                      <span className="xs muted">{p.qty} commandé{p.qty > 1 ? 's' : ''}, {p.orders} commande{p.orders > 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="sec">
              <div className="sech"><h2>Disponibilités déclarées</h2></div>
              <div className="card list">
                <div className="li"><span className="grow small">Lots disponibles</span><span className="small b num">{lots.filter((l) => l.status === 'Disponible').length}</span></div>
                <div className="li"><span className="grow small">Récolte en cours</span><span className="small b num">{lots.filter((l) => l.status === 'Récolte en cours').length}</span></div>
                <div className="li"><span className="grow small">Épuisés</span><span className="small b num">{lots.filter((l) => l.status === 'Épuisé').length}</span></div>
                <div className="li"><span className="grow small">Volume déclaré</span><span className="small b num">{volume ? `${fcfa(Math.round(volume / 100) / 10)} t` : '—'}</span></div>
              </div>
              {demo && <span className="xs muted">Les ventes affichées sont celles passées sur SAVAA depuis ce téléphone. Les lots de la maquette n’ont pas de ventes enregistrées.</span>}
            </div>
          </>
        )}
      </div>
      <TabBar />
    </div>
  );
}

/* ================================================================== */
/* 4. ESPACE FOURNISSEUR / ENTREPRISE B2B (/fournisseur)              */
/* ================================================================== */

const SUPPLIER_QUOTES = [
  { id: 'DQ-1', client: 'Ferme Koné & Fils', item: 'Aliment engraissement 50 kg + tourteau', qty: '40 sacs / mois', place: 'Sinématiali', suggested: 14000, photo: 'images/aliment-betail.jpg' },
  { id: 'DQ-2', client: 'La Terrasse du Plateau', item: 'Œufs frais calibrés & provende', qty: '50 plateaux / sem.', place: 'Abidjan-Plateau', suggested: 2500, photo: 'images/oeufs-plateaux.jpg' },
  { id: 'DQ-3', client: 'Couvoir du Nord', item: 'Couveuse automatique 528 œufs', qty: '2 unités', place: 'Korhogo', suggested: 370000, photo: 'images/couveuse-oeufs.jpg' },
];

const SUPPLIER_INVOICES: [string, string, number, string, Tone][] = [
  ['FAC-F-2026-412', 'Ferme Koné & Fils', 580000, 'Payée', 'green'],
  ['FAC-F-2026-419', 'Ranch Tuo', 840000, 'En attente (25/11)', 'amber'],
  ['FAC-F-2026-425', 'Couvoir du Nord', 385000, 'Payée', 'green'],
];

export function SupplierSpace() {
  const s = useStore();
  const [tab, setTab] = useState<'quotes' | 'catalog' | 'invoices'>('quotes');
  const demo = !!s.session().demo;
  const sent = s.get<Record<string, number>>('fourn.sent', {});
  const [offers, setOffers] = useState<Record<string, string>>({});
  /* Demandes reçues des restaurants et acheteurs pros (réseau de l'appareil), puis celles de la démo. Factures : démo seulement. */
  const myPhone = s.session().phone;
  const org = s.shop().created ? s.shop().name : s.session().pro?.['fourn.raison'] || undefined;
  const net = s.net();
  /* Demandes ouvertes des autres comptes, et celles où son offre a été retenue. */
  const keptMine = (q: NetQuote) => q.status === 'accepted' && q.offers.find((o) => o.id === q.accepted)?.supplier.phone === myPhone;
  const received = net.quotes.filter((q) => q.from.phone !== myPhone && (q.status === 'open' || keptMine(q)));
  const netSent: Record<string, number> = Object.fromEntries(received.flatMap((q) => q.offers.filter((o) => o.supplier.phone === myPhone).map((o) => [q.id, o.price])));
  const quotes = [
    ...received.map((q) => ({ id: q.id, client: q.from.org || q.from.name, item: q.product, qty: q.qty, place: q.place, suggested: 0, photo: 'images/aliment-betail.jpg', net: q as NetQuote | undefined })),
    ...(demo ? SUPPLIER_QUOTES.map((q) => ({ ...q, net: undefined as NetQuote | undefined })) : []),
  ];
  const sentOf = (id: string): number | undefined => netSent[id] ?? sent[id];
  /* Factures émises depuis ce compte (réseau de l'appareil), puis celles de la maquette. */
  const myInvoices = net.invoices.filter((x) => x.supplier.phone === myPhone);
  const invoices: [string, string, number, string, Tone][] = [
    ...myInvoices.map((x): [string, string, number, string, Tone] => [x.ref, x.client.org || x.client.name, x.amount, x.status === 'paid' ? `Payée le ${x.paidAt}` : `En attente (${x.due.slice(0, 5)})`, x.status === 'paid' ? 'green' : 'amber']),
    ...(demo ? SUPPLIER_INVOICES : []),
  ];
  const month = today().slice(3);
  const cashed = myInvoices.filter((x) => x.status === 'paid' && x.paidAt?.endsWith(month)).reduce((t, x) => t + x.amount, 0);
  const recurring = net.recurring.filter((r) => r.supplier.phone === myPhone);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const invoiceOf = (quoteId: string) => myInvoices.find((x) => x.quoteId === quoteId);
  const pendingQuotes = quotes.filter((q) => !sentOf(q.id)).length;
  /* Références : ses propres annonces d'aliments, d'intrants et de matériel (en démo, celles de la maquette). */
  const stockItems = s.listings().filter((l) => (demo || l.mine) && (l.category.includes('Aliments') || l.category === 'Matériel'));

  const sendQuote = (id: string, fallback: number, client: string, isNet = false) => {
    const val = Number((offers[id] ?? '').replace(/\D/g, '')) || fallback;
    if (!val) { showToast('Indiquez votre prix avant de répondre.'); return; }
    if (isNet) s.offerQuote(id, val, 'à convenir avec le client', org);
    else s.put('fourn.sent', { ...sent, [id]: val });
    showToast(`Offre de ${fcfa(val)} FCFA envoyée à ${client}.`);
  };
  const bill = (q: NetQuote, price: number) => {
    const amount = Number((amounts[q.id] ?? '').replace(/\D/g, '')) || price * (q.qtyNum ?? 1);
    const inv = s.issueInvoice({ quoteId: q.id, label: `${q.product}, ${q.qty}`, amount, client: q.from, org });
    showToast(`Facture ${inv.ref} de ${fcfa(amount)} FCFA envoyée à ${q.from.org || q.from.name}.`);
  };

  return (
    <div className="app">
      <DashHeader label="Fournisseur / entreprise B2B" name={s.shop().created ? s.shop().name : s.session().name || 'Espace fournisseur'} action={<Link className="link" to="/boutique" style={{ paddingRight: 12 }}>Boutique</Link>} />
      <div className="utabs" role="tablist">
        <button role="tab" aria-selected={tab === 'quotes'} className={tab === 'quotes' ? 'on' : ''} onClick={() => setTab('quotes')}>Devis ({pendingQuotes})</button>
        <button role="tab" aria-selected={tab === 'catalog'} className={tab === 'catalog' ? 'on' : ''} onClick={() => setTab('catalog')}>Catalogue gros</button>
        <button role="tab" aria-selected={tab === 'invoices'} className={tab === 'invoices' ? 'on' : ''} onClick={() => setTab('invoices')}>Factures</button>
      </div>
      <div className="body">
        {pendingQuotes ? (
          <TodayCard eyebrow="Aujourd’hui" title={`${pendingQuotes} demande${pendingQuotes > 1 ? 's' : ''} de devis à traiter`} text={`${quotes.find((q) => !sentOf(q.id))?.client ?? ''} attend votre tarif.`}>
            <button className="btn btn-p" onClick={() => setTab('quotes')}>Répondre</button>
          </TodayCard>
        ) : stockItems.length ? (
          <TodayCard eyebrow="Aujourd’hui" title="Aucune demande de devis en attente" text={`Vos ${stockItems.length} référence${stockItems.length > 1 ? 's sont visibles' : ' est visible'} par les restaurants, éleveurs et coopératives.`}>
            <Link className="btn btn-p" to="/vendre">Ajouter une référence</Link>
          </TodayCard>
        ) : (
          <TodayCard eyebrow="Pour commencer" title="Publiez vos premières références" text="Aliments, intrants, matériel : les acheteurs pros vous envoient leurs demandes de devis.">
            <Link className="btn btn-p" to="/vendre">Publier un produit</Link>
          </TodayCard>
        )}
        <div className="card grid3" style={{ gap: 0 }}>
          <div className="stat" style={{ padding: 12, borderRight: '1px solid #E3E7E4' }}><span className="v">{pendingQuotes}</span><span className="l">Devis ouverts</span></div>
          <div className="stat" style={{ padding: 12, borderRight: '1px solid #E3E7E4' }}><span className="v">{stockItems.length}</span><span className="l">Références</span></div>
          <div className="stat" style={{ padding: 12 }}><span className="v">{demo ? '1,8 M' : fcfa(cashed)}</span><span className="l">FCFA encaissés ce mois</span></div>
        </div>

        {tab === 'quotes' && !quotes.length && (
          <EmptyState title="Aucune demande de devis" text="Les restaurants, éleveurs et coopératives vous envoient leurs demandes ici. Publiez vos produits pour être trouvé.">
            <Link className="btn btn-p btn-sm" style={{ alignSelf: 'flex-start', marginTop: 4 }} to="/vendre">Publier un produit</Link>
          </EmptyState>
        )}
        {tab === 'quotes' && !!quotes.length && (
          <div className="col" style={{ gap: 10 }}>
            {quotes.map((q) => {
              const sentPrice = sentOf(q.id);
              const kept = q.net && keptMine(q.net);
              const inv = kept ? invoiceOf(q.id) : undefined;
              const per = q.net ? q.net.per ?? 'le kg' : 'l’unité';
              return (
                <div key={q.id} className="card pad col" style={{ gap: 10 }}>
                  <div className="row" style={{ gap: 12 }}>
                    <Photo w={54} h={54} radius={8} src={q.photo} />
                    <div className="col grow" style={{ gap: 2 }}>
                      <div className="row between" style={{ gap: 6 }}>
                        <span className="b small ell">{q.client}</span>
                        {kept ? <Badge tone="green">Offre retenue</Badge> : sentPrice ? <Badge tone="blue">Offre envoyée</Badge> : <Badge tone="blue">Nouveau devis</Badge>}
                      </div>
                      <span className="xs muted">{q.item}</span>
                      <span className="xs muted">{q.qty} · {q.place}</span>
                      {q.net?.details && <span className="xs muted">{q.net.details}</span>}
                    </div>
                  </div>
                  {kept && q.net && sentPrice ? (
                    <div className="col" style={{ gap: 8 }}>
                      <div className="notice n-info"><Icon name="check" size="sm" /><span><b>{q.client} a retenu votre offre</b> à {fcfa(sentPrice)} FCFA {per}. Contact : {q.net.from.name}, <span className="num">+225 {q.net.from.phone}</span>.</span></div>
                      {inv ? (
                        <span className="xs">Facture <b className="num">{inv.ref}</b> de {fcfa(inv.amount)} FCFA, {inv.status === 'paid' ? `payée le ${inv.paidAt}` : `en attente de paiement (échéance ${inv.due})`}.</span>
                      ) : (
                        <div className="row" style={{ gap: 8 }}>
                          <input className="input num grow" inputMode="numeric" aria-label="Montant de la facture en FCFA" placeholder={`Montant, ex. ${fcfa(sentPrice * (q.net.qtyNum ?? 1))}`} value={amounts[q.id] ?? ''} onChange={(e) => setAmounts({ ...amounts, [q.id]: e.target.value })} />
                          <button className="btn btn-p btn-sm" onClick={() => q.net && bill(q.net, sentPrice)}>Émettre la facture</button>
                        </div>
                      )}
                    </div>
                  ) : sentPrice ? (
                    <div className="notice n-info">
                      <Icon name="check" size="sm" />
                      <span>Votre tarif proposé : <b>{fcfa(sentPrice)} FCFA</b> {per}. En attente de la réponse du client.</span>
                    </div>
                  ) : (
                    <div className="row" style={{ gap: 8 }}>
                      <input
                        className="input num grow"
                        inputMode="numeric"
                        aria-label={`Votre prix ${per}, en FCFA`}
                        placeholder={q.suggested ? `Tarif unitaire (ex. ${fcfa(q.suggested)})` : `Votre prix ${per}, en FCFA`}
                        value={offers[q.id] ?? ''}
                        onChange={(e) => setOffers({ ...offers, [q.id]: e.target.value })}
                      />
                      <button className="btn btn-p btn-sm" onClick={() => sendQuote(q.id, q.suggested, q.client, !!q.net)}>Répondre</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'quotes' && recurring.length > 0 && (
          <div className="sec">
            <div className="sech"><h2>Livraisons récurrentes</h2><Badge tone="blue">{recurring.filter((r) => r.status === 'active').length}</Badge></div>
            <div className="card list">
              {recurring.map((r) => (
                <div className="li" key={r.id} style={{ alignItems: 'flex-start' }}>
                  <div className="col grow" style={{ gap: 2, minWidth: 0 }}>
                    <span className="small b">{r.client.org || r.client.name} : {r.label}</span>
                    <span className="xs muted">{fcfa(r.qtyNum)} × {fcfa(r.price)} FCFA, {FREQ[r.freq].toLowerCase()}, le {DAYS[r.day - 1]}</span>
                    <span className="xs muted">{r.status === 'paused' ? 'Suspendue par le client' : `Prochaine livraison le ${frDate(r.next)}`}{r.deliveries ? `, ${r.deliveries} déjà livrée${r.deliveries > 1 ? 's' : ''}` : ''}</span>
                  </div>
                  {r.status === 'paused' ? <Badge tone="amber">Suspendue</Badge> : (
                    <button className="btn btn-p btn-sm" style={{ flex: 'none' }} onClick={() => { s.deliverRecurring(r.id, org); showToast(`Livraison du ${frDate(r.next)} faite : facture de ${fcfa(r.price * r.qtyNum)} FCFA envoyée.`); }}>Livrer et facturer</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'catalog' && !stockItems.length && (
          <EmptyState title="Aucune référence" text="Vos annonces d’aliments, d’intrants et de matériel forment votre catalogue de gros.">
            <Link className="btn btn-p btn-sm" style={{ alignSelf: 'flex-start', marginTop: 4 }} to="/vendre">Publier un produit</Link>
          </EmptyState>
        )}
        {tab === 'catalog' && !!stockItems.length && (
          <div className="card list">
            {stockItems.map((l) => (
              <Link key={l.id} className="li" to={`/annonce/${l.id}`}>
                <Photo w={52} h={52} radius={6} src={l.photos?.[0]} />
                <div className="col grow" style={{ gap: 2 }}>
                  <span className="small b ell">{l.title}</span>
                  <span className="xs muted num">{fcfa(l.price)} FCFA {l.unit ?? ''} · stock {l.stock ?? 1}</span>
                </div>
                <Icon name="chevron" size="sm" />
              </Link>
            ))}
          </div>
        )}

        {tab === 'invoices' && !invoices.length && (
          <EmptyState title="Aucune facture" text="Les factures de vos ventes B2B apparaîtront ici, avec leur statut de paiement." />
        )}
        {tab === 'invoices' && !!invoices.length && (
          <div className="sec">
            <div className="sech">
              <h2>Factures B2B</h2>
              <button
                className="link plain"
                onClick={() => downloadCSV('factures-fournisseur-savaa.csv', [['Facture', 'Client', 'Montant (FCFA)', 'Statut'], ...invoices.map(([n, c, m, st]) => [n, c, m, st])])}
              >
                Exporter CSV
              </button>
            </div>
            <div className="card list">
              {invoices.map(([n, c, m, st, tone]) => (
                <div className="li" key={n}>
                  <div className="col grow"><span className="small b num">{n}</span><span className="xs muted">{c}, {fcfa(m)} FCFA</span></div>
                  <Badge tone={tone}>{st}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <TabBar />
    </div>
  );
}
