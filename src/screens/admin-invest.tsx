import { Fragment, useState } from 'react';
import { fcfa, today, useStore } from '../data';
import { downloadCSV } from '../device';
import {
  EMPTY_DOSSIER, FILIERES, REGIONS_CI, STATUS, display, stepErrors, stepsFor, visible,
  type Dossier, type DossierStatus,
} from '../invest';
import {
  KEYS, LOCAL_ID, PROJECT_STATUS, PROPOSAL_STATUS, SEED_DOSSIERS, SEED_PROJECTS, newProjectId, newProposalId, rankProjects, remaining,
  type AdminDossier, type Project, type ProjectStatus, type Proposal,
} from '../invest-admin';
import { showToast } from '../toast';
import { ProjectPhoto } from '../dash';
import { Badge, Icon, PhotoAdd } from '../ui';

/* Back-office : rubriques « Investisseurs » (dossiers, analyse, propositions) et « Projets agricoles » (catalogue). */

const ADMIN = 'Équipe SAVAA';
const colStyle = { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 } as const;
const gridStyle = { gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))' };
const DEMO_NOTE = 'Démonstration : le dossier de l’investisseur de cet appareil et des exemples fictifs. En production, les dossiers et les justificatifs viendront du serveur, avec un accès contrôlé et journalisé.';

const NOTIFY_TEXT: Partial<Record<DossierStatus, [string, string]>> = {
  attente: ['Dossier reçu', 'L’équipe SAVAA a bien reçu votre dossier.'],
  analyse: ['Dossier en cours d’analyse', 'Un membre de l’équipe SAVAA examine votre dossier.'],
  complement: ['Informations complémentaires demandées', 'Ouvrez votre dossier pour voir ce qui est demandé.'],
  valide: ['Dossier validé', 'L’équipe SAVAA va vous proposer des projets adaptés.'],
  refuse: ['Dossier refusé', 'Consultez le motif dans votre espace investisseur.'],
};

/** Données de l'espace investisseur vues par l'administration. */
function useInvest() {
  const s = useStore();
  const local = s.get<Dossier>(KEYS.local, EMPTY_DOSSIER);
  const localNotes = s.get<AdminDossier['notes']>('invest.local.notes', []);
  const seeds = s.get<AdminDossier[]>(KEYS.admin, SEED_DOSSIERS);
  const projects = s.get<Project[]>(KEYS.projects, SEED_PROJECTS);
  const proposals = s.get<Proposal[]>(KEYS.proposals, []);
  const d = local.data;
  const localName = local.type === 'entreprise' ? String(d['ent.raison'] || s.session().name) : `${d['id.prenoms'] ?? ''} ${d['id.nom'] ?? ''}`.trim() || s.session().name;
  /* Le dossier de l'appareil n'apparaît qu'une fois soumis. */
  const localAdmin: AdminDossier | null = local.ref ? {
    ...local, id: LOCAL_ID, name: localName, local: true, notes: localNotes,
    phone: String((local.type === 'entreprise' ? d['ent.tel'] : d['id.tel']) ?? ''),
    email: String((local.type === 'entreprise' ? d['ent.email'] : d['id.email']) ?? ''),
  } : null;
  const dossiers = localAdmin ? [localAdmin, ...seeds] : seeds;

  const setStatus = (dos: AdminDossier, status: DossierStatus, note?: string) => {
    const entry = { date: today(), status, by: ADMIN, note };
    if (dos.local) {
      s.put(KEYS.local, { ...local, status, history: [...local.history, entry] });
      const t = NOTIFY_TEXT[status];
      if (t) s.notify({ c: 'pro', title: t[0], text: note ? `${t[1]} ${note}` : t[1], to: '/investir' });
    } else {
      s.put(KEYS.admin, seeds.map((x) => (x.id === dos.id ? { ...x, status, history: [...x.history, entry] } : x)));
    }
  };
  const addNote = (dos: AdminDossier, text: string) => {
    const note = { date: today(), by: ADMIN, text };
    if (dos.local) s.put('invest.local.notes', [...localNotes, note]);
    else s.put(KEYS.admin, seeds.map((x) => (x.id === dos.id ? { ...x, notes: [...x.notes, note] } : x)));
  };
  const sendProposals = (dos: AdminDossier, items: Omit<Proposal, 'id' | 'dossierId' | 'date' | 'status'>[]) => {
    const created = items.map((it, i) => ({ ...it, id: `${newProposalId()}-${i}`, dossierId: dos.id, date: today(), status: 'recue' as const }));
    s.put(KEYS.proposals, [...proposals, ...created]);
    if (dos.local) s.notify({ c: 'pro', title: created.length > 1 ? `${created.length} nouveaux projets proposés` : 'Nouveau projet proposé', text: 'Consultez la proposition dans votre espace investisseur.', to: '/investir/propositions' });
  };
  const saveProjects = (next: Project[]) => s.put(KEYS.projects, next);
  return { dossiers, projects, proposals, setStatus, addNote, sendProposals, saveProjects };
}

