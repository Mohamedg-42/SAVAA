import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fcfa, today, useStore } from '../data';
import { DashHeader, Kpis, ProjectPhoto, TodayCard } from '../dash';
import {
  EMPTY_DOSSIER, STATUS, completion, display, newDossierRef, stepErrors, stepsFor, visible,
  type Data, type Dossier, type IField, type InvestorType, type Val,
} from '../invest';
import { KEYS, LOCAL_ID, PROPOSAL_STATUS, SEED_PROJECTS, type Project, type Proposal, type ProposalStatus } from '../invest-admin';
import { ReliefIcon } from '../relief';
import type { ReliefName } from '../relief-icons';
import { clearToast, showToast } from '../toast';
import { Badge, Check, Foot, Header, Icon, NotFound, Photo, PhotoAdd, TabBar } from '../ui';

/* Espace investisseur : tableau de bord, dossier en plusieurs étapes, propositions de projets. */

const KEY = 'invest.dossier';
const useDossier = () => {
  const s = useStore();
  const dossier = s.get<Dossier>(KEY, EMPTY_DOSSIER);
  const save = (patch: Partial<Dossier>) => s.put(KEY, { ...s.get<Dossier>(KEY, EMPTY_DOSSIER), ...patch });
  return { dossier, save };
};
const editable = (d: Dossier) => d.status === 'brouillon' || d.status === 'complement';

const NOTICE = 'Démonstration : le dossier est gardé sur cet appareil. SAVAA ne fait pas d’offre d’investissement ; une proposition de projet n’est jamais un engagement financier.';

/* ------------------------------------------------------------------ */
/* Tableau de bord investisseur (/investir)                           */
/* ------------------------------------------------------------------ */

