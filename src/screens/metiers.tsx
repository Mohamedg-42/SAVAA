import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fcfa, today, useStore, type NetAlert, type NetMission, type NetValidation } from '../data';
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

export function VetSpace() {
  const s = useStore();
  const [tab, setTab] = useState<'alerts' | 'validations' | 'visits'>('alerts');
  const handled = s.get<Record<string, string>>('vet.handled', {});
  const validated = s.get<Record<string, boolean>>('vet.validated', {});
  const confirmed = s.get<Record<string, boolean>>('vet.confirmed', {});
  const unread = s.unread();
  const visits = s.session().demo ? VET_VISITS : [];

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
        <button role="tab" aria-selected={tab === 'visits'} className={tab === 'visits' ? 'on' : ''} onClick={() => setTab('visits')}>Visites ({visits.length})</button>
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
          <div className="stat" style={{ padding: 12 }}><span className="v">{visits.length}</span><span className="l">Visites prévues</span></div>
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

        {tab === 'visits' && !visits.length && (
          <EmptyState title="Aucune visite prévue" text="Vos visites d’exploitation apparaîtront ici quand un éleveur vous en demandera une ou quand vous en planifierez." />
        )}
        {tab === 'visits' && !!visits.length && (
          <div className="card list">
            {visits.map((v) => {
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

/** Mission venue d'une vraie commande (réseau de l'appareil) : étapes et code de remise de l'acheteur. */
function NetMissionCard({ m }: { m: NetMission }) {
  const s = useStore();
  const [code, setCode] = useState('');
  const [label, tone] = MISSION_STEP[m.status];
  const deliver = () => {
    if (code !== m.code) { showToast('Code incorrect. Demandez à l’acheteur le code à 4 chiffres de sa commande.'); return; }
    s.moveMission(m.id, 'delivered');
    s.notify({ c: 'cmd', title: 'Livraison confirmée', text: `${m.orderRef} remise avec le code de l’acheteur. Rémunération de ${fcfa(m.fee)} FCFA validée.`, to: '/missions' });
    showToast('Remise horodatée et confirmée.');
  };
  return (
    <div className="card pad col" style={{ gap: 10 }}>
      <div className="row between" style={{ gap: 8 }}><span className="b small num">{m.orderRef}</span><Badge tone={tone}>{label}</Badge></div>
      <div className="row" style={{ gap: 10 }}>
        {m.photo && <Photo w={56} h={44} radius={6} src={m.photo} />}
        <div className="col grow" style={{ gap: 2, minWidth: 0 }}><span className="small b">{m.title}</span><span className="xs muted">Rémunération {fcfa(m.fee)} FCFA</span></div>
      </div>
      <dl className="kv">
        <dt>Enlèvement</dt><dd>{m.pickup}</dd>
        <dt>Livraison</dt><dd>{m.dropoff}</dd>
        <dt>Destinataire</dt><dd>{m.buyer.name}, <span className="num">+225 {m.buyer.phone}</span></dd>
      </dl>
      {m.status === 'delivered' ? (
        <div className="notice n-info"><Icon name="check" size="sm" /><span>Livrée le {m.deliveredAt}. Rémunération de {fcfa(m.fee)} FCFA validée.</span></div>
      ) : (
        <>
          <div className="seg">
            <button className={m.status === 'picked' ? 'on' : ''} onClick={() => { s.moveMission(m.id, 'picked'); showToast('Statut : prise en charge'); }}>Pris en charge</button>
            <button className={m.status === 'route' ? 'on' : ''} onClick={() => { s.moveMission(m.id, 'route'); showToast('Statut : en route'); }}>En route</button>
          </div>
          <div className="field">
            <label htmlFor={`code-${m.id}`}>Code de remise de l’acheteur</label>
            <div className="row" style={{ gap: 8 }}>
              <input id={`code-${m.id}`} className="input num grow" inputMode="numeric" maxLength={4} placeholder="4 chiffres" value={code} onChange={(e) => setCode(e.target.value.replace(/D/g, '').slice(0, 4))} />
              <button className="btn btn-p" disabled={code.length < 4} onClick={deliver}>Confirmer la remise</button>
            </div>
            <span className="hint">L’acheteur trouve ce code dans le suivi de sa commande. Le paiement du vendeur est libéré à la remise.</span>
          </div>
        </>
      )}
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

  /* Missions créées par les vraies commandes livrées (réseau de l'appareil). */
  const myPhone = s.session().phone;
  const netOpen = s.net().missions.filter((m) => m.status === 'open' && m.buyer.phone !== myPhone);
  const mine = s.net().missions.filter((m) => m.status !== 'open' && m.courier?.phone === myPhone);
  const myActive = mine.filter((m) => m.status !== 'delivered');
  const myDone = mine.filter((m) => m.status === 'delivered');
  const availableCount = MISSION_OFFERS.filter((m) => !accepted[m.id]).length + netOpen.length;
  /* Compte neuf : les missions en cours sont celles qu'il a acceptées ; ni historique ni gains tant qu'il n'a rien livré. */
  const acceptedOffers = MISSION_OFFERS.filter((m) => accepted[m.id]);
  const activeCount = (demo ? (step === 'delivered' ? 0 : 1) : acceptedOffers.length) + myActive.length;
  const deliveredCount = (demo ? MISSION_HISTORY.length + (step === 'delivered' ? 1 : 0) : 0) + myDone.length;
  const earned = (demo ? 40000 + (step === 'delivered' ? 25000 : 0) : 0) + myDone.reduce((t, m) => t + m.fee, 0);

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
        {myActive[0] ? (
          <TodayCard eyebrow="Mission en cours" title={myActive[0].title} text={`${myActive[0].pickup} → ${myActive[0].dropoff}. À la remise, demandez le code à 4 chiffres à ${myActive[0].buyer.name}.`}>
            <button className="btn btn-p" onClick={() => setTab('active')}>Voir la mission</button>
          </TodayCard>
        ) : demo && step !== 'delivered' ? (
          <TodayCard eyebrow="Mission en cours" title="Taurillon FK-0142 et 4 sacs d’aliment" text="Livrer à Fatou Ouattara, route de Dikodougou. À la remise, demandez le code à 4 chiffres à l’acheteur.">
            <button className="btn btn-p" onClick={() => setTab('active')}>Voir la mission</button>
          </TodayCard>
        ) : !demo && acceptedOffers[0] ? (
          <TodayCard eyebrow="Mission acceptée" title={acceptedOffers[0].title} text={`${acceptedOffers[0].route}, ${acceptedOffers[0].when}. Le vendeur vous confirme l’heure d’enlèvement.`}>
            <button className="btn btn-p" onClick={() => setTab('active')}>Voir la mission</button>
          </TodayCard>
        ) : (
          <TodayCard eyebrow="Aujourd’hui" title="Aucune mission en cours" text={`${availableCount} mission${availableCount > 1 ? 's' : ''} disponible${availableCount > 1 ? 's' : ''} près de vous.`}>
            <button className="btn btn-p" onClick={() => setTab('offers')}>Voir les missions</button>
          </TodayCard>
        )}
        <div className="card grid3" style={{ gap: 0 }}>
          <div className="stat" style={{ padding: 12, borderRight: '1px solid #E3E7E4' }}><span className="v">{activeCount}</span><span className="l">En cours</span></div>
          <div className="stat" style={{ padding: 12, borderRight: '1px solid #E3E7E4' }}><span className="v">{availableCount}</span><span className="l">Offres dispo</span></div>
          <div className="stat" style={{ padding: 12 }}><span className="v">{fcfa(earned)}</span><span className="l">FCFA (7 j)</span></div>
        </div>

        {tab === 'active' && myActive.map((m) => <NetMissionCard key={m.id} m={m} />)}
        {tab === 'active' && !demo && !myActive.length && (
          acceptedOffers.length ? (
            <div className="col" style={{ gap: 10 }}>
              {acceptedOffers.map((m) => (
                <div key={m.id} className="card pad col" style={{ gap: 8 }}>
                  <div className="row between" style={{ gap: 8 }}>
                    <span className="b small ell">{m.title}</span>
                    <Badge tone="blue">Acceptée</Badge>
                  </div>
                  <span className="xs muted">{m.route}</span>
                  <span className="xs muted">{m.vehicle}, {m.when}</span>
                  <span className="price">{fcfa(m.fee)} FCFA</span>
                  <span className="hint">Le vendeur vous confirmera l’heure d’enlèvement. À la livraison, l’acheteur vous donnera son code de remise.</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Aucune mission en cours" text="Acceptez une mission dans l’onglet Disponibles : elle apparaîtra ici jusqu’à la livraison.">
              <button className="btn btn-s btn-sm" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={() => setTab('offers')}>Voir les missions disponibles</button>
            </EmptyState>
          )
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
                    <input
                      id="remise-code"
                      className="input num grow"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="Ex. 4827"
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    />
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
            {netOpen.map((m) => (
              <div key={m.id} className="card pad col" style={{ gap: 10 }}>
                <div className="row" style={{ gap: 12 }}>
                  <Photo w={56} h={56} radius={8} src={m.photo ?? 'images/aliment-betail.jpg'} />
                  <div className="col grow" style={{ gap: 2, minWidth: 0 }}>
                    <span className="b small">{m.title}</span>
                    <span className="xs muted">{m.pickup} → {m.dropoff}</span>
                    <span className="xs muted">Commande {m.orderRef}, payée le {m.date}</span>
                  </div>
                </div>
                <div className="row between">
                  <span className="price">{fcfa(m.fee)} FCFA</span>
                  <button className="btn btn-p btn-sm" onClick={() => { s.moveMission(m.id, 'accepted'); showToast(`Mission ${m.orderRef} acceptée. L’acheteur est prévenu.`); setTab('active'); }}>Accepter la mission</button>
                </div>
              </div>
            ))}
            {MISSION_OFFERS.map((m) => {
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
                    {ok ? (
                      <Badge tone="green">Mission acceptée</Badge>
                    ) : (
                      <button
                        className="btn btn-p btn-sm"
                        onClick={() => {
                          s.put('courier.accepted', { ...accepted, [m.id]: true });
                          showToast(`Mission ${m.id} acceptée.`);
                        }}
                      >
                        Accepter la mission
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'history' && myDone.map((m) => (
          <div className="card list" key={m.id}><div className="li">{m.photo && <Photo w={48} h={48} radius={6} src={m.photo} />}<div className="col grow"><span className="small b">{m.title}</span><span className="xs muted">{m.pickup} → {m.dropoff}, {m.deliveredAt}</span></div><span className="small b num" style={{ color: '#145C3A' }}>+{fcfa(m.fee)}</span></div></div>
        ))}
        {tab === 'history' && !demo && !myDone.length && (
          <EmptyState title="Aucune livraison pour l’instant" text="Vos livraisons terminées et leur rémunération apparaîtront ici." />
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

export function AgriSpace() {
  const s = useStore();
  const [tab, setTab] = useState<'lots' | 'add' | 'cal'>('lots');
  const demo = !!s.session().demo;
  const extraLots = s.get<HarvestLot[]>('agri.lots', []);
  const lots = [...extraLots, ...(demo ? INITIAL_LOTS : [])];
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
      </div>
      <div className="body">
        {demo ? (
          <TodayCard eyebrow="Prochaine collecte" title="Maïs jaune, le 24/11" text="Magasin de Dikodougou, environ 120 sacs. Prévenez vos acheteurs et réservez le séchage.">
            <button className="btn btn-p" onClick={() => setTab('cal')}>Voir le calendrier</button>
          </TodayCard>
        ) : lots[0] ? (
          <TodayCard eyebrow="Aujourd’hui" title={`Mettez en vente : ${lots[0].crop}`} text={`${lots[0].qty}. La fiche de traçabilité se remplit en 4 étapes.`}>
            <Link className="btn btn-p" to="/vendre">Mettre en vente</Link>
          </TodayCard>
        ) : (
          <TodayCard eyebrow="Pour commencer" title="Déclarez votre première récolte" text="Culture, quantité et prix indicatif : vous suivez vos disponibilités et les mettez en vente quand vous voulez.">
            <button className="btn btn-p" onClick={() => setTab('add')}>Déclarer un lot</button>
          </TodayCard>
        )}
        <div className="card grid3" style={{ gap: 0 }}>
          <div className="stat" style={{ padding: 12, borderRight: '1px solid #E3E7E4' }}><span className="v">{lots.length}</span><span className="l">Lots actifs</span></div>
          <div className="stat" style={{ padding: 12, borderRight: '1px solid #E3E7E4' }}><span className="v">{demo ? '33 t' : '—'}</span><span className="l">Volume estimé</span></div>
          <div className="stat" style={{ padding: 12 }}><span className="v">{demo ? 4 : 0}</span><span className="l">Acheteurs pros</span></div>
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

        {tab === 'cal' && !demo && (
          <EmptyState title="Calendrier vide" text="Vos dates de récolte et de collecte apparaîtront ici." />
        )}
        {tab === 'cal' && demo && (
          <div className="card list">
            {[
              ['24', 'nov.', 'Collecte coopérative maïs jaune', 'Magasin Dikodougou · 120 sacs', 'images/mais-jaune.jpg'],
              ['02', 'déc.', 'Récolte parcelle igname Kponan', 'Secteur Nord · ~3 tonnes', 'images/igname-kponan.jpg'],
              ['15', 'déc.', 'Contrôle KOR anacarde brute', 'Union du Poro, Sinématiali', 'images/noix-cajou.jpg'],
            ].map(([d, m, t, sub, img]) => (
              <div className="li" key={t}>
                <span className="col" style={{ width: 38, alignItems: 'center', gap: 0 }}><span className="b num" style={{ fontSize: 17 }}>{d}</span><span className="xs muted">{m}</span></span>
                <Photo w={44} h={44} radius={6} src={img} />
                <div className="col grow"><span className="small b ell">{t}</span><span className="xs muted ell">{sub}</span></div>
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
  const received = s.net().quotes.filter((q) => q.status === 'open' && q.from.phone !== myPhone);
  const netSent: Record<string, number> = Object.fromEntries(received.flatMap((q) => q.offers.filter((o) => o.supplier.phone === myPhone).map((o) => [q.id, o.price])));
  const quotes = [
    ...received.map((q) => ({ id: q.id, client: q.from.org || q.from.name, item: q.product, qty: q.qty, place: q.place, suggested: 0, photo: 'images/aliment-betail.jpg', net: true })),
    ...(demo ? SUPPLIER_QUOTES.map((q) => ({ ...q, net: false })) : []),
  ];
  const sentOf = (id: string): number | undefined => netSent[id] ?? sent[id];
  const invoices = demo ? SUPPLIER_INVOICES : [];
  const pendingQuotes = quotes.filter((q) => !sentOf(q.id)).length;
  /* Références : ses propres annonces d'aliments, d'intrants et de matériel (en démo, celles de la maquette). */
  const stockItems = s.listings().filter((l) => (demo || l.mine) && (l.category.includes('Aliments') || l.category === 'Matériel'));

  const sendQuote = (id: string, fallback: number, client: string, net = false) => {
    const val = Number((offers[id] ?? '').replace(/\D/g, '')) || fallback;
    if (!val) { showToast('Indiquez votre prix avant de répondre.'); return; }
    if (net) s.offerQuote(id, val, 'à convenir avec le client', s.shop().created ? s.shop().name : undefined);
    else s.put('fourn.sent', { ...sent, [id]: val });
    showToast(`Offre de ${fcfa(val)} FCFA envoyée à ${client}.`);
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
          <div className="stat" style={{ padding: 12 }}><span className="v">{demo ? '1,8 M' : 0}</span><span className="l">FCFA (nov.)</span></div>
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
              return (
                <div key={q.id} className="card pad col" style={{ gap: 10 }}>
                  <div className="row" style={{ gap: 12 }}>
                    <Photo w={54} h={54} radius={8} src={q.photo} />
                    <div className="col grow" style={{ gap: 2 }}>
                      <div className="row between" style={{ gap: 6 }}>
                        <span className="b small ell">{q.client}</span>
                        {sentPrice ? <Badge tone="green">Offre envoyée</Badge> : <Badge tone="blue">Nouveau devis</Badge>}
                      </div>
                      <span className="xs muted">{q.item}</span>
                      <span className="xs muted">{q.qty} · {q.place}</span>
                    </div>
                  </div>
                  {sentPrice ? (
                    <div className="notice n-info">
                      <Icon name="check" size="sm" />
                      <span>Votre tarif proposé : <b>{fcfa(sentPrice)} FCFA</b> {q.net ? '/ kg' : '/ unité'}. En attente de confirmation client.</span>
                    </div>
                  ) : (
                    <div className="row" style={{ gap: 8 }}>
                      <input
                        className="input num grow"
                        inputMode="numeric"
                        placeholder={q.suggested ? `Tarif unitaire (ex. ${fcfa(q.suggested)})` : 'Votre prix au kg, en FCFA'}
                        value={offers[q.id] ?? ''}
                        onChange={(e) => setOffers({ ...offers, [q.id]: e.target.value })}
                      />
                      <button className="btn btn-p btn-sm" onClick={() => sendQuote(q.id, q.suggested, q.client, q.net)}>Répondre</button>
                    </div>
                  )}
                </div>
              );
            })}
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