const budgetOf = (d: Dossier) => {
  const min = Number(d.data['fin.min'] || 0);
  const max = Number(d.data['fin.max'] || 0);
  return max ? `${fcfa(min)} à ${fcfa(max)}` : String(d.data['fin.tranche'] ?? '—');
};
const typeLabel = (d: Dossier) => (d.type === 'entreprise' ? 'Entreprise' : 'Particulier');
const sortKey = (date?: string) => (date ? date.split('/').reverse().join('') : '');

/* ------------------------------------------------------------------ */
/* Rubrique Investisseurs                                             */
/* ------------------------------------------------------------------ */

export function AdminInvestors() {
  const inv = useInvest();
  const [openId, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [type, setType] = useState<'all' | 'particulier' | 'entreprise'>('all');
  const [status, setStatus] = useState<'all' | DossierStatus>('all');
  const [sort, setSort] = useState<'recent' | 'ancien' | 'budget'>('recent');
  const [page, setPage] = useState(0);
  const open = inv.dossiers.find((x) => x.id === openId);
  if (open) return <InvestorFile d={open} inv={inv} onBack={() => setOpenId(null)} />;

  const all = inv.dossiers;
  const count = (st: DossierStatus[]) => all.filter((x) => st.includes(x.status)).length;
  const budgets = all.reduce((t, x) => t + Number(x.data['fin.max'] || 0), 0);
  const sent = inv.proposals.length;
  const accepted = inv.proposals.filter((p) => p.status === 'acceptee' || p.status === 'negociation').length;

  const fold = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const rows = all
    .filter((x) => type === 'all' || x.type === type)
    .filter((x) => status === 'all' || x.status === status)
    .filter((x) => !q.trim() || fold(`${x.name} ${x.phone} ${x.email} ${x.ref ?? ''}`).includes(fold(q.trim())))
    .sort((a, b) => sort === 'budget' ? Number(b.data['fin.max'] || 0) - Number(a.data['fin.max'] || 0)
      : sort === 'ancien' ? sortKey(a.submittedAt).localeCompare(sortKey(b.submittedAt)) : sortKey(b.submittedAt).localeCompare(sortKey(a.submittedAt)));
  const PER = 8;
  const pages = Math.max(1, Math.ceil(rows.length / PER));
  const cur = Math.min(page, pages - 1);
  const shown = rows.slice(cur * PER, cur * PER + PER);

  const exportCsv = () => downloadCSV(`savaa-investisseurs-${today().replace(/\//g, '-')}.csv`, [
    ['Référence', 'Nom ou raison sociale', 'Type', 'Téléphone', 'E-mail', 'Budget min (FCFA)', 'Budget max (FCFA)', 'Filière prioritaire', 'Soumis le', 'Statut'],
    ...rows.map((x) => [x.ref ?? '', x.name, typeLabel(x), x.phone, x.email, Number(x.data['fin.min'] || 0), Number(x.data['fin.max'] || 0), String(x.data['pref.prioritaire'] ?? ''), x.submittedAt ?? '', STATUS[x.status].label]),
  ]);

  return (
    <>
      <div className="adm-top">
        <div style={colStyle}><h1>Investisseurs</h1><span className="small muted">Dossiers reçus, analyse et propositions de projets</span></div>
        <button className="btn btn-s btn-sm" onClick={exportCsv}>Exporter ({rows.length})</button>
      </div>
      <div className="adm-kpis">
        {([
          ['Investisseurs', all.length, `${all.filter((x) => x.type === 'particulier').length} particuliers, ${all.filter((x) => x.type === 'entreprise').length} entreprises`],
          ['À traiter', count(['soumis', 'attente']), 'dossiers en attente'],
          ['En analyse', count(['analyse', 'complement']), `dont ${count(['complement'])} en attente de compléments`],
          ['Validés', count(['valide']), `${count(['refuse'])} refusé${count(['refuse']) > 1 ? 's' : ''}`],
          ['Propositions', sent, `${accepted} poursuivie${accepted > 1 ? 's' : ''} en discussion`],
          ['Budgets déclarés', `${fcfa(Math.round(budgets / 1_000_000))} M`, 'FCFA, total des maximums'],
        ] as const).map(([l, v, sub]) => <div key={l} className="card pad stat"><span className="l">{l}</span><span className="v">{v}</span><span className="xs muted">{sub}</span></div>)}
      </div>
      <div className="adm-filters">
        <label className="search adm-filter-search">
          <Icon name="search" size="sm" />
          <input className="plain grow" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Nom, téléphone, e-mail, référence" aria-label="Rechercher un investisseur" />
        </label>
        <select className="input adm-filter" value={type} onChange={(e) => { setType(e.target.value as typeof type); setPage(0); }} aria-label="Type d’investisseur">
          <option value="all">Tous les types</option><option value="particulier">Particuliers</option><option value="entreprise">Entreprises</option>
        </select>
        <select className="input adm-filter" value={status} onChange={(e) => { setStatus(e.target.value as typeof status); setPage(0); }} aria-label="Statut du dossier">
          <option value="all">Tous les statuts</option>
          {(Object.keys(STATUS) as DossierStatus[]).map((k) => <option key={k} value={k}>{STATUS[k].label}</option>)}
        </select>
        <select className="input adm-filter" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Trier">
          <option value="recent">Plus récents</option><option value="ancien">Plus anciens</option><option value="budget">Budget le plus élevé</option>
        </select>
      </div>
      <section className="card">
        <div className="scroll">
          <table className="tbl">
            <thead><tr><th>Investisseur</th><th>Type</th><th>Contact</th><th>Budget (FCFA)</th><th>Filière prioritaire</th><th>Soumis le</th><th>Statut</th></tr></thead>
            <tbody>
              {shown.map((x) => (
                <tr key={x.id} onClick={() => setOpenId(x.id)} style={{ cursor: 'pointer' }}>
                  <td><button className="link plain b" onClick={() => setOpenId(x.id)} style={{ textAlign: 'left' }}>{x.name}</button><br /><span className="xs muted num">{x.ref}{x.local ? ', cet appareil' : ''}</span></td>
                  <td>{typeLabel(x)}</td>
                  <td><span className="stack"><span className="num">{x.phone || '—'}</span><span className="xs muted">{x.email || '—'}</span></span></td>
                  <td className="num" style={{ whiteSpace: 'nowrap' }}>{budgetOf(x)}</td>
                  <td>{String(x.data['pref.prioritaire'] ?? '—')}</td>
                  <td className="num">{x.submittedAt ?? '—'}</td>
                  <td><Badge tone={STATUS[x.status].tone}>{STATUS[x.status].label}</Badge></td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={7} className="small muted" style={{ textAlign: 'center' }}>Aucun dossier pour ces filtres.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      {pages > 1 && (
        <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
          <button className="btn btn-s btn-sm" disabled={cur === 0} onClick={() => setPage(cur - 1)}>Précédent</button>
          <span className="small muted">Page {cur + 1} sur {pages}</span>
          <button className="btn btn-s btn-sm" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Suivant</button>
        </div>
      )}
      <p className="xs muted">{DEMO_NOTE}</p>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Analyse d'un dossier                                               */
/* ------------------------------------------------------------------ */

function InvestorFile({ d, inv, onBack }: { d: AdminDossier; inv: ReturnType<typeof useInvest>; onBack: () => void }) {
  const [motif, setMotif] = useState('');
  const [note, setNote] = useState('');
  const steps = stepsFor(d.type);
  const missing = d.local ? steps.flatMap((st) => Object.keys(stepErrors(st, d.data, d.docs)).map((k) => st.fields.find((f) => f.key === k)?.label ?? st.docs?.find((x) => x.key === k)?.label ?? k)) : [];
  const st = STATUS[d.status];
  const act = (status: DossierStatus, needMotif?: boolean) => {
    if (needMotif && !motif.trim()) { showToast('Indiquez le motif : il sera transmis à l’investisseur.'); return; }
    inv.setStatus(d, status, motif.trim() || undefined);
    setMotif('');
    showToast(`Dossier passé au statut « ${STATUS[status].label} ».`);
  };
  const mine = inv.proposals.filter((p) => p.dossierId === d.id);

  return (
    <>
      <div className="adm-top">
        <div style={colStyle}>
          <button className="link plain small" onClick={onBack} style={{ alignSelf: 'flex-start' }}>← Tous les investisseurs</button>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}><h1>{d.name}</h1><Badge tone={st.tone}>{st.label}</Badge></div>
          <span className="small muted">{typeLabel(d)}, référence {d.ref}, soumis le {d.submittedAt}{d.local ? ', dossier de cet appareil' : ', dossier d’exemple'}</span>
        </div>
      </div>

      <div className="adm-grid" style={gridStyle}>
        <section className="card">
          <div className="cardh"><h2>Contrôle du dossier</h2>{d.local ? (missing.length ? <Badge tone="red">{missing.length} manquant{missing.length > 1 ? 's' : ''}</Badge> : <Badge tone="green">Complet</Badge>) : <Badge>Exemple</Badge>}</div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {!d.local ? <span className="small muted">Dossier d’exemple : seules les informations principales sont renseignées.</span>
              : missing.length ? missing.map((m) => <span key={m} className="small" style={{ color: '#A0221A' }}>Manquant : {m}</span>)
                : <span className="small">Toutes les informations et tous les documents obligatoires sont présents.</span>}
          </div>
        </section>

        <section className="card">
          <div className="cardh"><h2>Décision</h2></div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label className="small b" htmlFor="adm-motif">Motif ou message à l’investisseur</label>
            <textarea id="adm-motif" className="input" rows={3} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Obligatoire pour une demande de complément ou un refus" style={{ height: 'auto', paddingTop: 8 }} />
            <div className="wrap" style={{ gap: 8 }}>
              {(d.status === 'soumis' || d.status === 'attente' || d.status === 'complement') && <button className="btn btn-p btn-sm" onClick={() => act('analyse')}>Passer en analyse</button>}
              {d.status === 'soumis' && <button className="btn btn-s btn-sm" onClick={() => act('attente')}>Accuser réception</button>}
              {d.status === 'analyse' && <>
                <button className="btn btn-p btn-sm" onClick={() => act('valide')}>Valider le dossier</button>
                <button className="btn btn-s btn-sm" onClick={() => act('complement', true)}>Demander des compléments</button>
                <button className="btn btn-s btn-sm" style={{ color: '#A0221A' }} onClick={() => act('refuse', true)}>Refuser</button>
              </>}
              {(d.status === 'valide' || d.status === 'refuse') && <button className="btn btn-s btn-sm" onClick={() => act('archive')}>Archiver</button>}
            </div>
            <span className="xs muted">Chaque décision est enregistrée dans l’historique, avec la date et l’auteur{d.local ? ', et l’investisseur est prévenu' : ''}.</span>
          </div>
        </section>
      </div>

      {steps.map((step) => (
        <section className="card" key={step.title}>
          <div className="cardh"><h2>{step.title}</h2></div>
          <div style={{ padding: 16 }}>
            {step.fields.length > 0 && (
              <dl className="kv" style={{ gridTemplateColumns: 'minmax(140px, 220px) minmax(0, 1fr)' }}>
                {step.fields.filter((f) => visible(f, d.data)).map((f) => <Fragment key={f.key}><dt>{f.label}</dt><dd>{f.kind === 'photo' && typeof d.data[f.key] === 'string' && String(d.data[f.key]).startsWith('data:') ? <a href={String(d.data[f.key])} download={`${d.ref}-${f.key}.jpg`} title="Télécharger"><img src={String(d.data[f.key])} alt={f.label} style={{ width: 140, height: 90, objectFit: 'cover', borderRadius: 6, border: '1px solid #E3E7E4' }} /></a> : display(f, d.data[f.key])}</dd></Fragment>)}
              </dl>
            )}
            {step.docs && (
              <div className="wrap" style={{ gap: 12 }}>
                {step.docs.map((doc) => {
                  const src = d.docs[doc.key];
                  return (
                    <div key={doc.key} className="col" style={{ gap: 6, width: 150 }}>
                      {src && src.startsWith('data:')
                        ? <a href={src} download={`${d.ref}-${doc.key}.jpg`} title="Télécharger"><img src={src} alt={doc.label} style={{ width: 150, height: 100, objectFit: 'cover', borderRadius: 6, border: '1px solid #E3E7E4' }} /></a>
                        : <div className="card" style={{ width: 150, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="xs muted">{src ? 'Document d’exemple' : 'Non fourni'}</span></div>}
                      <span className="xs">{doc.label}</span>
                      {src && src.startsWith('data:') && <a className="xs link" href={src} download={`${d.ref}-${doc.key}.jpg`}>Télécharger</a>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      ))}

      {(d.status === 'valide' || mine.length > 0) && <Matching d={d} inv={inv} />}

      <div className="adm-grid" style={gridStyle}>
        <section className="card">
          <div className="cardh"><h2>Historique</h2></div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...d.history].reverse().map((h, i) => (
              <div key={i} className="col" style={{ gap: 2 }}>
                <span className="small"><b>{STATUS[h.status].label}</b>, le {h.date}, par {h.by}</span>
                {h.note && <span className="xs muted">{h.note}</span>}
              </div>
            ))}
          </div>
        </section>
        <section className="card">
          <div className="cardh"><h2>Notes internes</h2><span className="xs muted">Jamais visibles par l’investisseur</span></div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {d.notes.map((n, i) => <span key={i} className="small">{n.text} <span className="xs muted">({n.date}, {n.by})</span></span>)}
            <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ajouter une note" aria-label="Note interne" style={{ height: 'auto', paddingTop: 8 }} />
            <button className="btn btn-s btn-sm" style={{ alignSelf: 'flex-start' }} disabled={!note.trim()} onClick={() => { inv.addNote(d, note.trim()); setNote(''); }}>Ajouter la note</button>
          </div>
        </section>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Rapprochement et propositions                                      */
/* ------------------------------------------------------------------ */

function Matching({ d, inv }: { d: AdminDossier; inv: ReturnType<typeof useInvest> }) {
  const ranked = rankProjects(d, inv.projects);
  const mine = inv.proposals.filter((p) => p.dossierId === d.id);
  const already = new Set(mine.map((p) => p.projectId));
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState('');
  const [cond, setCond] = useState('');
  const [deadline, setDeadline] = useState('');
  const chosen = ranked.filter(({ p }) => sel[p.id]);

  const send = () => {
    if (!chosen.length) return;
    inv.sendProposals(d, chosen.map(({ p }) => ({
      projectId: p.id, message: msg.trim(), conditions: cond.trim() || p.conditions,
      amount: Math.min(Number(d.data['fin.max'] || 0) || remaining(p), remaining(p)),
      deadline: deadline ? deadline.split('-').reverse().join('/') : '',
    })));
    setSel({}); setMsg(''); setCond(''); setDeadline('');
    showToast(`${chosen.length} proposition${chosen.length > 1 ? 's' : ''} envoyée${chosen.length > 1 ? 's' : ''}.`);
  };

  return (
    <section className="card">
      <div className="cardh"><h2>Projets correspondants</h2><span className="xs muted">Aide à la sélection : la décision reste à l’équipe</span></div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {d.status === 'valide' && ranked.map(({ p, m }) => (
          <label key={p.id} className="card" style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'flex-start', cursor: already.has(p.id) ? 'default' : 'pointer', opacity: already.has(p.id) ? 0.6 : 1 }}>
            <input type="checkbox" disabled={already.has(p.id)} checked={!!sel[p.id]} onChange={(e) => setSel({ ...sel, [p.id]: e.target.checked })} style={{ marginTop: 3 }} />
            <div className="col grow" style={{ gap: 4, minWidth: 0 }}>
              <div className="row between" style={{ gap: 8 }}><span className="b small">{p.name}</span><span className="b num" style={{ color: m.score >= 60 ? '#145C3A' : '#5D6862' }}>{m.score} / 100</span></div>
              <span className="xs muted">{p.filiere}, {p.region}, reste {fcfa(remaining(p))} FCFA à financer, {p.duree.toLowerCase()}</span>
              <div style={{ height: 6, background: '#E3E7E4', borderRadius: 3 }}><div style={{ width: `${m.score}%`, height: 6, background: '#145C3A', borderRadius: 3 }} /></div>
              {m.reasons.map((r) => <span key={r} className="xs" style={{ color: '#145C3A' }}>+ {r}</span>)}
              {m.warnings.map((w) => <span key={w} className="xs" style={{ color: '#8A4B00' }}>! {w}</span>)}
              {already.has(p.id) && <span className="xs b">Déjà proposé</span>}
            </div>
          </label>
        ))}
        {d.status === 'valide' && (
          <div className="col" style={{ gap: 8 }}>
            <textarea className="input" rows={2} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Message personnalisé à l’investisseur" aria-label="Message" style={{ height: 'auto', paddingTop: 8 }} />
            <input className="input" value={cond} onChange={(e) => setCond(e.target.value)} placeholder="Conditions envisagées (sinon celles du projet)" aria-label="Conditions" />
            <label className="small" htmlFor="adm-deadline">Date limite de réponse</label>
            <input id="adm-deadline" className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} style={{ maxWidth: 220 }} />
            <button className="btn btn-p btn-sm" style={{ alignSelf: 'flex-start' }} disabled={!chosen.length} onClick={send}>Envoyer {chosen.length || ''} proposition{chosen.length > 1 ? 's' : ''}</button>
          </div>
        )}
        {mine.length > 0 && (
          <div className="col" style={{ gap: 6 }}>
            <span className="small b">Propositions envoyées</span>
            {mine.map((p) => {
              const prj = inv.projects.find((x) => x.id === p.projectId);
              return <div key={p.id} className="row between small" style={{ gap: 8 }}><span>{prj?.name ?? p.projectId}, le {p.date}</span><Badge tone={PROPOSAL_STATUS[p.status].tone}>{PROPOSAL_STATUS[p.status].label}</Badge></div>;
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Rubrique Projets agricoles                                         */
/* ------------------------------------------------------------------ */

const EMPTY_PROJECT: Project = {
  id: '', name: '', presentation: '', filiere: '', region: '', localisation: '', superficie: '', capacite: '', budget: 0, recherche: 0, finance: 0,
  duree: 'Moyen terme (2 à 5 ans)', risque: 'Risque modéré', objectifs: '', besoins: '', risques: '', conditions: '', status: 'brouillon',
};

export function AdminProjects() {
  const inv = useInvest();
  const [edit, setEdit] = useState<Project | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const setStatus = (p: Project, status: ProjectStatus) => { inv.saveProjects(inv.projects.map((x) => (x.id === p.id ? { ...x, status } : x))); showToast(`Projet ${PROJECT_STATUS[status].label.toLowerCase()}.`); };
  if (edit) return <ProjectForm initial={edit} onCancel={() => setEdit(null)} onSave={(p) => {
    const isNew = !(p.id && inv.projects.some((x) => x.id === p.id));
    const saved = isNew ? { ...p, id: newProjectId() } : p;
    inv.saveProjects(isNew ? [saved, ...inv.projects] : inv.projects.map((x) => (x.id === p.id ? p : x)));
    setEdit(null); setViewId(saved.id); showToast('Projet enregistré.');
  }} />;
  const view = inv.projects.find((p) => p.id === viewId);
  if (view) return <ProjectView p={view} onBack={() => setViewId(null)} onEdit={() => setEdit(view)} onStatus={(st) => setStatus(view, st)} />;

  const visibleProjects = inv.projects.filter((p) => p.status !== 'archive');
  return (
    <>
      <div className="adm-top">
        <div style={colStyle}><h1>Projets agricoles</h1><span className="small muted">Catalogue proposé aux investisseurs validés. Cliquez sur un projet pour voir tous ses détails.</span></div>
        <button className="btn btn-p btn-sm" onClick={() => setEdit(EMPTY_PROJECT)}>Nouveau projet</button>
      </div>
      <div className="adm-kpis">
        {([['Publiés', inv.projects.filter((p) => p.status === 'publie').length], ['Brouillons', inv.projects.filter((p) => p.status === 'brouillon').length],
          ['Montant recherché', `${fcfa(Math.round(visibleProjects.reduce((t, p) => t + p.recherche, 0) / 1_000_000))} M`],
          ['Restant à financer', `${fcfa(Math.round(visibleProjects.reduce((t, p) => t + remaining(p), 0) / 1_000_000))} M`]] as const)
          .map(([l, v]) => <div key={l} className="card pad stat"><span className="l">{l}</span><span className="v">{v}</span></div>)}
      </div>
      <div className="adm-catalog">
        {inv.projects.map((p) => (
          <button key={p.id} className="card adm-catalog-item" onClick={() => setViewId(p.id)} style={{ opacity: p.status === 'archive' ? 0.65 : 1 }} aria-label={`${p.name}, voir le détail`}>
            <ProjectPhoto src={p.photo} filiere={p.filiere} height={120}><Badge tone={PROJECT_STATUS[p.status].tone}>{PROJECT_STATUS[p.status].label}</Badge></ProjectPhoto>
            <span className="b small adm-catalog-title">{p.name}</span>
            <span className="xs muted">{p.filiere}, {p.region}</span>
          </button>
        ))}
      </div>
      <p className="xs muted">Les projets d’exemple sont fictifs. Les montants, risques et prévisions d’un projet sont ceux de son porteur : ce ne sont jamais des promesses de SAVAA.</p>
    </>
  );
}

/** Fiche complète d'un projet, avec ses actions. */
function ProjectView({ p, onBack, onEdit, onStatus }: { p: Project; onBack: () => void; onEdit: () => void; onStatus: (s: ProjectStatus) => void }) {
  return (
    <>
      <div className="adm-top">
        <div style={colStyle}>
          <button className="link plain small" onClick={onBack} style={{ alignSelf: 'flex-start' }}>← Tous les projets</button>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}><h1>{p.name}</h1><Badge tone={PROJECT_STATUS[p.status].tone}>{PROJECT_STATUS[p.status].label}</Badge></div>
          <span className="small muted">{p.filiere}, {p.region}{p.localisation ? `, ${p.localisation}` : ''}</span>
        </div>
        <div className="adm-actions">
          {p.status === 'publie' ? <button className="btn btn-s btn-sm" onClick={() => onStatus('depublie')}>Dépublier</button>
            : p.status === 'archive' ? <button className="btn btn-s btn-sm" onClick={() => onStatus('brouillon')}>Restaurer</button>
              : <button className="btn btn-p btn-sm" onClick={() => onStatus('publie')}>Publier</button>}
          <button className="btn btn-s btn-sm" onClick={onEdit}>Modifier</button>
          <button className="btn btn-s btn-sm" disabled={p.status === 'archive'} onClick={() => onStatus('archive')}>Archiver</button>
        </div>
      </div>
      <div className="adm-grid" style={gridStyle}>
        <section className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ProjectPhoto src={p.photo} filiere={p.filiere} height={220} />
          <p className="small" style={{ lineHeight: 1.55 }}>{p.presentation || 'Pas encore de présentation.'}</p>
        </section>
        <section className="card" style={{ padding: 16 }}>
          <dl className="kv" style={{ gridTemplateColumns: 'minmax(140px, 200px) minmax(0, 1fr)' }}>
            <dt>Localisation</dt><dd>{[p.localisation, p.region].filter(Boolean).join(', ') || '—'}</dd>
            <dt>Superficie</dt><dd>{p.superficie || '—'}</dd>
            <dt>Capacité de production</dt><dd>{p.capacite || '—'}</dd>
            <dt>Budget global</dt><dd className="num">{fcfa(p.budget)} FCFA</dd>
            <dt>Montant recherché</dt><dd className="num">{fcfa(p.recherche)} FCFA</dd>
            <dt>Déjà financé</dt><dd className="num">{fcfa(p.finance)} FCFA</dd>
            <dt>Reste à financer</dt><dd className="num">{fcfa(remaining(p))} FCFA</dd>
            <dt>Durée prévisionnelle</dt><dd>{p.duree}</dd>
            <dt>Niveau de risque</dt><dd>{p.risque}</dd>
          </dl>
        </section>
      </div>
      <section className="card" style={{ padding: 16 }}>
        <dl className="kv" style={{ gridTemplateColumns: 'minmax(140px, 200px) minmax(0, 1fr)' }}>
          <dt>Objectifs</dt><dd>{p.objectifs || '—'}</dd>
          <dt>Besoins techniques</dt><dd>{p.besoins || '—'}</dd>
          <dt>Risques identifiés</dt><dd>{p.risques || '—'}</dd>
          <dt>Conditions de participation</dt><dd>{p.conditions || '—'}</dd>
        </dl>
      </section>
    </>
  );
}

function ProjectForm({ initial, onSave, onCancel }: { initial: Project; onSave: (p: Project) => void; onCancel: () => void }) {
  const [p, setP] = useState<Project>(initial);
  const [tried, setTried] = useState(false);
  const set = <K extends keyof Project>(k: K, v: Project[K]) => setP({ ...p, [k]: v });
  const errors: Record<string, string> = {};
  if (!p.name.trim()) errors.name = 'Nom obligatoire.';
  if (!p.filiere) errors.filiere = 'Choisissez la filière.';
  if (!p.region) errors.region = 'Choisissez la région.';
  if (!(p.recherche > 0)) errors.recherche = 'Indiquez le montant recherché.';
  if (p.finance > p.recherche) errors.finance = 'Le montant déjà financé dépasse le montant recherché.';
  const err = (k: string) => tried && errors[k] && <span className="xs" role="alert" style={{ color: '#A0221A' }}>{errors[k]}</span>;
  const amount = (k: 'budget' | 'recherche' | 'finance', label: string) => (
    <div className="field"><label htmlFor={`prj-${k}`}>{label}</label><input id={`prj-${k}`} className="input num" inputMode="numeric" value={p[k] ? fcfa(p[k]) : ''} onChange={(e) => set(k, Number(e.target.value.replace(/\D/g, '').slice(0, 13)))} />{err(k)}</div>
  );
  const text = (k: 'name' | 'localisation' | 'superficie' | 'capacite' | 'conditions', label: string) => (
    <div className="field"><label htmlFor={`prj-${k}`}>{label}</label><input id={`prj-${k}`} className="input" value={p[k]} onChange={(e) => set(k, e.target.value)} />{err(k)}</div>
  );
  const area = (k: 'presentation' | 'objectifs' | 'besoins' | 'risques', label: string) => (
    <div className="field"><label htmlFor={`prj-${k}`}>{label}</label><textarea id={`prj-${k}`} className="input" rows={3} value={p[k]} onChange={(e) => set(k, e.target.value)} style={{ height: 'auto', paddingTop: 8 }} /></div>
  );
  return (
    <>
      <div className="adm-top">
        <div style={colStyle}><button className="link plain small" onClick={onCancel} style={{ alignSelf: 'flex-start' }}>← Tous les projets</button><h1>{initial.id ? 'Modifier le projet' : 'Nouveau projet'}</h1></div>
        <div className="wrap" style={{ gap: 8 }}>
          <button className="btn btn-s btn-sm" onClick={onCancel}>Annuler</button>
          <button className="btn btn-p btn-sm" onClick={() => { if (Object.keys(errors).length) { setTried(true); showToast('Complétez les champs signalés.'); return; } onSave(p); }}>Enregistrer</button>
        </div>
      </div>
      <div className="adm-grid" style={gridStyle}>
        <section className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field">
            <span className="lbl">Photo du projet</span>
            {p.photo
              ? <div className="col" style={{ gap: 6 }}><ProjectPhoto src={p.photo} filiere={p.filiere} height={160} /><button className="link plain small" style={{ alignSelf: 'flex-start' }} onClick={() => set('photo', undefined)}>Retirer la photo</button></div>
              : <PhotoAdd height={96} label="Ajouter une photo" onAdd={(src) => set('photo', src)} />}
            <span className="hint">Une vraie photo du site ou de la production. Sans photo, la carte affiche la filière.</span>
          </div>
          {text('name', 'Nom du projet')}
          <div className="field"><label htmlFor="prj-filiere">Filière</label><select id="prj-filiere" className="input" value={p.filiere} onChange={(e) => set('filiere', e.target.value)}><option value="" disabled>Choisir…</option>{FILIERES.map((f) => <option key={f}>{f}</option>)}</select>{err('filiere')}</div>
          <div className="field"><label htmlFor="prj-region">Région</label><select id="prj-region" className="input" value={p.region} onChange={(e) => set('region', e.target.value)}><option value="" disabled>Choisir…</option>{REGIONS_CI.map((r) => <option key={r}>{r}</option>)}</select>{err('region')}</div>
          {text('localisation', 'Localisation')}
          {text('superficie', 'Superficie')}
          {text('capacite', 'Capacité de production')}
          {area('presentation', 'Présentation détaillée')}
        </section>
        <section className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {amount('budget', 'Budget global du projet (FCFA)')}
          {amount('recherche', 'Montant recherché (FCFA)')}
          {amount('finance', 'Montant déjà financé (FCFA)')}
          <span className="small muted">Reste à financer : <b className="num">{fcfa(remaining(p))} FCFA</b></span>
          <div className="field"><label htmlFor="prj-duree">Durée prévisionnelle</label><select id="prj-duree" className="input" value={p.duree} onChange={(e) => set('duree', e.target.value)}>{['Court terme (moins de 2 ans)', 'Moyen terme (2 à 5 ans)', 'Long terme (plus de 5 ans)'].map((o) => <option key={o}>{o}</option>)}</select></div>
          <div className="field"><label htmlFor="prj-risque">Niveau de risque</label><select id="prj-risque" className="input" value={p.risque} onChange={(e) => set('risque', e.target.value)}>{['Non, risque faible', 'Risque modéré', 'Risque élevé'].map((o) => <option key={o}>{o}</option>)}</select></div>
          {area('objectifs', 'Objectifs')}
          {area('besoins', 'Besoins techniques et infrastructures')}
          {area('risques', 'Risques identifiés')}
          {text('conditions', 'Conditions de participation')}
        </section>
      </div>
    </>
  );
}
