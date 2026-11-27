import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { nowTime, PROOF, today, useStore, type Animal, type EventKind, type HealthEvent, type TraceEvent } from '../data';
import { printPage, share } from '../device';
import { showToast } from '../toast';
import { animalMeasure, animalOrigin, animalPurpose, animalStatus, animalUrl, ficheUrl, sheetOf } from '../trace';
import { useOnline } from '../hooks';
import { Badge, Foot, Header, Icon, NotFound, Photo, PhotoAdd, PreviewModal, Section, type PreviewData } from '../ui';
import { QrDialog, TraceTimeline } from './fiche';

/* Seul le taurillon FK-0142 a une fiche complète dans la maquette (race, ascendance, mouvements…). */
const DEMO_ID = 'FK-0142';
const SPECIES_LABEL = { bovin: 'Bovin', ovin: 'Ovin', caprin: 'Caprin' } as const;

/** Résout l'animal de l'URL, ou affiche « introuvable ». */
function WithAnimal({ render }: { render: (a: Animal) => ReactNode }) {
  const { id = '' } = useParams();
  const a = useStore().animal(id);
  if (!a) return <NotFound title="Fiche animale" text={`Aucun animal ne porte le numéro « ${id} » dans votre cheptel.`} to="/cheptel" cta="Voir mon cheptel" />;
  return <>{render(a)}</>;
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="card pad"><span className="small muted">{children}</span></div>;
}

function Timeline({ children }: { children: ReactNode }) {
  return <div className="tl">{children}</div>;
}

function TimelineItem({ dot = 'tld f', children }: { dot?: string; children: ReactNode }) {
  return (
    <div className="tli">
      <span className={dot}></span>
      <div className="col" style={{ gap: 4 }}>{children}</div>
    </div>
  );
}

const HEALTH_KIND = { obs: 'Observation sanitaire', trt: 'Traitement', vac: 'Vaccination' } as const;

const dotFor = (e: HealthEvent) => (e.pending ? 'tld a' : e.kind === 'obs' ? 'tld' : 'tld f');

/* Écran 07 : fiche individuelle et traçabilité avec galerie photos. */
export function AnimalSheet() {
  return <WithAnimal render={(a) => <AnimalSheetInner key={a.id} a={a} />} />;
}

const ANIMAL_PHOTO_LABELS = ['Profil', 'Trois-quarts', 'En parc', 'Boucle officielle', 'Pesée', 'Suivi sanitaire'];