export function InvestHome() {
  const s = useStore();
  const { dossier } = useDossier();
  const name = s.session().name;
  const first = name.split(/\s+/)[0] || name;
  const pct = completion(dossier);
  const st = STATUS[dossier.status];
  const proposals = s.get<Proposal[]>(KEYS.proposals, []).filter((p) => p.dossierId === LOCAL_ID && p.status !== 'declinee');
  const unread = s.unread();

  /* Frise du suivi : étapes franchies d'après l'historique. */
  const reached = new Set(dossier.history.map((h) => h.status));
  const steps: [string, boolean, boolean][] = [
    ['Inscription effectuée', true, false],
    ['Dossier en cours de constitution', !!dossier.type, dossier.status === 'brouillon' && !!dossier.type],
    ['Dossier soumis', reached.has('soumis'), dossier.status === 'soumis' || dossier.status === 'attente'],
    ['En cours d’analyse', reached.has('analyse'), dossier.status === 'analyse'],
    ...(reached.has('complement') ? [['Informations complémentaires demandées', true, dossier.status === 'complement'] as [string, boolean, boolean]] : []),
    [dossier.status === 'refuse' ? 'Dossier refusé' : 'Dossier validé', dossier.status === 'valide' || dossier.status === 'refuse', false],
  ];

  return (
    <div className="app">
      <DashHeader
        label="Espace investisseur"
        name={`Bonjour, ${first}`}
        action={<Link className="iconbtn" to="/notifications" aria-label={`Notifications, ${unread} non lue${unread > 1 ? 's' : ''}`}><Icon name="bell" />{unread > 0 && <span className="dot">{unread}</span>}</Link>}
      />
      <div className="body">
        {!dossier.type ? (
          <TodayCard eyebrow="Pour commencer" title="Constituez votre dossier d’investissement" text="Particulier ou entreprise : quelques étapes pour décrire votre capacité, vos objectifs et les filières qui vous intéressent. Le dossier s’enregistre à chaque réponse.">
            <Link className="btn btn-p" to="/investir/dossier">Commencer</Link>
          </TodayCard>
        ) : dossier.status === 'brouillon' ? (
          <TodayCard eyebrow="À terminer" title={`Votre dossier est complété à ${pct} %`} text="Reprenez là où vous vous êtes arrêté. Rien n’est perdu.">
            <Link className="btn btn-p" to="/investir/dossier">Reprendre mon dossier</Link>
          </TodayCard>
        ) : dossier.status === 'complement' ? (
          <TodayCard alert eyebrow="Action demandée" title="Informations complémentaires requises" text={dossier.history[dossier.history.length - 1]?.note ?? 'L’équipe SAVAA vous demande de compléter votre dossier.'}>
            <Link className="btn btn-p" to="/investir/dossier">Compléter le dossier</Link>
          </TodayCard>
        ) : dossier.status === 'refuse' ? (
          <TodayCard alert eyebrow="Dossier refusé" title="Votre dossier n’a pas été retenu" text={dossier.history[dossier.history.length - 1]?.note ?? 'Contactez l’assistance pour en savoir plus.'}>
            <Link className="btn btn-s" to="/assistance">Contacter l’assistance</Link>
          </TodayCard>
        ) : dossier.status === 'valide' ? (
          <TodayCard eyebrow="Dossier validé" title={proposals.length ? `${proposals.length} projet${proposals.length > 1 ? 's' : ''} vous ${proposals.length > 1 ? 'sont proposés' : 'est proposé'}` : 'L’équipe prépare vos propositions'} text="Les projets sont choisis par l’équipe SAVAA selon votre budget, vos filières et vos régions.">
            <Link className="btn btn-p" to="/investir/propositions">Voir mes propositions</Link>
          </TodayCard>
        ) : (
          <TodayCard eyebrow="Dossier soumis" title={`Référence ${dossier.ref ?? '—'}`} text="L’équipe SAVAA examine votre dossier. Vous serez prévenu à chaque étape." />
        )}

        <Kpis items={[
          { label: 'Statut du dossier', value: <Badge tone={st.tone}>{st.label}</Badge> },
          { label: 'Profil complété', value: `${pct} %` },
          { label: 'Référence', value: <span style={{ fontSize: 15, whiteSpace: 'nowrap' }}>{dossier.ref ?? '—'}</span> },
          { label: 'Soumis le', value: dossier.submittedAt ?? '—' },
        ]} />

        <div className="sec">
          <div className="sech"><h2>Suivi du dossier</h2></div>
          <div className="card pad">
            <div className="tl">
              {steps.map(([label, done, current]) => (
                <div className="tli" key={label}>
                  <span className={current ? 'tld a' : done ? 'tld f' : 'tld o'}></span>
                  <div className="col" style={{ gap: 2 }}>
                    <span className="small" style={{ fontWeight: done || current ? 600 : 400, color: done || current ? undefined : '#5D6862' }}>{label}</span>
                    {current && <span className="xs muted">Étape en cours</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sec">
          <div className="sech"><h2>Mon espace</h2></div>
          <div className="card list">
            {([
              ['Mon dossier d’investissement', dossier.type ? (dossier.type === 'entreprise' ? 'Personne morale' : 'Personne physique') : 'À constituer', '/investir/dossier', 'fiche'],
              ['Mes propositions de projets', proposals.length ? `${proposals.length} reçue${proposals.length > 1 ? 's' : ''}` : 'Après validation du dossier', '/investir/propositions', 'mobile-money'],
              ['Assistance', 'Une question sur votre dossier', '/assistance', 'messages'],
              ['Mon compte et paramètres', 'Profil, photo, préférences', '/compte', 'certifie'],
            ] as [string, string, string, ReliefName][]).map(([t, d, to, ic]) => (
              <Link key={t} className="li" to={to}>
                <ReliefIcon name={ic} size={28} shadow={false} />
                <div className="col grow" style={{ minWidth: 0 }}><span className="small b">{t}</span><span className="xs muted ell">{d}</span></div>
                <Icon name="chevron" size="sm" />
              </Link>
            ))}
          </div>
        </div>
        <p className="hint">{NOTICE}</p>
      </div>
      <TabBar />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dossier en plusieurs étapes (/investir/dossier)                    */
/* ------------------------------------------------------------------ */

/** Regroupe deux champs courts consécutifs sur une même ligne. */
function pairFields(fields: IField[]): IField[][] {
  const out: IField[][] = [];
  for (let i = 0; i < fields.length; i++) {
    if (fields[i].half && fields[i + 1]?.half) { out.push([fields[i], fields[i + 1]]); i++; }
    else out.push([fields[i]]);
  }
  return out;
}

/** Liste déroulante à choix multiples : repliée, elle affiche le résumé du choix ; ouverte, des cases à cocher. */
function MultiSelect({ f, list, error, onChange }: { f: IField; list: string[]; error?: ReactNode; onChange: (v: Val) => void }) {
  const [open, setOpen] = useState(false);
  const summary = list.length === 0 ? 'Choisir…' : list.length === 1 ? list[0] : list.length === 2 ? list.join(', ') : `${list.length} sélectionnées : ${list[0]}, ${list[1]}…`;
  return (
    <div className="field">
      <span className="lbl" id={`lbl-${f.key}`}>{f.label}</span>
      <button className="input row between" aria-expanded={open} aria-labelledby={`lbl-${f.key}`} onClick={() => setOpen(!open)} style={{ cursor: 'pointer', textAlign: 'left', font: 'inherit', color: list.length ? '#17201B' : '#5D6862', gap: 8 }}>
        <span className="ell" style={{ minWidth: 0 }}>{summary}</span>
        <Icon name="down" size="sm" style={{ flex: 'none', transform: open ? 'rotate(180deg)' : undefined }} />
      </button>
      {open && (
        <div className="card list" role="group" aria-label={f.label} style={{ maxHeight: 340, overflowY: 'auto' }}>
          {f.options?.map((o) => {
            const on = list.includes(o);
            return (
              <button key={o} className="li" role="checkbox" aria-checked={on} onClick={() => onChange(on ? list.filter((x) => x !== o) : [...list, o])} style={{ background: on ? '#E8F3EA' : '#fff' }}>
                <Check on={on} /><span className="small grow" style={{ textAlign: 'left' }}>{o}</span>
              </button>
            );
          })}
        </div>
      )}
      {error}
    </div>
  );
}

function FieldInput({ f, v, err, onChange }: { f: IField; v?: Val; err?: string; onChange: (v: Val) => void }) {
  const id = `inv-${f.key}`;
  const str = typeof v === 'string' ? v : '';
  const list = Array.isArray(v) ? v : [];
  const label = <label htmlFor={id}>{f.label}{!f.required && !f.label.includes('facultatif') && <span className="muted"> (facultatif)</span>}</label>;
  const error = err && <span className="xs" role="alert" style={{ color: '#A0221A' }}>{err}</span>;

  if (f.kind === 'chips') {
    return (
      <div className="field">
        <span className="lbl">{f.label}</span>
        <div className="wrap" style={{ gap: 8 }} role="group" aria-label={f.label}>
          {f.options?.map((o) => {
            const on = list.includes(o);
            return <button key={o} className={`chip${on ? ' on' : ''}`} aria-pressed={on} onClick={() => onChange(on ? list.filter((x) => x !== o) : [...list, o])}>{o}</button>;
          })}
        </div>
        {error}
      </div>
    );
  }
  if (f.kind === 'multi') return <MultiSelect f={f} list={list} error={error} onChange={onChange} />;
  if (f.kind === 'photo') {
    return (
      <div className="field">
        <span className="lbl">{f.label}</span>
        {str
          ? <Photo src={str} label={f.label} h={48} radius={8} onRemove={() => onChange('')} />
          : <PhotoAdd height={48} label="Ajouter" onAdd={(p) => onChange(p)} />}
        {error}
      </div>
    );
  }
  if (f.kind === 'yesno') {
    return (
      <div className="field">
        <span className="lbl">{f.label}</span>
        <div className="seg" role="radiogroup" aria-label={f.label}>
          {['Oui', 'Non'].map((o) => <button key={o} role="radio" aria-checked={str === o} className={str === o ? 'on' : ''} onClick={() => onChange(o)}>{o}</button>)}
        </div>
        {error}
      </div>
    );
  }
  return (
    <div className="field">
      {label}
      {f.kind === 'select' ? (
        <select id={id} className="input" value={str} onChange={(e) => onChange(e.target.value)} aria-invalid={!!err} style={{ color: str ? '#17201B' : '#5D6862' }}>
          <option value="" disabled>Choisir…</option>
          {f.options?.map((o) => <option key={o}>{o}</option>)}
        </select>
      ) : f.kind === 'textarea' ? (
        <textarea id={id} className="input" rows={3} value={str} maxLength={600} onChange={(e) => onChange(e.target.value)} style={{ height: 'auto', paddingTop: 10, resize: 'vertical' }} aria-invalid={!!err} />
      ) : f.kind === 'amount' ? (
        <label className="input num" style={{ gap: 6 }}>
          <input id={id} className="plain grow num" inputMode="numeric" value={str ? fcfa(Number(str)) : ''} onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 13))} style={{ outline: 'none', minWidth: 0 }} aria-invalid={!!err} />
          <span className="muted" style={{ flex: 'none' }}>FCFA</span>
        </label>
      ) : (
        <input id={id} className="input" type={f.kind === 'date' ? 'date' : f.kind === 'email' ? 'email' : f.kind === 'tel' ? 'tel' : 'text'} inputMode={f.kind === 'tel' ? 'tel' : undefined} placeholder={f.placeholder} value={str} maxLength={160} onChange={(e) => onChange(e.target.value)} aria-invalid={!!err} />
      )}
      {f.hint && <span className="hint">{f.hint}</span>}
      {error}
    </div>
  );
}

export function InvestDossier() {
  const s = useStore();
  const navigate = useNavigate();
  const { dossier, save } = useDossier();
  const [tried, setTried] = useState<Record<number, boolean>>({});
  const [consent, setConsent] = useState({ cgu: false, data: false });
  const steps = stepsFor(dossier.type);
  const recapIndex = steps.length;
  const canEdit = editable(dossier);
  /* Pendant l'examen, le dossier est verrouillé : seul le récapitulatif s'affiche. */
  const step = canEdit ? Math.min(dossier.step, recapIndex) : recapIndex;

  /* Choix du statut, obligatoire avant le formulaire. */
  if (!dossier.type) {
    const choose = (type: InvestorType) => save({
      type, step: 0, status: 'brouillon',
      data: { ...dossier.data, 'id.tel': s.session().phone, ...(type === 'particulier' ? { 'id.nom': s.session().name.split(/\s+/).slice(1).join(' '), 'id.prenoms': s.session().name.split(/\s+/)[0] ?? '' } : {}) },
      history: [...dossier.history, { date: `${today()}`, status: 'brouillon', by: s.session().name, note: 'Dossier commencé' }],
    });
    return (
      <div className="app">
        <Header back title="Mon dossier" />
        <div className="body" style={{ gap: 16 }}>
          <div className="col" style={{ gap: 6 }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.25 }}>Vous investissez en tant que…</h2>
            <p className="muted">Votre choix détermine les informations et les documents demandés.</p>
          </div>
          {([
            ['particulier', 'Investisseur particulier', 'Personne physique : vos informations personnelles et votre pièce d’identité.'],
            ['entreprise', 'Investisseur entreprise', 'Personne morale : identification de la société (RCCM, NCC), représentant légal, documents de l’entreprise.'],
          ] as const).map(([t, title, text]) => (
            <button key={t} className="card pad col" onClick={() => choose(t)} style={{ gap: 6, textAlign: 'left', font: 'inherit', color: 'inherit', cursor: 'pointer', alignItems: 'stretch' }}>
              <span className="row between"><span className="b">{title}</span><Icon name="chevron" size="sm" /></span>
              <span className="small muted" style={{ lineHeight: 1.45 }}>{text}</span>
            </button>
          ))}
          <p className="hint">{NOTICE}</p>
        </div>
      </div>
    );
  }

  const setVal = (key: string, v: Val) => save({ data: { ...dossier.data, [key]: v } });
  const setDoc = (key: string, v?: string) => {
    const docs = { ...dossier.docs };
    if (v) docs[key] = v;
    else delete docs[key];
    save({ docs });
  };
  const go = (n: number) => { clearToast(); save({ step: n }); };
  const current = steps[step];
  const errors = current && tried[step] ? stepErrors(current, dossier.data, dossier.docs) : {};

  const next = () => {
    const e = stepErrors(current, dossier.data, dossier.docs);
    if (Object.keys(e).length) {
      setTried({ ...tried, [step]: true });
      showToast('Complétez les champs signalés en rouge.');
      return;
    }
    go(step + 1);
  };

  const allErrors = steps.map((st) => stepErrors(st, dossier.data, dossier.docs));
  const firstIncomplete = allErrors.findIndex((e) => Object.keys(e).length > 0);

  const submit = () => {
    if (firstIncomplete >= 0) { setTried({ ...tried, [firstIncomplete]: true }); go(firstIncomplete); showToast('Il reste des informations obligatoires à compléter.'); return; }
    if (!consent.cgu || !consent.data) { showToast('Acceptez les conditions et le traitement de vos données pour soumettre.'); return; }
    const ref = dossier.ref ?? newDossierRef();
    const date = today();
    save({ status: 'soumis', ref, submittedAt: dossier.submittedAt ?? date, history: [...dossier.history, { date, status: 'soumis', by: s.session().name, note: dossier.status === 'complement' ? 'Dossier complété et soumis à nouveau' : 'Dossier soumis' }] });
    s.notify({ c: 'pro', title: 'Dossier d’investissement soumis', text: `Référence ${ref}. L’équipe SAVAA vous préviendra à chaque étape.`, to: '/investir' });
    navigate('/investir', { replace: true });
  };

  const header = (
    <header className="hdr">
      <button className="iconbtn" aria-label={step === 0 ? 'Fermer' : 'Étape précédente'} onClick={() => (step === 0 ? navigate('/investir') : go(step - 1))}><Icon name={step === 0 ? 'close' : 'back'} /></button>
      <h1>{step === recapIndex ? 'Récapitulatif' : 'Mon dossier'}</h1>
      <span className="small muted" style={{ paddingRight: 12, flex: 'none' }}>{Math.min(step + 1, recapIndex + 1)} / {recapIndex + 1}</span>
    </header>
  );
  const progress = (
    <div style={{ background: '#fff', padding: '0 16px 12px', borderBottom: '1px solid #E3E7E4', flex: 'none' }}>
      <div className="steps">{[...steps, null].map((_, i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>
      <span className="xs muted" style={{ display: 'block', marginTop: 8 }}>{current?.title ?? 'Vérifiez et soumettez'}{canEdit ? ', enregistré automatiquement' : ''}</span>
    </div>
  );

  if (step === recapIndex) {
    return (
      <div className="app">
        {header}
        {progress}
        <div className="body" style={{ gap: 14 }}>
          {!canEdit && <div className="notice"><Icon name="info" size="sm" /><span>Dossier {STATUS[dossier.status].label.toLowerCase()} : il ne peut plus être modifié pendant l’examen.</span></div>}
          <div className="card pad row between"><span className="small muted">Statut d’investisseur</span><span className="small b">{dossier.type === 'entreprise' ? 'Entreprise (personne morale)' : 'Particulier (personne physique)'}</span></div>
          {steps.map((st, i) => {
            const missing = Object.keys(allErrors[i]).length;
            return (
              <div key={st.title} className="card pad col" style={{ gap: 10 }}>
                <div className="row between" style={{ gap: 8 }}>
                  <span className="b small">{st.title}</span>
                  {missing ? <Badge tone="red">{missing} à compléter</Badge> : <Badge tone="green">Complet</Badge>}
                </div>
                {st.fields.length > 0 && (
                  <dl className="kv">
                    {st.fields.filter((f) => visible(f, dossier.data)).map((f) => <Fragment key={f.key}><dt>{f.label}</dt><dd>{display(f, dossier.data[f.key])}</dd></Fragment>)}
                  </dl>
                )}
                {st.docs && (
                  <div className="col" style={{ gap: 6 }}>
                    {st.docs.map((d) => <div key={d.key} className="row between small"><span>{d.label}</span>{dossier.docs[d.key] ? <Badge tone="green">Ajouté</Badge> : <Badge tone={d.required ? 'red' : 'grey'}>{d.required ? 'Manquant' : 'Non fourni'}</Badge>}</div>)}
                  </div>
                )}
                {canEdit && <button className="link plain" style={{ alignSelf: 'flex-start' }} onClick={() => go(i)}>Modifier</button>}
              </div>
            );
          })}
          {canEdit && (
            <div className="col" style={{ gap: 12 }}>
              <button className="row top" role="checkbox" aria-checked={consent.cgu} onClick={() => setConsent({ ...consent, cgu: !consent.cgu })} style={{ border: 0, background: 'none', padding: 0, textAlign: 'left', font: 'inherit', color: 'inherit', cursor: 'pointer', gap: 10 }}>
                <Check on={consent.cgu} /><span className="small" style={{ lineHeight: 1.45 }}>J’accepte les conditions d’utilisation et la politique de confidentialité, et je certifie l’exactitude des informations fournies.</span>
              </button>
              <button className="row top" role="checkbox" aria-checked={consent.data} onClick={() => setConsent({ ...consent, data: !consent.data })} style={{ border: 0, background: 'none', padding: 0, textAlign: 'left', font: 'inherit', color: 'inherit', cursor: 'pointer', gap: 10 }}>
                <Check on={consent.data} /><span className="small" style={{ lineHeight: 1.45 }}>J’accepte que SAVAA traite mes données personnelles et financières pour étudier mon dossier, conformément à la loi n° 2013-450 relative à la protection des données à caractère personnel. Je peux les consulter et les faire rectifier.</span>
              </button>
            </div>
          )}
          <p className="hint">{NOTICE}</p>
        </div>
        {canEdit ? (
          <Foot>
            <button className="btn btn-s" style={{ flex: '0 0 auto' }} onClick={() => navigate('/investir')}>Brouillon</button>
            <button className="btn btn-p" onClick={submit}>Soumettre le dossier</button>
          </Foot>
        ) : (
          <Foot><Link className="btn btn-p" to="/investir">Retour au tableau de bord</Link></Foot>
        )}
      </div>
    );
  }

  return (
    <div className="app">
      {header}
      {progress}
      <div className="body" style={{ gap: 18 }}>
        <h2 style={{ fontSize: 19, fontWeight: 600 }}>{current.title}</h2>
        {current.intro && <p className="small muted" style={{ lineHeight: 1.5 }}>{current.intro}</p>}
        {pairFields(current.fields.filter((f) => visible(f, dossier.data as Data))).map((group) => group.length === 2 ? (
          <div className="grid2" key={group[0].key} style={{ gap: 12, alignItems: 'start' }}>
            {group.map((f) => <FieldInput key={f.key} f={f} v={dossier.data[f.key]} err={errors[f.key]} onChange={(v) => setVal(f.key, v)} />)}
          </div>
        ) : (
          <FieldInput key={group[0].key} f={group[0]} v={dossier.data[group[0].key]} err={errors[group[0].key]} onChange={(v) => setVal(group[0].key, v)} />
        ))}
        {current.docs?.map((d) => (
          <div className="field" key={d.key}>
            <span className="lbl">{d.label}{!d.required && <span className="muted"> (facultatif)</span>}</span>
            <div className="row" style={{ gap: 10 }}>
              {dossier.docs[d.key]
                ? <Photo src={dossier.docs[d.key]} label={d.label} w={96} h={72} radius={8} onRemove={() => setDoc(d.key)} />
                : <PhotoAdd height={72} label="Ajouter" style={{ width: 96, flex: 'none' }} onAdd={(p) => setDoc(d.key, p)} />}
              <span className="xs muted" style={{ lineHeight: 1.45 }}>{dossier.docs[d.key] ? 'Document ajouté. Vu uniquement par l’équipe SAVAA.' : 'Photo nette, document en entier.'}</span>
            </div>
            {errors[d.key] && <span className="xs" role="alert" style={{ color: '#A0221A' }}>{errors[d.key]}</span>}
          </div>
        ))}
        {step === 0 && (
          <button className="link plain" style={{ alignSelf: 'flex-start' }} onClick={() => save({ type: undefined, step: 0 })}>Changer de statut (particulier ou entreprise)</button>
        )}
      </div>
      <Foot>
        <button className="btn btn-s" style={{ flex: '0 0 auto' }} onClick={() => (step === 0 ? navigate('/investir') : go(step - 1))}>{step === 0 ? 'Plus tard' : 'Précédent'}</button>
        <button className="btn btn-p" onClick={next}>{step === recapIndex - 1 ? 'Voir le récapitulatif' : 'Suivant'}</button>
      </Foot>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Propositions de projets (/investir/propositions)                   */
/* ------------------------------------------------------------------ */

/** Propositions de l'investisseur et projets associés. */
function useProposals() {
  const s = useStore();
  const all = s.get<Proposal[]>(KEYS.proposals, []);
  const mine = all.filter((p) => p.dossierId === LOCAL_ID);
  const projects = s.get<Project[]>(KEYS.projects, SEED_PROJECTS);
  const setStatus = (id: string, status: ProposalStatus, toast?: string) => {
    s.put(KEYS.proposals, all.map((p) => (p.id === id ? { ...p, status } : p)));
    if (toast) showToast(toast);
  };
  return { mine, projects, setStatus };
}

/* Catalogue des projets proposés : une carte courte par projet, le détail s'ouvre au clic. */
export function InvestProposals() {
  const { dossier } = useDossier();
  const { mine, projects } = useProposals();
  return (
    <div className="app">
      <Header back title="Mes propositions" />
      <div className="body" style={{ gap: 14 }}>
        {mine.length === 0 ? (
          <div className="card pad col" style={{ gap: 6 }}>
            <span className="small b">Aucune proposition pour l’instant</span>
            <span className="xs muted" style={{ lineHeight: 1.45 }}>
              {dossier.status === 'valide'
                ? 'Votre dossier est validé. L’équipe SAVAA sélectionne des projets adaptés à votre budget, vos filières et vos régions.'
                : 'Après validation de votre dossier, l’équipe SAVAA vous propose des projets agricoles adaptés. Vous pourrez les consulter, poser vos questions ou demander un rendez-vous.'}
            </span>
            {!dossier.type && <Link className="btn btn-p btn-sm" style={{ alignSelf: 'flex-start', marginTop: 4 }} to="/investir/dossier">Constituer mon dossier</Link>}
          </div>
        ) : (
          <>
            <span className="small muted">{mine.length} projet{mine.length > 1 ? 's' : ''} proposé{mine.length > 1 ? 's' : ''} par l’équipe SAVAA</span>
            <div className="grid2">
              {mine.map((pr) => {
                const p = projects.find((x) => x.id === pr.projectId);
                const st = PROPOSAL_STATUS[pr.status];
                return (
                  <Link key={pr.id} className="pc" to={`/investir/propositions/${pr.id}`} style={{ minWidth: 0 }}>
                    <ProjectPhoto src={p?.photo} filiere={p?.filiere ?? ''} height={112} radius={0} />
                    <div className="in" style={{ gap: 3 }}>
                      <span className="small b" style={{ lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p?.name ?? pr.projectId}</span>
                      <span className="price">{fcfa(pr.amount)} FCFA</span>
                      <span className="xs muted ell">{p ? `${p.region}, ${p.filiere}` : ''}</span>
                      <span className="wrap" style={{ gap: 4, marginTop: 2 }}><Badge tone={st.tone}>{st.label}</Badge></span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
        <p className="hint">Une proposition n’est ni une offre d’investissement ni un contrat : c’est une mise en relation. Poursuivre les discussions n’engage aucun versement.</p>
      </div>
      <TabBar />
    </div>
  );
}

/* Détail d'une proposition : le projet complet et les réponses possibles. */
export function InvestProposalDetail() {
  const { id = '' } = useParams();
  const { mine, projects, setStatus } = useProposals();
  const pr = mine.find((x) => x.id === id);
  const p = pr && projects.find((x) => x.id === pr.projectId);
  /* Ouvrir une proposition reçue la passe « en cours de consultation ». */
  useEffect(() => {
    if (pr?.status === 'recue') setStatus(pr.id, 'consultation');
  }, [pr?.id, pr?.status]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!pr || !p) return <NotFound title="Proposition introuvable" text="Cette proposition n’existe pas ou n’est plus disponible." to="/investir/propositions" cta="Mes propositions" />;
  const st = PROPOSAL_STATUS[pr.status];
  const closed = pr.status === 'declinee' || pr.status === 'cloturee';
  return (
    <div className="app">
      <Header back title="Projet proposé" />
      <div className="body" style={{ gap: 14 }}>
        <ProjectPhoto src={p.photo} filiere={p.filiere} height={180}><Badge tone={st.tone}>{st.label}</Badge></ProjectPhoto>
        <div className="col" style={{ gap: 4 }}>
          <h2 style={{ fontSize: 19, fontWeight: 600, lineHeight: 1.3 }}>{p.name}</h2>
          <span className="small muted">{p.filiere}, {p.region}{pr.deadline ? `. Réponse souhaitée avant le ${pr.deadline}` : ''}</span>
        </div>
        {pr.message && <p className="small" style={{ lineHeight: 1.5, background: '#E8F3EA', padding: 12, borderRadius: 8 }}><b>Message de l’équipe SAVAA : </b>{pr.message}</p>}
        <p className="small" style={{ lineHeight: 1.5 }}>{p.presentation}</p>
        <div className="card pad">
          <dl className="kv">
            <dt>Localisation</dt><dd>{p.localisation}, {p.region}</dd>
            <dt>Superficie</dt><dd>{p.superficie || '—'}</dd>
            <dt>Capacité</dt><dd>{p.capacite || '—'}</dd>
            <dt>Budget global</dt><dd className="num">{fcfa(p.budget)} FCFA</dd>
            <dt>Montant recherché</dt><dd className="num">{fcfa(p.recherche)} FCFA</dd>
            <dt>Reste à financer</dt><dd className="num">{fcfa(Math.max(0, p.recherche - p.finance))} FCFA</dd>
            <dt>Montant proposé</dt><dd className="num">{fcfa(pr.amount)} FCFA</dd>
            <dt>Durée</dt><dd>{p.duree}</dd>
            <dt>Risque</dt><dd>{p.risque}</dd>
          </dl>
        </div>
        <div className="card pad">
          <dl className="kv">
            <dt>Objectifs</dt><dd>{p.objectifs || '—'}</dd>
            <dt>Besoins</dt><dd>{p.besoins || '—'}</dd>
            <dt>Risques identifiés</dt><dd>{p.risques || '—'}</dd>
            <dt>Conditions</dt><dd>{pr.conditions || p.conditions || '—'}</dd>
          </dl>
        </div>
        {!closed && (
          <div className="col" style={{ gap: 8 }}>
            {pr.status === 'interet' || pr.status === 'rdv' ? (
              <button className="btn btn-p btn-block" style={{ flex: 'none' }} onClick={() => setStatus(pr.id, 'acceptee', 'Vous poursuivez les discussions. Ce n’est pas un engagement financier.')}>Poursuivre les discussions</button>
            ) : pr.status !== 'acceptee' && (
              <button className="btn btn-p btn-block" style={{ flex: 'none' }} onClick={() => setStatus(pr.id, 'interet', 'Intérêt transmis à l’équipe SAVAA.')}>Je suis intéressé</button>
            )}
            <div className="grid2">
              <button className="btn btn-s" disabled={pr.status === 'rdv'} onClick={() => setStatus(pr.id, 'rdv', 'Demande de rendez-vous envoyée.')} style={{ whiteSpace: 'normal', lineHeight: 1.2 }}>{pr.status === 'rdv' ? 'Rendez-vous demandé' : 'Demander un rendez-vous'}</button>
              <Link className="btn btn-s" to="/assistance" style={{ whiteSpace: 'normal', lineHeight: 1.2 }}>Poser une question</Link>
            </div>
            <button className="link plain" style={{ alignSelf: 'center', color: '#A0221A', padding: 8 }} onClick={() => setStatus(pr.id, 'declinee', 'Proposition déclinée.')}>Décliner cette proposition</button>
          </div>
        )}
        <p className="hint">Les montants, risques et prévisions sont ceux du porteur de projet : ce ne sont pas des promesses de SAVAA. Poursuivre les discussions n’engage aucun versement.</p>
      </div>
    </div>
  );
}
