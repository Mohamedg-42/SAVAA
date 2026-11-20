import { Fragment, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { PROOF, fcfa, useStore, type Listing, type Proof, type TraceEvent, type TraceSheet } from '../data';
import { share } from '../device';
import { ficheUrl, sheetOf, sheetStatus, traceCategory, unitPrice, unitQty } from '../trace';
import { Badge, Header, Icon, NotFound, Photo, Section } from '../ui';

/* Fiche d'identité et de traçabilité d'un produit (parties A à E du cahier des charges), ouverte depuis l'annonce ou par son QR code. */

/** Fenêtre du QR code d'une fiche (fiche produit et fiche animale). */
export function QrDialog({ code, title, url, onClose }: { code: string; title: string; url: string; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-title"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(23, 32, 27, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 40 }}
    >
      <div className="card pad col" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 340, gap: 14, borderRadius: 14, boxShadow: '0 12px 32px rgba(0,0,0,.24)', alignItems: 'center', textAlign: 'center' }}>
        <span id="qr-title" className="b" style={{ fontSize: 17 }}>{title}</span>
        <div style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #E3E7E4' }}>
          <div role="img" aria-label={`QR code de la fiche ${code}`}><QRCode value={url} size={196} fgColor="#17201B" /></div>
        </div>
        <span className="small b num">{code}</span>
        <p className="xs muted" style={{ lineHeight: 1.5 }}>Scanné avec un téléphone, ce code ouvre la fiche de traçabilité sur SAVAA.</p>
        <div className="row" style={{ gap: 10, width: '100%' }}>
          <button className="btn btn-s grow" onClick={() => void share(title, `Fiche de traçabilité ${code}`)}>Partager</button>
          <button className="btn btn-p grow" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

/** Explication des 4 niveaux de preuve. */
const PROOF_TEXT: Record<Proof, string> = {
  declared: 'saisi par le vendeur',
  documented: 'un justificatif est joint',
  verified: 'contrôlé par l’équipe SAVAA ou un vétérinaire',
  certified: 'attesté par un organisme officiel',
};

export function ProofLegend() {
  return (
    <div className="col" style={{ gap: 6 }}>
      {(Object.keys(PROOF) as Proof[]).map((p) => (
        <span key={p} className="row xs" style={{ gap: 8 }}><Badge tone={PROOF[p].tone}>{PROOF[p].label}</Badge><span className="muted">{PROOF_TEXT[p]}</span></span>
      ))}
    </div>
  );
}

/** Date « JJ/MM/AAAA [HH:MM] » en clé de tri. */
const sortKey = (d: string) => {
  const [day, time = ''] = d.split(' ');
  const [dd, mm, yy] = day.split('/');
  return `${yy}${mm}${dd}${time}`;
};

/** Historique en frise, du plus récent au plus ancien. */
export function TraceTimeline({ events }: { events: TraceEvent[] }) {
  const list = [...events].sort((a, b) => sortKey(b.date).localeCompare(sortKey(a.date)));
  if (!list.length) return <span className="small muted">Aucun événement enregistré.</span>;
  return (
    <div className="tl">
      {list.map((e, i) => (
        <div key={i} className="tli">
          <span className={e.proof === 'declared' ? 'tld' : 'tld f'}></span>
          <div className="col" style={{ gap: 4, minWidth: 0 }}>
            <div className="row between" style={{ gap: 8, alignItems: 'flex-start' }}>
              <span className="small b">{e.kind}</span>
              <Badge tone={PROOF[e.proof].tone}>{PROOF[e.proof].label}</Badge>
            </div>
            <span className="xs muted num">{e.date}{e.place ? `, ${e.place}` : ''}</span>
            <span className="small" style={{ lineHeight: 1.45 }}>{e.text}</span>
            <span className="xs muted">Responsable : {e.by}{e.file ? `. Justificatif : ${e.file}` : ''}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const maskPhone = (p: string) => {
  const d = p.replace(/\D/g, '');
  return d.length === 10 ? `+225 ${d.slice(0, 2)} •• •• •• ${d.slice(8)}` : 'Non communiqué';
};

const HEALTH_KIND = { obs: 'Observation sanitaire', trt: 'Traitement', vac: 'Vaccination' } as const;

export function ProductSheet() {
  const { code = '' } = useParams();
  const s = useStore();
  const l = s.listings().find((x) => sheetOf(x)?.code === code);
  const sheet = l && sheetOf(l);
  if (!l || !sheet) {
    return <NotFound title="Fiche introuvable" text="Ce code de traçabilité ne correspond à aucune fiche sur SAVAA." to="/explorer" cta="Parcourir le catalogue" />;
  }
  return <ProductSheetInner l={l} sheet={sheet} />;
}

function ProductSheetInner({ l, sheet }: { l: Listing; sheet: TraceSheet }) {
  const s = useStore();
  const [qr, setQr] = useState(false);
  const cat = traceCategory(sheet.category);
  const status = sheetStatus(l);
  const { origin, sale, seller } = sheet;

  /* Pour un animal du cheptel, l'historique reprend aussi son dossier sanitaire. */
  const health: TraceEvent[] = (l.animalIds ?? []).flatMap((id) =>
    s.eventsFor(id).filter((e) => !e.pending).map((e) => ({ date: e.date, kind: `${HEALTH_KIND[e.kind]}, ${id}`, text: e.title, by: 'Dossier sanitaire de l’animal', proof: e.proof, file: e.file })),
  );
  const events = [...sheet.events, ...health];
  const extra = Object.entries(sheet.extra);
  const photo = l.photos?.[0];

  return (
    <div className="app">
      <Header back title="Fiche produit" />
      <div className="body" style={{ gap: 14 }}>
        <div className="card pad col" style={{ gap: 12 }}>
          <div className="row top" style={{ gap: 12 }}>
            <Photo w={72} h={72} radius={8} src={photo} label={photo ? undefined : l.photo} tint={l.tint} />
            <div className="col grow" style={{ gap: 4, minWidth: 0 }}>
              <span className="b" style={{ fontSize: 16, lineHeight: 1.3 }}>{l.title}</span>
              <span className="xs muted">Code de traçabilité</span>
              <span className="small b num">{sheet.code}</span>
            </div>
          </div>
          <div className="wrap" style={{ gap: 6 }}>
            <Badge tone={status.tone}>{status.label}</Badge>
            {cat && <Badge tone="blue">{cat.label}</Badge>}
          </div>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-p grow" onClick={() => setQr(true)}>Afficher le QR code</button>
            <Link className="btn btn-s" style={{ flex: '0 0 auto' }} to={`/annonce/${l.id}`}>L’annonce</Link>
          </div>
        </div>

        <Section title="Produit" open>
          <dl className="kv">
            <dt>Identifiant SAVAA</dt><dd className="num">{l.id}</dd>
            <dt>Catégorie</dt><dd>{cat?.label ?? '—'}</dd>
            <dt>Sous-catégorie</dt><dd>{sheet.sub}</dd>
            {sheet.brand && <><dt>Marque ou variété</dt><dd>{sheet.brand}</dd></>}
            {extra.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}
            <dt>Photos</dt><dd className="num">{l.photos?.length ?? 0}</dd>
          </dl>
          {l.description && <p className="small" style={{ lineHeight: 1.5 }}>{l.description}</p>}
          {!!l.animalIds?.length && (
            <div className="col" style={{ gap: 6 }}>
              {l.animalIds.map((id) => <Link key={id} className="link row between" to={`/animal/${id}`}>Fiche animale {id}<Icon name="chevron" size="sm" /></Link>)}
            </div>
          )}
        </Section>

        <Section title="Vendeur" aside={l.sellerVerified ? <Badge tone="green">Compte vérifié</Badge> : <Badge>Non vérifié</Badge>}>
          <dl className="kv">
            <dt>Nom</dt><dd>{seller.name}</dd>
            <dt>Type d’acteur</dt><dd>{seller.actor}</dd>
            <dt>Téléphone</dt><dd className="num">{maskPhone(seller.phone)}</dd>
            <dt>Zone d’activité</dt><dd>{origin.region}</dd>
          </dl>
          <p className="xs muted">Le numéro est masqué sur la fiche publique. Pour joindre le vendeur, passez par l’annonce.</p>
        </Section>

        <Section title="Origine">
          <dl className="kv">
            <dt>Pays</dt><dd>{origin.country}</dd>
            <dt>Région</dt><dd>{origin.region}</dd>
            <dt>Département</dt><dd>{origin.department || '—'}</dd>
            <dt>Commune</dt><dd>{origin.town}</dd>
            {origin.locality && <><dt>Localité</dt><dd>{origin.locality}</dd></>}
            <dt>Exploitation</dt><dd>{origin.farm}</dd>
            {origin.producedOn && <><dt>{cat?.live ? 'Naissance ou acquisition' : 'Production ou récolte'}</dt><dd className="num">{origin.producedOn}</dd></>}
          </dl>
        </Section>

        <Section title="Prix et vente">
          <dl className="kv">
            <dt>Prix</dt><dd className="num">{fcfa(l.price)} FCFA {l.unit ?? unitPrice(sale.unit)}</dd>
            <dt>Négociable</dt><dd>{l.negotiable ? 'Oui' : 'Non'}</dd>
            <dt>Disponible</dt><dd className="num">{unitQty(l.stock ?? 1, sale.unit)}</dd>
            <dt>Commande minimale</dt><dd className="num">{unitQty(sale.minQty, sale.unit)}</dd>
            {sale.available && <><dt>À partir du</dt><dd className="num">{sale.available}</dd></>}
            <dt>Remise</dt><dd>{sale.handover}</dd>
            <dt>Lieu</dt><dd>{l.place}</dd>
          </dl>
        </Section>

        <Section title="Traçabilité" aside={<span className="xs muted num">{events.length}</span>} open>
          <TraceTimeline events={events} />
          <div className="divider" />
          <span className="xs b">Niveaux de preuve</span>
          <ProofLegend />
        </Section>

        <p className="hint">Les informations « déclarées » engagent le vendeur. SAVAA ne remplace pas un certificat sanitaire ou phytosanitaire officiel.</p>
      </div>
      {qr && <QrDialog code={sheet.code} title={l.title} url={ficheUrl(sheet.code)} onClose={() => setQr(false)} />}
    </div>
  );
}