function AnimalSheetInner({ a }: { a: Animal }) {
  const s = useStore();
  const navigate = useNavigate();
  const full = a.id === DEMO_ID;
  const recent = s.eventsFor(a.id).filter((e) => e.summary !== false).slice(0, 4);
  /* Seul le propriétaire (éleveur) saisit des observations ; les acheteurs consultent. */
  const owner = !!a.mine && s.isBreeder();
  const [tab, setTab] = useState(0);
  const tabs = ['Identité', 'Santé', 'Ascendance', 'Mouvements', 'Historique'];
  const gallery = a.photos?.length ? a.photos : a.photo ? [a.photo] : ['images/taurillon-goudali.jpg'];
  const [photoIdx, setPhotoIdx] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [docPreview, setDocPreview] = useState<PreviewData | null>(null);
  const activePhoto = gallery[photoIdx] ?? gallery[0];
  const [qr, setQr] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(a.name);
  const [editDetails, setEditDetails] = useState(a.details);
  const [editOfficial, setEditOfficial] = useState(a.officialId ?? '');
  const [editWeight, setEditWeight] = useState(() => {
    const w = animalMeasure(a)?.weight;
    return w ? String(w) : '';
  });
  const [confirmDel, setConfirmDel] = useState(false);

  const saveAnimal = () => {
    if (!editName.trim()) {
      showToast('Indiquez le nom de l’animal.');
      return;
    }
    const w = Number(editWeight.replace(/\D/g, ''));
    s.updateAnimal(a.id, {
      name: editName.trim(),
      details: editDetails.trim() || a.details,
      officialId: editOfficial.trim() || undefined,
      measure: w > 0 ? { ...(a.measure ?? {}), weight: w, weighedOn: today() } : a.measure,
    });
    setEditOpen(false);
    showToast(`Fiche ${a.id} mise à jour.`);
  };
  /* Vérification de la fiche demandée aux vétérinaires (réseau de l'appareil). */
  const check = owner ? s.validationOf(a.id) : undefined;

  /* Fiche d'identité (sections 2.1 et 2.2) et historique de traçabilité. */
  const listings = s.listings();
  const status = animalStatus(a, listings, s.orders());
  const measure = animalMeasure(a);
  const origin = animalOrigin(a);
  const ownFarm = a.mine && !s.session().demo;
  const farm = ownFarm ? (s.shop().created ? s.shop().name : 'Non renseignée') : 'Ferme Koné & Fils';
  const breeder = ownFarm ? s.session().name : 'Adama Koné';
  const sheet = listings.filter((l) => l.animalIds?.includes(a.id)).map(sheetOf).find(Boolean);
  const trace: TraceEvent[] = [
    ...(sheet?.events ?? []),
    ...s.eventsFor(a.id).filter((e) => !e.pending).map((e) => ({ date: e.date, kind: HEALTH_KIND[e.kind], text: e.title, by: 'Dossier sanitaire', proof: e.proof, file: e.file })),
    ...(measure?.weight && measure.weighedOn && !sheet?.events.some((e) => e.kind === 'Pesée')
      ? [{ date: measure.weighedOn, kind: 'Pesée', text: `${measure.weight} kg.`, by: breeder, proof: 'declared' as const }]
      : []),
  ];

  return (
    <div className="app">
      <Header back title="Fiche animale" actions={<button className="iconbtn" aria-label="Partager la fiche" onClick={() => share(`Fiche animale ${a.id}`, `${a.name}, fiche de traçabilité SAVAA`)}><Icon name="share" /></button>} />
      <div className="body flush">
        <div style={{ background: '#fff', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="row top" style={{ gap: 14 }}>
            <button type="button" className="plain" style={{ flex: 'none', cursor: 'zoom-in' }} aria-label="Agrandir la photo" onClick={() => setZoomOpen(true)}>
              <Photo label="Photo" w={96} h={96} radius={8} src={activePhoto} />
            </button>
            <div className="col grow" style={{ gap: 3 }}>
              <span className="small muted num">{a.id}, n° interne</span>
              <span className="b" style={{ fontSize: 17, lineHeight: 1.25 }}>{a.name}</span>
              <span className="small muted">{full ? 'Mâle, né le 12/09/2024 (26 mois)' : a.details}</span>
              <div className="wrap" style={{ marginTop: 4 }}>
                <Badge tone={a.tone}>{a.status}</Badge>
                {full && <Link className="badge bd-grey" to={`/annonce/${a.id}`}>Voir l’annonce</Link>}
                <button className="badge bd-grey" style={{ border: 0, cursor: 'pointer', font: 'inherit' }} onClick={() => setQr(true)}>QR code</button>
                {owner && (
                  <button className="badge bd-blue" style={{ border: 0, cursor: 'pointer', font: 'inherit' }} onClick={() => setEditOpen((v) => !v)}>
                    {editOpen ? 'Fermer' : 'Modifier'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {owner && editOpen && (
            <div className="card pad col" style={{ gap: 8, background: '#F8FAF8' }}>
              <span className="small b">Modifier {a.id}</span>
              <div className="grid2" style={{ gap: 8 }}>
                <div className="field">
                  <label className="xs muted" htmlFor="an-name">Nom / race</label>
                  <input id="an-name" className="input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="field">
                  <label className="xs muted" htmlFor="an-weight">Poids (kg)</label>
                  <input id="an-weight" className="input num" inputMode="numeric" placeholder="Ex. 320" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} />
                </div>
              </div>
              <div className="grid2" style={{ gap: 8 }}>
                <div className="field">
                  <label className="xs muted" htmlFor="an-det">Détails (sexe, âge)</label>
                  <input id="an-det" className="input" value={editDetails} onChange={(e) => setEditDetails(e.target.value)} />
                </div>
                <div className="field">
                  <label className="xs muted" htmlFor="an-oid">Identifiant officiel</label>
                  <input id="an-oid" className="input num" placeholder="CI-BOV-…" value={editOfficial} onChange={(e) => setEditOfficial(e.target.value)} />
                </div>
              </div>
              <div className="row between" style={{ gap: 8, flexWrap: 'wrap' }}>
                {!confirmDel ? (
                  <button className="plain xs" style={{ color: '#A0221A', cursor: 'pointer' }} onClick={() => setConfirmDel(true)}>Supprimer du cheptel</button>
                ) : (
                  <button
                    className="btn btn-danger btn-sm"
                    style={{ flex: 'none' }}
                    onClick={() => { s.removeAnimal(a.id); showToast(`${a.id} retiré du cheptel.`); navigate('/cheptel', { replace: true }); }}
                  >
                    Confirmer la suppression
                  </button>
                )}
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 'none' }} onClick={() => { setEditOpen(false); setConfirmDel(false); }}>Annuler</button>
                  <button className="btn btn-p btn-sm" style={{ flex: 'none' }} onClick={saveAnimal}>Enregistrer</button>
                </div>
              </div>
            </div>
          )}

          {gallery.length > 1 && (
            <div className="col" style={{ gap: 6 }}>
              <span className="row between xs muted">
                <span>Photos d’identification ({gallery.length})</span>
                <span>{ANIMAL_PHOTO_LABELS[photoIdx] ?? `Photo ${photoIdx + 1}`}</span>
              </span>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                {gallery.map((src, i) => (
                  <button
                    key={src + i}
                    onClick={() => setPhotoIdx(i)}
                    aria-label={`Photo ${i + 1}`}
                    aria-pressed={photoIdx === i}
                    style={{
                      flex: 'none',
                      width: 64,
                      height: 48,
                      borderRadius: 6,
                      padding: 0,
                      cursor: 'pointer',
                      border: photoIdx === i ? '2.5px solid #145C3A' : '1px solid #C5CDC7',
                      opacity: photoIdx === i ? 1 : 0.72,
                      backgroundImage: `url(${src})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="card" style={{ padding: 12, background: '#F8FAF8' }}>
            <div className="row between" style={{ gap: 8 }}>
              <span className="col" style={{ gap: 2 }}>
                <span className="xs muted">Identifiant officiel</span>
                <span className="b num ell">{a.officialId ?? 'À renseigner'}</span>
              </span>
              {check?.status === 'verified' ? <Badge tone="green">Vérifié</Badge> : check ? <Badge tone="blue">Demande envoyée</Badge> : <Badge tone={a.officialId ? 'amber' : 'grey'}>{a.officialId ? 'À vérifier' : 'À renseigner'}</Badge>}
            </div>
            <p className="xs muted" style={{ marginTop: 8, lineHeight: 1.45 }}>
              {check?.status === 'verified' && check.vet
                ? `Fiche contrôlée par ${check.vet.name} le ${check.answeredAt}.`
                : check
                  ? `Demande de vérification envoyée aux vétérinaires le ${check.date}.`
                  : a.officialId ? 'Saisi par l’éleveur, en attente de contrôle par un agent.' : 'Numéro de boucle officiel pas encore saisi.'}
            </p>
            {owner && a.officialId && !check && (
              <button className="btn btn-s btn-sm" style={{ marginTop: 8 }} onClick={() => { s.askValidation(a.id); showToast('Demande envoyée aux vétérinaires de la zone.'); }}>Demander la vérification</button>
            )}
          </div>
          <div className="wrap" style={{ gap: '6px 10px' }}>
            <span className="xs muted" style={{ width: '100%' }}>Niveaux de preuve</span>
            {Object.values(PROOF).map((p) => <Badge key={p.label} tone={p.tone}>{p.label}</Badge>)}
          </div>
        </div>
        <div className="utabs">
          {tabs.map((t, i) => <button key={t} className={tab === i ? 'on' : ''} onClick={() => setTab(i)}>{t}</button>)}
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tab === 0 && !full && (
            <div className="card pad">
              <dl className="kv">
                <dt>Espèce</dt><dd>{SPECIES_LABEL[a.species]}{a.info?.breed ? `, ${a.info.breed}` : ''}</dd>
                <dt>Description</dt><dd>{a.details}</dd>
                {a.info?.coat && <><dt>Robe</dt><dd>{a.info.coat}</dd></>}
                {a.info?.marks && <><dt>Signes</dt><dd>{a.info.marks}</dd></>}
                {a.info?.entry && <><dt>Entrée</dt><dd className="num">{a.info.entry}</dd></>}
                {a.info && <><dt>Ascendance</dt><dd>Mère {a.info.mother || 'inconnue'}, père {a.info.father || 'inconnu'}</dd></>}
                <dt>Exploitation</dt><dd>{a.mine && !s.session().demo ? (s.shop().created ? `${s.shop().name}, ${s.shop().town}` : 'Non renseignée') : 'Ferme Koné & Fils, Sinématiali'}</dd>
                <dt>Détenteur</dt><dd>{a.mine && !s.session().demo ? s.session().name : 'Adama Koné'}</dd>
              </dl>
            </div>
          )}
          {tab === 0 && !full && !!a.docs?.length && (
            <div className="card list">
              {a.docs.map((d) => (
                <button
                  key={d}
                  type="button"
                  className="li"
                  onClick={() => setDocPreview({ title: d, subtitle: `${a.id}, ${a.name}`, badge: ['Déclaré', 'grey'], details: [['Document', d], ['Animal', `${a.id}, ${a.name}`]], printable: true })}
                >
                  <Icon name="file" /><span className="grow small b ell">{d}</span><Badge>Déclaré</Badge>
                </button>
              ))}
            </div>
          )}
          {tab === 0 && full && (
            <>
              <div className="card pad">
                <dl className="kv">
                  <dt>Espèce / race</dt><dd>Bovin, Zébu Goudali</dd>
                  <dt>Robe</dt><dd>Blanc pie, cornes en lyre</dd>
                  <dt>Signes</dt><dd>Cicatrice flanc droit</dd>
                  <dt>Poids</dt><dd className="num">{a.measure?.weight ?? 312} kg, pesé le {a.measure?.weighedOn ?? '04/11/2026'} <Badge tone="blue">{a.measure?.weight ? 'Déclaré' : 'Documenté'}</Badge></dd>
                  <dt>Exploitation</dt><dd>Ferme Koné &amp; Fils, Sinématiali</dd>
                  <dt>Détenteur</dt><dd>Adama Koné</dd>
                  <dt>Élevage</dt><dd>Semi-intensif, pâturage + complément</dd>
                  <dt>Entrée</dt><dd className="num">12/09/2024, né sur place</dd>
                </dl>
              </div>
              <div className="card pad col" style={{ gap: 8 }}>
                <span className="b small">Alimentation déclarée</span>
                <span className="small muted">Pâturage naturel, tourteau de coton 1,5 kg/j, pierre à lécher. <Badge>Déclaré</Badge></span>
              </div>
            </>
          )}
          {tab === 0 && (
            <>
              <Section title="Identification et état" open>
                <dl className="kv">
                  <dt>Statut</dt><dd><Badge tone={status.tone}>{status.label}</Badge></dd>
                  <dt>Vocation</dt><dd>{animalPurpose(a, listings)}</dd>
                  <dt>Poids actuel</dt><dd className="num">{measure?.weight ? `${measure.weight} kg` : '—'}</dd>
                  <dt>Dernière pesée</dt><dd className="num">{measure?.weighedOn ?? '—'}</dd>
                  <dt>Mensurations</dt><dd>{measure?.size || '—'}</dd>
                  <dt>État général observé</dt><dd>{measure?.condition || '—'}</dd>
                </dl>
                <p className="xs muted">Le numéro SAVAA ({a.id}) ne remplace pas le numéro officiel d’identification.</p>
              </Section>
              <Section title="Origine">
                <dl className="kv">
                  <dt>Pays</dt><dd>{origin?.country ?? 'Côte d’Ivoire'}</dd>
                  <dt>Région</dt><dd>{origin?.region || '—'}</dd>
                  <dt>Département</dt><dd>{origin?.department || '—'}</dd>
                  <dt>Commune</dt><dd>{origin?.town || '—'}</dd>
                  {origin?.locality && <><dt>Localité</dt><dd>{origin.locality}</dd></>}
                  <dt>Exploitation</dt><dd>{farm}</dd>
                  <dt>Éleveur</dt><dd>{breeder}</dd>
                </dl>
              </Section>
              <Section title="Historique de traçabilité" aside={<span className="xs muted num">{trace.length}</span>}>
                <TraceTimeline events={trace} />
                {sheet && <Link className="link row between" to={`/fiche/${sheet.code}`}>Fiche produit {sheet.code}<Icon name="chevron" size="sm" /></Link>}
              </Section>
            </>
          )}
          {tab === 1 && (
            <>
              {recent.length === 0 ? <Empty>Aucun événement sanitaire enregistré pour cet animal.</Empty> : <div className="card pad">
                <Timeline>
                  {recent.map((e) => (
                    <TimelineItem key={e.date + e.title} dot={dotFor(e)}>
                      <span className="row between" style={{ gap: 8 }}><span className="b small">{(e.summary && e.summary.title) || e.title}</span>{e.pending ? <Badge tone="amber">En attente d’envoi</Badge> : <Badge tone={PROOF[e.proof].tone}>{PROOF[e.proof].label}</Badge>}</span>
                      <span className="xs muted num">{e.summary ? e.summary.sub : e.date}</span>
                      {!!e.photos?.length && (
                        <span className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                          {e.photos.map((p, i) => <Photo key={i} src={p} label={`Photo ${i + 1}`} w={56} h={44} radius={6} />)}
                        </span>
                      )}
                    </TimelineItem>
                  ))}
                </Timeline>
              </div>}
              <Link className="btn btn-s btn-block" to={`/animal/${a.id}/sante`}>Dossier sanitaire complet</Link>
            </>
          )}
          {tab === 2 && !full && (
            a.info ? (
              <div className="grid2">
                <div className="card pad col" style={{ gap: 4 }}>
                  <Photo w="100%" h={72} radius={6} src={a.photos?.[1] ?? a.photo} />
                  <span className="xs muted">Père</span>
                  <span className="b small">{a.info.father || 'Inconnu'}</span>
                  <Badge style={{ alignSelf: 'flex-start', marginTop: 2 }}>Déclaré</Badge>
                </div>
                <div className="card pad col" style={{ gap: 4 }}>
                  <Photo w="100%" h={72} radius={6} src={a.photos?.[0] ?? a.photo} />
                  <span className="xs muted">Mère</span>
                  <span className="b small">{a.info.mother || 'Inconnue'}</span>
                  <Badge style={{ alignSelf: 'flex-start', marginTop: 2 }}>Déclaré</Badge>
                </div>
              </div>
            ) : <Empty>Rien n’a encore été saisi dans cet onglet pour cet animal.</Empty>
          )}
          {tab > 2 && !full && <Empty>Rien n’a encore été saisi dans cet onglet pour cet animal.</Empty>}
          {tab === 2 && full && (
            <>
              <div className="grid2">
                <div className="card pad col" style={{ gap: 4 }}>
                  <Photo w="100%" h={76} radius={6} src="images/taureau-reproducteur.jpg" />
                  <span className="xs muted">Père</span>
                  <span className="b small">Taureau Goudali</span>
                  <span className="xs muted num">CI-BOV-2019-•••0233</span>
                  <Badge tone="blue" style={{ alignSelf: 'flex-start', marginTop: 4 }}>Documenté</Badge>
                </div>
                <div className="card pad col" style={{ gap: 4 }}>
                  <Photo w="100%" h={76} radius={6} src="images/taurillon-goudali-troupeau.jpg" />
                  <span className="xs muted">Mère</span>
                  <span className="b small">FK-0041, Zébu</span>
                  <span className="xs muted">Née sur l’exploitation</span>
                  <Badge style={{ alignSelf: 'flex-start', marginTop: 4 }}>Déclaré</Badge>
                </div>
              </div>
              <p className="hint">Saillie naturelle, géniteur loué à la Ferme Silué (Napiéolédougou), contrat joint.</p>
            </>
          )}
          {tab === 3 && full && (
            <div className="card pad">
              <Timeline>
                <TimelineItem dot="tld o"><span className="b small">Mise en vente sur SAVAA</span><span className="xs muted num">06/11/2026, annonce n° A-20931</span></TimelineItem>
                <TimelineItem><span className="b small">Transhumance courte, parc de Kassoumbarga</span><span className="xs muted">Juin à sept. 2026, retour le 21/09</span></TimelineItem>
                <TimelineItem><span className="b small">Naissance sur l’exploitation</span><span className="xs muted num">12/09/2024, Sinématiali</span></TimelineItem>
              </Timeline>
            </div>
          )}
          {tab === 4 && full && (
            <div className="card list">
              {[
                ['Poids modifié : 298 → 312 kg', '04/11/2026 15:22, A. Koné'],
                ['Vaccin PPCB validé', '02/10/2026 11:05, Dr Y. Coulibaly'],
                ['Identifiant officiel ajouté', '20/03/2025 09:40, A. Koné'],
              ].map(([t, d]) => (
                <div className="li" key={t}><div className="col grow"><span className="small b">{t}</span><span className="xs muted num">{d}</span></div></div>
              ))}
            </div>
          )}
          <p className="xs muted" style={{ lineHeight: 1.45 }}>Mise à jour le 14/11/2026. Ne remplace pas un certificat sanitaire officiel.</p>
        </div>
      </div>
      <PreviewModal
        data={docPreview ?? (zoomOpen ? { title: `${a.id}, ${a.name}`, subtitle: ANIMAL_PHOTO_LABELS[photoIdx] ?? `Photo ${photoIdx + 1}`, images: gallery, startIndex: photoIdx } : null)}
        onClose={() => { setZoomOpen(false); setDocPreview(null); }}
      />
      {qr && <QrDialog code={sheet?.code ?? a.id} title={a.name} url={sheet ? ficheUrl(sheet.code) : animalUrl(a.id)} onClose={() => setQr(false)} />}
      <Foot>
        {owner && <Link className="btn btn-s" to={`/animal/${a.id}/observation`}>Observation</Link>}
        <Link className="btn btn-p" to={`/animal/${a.id}/sante`}>Dossier sanitaire</Link>
      </Foot>
    </div>
  );
}

/* Écran 10 : chronologie sanitaire filtrable. */
export function HealthRecord() {
  return <WithAnimal render={(a) => <HealthRecordInner key={a.id} a={a} />} />;
}

function HealthRecordInner({ a }: { a: Animal }) {
  const s = useStore();
  const [filter, setFilter] = useState<EventKind | 'all'>('all');
  const [careOpen, setCareOpen] = useState(false);
  const [careKind, setCareKind] = useState<'vac' | 'trt' | 'pesee'>('vac');
  const [careTitle, setCareTitle] = useState('');
  const [careText, setCareText] = useState('');
  const [careWeight, setCareWeight] = useState('');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const all = s.eventsFor(a.id);
  const events = all.filter((e) => filter === 'all' || e.kind === filter);
  const F: [EventKind | 'all', string][] = [['all', 'Tout'], ['obs', 'Observ.'], ['trt', 'Traitem.'], ['vac', 'Vaccins']];

  const saveCare = () => {
    if (careKind === 'pesee') {
      const w = Number(careWeight.replace(/\D/g, ''));
      if (!w || w < 1) {
        showToast('Indiquez un poids valide en kg.');
        return;
      }
      s.updateAnimal(a.id, { measure: { ...(a.measure ?? {}), weight: w, weighedOn: today() } });
      s.addEvent({
        animalId: a.id,
        kind: 'trt',
        date: today(),
        title: `Pesée : ${w} kg`,
        text: careText.trim() || `Nouvelle pesée enregistrée (${w} kg).`,
        proof: 'declared',
      });
      setCareWeight(''); setCareText(''); setCareOpen(false);
      showToast(`Pesée de ${w} kg enregistrée.`);
      return;
    }
    if (!careTitle.trim()) {
      showToast('Indiquez le nom du vaccin ou traitement.');
      return;
    }
    s.addEvent({
      animalId: a.id,
      kind: careKind,
      date: today(),
      title: careTitle.trim(),
      text: careText.trim() || (careKind === 'vac' ? 'Vaccination enregistrée par l’éleveur.' : 'Traitement enregistré par l’éleveur.'),
      proof: 'declared',
    });
    setCareTitle(''); setCareText(''); setCareOpen(false);
    showToast(careKind === 'vac' ? 'Vaccin enregistré.' : 'Traitement enregistré.');
  };

  return (
    <div className="app">
      <Header back title="Dossier sanitaire" sub={`${a.id}, ${a.name}`} actions={<button className="iconbtn" aria-label="Exporter en PDF" onClick={printPage}><Icon name="download" /></button>} />
      <div style={{ background: '#fff', borderBottom: '1px solid #E3E7E4', padding: '12px 16px', flex: 'none' }}>
        <div className="seg">
          {F.map(([k, t]) => <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{t}</button>)}
        </div>
      </div>
      <div className="body">
        {careOpen && a.mine && s.isBreeder() && (
          <div className="card pad col" style={{ gap: 10, background: '#F8FAF8', borderColor: '#CFE0D4' }}>
            <div className="row between">
              <span className="small b">Enregistrer un soin ou une pesée</span>
              <button className="plain xs muted" onClick={() => setCareOpen(false)}>Fermer</button>
            </div>
            <div className="seg">
              <button className={careKind === 'vac' ? 'on' : ''} onClick={() => setCareKind('vac')}>Vaccin</button>
              <button className={careKind === 'trt' ? 'on' : ''} onClick={() => setCareKind('trt')}>Traitement</button>
              <button className={careKind === 'pesee' ? 'on' : ''} onClick={() => setCareKind('pesee')}>Pesée</button>
            </div>
            {careKind === 'pesee' ? (
              <div className="field">
                <label className="xs muted" htmlFor="care-w">Poids mesuré (kg)</label>
                <input id="care-w" className="input num" inputMode="numeric" placeholder="Ex. 325" value={careWeight} onChange={(e) => setCareWeight(e.target.value)} />
              </div>
            ) : (
              <div className="field">
                <label className="xs muted" htmlFor="care-t">{careKind === 'vac' ? 'Vaccin administré' : 'Traitement / vermifuge'}</label>
                <input id="care-t" className="input" placeholder={careKind === 'vac' ? 'Ex. Vaccination PPCB' : 'Ex. Vermifuge Ivermectine'} value={careTitle} onChange={(e) => setCareTitle(e.target.value)} />
              </div>
            )}
            <div className="field">
              <label className="xs muted" htmlFor="care-n">Notes (optionnel)</label>
              <input id="care-n" className="input" placeholder="Lot, dose, vétérinaire…" value={careText} onChange={(e) => setCareText(e.target.value)} />
            </div>
            <button className="btn btn-p btn-sm" onClick={saveCare}>Enregistrer au dossier</button>
          </div>
        )}
        <div className="grid3">
          <button type="button" className="card stat" style={{ padding: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }} onClick={() => setFilter(filter === 'vac' ? 'all' : 'vac')}><span className="v">{all.filter((e) => e.kind === 'vac').length}</span><span className="l">Vaccins</span></button>
          <button type="button" className="card stat" style={{ padding: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }} onClick={() => setFilter(filter === 'trt' ? 'all' : 'trt')}><span className="v">{all.filter((e) => e.kind === 'trt').length}</span><span className="l">Traitements</span></button>
          <button type="button" className="card stat" style={{ padding: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }} onClick={() => setFilter(filter === 'obs' ? 'all' : 'obs')}><span className="v">{all.filter((e) => e.pending).length}</span><span className="l">En attente d’envoi</span></button>
        </div>
        {a.id === DEMO_ID && (
          <div className="notice n-grey">
            <Icon name="calendar" size="sm" />
            <span>Prochain rappel : <b>PPCB le 02/10/2027</b>. Rappel envoyé 15 jours avant.</span>
          </div>
        )}
        <div className="card pad">
          {events.length === 0 ? (
            <span className="small muted">{all.length ? 'Aucun événement de ce type.' : 'Aucun événement sanitaire enregistré pour cet animal.'}</span>
          ) : (
            <Timeline>
              {events.map((e) => (
                <TimelineItem key={e.date + e.title} dot={dotFor(e)}>
                  <span className="row between" style={{ gap: 8 }}>
                    <span className="xs muted num">{e.date}</span>
                    {e.pending ? <Badge tone="amber">En attente d’envoi</Badge> : <Badge tone={PROOF[e.proof].tone}>{PROOF[e.proof].label}</Badge>}
                  </span>
                  <span className="b small">{e.title}</span>
                  <span className="small muted" style={{ lineHeight: 1.45 }}>{e.text}</span>
                  {e.file && (
                    <button
                      type="button"
                      className="row xs plain"
                      style={{ gap: 6, color: '#145C3A', fontWeight: 600, cursor: 'pointer' }}
                      onClick={() => setPreview({
                        title: e.file ?? 'Justificatif sanitaire',
                        subtitle: `${a.id}, ${a.name}`,
                        badge: [PROOF[e.proof].label, PROOF[e.proof].tone],
                        details: [['Événement', e.title], ['Date', e.date], ['Fichier', e.file ?? '—']],
                        note: e.text,
                        printable: true,
                      })}
                    >
                      <Icon name="file" size="sm" />{e.file}
                    </button>
                  )}
                  {!!e.photos?.length && (
                    <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                      {e.photos.map((p, i) => (
                        <button key={i} type="button" className="plain" style={{ cursor: 'zoom-in' }} onClick={() => setPreview({ title: e.title, subtitle: `${a.id}, ${e.date}`, images: e.photos, startIndex: i })}>
                          <Photo src={p} label={`Photo ${i + 1}`} w={64} h={64} radius={6} />
                        </button>
                      ))}
                    </span>
                  )}
                </TimelineItem>
              ))}
            </Timeline>
          )}
        </div>
      </div>
      {a.mine && s.isBreeder() && (
        <Foot>
          <button className="btn btn-s" onClick={() => setCareOpen((v) => !v)}>{careOpen ? 'Fermer' : 'Soin / Pesée'}</button>
          <Link className="btn btn-p" to={`/animal/${a.id}/observation`}>Observation</Link>
        </Foot>
      )}
      <PreviewModal data={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

const SIGNS = ['Appétit réduit', 'Abattement', 'Toux', 'Diarrhée', 'Boiterie', 'Écoulement', 'Comportement', 'Baisse de production', 'Autre'];
const LEVELS: Record<string, string> = {
  Faible: 'Suivi normal, rappel dans 48 h.',
  Moyenne: 'Votre vétérinaire référent est notifié.',
  Élevée: 'Vétérinaire notifié, appel recommandé immédiatement.',
};

/* Écran 11 : observation et alerte, saisie hors connexion. */
export function Observation() {
  /* Seul le propriétaire de l'animal saisit une observation, même en tapant l'adresse. */
  return (
    <WithAnimal
      render={(a) => (a.mine
        ? <ObservationInner key={a.id} a={a} />
        : <NotFound title="Nouvelle observation" text={`${a.id} n’est pas dans votre cheptel : seul son éleveur peut y ajouter une observation.`} to={`/animal/${a.id}`} cta="Voir la fiche" />)}
    />
  );
}

function ObservationInner({ a }: { a: Animal }) {
  const s = useStore();
  const navigate = useNavigate();
  const online = useOnline();
  const [sel, setSel] = useState<string[]>([]);
  const [level, setLevel] = useState('Moyenne');
  const [text, setText] = useState('');
  const [date, setDate] = useState(today);
  const [time, setTime] = useState(nowTime);
  const [photos, setPhotos] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const toggle = (x: string) => setSel(sel.includes(x) ? sel.filter((y) => y !== x) : [...sel, x]);
  const save = () => {
    s.addEvent({
      animalId: a.id,
      kind: 'obs',
      date: date.trim() || today(),
      title: `Observation : ${sel.length ? sel.join(', ').toLowerCase() : 'signe non précisé'}`,
      text: `${text.trim()} Urgence ${level.toLowerCase()}, relevée à ${time}.`,
      proof: 'declared',
      pending: !online,
      photos,
    });
    setDone(true);
  };

  return (
    <div className="app">
      <Header close title="Nouvelle observation" />
      {!online && (
        <div className="row small" style={{ background: '#FCF1DC', color: '#5E3904', padding: '8px 16px', flex: 'none' }}>
          <Icon name="offline" size="sm" />
          <span className="grow">Hors connexion. Envoi automatique au retour du réseau.</span>
        </div>
      )}
      {!done ? (
        <>
          <div className="body" style={{ gap: 20 }}>
            <div className="card row" style={{ padding: '10px 12px' }}>
              <Photo w={44} h={44} radius={6} src={a.photo} />
              <div className="col grow"><span className="b small ell">{a.id}, {a.name}</span><span className="xs muted">{s.shop().created ? s.shop().name : s.session().pro?.['eleveur.ferme'] || s.session().name}</span></div>
            </div>
            <div className="field">
              <span className="lbl">Signes observés</span>
              <div className="wrap" style={{ gap: 8 }}>
                {SIGNS.map((x) => <button key={x} className={`chip${sel.includes(x) ? ' on' : ''}`} onClick={() => toggle(x)}>{x}</button>)}
              </div>
            </div>
            <div className="grid2">
              <div className="field"><label htmlFor="d">Date</label><input id="d" className="input num" inputMode="numeric" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <div className="field"><label htmlFor="h">Heure</label><input id="h" className="input num" inputMode="numeric" value={time} onChange={(e) => setTime(e.target.value)} /></div>
            </div>
            <div className="field"><label htmlFor="desc">Description</label><textarea id="desc" className="input" placeholder="Ce que vous avez constaté, depuis quand…" value={text} onChange={(e) => setText(e.target.value)} /></div>
            <div className="field">
              <span className="lbl">Photo ou vidéo</span>
              <div className="grid3">
                {photos.map((p, i) => <Photo key={i} src={p} label={`Photo ${i + 1}`} h={84} radius={8} onRemove={() => setPhotos(photos.filter((_, j) => j !== i))} />)}
                {photos.length < 5 && <PhotoAdd height={84} onAdd={(p) => setPhotos((x) => [...x, p])} />}
              </div>
            </div>
            <div className="field">
              <span className="lbl">Niveau d’urgence</span>
              <div className="seg">
                {Object.keys(LEVELS).map((l) => <button key={l} className={level === l ? 'on' : ''} onClick={() => setLevel(l)}>{l}</button>)}
              </div>
              <span className="hint">{LEVELS[level]}</span>
            </div>
            <div className="notice n-red">
              <Icon name="alert" size="sm" />
              <span>Une alerte n’est pas un diagnostic. Si l’état s’aggrave, appelez un vétérinaire.</span>
            </div>
          </div>
          <Foot><button className="btn btn-p" disabled={!sel.length && !text.trim()} onClick={save}>Enregistrer et alerter</button></Foot>
        </>
      ) : (
        <div className="body" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 14, padding: 32 }}>
          <Icon name="check" style={{ width: 56, height: 56, color: '#145C3A', strokeWidth: 1.4 }} />
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Observation enregistrée</h2>
          <p className="muted small" style={{ lineHeight: 1.5 }}>Enregistrée sur le téléphone. Elle sera ajoutée au dossier et transmise à votre vétérinaire référent dès le retour du réseau.</p>
          <div className="card pad" style={{ width: '100%', textAlign: 'left' }}>
            <dl className="kv">
              <dt>Animal</dt><dd>{a.id}</dd>
              <dt>Signes</dt><dd>{sel.join(', ') || 'Aucun'}</dd>
              <dt>Urgence</dt><dd>{level}</dd>
              <dt>Statut</dt><dd><Badge tone="amber">En attente d’envoi</Badge></dd>
            </dl>
          </div>
          <button className="btn btn-p btn-block" onClick={() => navigate(`/animal/${a.id}/sante`, { replace: true })}>Voir le dossier</button>
          <button className="btn btn-ghost btn-block" onClick={() => { setDone(false); setSel([]); setText(''); setPhotos([]); setLevel('Moyenne'); }}>Nouvelle observation</button>
        </div>
      )}
    </div>
  );
}
