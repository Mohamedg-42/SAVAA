import { Fragment, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CI_REGIONS, fcfa, priceLabel, today, useStore, type Listing, type TraceSheet } from '../data';
import { ACTORS, HANDOVER, HERD_SPECIES, TRACE_CATEGORIES, UNITS, newTraceCode, nowStamp, sheetOf, subsFor, traceCategory, unitPrice, unitQty } from '../trace';
import { DashHeader, Kpis, TodayCard } from '../dash';
import { downloadCSV } from '../device';
import { clearToast, showToast } from '../toast';
import { Badge, Check, Foot, Header, Icon, Photo, PhotoAdd, TabBar } from '../ui';
import { SalesList } from './tableaux';
import { ClientInvoices, ClientRecurring, RecurringSetup } from './devis';

/* Lot 5 : vente (boutique, publication, campagne, statistiques, espace restaurant). */

/** Bouton « ligne + interrupteur » de la maquette. */
const rowBtn: CSSProperties = { border: 0, background: 'none', padding: 0, fontFamily: 'inherit', color: 'inherit', cursor: 'pointer', textAlign: 'left' };
/** Boutons dont le libellé peut passer sur deux lignes à 320 px. */
const wrapBtn: CSSProperties = { minWidth: 0, whiteSpace: 'normal', lineHeight: 1.2, padding: '0 6px' };
/** Champ de saisie sans bordure placé dans un `.input` (avec suffixe). */
const bare: CSSProperties = { outline: 'none', cursor: 'text', minWidth: 0 };

function Toggle({ on }: { on: boolean }) {
  return <span className={`toggle${on ? ' on' : ''}`} />;
}

/** Interrupteur avec libellé et sous-titre. */
function ToggleRow({ on, onClick, title, sub }: { on: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <button className="row" style={rowBtn} onClick={onClick} aria-pressed={on}>
      <span className="col grow"><span className="small b">{title}</span><span className="xs muted">{sub}</span></span>
      <Toggle on={on} />
    </button>
  );
}

/** Liste de puces à choix multiples. */
function ChipPicker({ items, sel, onToggle }: { items: string[]; sel: Record<string, boolean>; onToggle: (t: string) => void }) {
  return (
    <div className="wrap" style={{ gap: 8 }}>
      {items.map((t) => (
        <button key={t} className={`chip${sel[t] ? ' on' : ''}`} aria-pressed={!!sel[t]} onClick={() => onToggle(t)}>{t}</button>
      ))}
    </div>
  );
}

/** Saisie d'un montant entier, affiché avec séparateur de milliers. */
const parseAmount = (v: string) => Number(v.replace(/\D/g, '').slice(0, 9));

/* Écran 12b : créer ma boutique */

const SHOP_CATS = ['Bovins', 'Ovins et caprins', 'Volailles', 'Récoltes', 'Aliments et intrants', 'Matériel'];

export function CreateShop() {
  const s = useStore();
  const shop = s.shop();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');
  const session = s.session();
  const [name, setName] = useState(shop.name);
  const [logo, setLogo] = useState(shop.logo);
  const [desc, setDesc] = useState(shop.desc);
  const [town, setTown] = useState(shop.town);
  const [cats, setCats] = useState<Record<string, boolean>>({});
  const [delivery, setDelivery] = useState(true);
  const [cgv, setCgv] = useState(false);
  const ready = cgv && name.trim() !== '' && Object.values(cats).some(Boolean);

  return (
    <div className="app">
      <Header back title="Créer ma boutique" actions={<span className="small muted" style={{ paddingRight: 12, flex: 'none' }}>Étape 3 sur 3</span>} />
      <div className="body" style={{ gap: 20 }}>
        <div className="row" style={{ gap: 14 }}>
          {logo ? (
            <Photo src={logo} label="Logo de la boutique" w={76} h={76} radius={12} onRemove={() => setLogo(undefined)} />
          ) : (
            <PhotoAdd height={76} label="Logo" onAdd={setLogo} style={{ width: 76, borderRadius: 12, flex: 'none' }} />
          )}
          <div className="field grow">
            <label htmlFor="shop-name">Nom de la boutique</label>
            <input id="shop-name" className="input" placeholder="Ex. Ferme Traoré" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <span className="lbl">Ce que vous vendez</span>
          <ChipPicker items={SHOP_CATS} sel={cats} onToggle={(t) => setCats({ ...cats, [t]: !cats[t] })} />
        </div>
        <div className="field">
          <label htmlFor="shop-desc">Présentation</label>
          <textarea id="shop-desc" className="input" placeholder="Ce que vous produisez, depuis quand, comment vous visiter…" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="shop-town">Commune ou ville</label>
            <select id="shop-town" className="input" value={town} onChange={(e) => setTown(e.target.value)}>
              <option value="" disabled>Choisir la commune…</option>
              {CI_REGIONS.map((g) => (
                <optgroup key={g.region} label={g.region}>
                  {g.towns.map((t) => <option key={t} value={t}>{t}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="shop-radius">Rayon de vente</label>
            <select id="shop-radius" className="input" defaultValue="100 km">
              {['25 km', '50 km', '100 km', '200 km', 'Tout le pays'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <ToggleRow on={delivery} onClick={() => setDelivery(!delivery)} title="Proposer la livraison SAVAA" sub="Un transporteur partenaire récupère chez vous" />
        <div className="field">
          <label htmlFor="shop-payout">Compte de versement des ventes</label>
          <select id="shop-payout" className="input" defaultValue="om">
            <option value="om">{session.phone ? `Orange Money, ${session.phone}` : 'Mobile Money, numéro à renseigner'}</option>
            <option value="new">Ajouter un autre compte</option>
          </select>
          <span className="hint">Vérifié par le prestataire de paiement avant le premier versement.</span>
        </div>
        <button className="row top" style={rowBtn} onClick={() => setCgv(!cgv)} aria-pressed={cgv}>
          <Check on={cgv} />
          <span className="small" style={{ lineHeight: 1.45 }}>J’accepte les <span className="link" style={{ fontSize: 'inherit' }}>conditions de vente SAVAA</span>, dont la commission par vente.</span>
        </button>
      </div>
      <Foot>
        <Link className="btn btn-s" to="/explorer" style={{ flex: '0 0 auto' }}>Plus tard</Link>
        <button className="btn btn-p" disabled={!ready} onClick={() => { s.setShop({ created: true, name: name.trim(), desc: desc.trim(), town, logo }); navigate(next && next.startsWith('/') ? next : '/vendre', { replace: true }); }}>Créer et publier</button>
      </Foot>
    </div>
  );
}

/* Écran 12 : ma boutique */

type ShopTab = 'ads' | 'orders' | 'reviews';

const thumb = <Photo w={52} h={52} radius={6} />;
const LISTING_BADGE: Record<Listing['status'], [string, 'green' | 'amber' | 'blue' | 'red' | 'grey']> = {
  online: ['En ligne', 'green'],
  review: ['En revue', 'amber'],
  sold: ['Vendu', 'blue'],
  out: ['Rupture', 'red'],
  archived: ['Archivée', 'grey'],
};

export function Shop() {
  const s = useStore();
  const shop = s.shop();
  const mine = s.myListings();
  const [tab, setTab] = useState<ShopTab>('ads');
  const statCell: CSSProperties = { padding: 10, borderRight: '1px solid #E3E7E4', minWidth: 0 };
  const initials = shop.name.split(/\s+/).filter((w) => /^\p{L}/u.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  /* Le compte de démonstration garde l'historique de la maquette ; un nouveau vendeur part de zéro. */
  const demo = !!s.session().demo;
  const tabs: [ShopTab, string][] = [['ads', `Annonces (${(demo ? 4 : 0) + mine.length})`], ['orders', `Commandes (${(demo ? 3 : 0) + s.mySales().length})`], ['reviews', `Avis (${demo ? 23 : 0})`]];
  const buyerView = demo ? '/annonce/FK-0142' : mine[0] ? `/annonce/${mine[0].id}` : null;
  const empty = (t: string) => <div className="card pad"><span className="small muted">{t}</span></div>;

  return (
    <div className="app">
      <Header back title="Ma boutique" actions={buyerView ? <Link className="link" to={buyerView} style={{ paddingRight: 12, flex: 'none' }}>Vue acheteur</Link> : undefined} />
      <div className="body flush">
        <div style={{ background: '#fff', padding: 16, display: 'flex', flexDirection: 'column', gap: 14, borderBottom: '1px solid #E3E7E4' }}>
          <div className="row" style={{ gap: 14 }}>
            {shop.logo ? <Photo src={shop.logo} label="Logo" w={60} h={60} radius={10} /> : <span className="av" style={{ width: 60, height: 60, fontSize: 20, borderRadius: 10 }}>{initials}</span>}
            <div className="col grow" style={{ gap: 3, minWidth: 0 }}>
              <span className="b ell" style={{ fontSize: 17 }}>{shop.name}</span>
              <span className="xs muted">{demo ? 'Éleveur, bovins et ovins' : shop.desc.split(/[.\n]/)[0] || 'Boutique'}, {shop.town}</span>
              <div className="wrap" style={{ marginTop: 2 }}>
                {demo ? <><Badge tone="green">Compte vérifié</Badge><Badge tone="amber">Exploitation : visite le 25/11</Badge></> : <Badge tone="amber">Vérification en cours</Badge>}
              </div>
            </div>
          </div>
          <div className="grid4" style={{ gap: 0, border: '1px solid #E3E7E4', borderRadius: 10 }}>
            <div className="stat" style={statCell}><span className="v" style={{ fontSize: 18 }}>{demo ? 41 : 0}</span><span className="l">ventes</span></div>
            <div className="stat" style={statCell}><span className="v" style={{ fontSize: 18 }}>{demo ? '4,7' : '–'}</span><span className="l">{demo ? '23 avis' : 'aucun avis'}</span></div>
            <div className="stat" style={statCell}><span className="v" style={{ fontSize: 18 }}>{demo ? '2 h' : '–'}</span><span className="l">réponse</span></div>
            <div className="stat" style={{ ...statCell, borderRight: 0 }}><span className="v" style={{ fontSize: 18 }}>{demo ? '98 %' : '–'}</span><span className="l">livrées</span></div>
          </div>
          <div className="grid3" style={{ gap: 8 }}>
            <Link className="btn btn-s btn-sm" style={wrapBtn} to="/vendre">Publier</Link>
            <Link className="btn btn-s btn-sm" style={wrapBtn} to="/campagne">Mettre en avant</Link>
            <Link className="btn btn-s btn-sm" style={wrapBtn} to="/campagne/stats">Statistiques</Link>
          </div>
        </div>
        <div className="utabs" role="tablist">
          {tabs.map(([id, t]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{t}</button>
          ))}
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tab === 'ads' && !demo && mine.length === 0 && empty('Aucune annonce pour l’instant. Touchez « Publier » pour mettre en vente.')}
          {tab === 'orders' && s.mySales().length > 0 && <SalesList sales={s.mySales()} />}
          {tab === 'orders' && !demo && !s.mySales().length && empty('Aucune commande reçue pour l’instant.')}
          {tab === 'reviews' && !demo && empty('Aucun avis : ils arrivent après les premières ventes livrées.')}
          {tab === 'ads' && (demo || mine.length > 0) && (
            <div className="card list">
              {mine.map((l) => {
                const [label, tone] = LISTING_BADGE[l.status];
                return (
                  <div className="li" key={l.id}>
                    <Link to={`/annonce/${l.id}`} className="row grow" style={{ gap: 12, minWidth: 0 }}>
                      <Photo w={52} h={52} radius={6} src={l.photos?.[0]} />
                      <div className="col grow" style={{ minWidth: 0 }}><span className="small b ell">{l.title}</span><span className="xs muted num ell">{priceLabel(l)}, publiée le {l.date}</span></div>
                    </Link>
                    {l.status === 'review' ? (
                      <button className="btn btn-s btn-sm" style={{ flex: 'none' }} onClick={() => { s.updateListing(l.id, { status: 'online' }); showToast('Annonce validée et mise en ligne.'); }} title="En démonstration, valide l’annonce comme le ferait l’équipe SAVAA">Valider</button>
                    ) : (
                      <span className="col" style={{ alignItems: 'flex-end', gap: 4, flex: 'none' }}>
                        <Badge tone={tone}>{label}</Badge>
                        {l.status === 'archived' ? (
                          <button className="link plain xs" onClick={() => { s.updateListing(l.id, { status: 'review' }); showToast('Annonce renvoyée en relecture avant sa remise en vente.'); }}>Remettre en vente</button>
                        ) : (
                          <button className="link plain xs" style={{ color: '#5D6862' }} onClick={() => { s.updateListing(l.id, { status: 'archived' }); showToast(`« ${l.title} » archivée : elle n’est plus visible des acheteurs.`); }}>Archiver</button>
                        )}
                      </span>
                    )}
                  </div>
                );
              })}
              {demo && <>
                <Link className="li" to="/annonce/FK-0142">{thumb}<div className="col grow"><span className="small b ell">Taurillon Zébu Goudali</span><span className="xs muted num">650 000 FCFA, 214 vues, 9 contacts</span></div><Badge tone="blue">Vendu</Badge></Link>
                <Link className="li" to="/campagne/stats"><Photo w={52} h={52} radius={6} src="images/beliers-saheliens.jpg" /><div className="col grow"><span className="small b ell">Béliers Sahéliens, lot de 6</span><span className="xs muted num">117 500 / tête, stock 6</span></div><Badge tone="sp">Sponsorisé</Badge></Link>
                <div className="li"><Photo w={52} h={52} radius={6} src="images/genisse-metisse.jpg" /><div className="col grow"><span className="small b ell">Génisse métisse, 19 mois</span><span className="xs muted num">480 000 FCFA, en modération</span></div><Badge tone="amber">En revue</Badge></div>
                <Link className="li" to="/annonce/L-FUMIER"><Photo w={52} h={52} radius={6} src="images/fumier-composte.jpg" /><div className="col grow"><span className="small b ell">Fumier composté, sac 40 kg</span><span className="xs muted num">2 000 FCFA, stock 0</span></div><Badge tone="red">Rupture</Badge></Link>
              </>}
            </div>
          )}
          {tab === 'orders' && demo && (
            <div className="card list">
              <Link className="li" to="/commande"><Photo w={48} h={48} radius={6} src="images/taurillon-goudali.jpg" /><div className="col grow"><span className="small b">SAV-2026-11-004812</span><span className="xs muted">Fatou Ouattara, taurillon, 650 000 FCFA</span></div><Badge tone="blue">En livraison</Badge></Link>
              <div className="li"><Photo w={48} h={48} radius={6} src="images/beliers-saheliens.jpg" /><div className="col grow"><span className="small b">SAV-2026-11-004655</span><span className="xs muted">Maquis Le Carrefour, 2 béliers</span></div><Badge tone="amber">À préparer</Badge></div>
              <div className="li"><Photo w={48} h={48} radius={6} src="images/taureau-reproducteur.jpg" /><div className="col grow"><span className="small b">SAV-2026-10-003910</span><span className="xs muted">Boucherie Fofana, 1 bœuf</span></div><Badge tone="green">Livrée</Badge></div>
            </div>
          )}
          {tab === 'reviews' && demo && (
            <>
              <div className="card pad col" style={{ gap: 6 }}>
                <span className="row between"><span className="small b">Boucherie Fofana</span><span className="small num">5 / 5</span></span>
                <span className="small muted">Bœuf conforme à la fiche, poids annoncé exact. Livraison à l’heure.</span>
                <span className="xs muted">Achat vérifié, 28/10/2026</span>
              </div>
              <div className="card pad col" style={{ gap: 6 }}>
                <span className="row between"><span className="small b">Kouassi A.</span><span className="small num">4 / 5</span></span>
                <span className="small muted">Bon bélier, un jour de retard sur la livraison.</span>
                <span className="xs muted">Achat vérifié, 14/10/2026</span>
              </div>
            </>
          )}
        </div>
      </div>
      <TabBar />
    </div>
  );
}

/* Écran 13 : publier une annonce (onglet « Vendre »), avec sa fiche d'identité et de traçabilité.
   4 étapes courtes (produit, origine, prix et vente, vendeur), puis un aperçu de la fiche avant l'envoi en relecture. */

/* Brouillon gardé sur le téléphone (bouton « Brouillon »). Nouvelle clé : l'ancien brouillon n'avait pas les champs de la fiche. */
const DRAFT_KEY = 'savaa-brouillon-fiche';
type Draft = {
  cat: string; sub: string; picked: string[]; photos: string[]; title: string; desc: string; brand: string; extra: Record<string, string>;
  country: string; region: string; department: string; town: string; locality: string; farm: string; producedOn: string;
  price: number; proPrice?: number; unit: string; qty: number; minQty: number; available: string; handover: string; neg: boolean;
  sellerName: string; phone: string; actor: string;
};
function loadDraft(): Partial<Draft> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<Draft>) : null;
  } catch {
    return null;
  }
}

type PubStep = 1 | 2 | 3 | 4 | 'apercu' | 'sent';
const STEP_TITLES = ['Le produit', 'Origine', 'Prix et vente', 'Vendeur'];

/** Date du sélecteur (AAAA-MM-JJ) au format affiché (JJ/MM/AAAA). */
const frDate = (iso: string) => iso.split('-').reverse().join('/');

/** Message d'erreur sous un champ. */
function FieldError({ msg }: { msg?: string }) {
  return msg ? <span className="xs" role="alert" style={{ color: '#A0221A' }}>{msg}</span> : null;
}

export function Publish() {
  const s = useStore();
  const navigate = useNavigate();
  const herd = s.animals();
  const shop = s.shop();
  const session = s.session();
  const breeder = s.isBreeder();

  const [draft] = useState(loadDraft);
  const cats = TRACE_CATEGORIES.filter((c) => subsFor(c, breeder).length > 0);
  const defaultCat = s.has('agri') && !breeder ? 'frais' : s.has('fourn') && !breeder ? 'transforme' : breeder ? 'vivant' : 'frais';
  const [catId, setCatId] = useState(draft?.cat && cats.some((c) => c.id === draft.cat) ? draft.cat : defaultCat);
  const cat = traceCategory(catId) ?? cats[0];
  const subs = subsFor(cat, breeder);
  const [sub, setSub] = useState(draft?.sub && subs.includes(draft.sub) ? draft.sub : subs[0]);

  const [step, setStep] = useState<PubStep>(1);
  const [tried, setTried] = useState<Record<string, boolean>>({});
  const [picked, setPicked] = useState<string[]>(draft?.picked ?? []);
  const [picker, setPicker] = useState(false);
  /* Photos ajoutées depuis l'appareil (data URL). */
  const [photos, setPhotos] = useState<string[]>(draft?.photos?.filter((p) => p.startsWith('data:')) ?? []);
  const [title, setTitle] = useState(draft?.title ?? '');
  const [desc, setDesc] = useState(draft?.desc ?? '');
  const [brand, setBrand] = useState(draft?.brand ?? '');
  const [extra, setExtra] = useState<Record<string, string>>(draft?.extra ?? {});

  /* Origine : on part de la commune de la boutique (donnée du compte), modifiable. */
  const shopRegion = CI_REGIONS.find((g) => g.towns.includes(shop.town))?.region ?? '';
  const [country, setCountry] = useState(draft?.country ?? 'Côte d’Ivoire');
  const [region, setRegion] = useState(draft?.region ?? shopRegion);
  const [department, setDepartment] = useState(draft?.department ?? '');
  const [town, setTown] = useState(draft?.town ?? (shopRegion ? shop.town : ''));
  const [locality, setLocality] = useState(draft?.locality ?? '');
  const [farm, setFarm] = useState(draft?.farm ?? '');
  const [producedOn, setProducedOn] = useState(draft?.producedOn ?? '');

  const [price, setPrice] = useState(draft?.price ?? 0);
  const [unit, setUnit] = useState(draft?.unit ?? cat.unit);
  const [qty, setQty] = useState(draft?.qty ?? 1);
  const [minQty, setMinQty] = useState(draft?.minQty ?? 1);
  const [available, setAvailable] = useState(draft?.available ?? '');
  const [handover, setHandover] = useState(draft?.handover ?? HANDOVER[0]);
  const [neg, setNeg] = useState(draft?.neg ?? false);
  const [proPrice, setProPrice] = useState(draft?.proPrice ?? 0);

  /* Vendeur : nom et téléphone du compte et de la boutique, modifiables. */
  const defaultActor = breeder ? 'Éleveur' : s.has('agri') ? 'Producteur' : s.has('fourn') ? 'Distributeur' : 'Commerçant';
  const [sellerName, setSellerName] = useState(draft?.sellerName ?? shop.name);
  const [phone, setPhone] = useState(draft?.phone ?? session.phone);
  const [actor, setActor] = useState(draft?.actor ?? defaultActor);
  const [attested, setAttested] = useState(false);

  const [published, setPublished] = useState<{ id: string; code: string } | null>(null);

  /* Les animaux de l'élevage (bovins, ovins, caprins) se vendent avec leur fiche du cheptel. */
  const isHerd = !!cat.live && HERD_SPECIES.includes(sub);
  const chosen = herd.filter((a) => picked.includes(a.id));
  const saleUnit = isHerd ? 'tête' : unit;

  const changeCat = (id: string) => {
    const c = traceCategory(id);
    if (!c) return;
    setCatId(id);
    setSub(subsFor(c, breeder)[0]);
    setUnit(c.unit);
    setExtra({});
  };
  const togglePick = (id: string) => {
    const next = picked.includes(id) ? picked.filter((p) => p !== id) : [...picked, id];
    setPicked(next);
    setQty(Math.max(1, next.length));
  };

  /* Contrôles de chaque étape : les messages s'affichent sous les champs après un premier « Continuer ». */
  const errorsFor = (n: number): Record<string, string> => {
    const e: Record<string, string> = {};
    if (n === 1) {
      if (!photos.length) e.photos = 'Ajoutez au moins une photo réelle du produit.';
      if (!title.trim()) e.title = 'Indiquez le nom du produit.';
      if (isHerd && chosen.length === 0) e.herd = 'Choisissez au moins un animal du cheptel.';
    }
    if (n === 2) {
      if (!region) e.region = 'Choisissez la région.';
      if (!department.trim()) e.department = 'Indiquez le département.';
      if (!town) e.town = 'Choisissez la commune ou la ville.';
      if (!farm.trim()) e.farm = 'Indiquez l’exploitation ou l’unité de production.';
    }
    if (n === 3) {
      if (!(price > 0)) e.price = 'Indiquez un prix en FCFA, en chiffres.';
      if (!(qty > 0)) e.qty = 'Indiquez la quantité disponible.';
      if (proPrice && proPrice >= price) e.proPrice = 'Le prix pro doit être inférieur au prix normal.';
      if (!(minQty > 0) || minQty > qty) e.minQty = 'La commande minimale doit être comprise entre 1 et la quantité disponible.';
    }
    if (n === 4) {
      if (!sellerName.trim()) e.sellerName = 'Indiquez le nom du vendeur ou de l’exploitation.';
      if (phone.replace(/\D/g, '').length !== 10) e.phone = 'Numéro à 10 chiffres.';
      if (!attested) e.attested = 'Cochez l’attestation pour envoyer la fiche.';
    }
    return e;
  };
  const current = typeof step === 'number' ? step : 0;
  const errors = current && tried[current] ? errorsFor(current) : {};

  const next = () => {
    if (typeof step !== 'number') return;
    if (Object.keys(errorsFor(step)).length) {
      setTried({ ...tried, [step]: true });
      showToast('Complétez les champs signalés en rouge.');
      return;
    }
    clearToast();
    setStep(step === 4 ? 'apercu' : ((step + 1) as PubStep));
  };
  const back = () => {
    clearToast();
    if (step === 'apercu') setStep(4);
    else if (typeof step === 'number' && step > 1) setStep((step - 1) as PubStep);
    else navigate(-1);
  };

  const saveDraft = () => {
    try {
      const d: Draft = {
        cat: catId, sub, picked, photos, title, desc, brand, extra, country, region, department, town, locality, farm, producedOn,
        price, proPrice, unit, qty, minQty, available, handover, neg, sellerName, phone, actor,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
      showToast('Brouillon enregistré sur le téléphone');
    } catch {
      showToast('Brouillon trop lourd : retirez une photo et réessayez.');
    }
  };

  const images = photos.filter((p) => p.startsWith('data:'));
  const extraFilled = cat.fields.filter((f) => extra[f.label]?.trim());
  const delivery = handover !== 'Retrait sur place';

  const send = () => {
    const id = `L-${Date.now().toString(36).toUpperCase()}`;
    const code = newTraceCode(s.listings());
    const stamp = nowStamp();
    const sheet: TraceSheet = {
      code, category: cat.id, sub, brand: brand.trim() || undefined,
      extra: Object.fromEntries(extraFilled.map((f) => [f.label, f.type === 'date' ? frDate(extra[f.label]) : extra[f.label].trim()])),
      origin: { country: country.trim(), region, department: department.trim(), town, locality: locality.trim() || undefined, farm: farm.trim(), producedOn: producedOn ? frDate(producedOn) : undefined },
      sale: { unit: saleUnit, minQty, available: available ? frDate(available) : undefined, handover },
      seller: { name: sellerName.trim(), phone: phone.trim(), actor, attested: true },
      events: [
        ...(producedOn ? [{ date: frDate(producedOn), kind: isHerd || cat.live ? 'Acquisition ou naissance' : 'Production ou récolte', text: `${farm.trim()}, ${town}`, by: sellerName.trim(), place: town, proof: 'declared' as const }] : []),
        ...(isHerd ? [{ date: stamp, kind: 'Fiches animales liées', text: `Fiches du cheptel : ${chosen.map((a) => a.id).join(', ')}`, by: sellerName.trim(), place: town, proof: 'documented' as const }] : []),
        { date: stamp, kind: 'Création de la fiche', text: 'Fiche déclarée par le vendeur et envoyée en relecture à l’équipe SAVAA.', by: sellerName.trim(), place: town, proof: 'declared' },
      ],
    };
    s.addListing({
      id,
      title: title.trim(),
      details: isHerd ? (chosen.length === 1 ? chosen[0].details : `${chosen.length} animaux : ${chosen.map((a) => a.id).join(', ')}`) : `${sub}, ${unitQty(qty, saleUnit)} disponibles`,
      price,
      proPrice: proPrice && proPrice < price ? proPrice : undefined,
      unit: isHerd && qty === 1 ? undefined : unitPrice(saleUnit),
      negotiable: neg,
      place: department.trim() && department.trim() !== town ? `${town}, ${department.trim()}` : town,
      seller: sellerName.trim(),
      sellerShort: sellerName.trim(),
      sellerVerified: true,
      category: cat.legacy(sub),
      photo: 'Photo',
      photos: images,
      trace: isHerd ? [chosen.length > 1 ? `${chosen.length} fiches` : 'Fiche liée', 'blue'] : ['Fiche déclarée', 'grey'],
      animalIds: isHerd ? chosen.map((a) => a.id) : undefined,
      delivery,
      pickup: handover !== HANDOVER[0] ? town : undefined,
      stock: qty > 1 ? qty : undefined,
      status: 'review',
      mine: true,
      date: today(),
      description: desc.trim() || undefined,
      sheet,
    });
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* rien */
    }
    setPublished({ id, code });
    setStep('sent');
  };

  const header = (
    <header className="hdr">
      {step === 'sent' ? (
        <button className="iconbtn" aria-label="Fermer" onClick={() => navigate('/boutique')}><Icon name="close" /></button>
      ) : step === 1 ? (
        <button className="iconbtn" aria-label="Fermer" onClick={() => navigate(-1)}><Icon name="close" /></button>
      ) : (
        <button className="iconbtn" aria-label="Retour" onClick={back}><Icon name="back" /></button>
      )}
      <h1>{step === 'sent' ? 'Annonce envoyée' : step === 'apercu' ? 'Aperçu de la fiche' : 'Nouvelle annonce'}</h1>
      {typeof step === 'number' && <span className="small muted" style={{ paddingRight: 12, flex: 'none' }}>{step} / 4</span>}
    </header>
  );

  const steps = (
    <div style={{ background: '#fff', padding: '0 16px 12px', borderBottom: '1px solid #E3E7E4', flex: 'none' }}>
      <div className="steps">{STEP_TITLES.map((t, i) => <i key={t} className={step === 'apercu' || (typeof step === 'number' && i < step) ? 'on' : ''} />)}</div>
      {typeof step === 'number' && <span className="xs muted" style={{ display: 'block', marginTop: 8 }}>{STEP_TITLES[step - 1]}</span>}
    </div>
  );

  if (step === 'sent' && published) {
    return (
      <div className="app">
        {header}
        <div className="body" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 14, padding: 28 }}>
          <Icon name="check" style={{ width: 52, height: 52, color: '#145C3A', strokeWidth: 1.4 }} />
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Annonce envoyée en relecture</h2>
          <p className="small muted" style={{ lineHeight: 1.5 }}>L’équipe SAVAA vérifie l’annonce et sa fiche avant la mise en ligne, en général sous 24 h. Vous serez prévenu par notification.</p>
          <div className="card pad" style={{ width: '100%', textAlign: 'left' }}>
            <dl className="kv">
              <dt>Annonce</dt><dd className="ell">{title}</dd>
              <dt>Prix</dt><dd className="num">{fcfa(price)} FCFA</dd>
              <dt>Code de traçabilité</dt><dd className="num">{published.code}</dd>
              <dt>Statut</dt><dd><Badge tone="amber">En modération</Badge></dd>
            </dl>
          </div>
          <Link className="btn btn-p btn-block" to={`/annonce/${published.id}`}>Voir l’annonce</Link>
          <Link className="btn btn-s btn-block" to="/campagne">Mettre en avant</Link>
          <Link className="btn btn-ghost btn-block" to="/boutique">Voir ma boutique</Link>
        </div>
      </div>
    );
  }

  if (step === 'apercu') {
    return (
      <div className="app">
        {header}
        {steps}
        <div className="body" style={{ gap: 16 }}>
          <div className="sec" style={{ gap: 8 }}>
            <span className="lbl">Aperçu dans les résultats</span>
            <div className="hc">
              <Photo label="Photo" src={images[0]} w={84} h={84} radius={images[0] ? 8 : undefined} />
              <div className="col grow" style={{ gap: 3, minWidth: 0 }}>
                <span className="b small" style={{ lineHeight: 1.3 }}>{title}</span>
                <span className="price">{fcfa(price)} FCFA {unitPrice(saleUnit)}{neg ? ', négociable' : ''}</span>
                <span className="xs muted ell">{town}, {sellerName}</span>
                <span className="wrap" style={{ gap: 4, marginTop: 2 }}>
                  <Badge tone="grey">Brouillon</Badge>
                  {isHerd ? <Badge tone="blue">{chosen.length > 1 ? `${chosen.length} fiches` : 'Fiche liée'}</Badge> : <Badge>Fiche déclarée</Badge>}
                </span>
              </div>
            </div>
          </div>
          <div className="card pad col" style={{ gap: 10 }}>
            <span className="b small">Le produit</span>
            <dl className="kv">
              <dt>Catégorie</dt><dd>{cat.label}</dd>
              <dt>Sous-catégorie</dt><dd>{sub}</dd>
              {brand.trim() && <><dt>Marque ou variété</dt><dd>{brand}</dd></>}
              {isHerd && <><dt>Animaux</dt><dd>{chosen.map((a) => a.id).join(', ')}</dd></>}
              {extraFilled.map((f) => <Fragment key={f.label}><dt>{f.label}</dt><dd>{f.type === 'date' ? frDate(extra[f.label]) : extra[f.label]}</dd></Fragment>)}
              <dt>Photos</dt><dd className="num">{photos.length}</dd>
            </dl>
            {desc.trim() && <p className="small" style={{ lineHeight: 1.5 }}>{desc}</p>}
          </div>
          <div className="card pad col" style={{ gap: 10 }}>
            <span className="b small">Origine</span>
            <dl className="kv">
              <dt>Pays</dt><dd>{country}</dd>
              <dt>Région</dt><dd>{region}</dd>
              <dt>Département</dt><dd>{department}</dd>
              <dt>Commune</dt><dd>{town}</dd>
              {locality.trim() && <><dt>Localité</dt><dd>{locality}</dd></>}
              <dt>Exploitation</dt><dd>{farm}</dd>
              {producedOn && <><dt>{cat.live ? 'Naissance ou acquisition' : 'Production ou récolte'}</dt><dd className="num">{frDate(producedOn)}</dd></>}
            </dl>
          </div>
          <div className="card pad col" style={{ gap: 10 }}>
            <span className="b small">Prix et vente</span>
            <dl className="kv">
              <dt>Prix</dt><dd className="num">{fcfa(price)} FCFA {unitPrice(saleUnit)}</dd>
              <dt>Négociable</dt><dd>{neg ? 'Oui' : 'Non'}</dd>
              {proPrice > 0 && <><dt>Prix pro</dt><dd className="num">{fcfa(proPrice)} FCFA {unitPrice(saleUnit)}</dd></>}
              <dt>Disponible</dt><dd className="num">{unitQty(qty, saleUnit)}</dd>
              <dt>Commande minimale</dt><dd className="num">{unitQty(minQty, saleUnit)}</dd>
              {available && <><dt>À partir du</dt><dd className="num">{frDate(available)}</dd></>}
              <dt>Remise</dt><dd>{handover}</dd>
            </dl>
          </div>
          <div className="card pad col" style={{ gap: 10 }}>
            <span className="b small">Vendeur</span>
            <dl className="kv">
              <dt>Nom</dt><dd>{sellerName}</dd>
              <dt>Type d’acteur</dt><dd>{actor}</dd>
              <dt>Téléphone</dt><dd className="num">+225 {phone}</dd>
            </dl>
          </div>
          <div className="notice"><Icon name="info" size="sm" /><span>Le code de traçabilité SAV-TRACE est attribué à l’envoi. Les informations sont « déclarées » par vous ; l’équipe SAVAA ou un vétérinaire peut ensuite les vérifier.</span></div>
          {photos.length < 3 && (
            <div className="notice n-warn"><Icon name="alert" size="sm" /><span>Ajoutez au moins 3 photos pour une annonce plus visible.</span></div>
          )}
          <button className="btn btn-ghost btn-block small" style={{ flex: 'none' }} onClick={saveDraft}>Garder en brouillon</button>
        </div>
        <Foot>
          <button className="btn btn-s" style={{ flex: '0 0 auto' }} onClick={() => setStep(1)}>Modifier</button>
          <button className="btn btn-p" onClick={send}>Envoyer en relecture</button>
        </Foot>
      </div>
    );
  }

  return (
    <div className="app">
      {header}
      {steps}
      <div className="body" style={{ gap: 18 }}>
        {step === 1 && (
          <>
            <div className="field">
              <label htmlFor="pub-cat">Catégorie</label>
              <select id="pub-cat" className="input" value={cat.id} onChange={(e) => changeCat(e.target.value)}>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="pub-sub">Sous-catégorie</label>
              <select id="pub-sub" className="input" value={sub} onChange={(e) => setSub(e.target.value)}>
                {subs.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>

            {isHerd && (
              <div className="field">
                <span className="lbl">Animaux concernés</span>
                {herd.length === 0 ? (
                  <span className="hint">Votre cheptel est vide. <Link className="link" to="/cheptel/ajout">Ajoutez d’abord l’animal</Link> : il sera vendu avec sa fiche.</span>
                ) : chosen.length === 0 && <span className="hint">Choisissez au moins un animal du cheptel.</span>}
                {chosen.map((a) => (
                  <div key={a.id} className="card row" style={{ padding: '10px 12px' }}>
                    <button className="plain" aria-label={`Retirer ${a.id}`} onClick={() => togglePick(a.id)}><Check on /></button>
                    <div className="col grow"><span className="small b ell">{a.id}, {a.name}</span><span className="xs muted">Fiche liée automatiquement à l’annonce</span></div>
                    {a.tone === 'green' ? <Badge tone="green">Fiche à jour</Badge> : <Badge tone={a.tone}>{a.status}</Badge>}
                  </div>
                ))}
                {herd.length > 0 && (
                  <button className="link plain" style={{ alignSelf: 'flex-start' }} onClick={() => setPicker(!picker)} aria-expanded={picker}>
                    {picker ? 'Fermer la liste du cheptel' : '+ Choisir d’autres animaux du cheptel'}
                  </button>
                )}
                {picker && (
                  <div className="card list">
                    {herd.map((a) => {
                      const blocked = a.tone === 'red';
                      const on = picked.includes(a.id);
                      return (
                        <button key={a.id} className="li" disabled={blocked} onClick={() => togglePick(a.id)} style={{ opacity: blocked ? 0.55 : 1, cursor: blocked ? 'not-allowed' : 'pointer', background: on ? '#E8F3EA' : '#fff' }}>
                          <Check on={on} />
                          <span className="col grow"><span className="small b ell">{a.id}, {a.name}</span><span className="xs muted ell">{blocked ? 'Alerte sanitaire ouverte, vente impossible' : a.details}</span></span>
                          <Badge tone={a.tone}>{a.status}</Badge>
                        </button>
                      );
                    })}
                  </div>
                )}
                <FieldError msg={errors.herd} />
              </div>
            )}

            <div className="field">
              <span className="lbl">Photos</span>
              <div className="grid4">
                {photos.map((p, i) => <Photo key={i} src={p} label={`Photo ${i + 1}`} h={76} radius={8} onRemove={() => setPhotos(photos.filter((_, j) => j !== i))} />)}
                {photos.length < 8 && <PhotoAdd height={76} label="" icon="plus" onAdd={(p) => setPhotos((x) => (x.length < 8 ? [...x, p] : x))} />}
              </div>
              <span className="hint">{cat.live ? 'Prenez l’animal de profil, en plein jour.' : 'Photos réelles du produit, en plein jour.'} Au moins 3 photos.</span>
              <FieldError msg={errors.photos} />
            </div>

            <div className="field">
              <label htmlFor="pub-title">Nom du produit</label>
              <input id="pub-title" className="input" placeholder={cat.live ? 'Ex. Génisse N’Dama, 19 mois' : 'Ex. Maïs jaune séché, sacs de 100 kg'} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} aria-invalid={!!errors.title} />
              <FieldError msg={errors.title} />
            </div>
            <div className="field">
              <label htmlFor="pub-desc">Description courte <span className="muted">(facultatif)</span></label>
              <textarea id="pub-desc" className="input" rows={3} maxLength={300} placeholder="Qualité, conditionnement, ce que l’acheteur doit savoir" value={desc} onChange={(e) => setDesc(e.target.value)} style={{ height: 'auto', paddingTop: 10, resize: 'vertical' }} />
            </div>
            <div className="field">
              <label htmlFor="pub-brand">Marque ou variété <span className="muted">(facultatif)</span></label>
              <input id="pub-brand" className="input" value={brand} maxLength={60} onChange={(e) => setBrand(e.target.value)} />
            </div>
            {cat.fields.length > 0 && !isHerd && (
              <div className="col" style={{ gap: 12 }}>
                <span className="lbl">Informations de traçabilité <span className="muted">(facultatif)</span></span>
                {cat.fields.map((f, i) => (
                  <div key={f.label} className="field">
                    <label htmlFor={`pub-x${i}`}>{f.label}</label>
                    <input id={`pub-x${i}`} className="input" type={f.type === 'date' ? 'date' : 'text'} inputMode={f.type === 'number' ? 'decimal' : undefined} placeholder={f.placeholder} value={extra[f.label] ?? ''} maxLength={80} onChange={(e) => setExtra({ ...extra, [f.label]: e.target.value })} />
                  </div>
                ))}
              </div>
            )}
            {isHerd && <p className="hint">Race, âge, poids et santé viennent de la fiche de chaque animal du cheptel.</p>}
            <Link className="card pad row" to="/assistance" style={{ background: '#E8F3EA', borderColor: '#CFE0D4' }}>
              <Icon name="phone" style={{ color: '#145C3A' }} />
              <span className="col grow"><span className="small b">Besoin d’aide pour publier ?</span><span className="xs muted">Un conseiller vous rappelle et remplit l’annonce avec vous.</span></span>
            </Link>
          </>
        )}

        {step === 2 && (
          <>
            <p className="small muted" style={{ lineHeight: 1.5 }}>D’où vient le produit ? Ces informations figurent sur la fiche de traçabilité.</p>
            <div className="field">
              <label htmlFor="pub-country">Pays d’origine</label>
              <input id="pub-country" className="input" value={country} maxLength={40} onChange={(e) => setCountry(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="pub-region">Région</label>
              <select id="pub-region" className="input" value={region} onChange={(e) => { setRegion(e.target.value); setTown(''); }} aria-invalid={!!errors.region} style={{ color: region ? '#17201B' : '#5D6862' }}>
                <option value="" disabled>Choisir la région…</option>
                {CI_REGIONS.map((g) => <option key={g.region} value={g.region}>{g.region}</option>)}
              </select>
              <FieldError msg={errors.region} />
            </div>
            <div className="field">
              <label htmlFor="pub-dep">Département</label>
              <input id="pub-dep" className="input" placeholder="Ex. Bouaké" value={department} maxLength={40} onChange={(e) => setDepartment(e.target.value)} aria-invalid={!!errors.department} />
              <FieldError msg={errors.department} />
            </div>
            <div className="field">
              <label htmlFor="pub-town">Commune ou ville</label>
              <select id="pub-town" className="input" value={town} disabled={!region} onChange={(e) => setTown(e.target.value)} aria-invalid={!!errors.town} style={{ color: town ? '#17201B' : '#5D6862' }}>
                <option value="" disabled>{region ? 'Choisir la commune…' : 'Choisissez d’abord la région'}</option>
                {(CI_REGIONS.find((g) => g.region === region)?.towns ?? []).map((t) => <option key={t}>{t}</option>)}
              </select>
              <FieldError msg={errors.town} />
            </div>
            <div className="field">
              <label htmlFor="pub-loc">Village ou localité <span className="muted">(facultatif)</span></label>
              <input id="pub-loc" className="input" value={locality} maxLength={60} onChange={(e) => setLocality(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="pub-farm">Exploitation ou unité de production</label>
              <input id="pub-farm" className="input" placeholder="Ex. ferme, champ, coopérative, atelier" value={farm} maxLength={80} onChange={(e) => setFarm(e.target.value)} aria-invalid={!!errors.farm} />
              <FieldError msg={errors.farm} />
            </div>
            <div className="field">
              <label htmlFor="pub-prod">{cat.live ? 'Date de naissance ou d’acquisition' : 'Date de production ou de récolte'} <span className="muted">(facultatif)</span></label>
              <input id="pub-prod" className="input" type="date" value={producedOn} onChange={(e) => setProducedOn(e.target.value)} />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="grid2">
              <div className="field">
                <label htmlFor="pub-price">Prix (FCFA)</label>
                <input id="pub-price" className="input num b" inputMode="numeric" placeholder="0" value={price ? fcfa(price) : ''} onChange={(e) => setPrice(parseAmount(e.target.value))} aria-invalid={!!errors.price} />
                <FieldError msg={errors.price} />
              </div>
              <div className="field">
                <label htmlFor="pub-unit">Unité de vente</label>
                <select id="pub-unit" className="input" value={saleUnit} disabled={isHerd} onChange={(e) => setUnit(e.target.value)}>
                  {UNITS.map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="grid2">
              <div className="field">
                <label htmlFor="pub-qty">Quantité disponible</label>
                <input id="pub-qty" className="input num" inputMode="numeric" value={qty || ''} disabled={isHerd} onChange={(e) => setQty(Math.min(99999, parseAmount(e.target.value)))} aria-invalid={!!errors.qty} />
                <FieldError msg={errors.qty} />
              </div>
              <div className="field">
                <label htmlFor="pub-min">Commande minimale</label>
                <input id="pub-min" className="input num" inputMode="numeric" value={minQty || ''} onChange={(e) => setMinQty(Math.min(99999, parseAmount(e.target.value)))} aria-invalid={!!errors.minQty} />
                <FieldError msg={errors.minQty} />
              </div>
            </div>
            <ToggleRow on={neg} onClick={() => setNeg(!neg)} title="Prix négociable" sub="Les acheteurs peuvent faire une offre" />
            <div className="field">
              <label htmlFor="pub-pro">Prix pro (FCFA) <span className="muted">(facultatif)</span></label>
              <input id="pub-pro" className="input num" inputMode="numeric" placeholder="Ex. 10 % de moins" value={proPrice ? fcfa(proPrice) : ''} onChange={(e) => setProPrice(parseAmount(e.target.value))} aria-invalid={!!errors.proPrice} />
              <span className="hint">Réservé aux restaurants et hôtels vérifiés, qui achètent en volume. Les autres acheteurs voient le prix normal.</span>
              <FieldError msg={errors.proPrice} />
            </div>
            <div className="field">
              <label htmlFor="pub-hand">Mode de remise</label>
              <select id="pub-hand" className="input" value={handover} onChange={(e) => setHandover(e.target.value)}>
                {HANDOVER.map((h) => <option key={h}>{h}</option>)}
              </select>
              <span className="hint">{delivery ? 'Frais de transport calculés et payés par l’acheteur.' : `L’acheteur vient chercher le produit à ${town || 'votre commune'}.`}</span>
            </div>
            <div className="field">
              <label htmlFor="pub-avail">Disponible à partir du <span className="muted">(facultatif)</span></label>
              <input id="pub-avail" className="input" type="date" value={available} onChange={(e) => setAvailable(e.target.value)} />
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div className="field">
              <label htmlFor="pub-seller">Nom du vendeur ou de l’exploitation</label>
              <input id="pub-seller" className="input" value={sellerName} maxLength={80} onChange={(e) => setSellerName(e.target.value)} aria-invalid={!!errors.sellerName} />
              <FieldError msg={errors.sellerName} />
            </div>
            <div className="field">
              <label htmlFor="pub-actor">Type d’acteur</label>
              <select id="pub-actor" className="input" value={actor} onChange={(e) => setActor(e.target.value)}>
                {ACTORS.map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="pub-tel">Téléphone</label>
              <div className="row" style={{ gap: 8 }}>
                <div className="input" style={{ width: 92, flex: 'none', justifyContent: 'center', fontWeight: 500 }}>+225</div>
                <input id="pub-tel" className="input num" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, '').slice(0, 14))} style={{ minWidth: 0 }} aria-invalid={!!errors.phone} />
              </div>
              <FieldError msg={errors.phone} />
            </div>
            <button className="row top" role="checkbox" aria-checked={attested} onClick={() => setAttested(!attested)} style={{ ...rowBtn, gap: 10 }}>
              <Check on={attested} />
              <span className="small" style={{ lineHeight: 1.45 }}>J’atteste que les informations de cette fiche sont exactes. Une fausse déclaration entraîne le retrait de l’annonce.</span>
            </button>
            <FieldError msg={errors.attested} />
            <p className="hint">Chaque annonce est relue par l’équipe SAVAA avant sa mise en ligne, en général sous 24 h.</p>
          </>
        )}
      </div>
      <Foot>
        <button className="btn btn-s" style={{ flex: '0 0 auto' }} onClick={saveDraft}>Brouillon</button>
        <button className="btn btn-p" onClick={next}>{step === 4 ? 'Voir l’aperçu' : 'Continuer'}</button>
      </Foot>
    </div>
  );
}

/* Écran 14 : campagne de mise en avant */

const FORMATS = [
  ['top', 'En tête des résultats', 'Recherches « bélier », « mouton », « Tabaski »'],
  ['cat', 'Bannière de catégorie', 'Haut de la page Ovins et caprins'],
  ['day', 'Offre du jour', 'Accueil, une journée'],
  ['loc', 'Campagne locale', 'Acheteurs à moins de 50 km'],
] as const;
const ZONES = ['Poro', 'Tchologo', 'Hambol', 'Gbêkê', 'Abidjan'];
const BUYERS = ['Particuliers', 'Restaurants', 'Grossistes', 'Éleveurs'];
const BILLING = ['Forfait', 'Par clic', 'Par 1 000 vues'];

type CampaignDraft = { listingId: string; fmt: string; zones: string[]; budget: number; cap: number; start: string; end: string };

export function Campaign() {
  const s = useStore();
  const navigate = useNavigate();
  const demo = !!s.session().demo;
  const online = s.myListings().filter((l) => l.status === 'online');
  const [target, setTarget] = useState(online[0]?.id ?? '');
  const [fmt, setFmt] = useState<string>('top');
  const [zones, setZones] = useState<Record<string, boolean>>(demo ? { Poro: true, Tchologo: true } : { Poro: true });
  const [buyers, setBuyers] = useState<Record<string, boolean>>(demo ? { Particuliers: true, Restaurants: true } : {});
  const [bill, setBill] = useState('Forfait');
  const [budget, setBudget] = useState(demo ? 15000 : 0);
  const [cap, setCap] = useState(demo ? 1500 : 0);
  const [start, setStart] = useState(demo ? '10/11/2026' : today());
  const [end, setEnd] = useState(demo ? '24/11/2026' : '');

  const ready = Object.values(zones).some(Boolean) && Object.values(buyers).some(Boolean) && budget > 0 && (demo || !!target);
  const days = cap > 0 ? Math.ceil(budget / cap) : 0;
  const l = s.listing(target);

  if (!demo && online.length === 0) {
    return (
      <div className="app">
        <Header back title="Mettre en avant" />
        <div className="body" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 12, padding: 32 }}>
          <Icon name="megaphone" style={{ width: 52, height: 52, color: '#5D6862', strokeWidth: 1.4 }} />
          <h2 style={{ fontSize: 19, fontWeight: 600 }}>Aucune annonce en ligne</h2>
          <p className="small muted" style={{ lineHeight: 1.5 }}>Une annonce doit être validée et en ligne avant d’être mise en avant.</p>
          <Link className="btn btn-p btn-block" to="/vendre">Publier une annonce</Link>
        </div>
      </div>
    );
  }

  const submit = () => {
    s.put('campaign', { listingId: target, fmt, zones: Object.keys(zones).filter((z) => zones[z]), budget, cap, start, end } satisfies CampaignDraft);
    s.notify({ c: 'cmp', title: 'Campagne envoyée en validation', text: `« ${l?.title ?? ''} » sera relue par SAVAA avant diffusion.`, to: '/campagne/stats' });
    navigate('/campagne/stats');
  };

  return (
    <div className="app">
      <Header back title="Mettre en avant" />
      <div className="body" style={{ gap: 20 }}>
        {demo ? (
          <div className="card row" style={{ padding: '10px 12px' }}>
            <Photo w={48} h={48} radius={6} src="images/beliers-saheliens.jpg" />
            <div className="col grow"><span className="small b ell">Béliers Sahéliens, lot de 6</span><span className="xs muted num">117 500 FCFA / tête, en ligne</span></div>
            <Link className="link" to="/boutique" style={{ flex: 'none' }}>Changer</Link>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="cp-listing">Annonce à mettre en avant</label>
            <select id="cp-listing" className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
              {online.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
            </select>
          </div>
        )}

        <div className="sec" style={{ gap: 8 }}>
          <span className="lbl">Format</span>
          <div className="card list" role="radiogroup">
            {FORMATS.map(([id, t, d]) => (
              <button key={id} className="li" role="radio" aria-checked={fmt === id} onClick={() => setFmt(id)} style={{ background: fmt === id ? '#E8F3EA' : '#fff' }}>
                <span className={`radio${fmt === id ? ' on' : ''}`} />
                <span className="col grow"><span className="small b">{t}</span><span className="xs muted">{d}</span></span>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="lbl">Zones de diffusion</span>
          <ChipPicker items={ZONES} sel={zones} onToggle={(t) => setZones({ ...zones, [t]: !zones[t] })} />
        </div>
        <div className="field">
          <span className="lbl">Acheteurs visés</span>
          <ChipPicker items={BUYERS} sel={buyers} onToggle={(t) => setBuyers({ ...buyers, [t]: !buyers[t] })} />
        </div>

        <div className="grid2">
          <div className="field"><label htmlFor="cp-start">Début</label><input id="cp-start" className="input num" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div className="field"><label htmlFor="cp-end">Fin</label><input id="cp-end" className="input num" placeholder="JJ/MM/AAAA" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
        </div>

        <div className="field">
          <span className="lbl">Facturation</span>
          <div className="seg">
            {BILLING.map((b) => (
              <button key={b} className={bill === b ? 'on' : ''} style={{ whiteSpace: 'normal', lineHeight: 1.15 }} onClick={() => setBill(b)}>{b}</button>
            ))}
          </div>
          <div className="grid2" style={{ marginTop: 4 }}>
            <div className="field">
              <label htmlFor="cp-budget">Budget total</label>
              <label className="input num b" style={{ gap: 6 }}>
                <input id="cp-budget" className="plain grow num b" inputMode="numeric" style={bare} value={budget ? fcfa(budget) : ''} onChange={(e) => setBudget(parseAmount(e.target.value))} />
                <span style={{ flex: 'none' }}>FCFA</span>
              </label>
            </div>
            <div className="field">
              <label htmlFor="cp-cap">Plafond / jour</label>
              <label className="input num" style={{ gap: 6 }}>
                <input id="cp-cap" className="plain grow num" inputMode="numeric" style={bare} value={cap ? fcfa(cap) : ''} onChange={(e) => setCap(parseAmount(e.target.value))} />
                <span style={{ flex: 'none' }}>FCFA</span>
              </label>
            </div>
          </div>
          {days > 0 && <span className="hint">Au plafond, le budget couvre environ {days} jour{days > 1 ? 's' : ''} de diffusion.</span>}
        </div>

        <div className="sec" style={{ gap: 8 }}>
          <span className="lbl">Aperçu dans les résultats</span>
          <div className="hc" style={{ borderStyle: 'dashed' }}>
            <Photo label="Photo" w={84} h={84} src={demo ? 'images/beliers-saheliens.jpg' : l?.photos?.[0]} />
            <div className="col grow" style={{ gap: 3 }}>
              <Badge tone="sp" style={{ alignSelf: 'flex-start' }}>Sponsorisé</Badge>
              <span className="b small ell">{demo ? 'Béliers Sahéliens, lot de 6' : l?.title}</span>
              <span className="price">{demo ? '117 500 FCFA' : l ? priceLabel(l) : ''}</span>
              <span className="xs muted ell">{demo ? 'Sinématiali, Ferme Koné & Fils' : `${s.shop().town}, ${s.shop().name}`}</span>
            </div>
          </div>
        </div>
        <p className="hint">Relue par SAVAA avant diffusion. Paiement de la campagne simulé dans cette démonstration.</p>
      </div>
      <Foot>
        {ready && demo ? (
          <Link className="btn btn-p" to="/campagne/stats">Soumettre à validation</Link>
        ) : (
          <button className="btn btn-p" disabled={!ready} onClick={submit}>Soumettre à validation</button>
        )}
      </Foot>
    </div>
  );
}

/* Un nouveau vendeur : sa campagne attend la validation, sans chiffres inventés. */
function PendingCampaign() {
  const s = useStore();
  const c = s.get<CampaignDraft | null>('campaign', null);
  const l = c ? s.listing(c.listingId) : undefined;
  return (
    <div className="app">
      <Header back title="Résultats de campagne" />
      <div className="body">
        {c && l ? (
          <div className="card pad col" style={{ gap: 8 }}>
            <div className="row between"><span className="b" style={{ minWidth: 0 }}>{l.title}</span><Badge tone="amber">En validation</Badge></div>
            <div className="wrap" style={{ alignItems: 'center' }}><Badge tone="sp">Sponsorisé</Badge><span className="xs muted">{FORMATS.find((f) => f[0] === c.fmt)?.[1]}, {c.zones.join(', ')}, du {c.start}{c.end ? ` au ${c.end}` : ''}</span></div>
            <div className="row between small" style={{ flexWrap: 'wrap', gap: 4 }}><span className="muted">Budget dépensé</span><span className="b num">0 / {fcfa(c.budget)} FCFA</span></div>
            <div className="bar"><i style={{ width: '0%' }} /></div>
            <span className="xs muted">Les affichages, clics et commandes apparaîtront ici dès la diffusion.</span>
          </div>
        ) : (
          <div className="card pad col" style={{ gap: 8 }}>
            <span className="b">Aucune campagne</span>
            <span className="small muted">Mettez une annonce en avant pour suivre ici ses résultats.</span>
          </div>
        )}
      </div>
      <Foot><Link className="btn btn-p" to="/campagne">{c ? 'Modifier' : 'Créer une campagne'}</Link></Foot>
    </div>
  );
}

/* Écran 15 : résultats de campagne */

const CLICKS = [14, 19, 22, 18, 27, 41, 25, 23, 18];
const CLICKS_MAX = Math.max(...CLICKS);
const nineCols: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(9, minmax(0, 1fr))', gap: 8 };

export function CampaignStats() {
  const s = useStore();
  const [paused, setPaused] = useState(false);
  if (!s.session().demo) return <PendingCampaign />;

  return (
    <div className="app">
      <Header back title="Résultats de campagne" />
      <div className="body">
        <div className="card pad col" style={{ gap: 8 }}>
          <div className="row between">
            <span className="b" style={{ minWidth: 0 }}>Béliers Sahéliens, lot de 6</span>
            {paused ? <Badge tone="amber">En pause</Badge> : <Badge tone="green">En cours</Badge>}
          </div>
          <div className="wrap" style={{ alignItems: 'center' }}>
            <Badge tone="sp">Sponsorisé</Badge>
            <span className="xs muted">En tête des résultats, Poro, Tchologo, 10 au 24 nov.</span>
          </div>
          <div className="col" style={{ gap: 6, marginTop: 4 }}>
            <div className="row between small" style={{ flexWrap: 'wrap', gap: 4 }}><span className="muted">Budget dépensé</span><span className="b num">8 350 / 15 000 FCFA</span></div>
            <div className="bar"><i style={{ width: '56%' }} /></div>
            <span className="xs muted">{paused ? 'Diffusion suspendue, reste 6 650 FCFA' : 'Reste 6 650 FCFA, environ 6 jours au rythme actuel'}</span>
          </div>
        </div>

        <div className="grid3" style={{ gap: 8 }}>
          {[['3 812', 'Affichages'], ['207', 'Clics'], ['19', 'Contacts'], ['7', 'Ajouts panier'], ['3', 'Commandes'], ['2 783', 'FCFA / cmd']].map(([v, l]) => (
            <div key={l} className="card stat" style={{ padding: 12, minWidth: 0 }}><span className="v">{v}</span><span className="l">{l}</span></div>
          ))}
        </div>

        <div className="card pad col" style={{ gap: 12 }}>
          <div className="row between"><span className="b small">Clics par jour</span><span className="xs muted">10 → 18 nov.</span></div>
          <div style={{ ...nineCols, alignItems: 'end', height: 120, borderBottom: '1px solid #E3E7E4' }}>
            {CLICKS.map((v, i) => (
              <div key={i} className="col" style={{ alignItems: 'center', gap: 4, justifyContent: 'flex-end', height: '100%' }}>
                <span className="xs num muted">{v}</span>
                <div style={{ width: '100%', height: Math.round((v / CLICKS_MAX) * 86), background: v === CLICKS_MAX ? '#F28C28' : '#145C3A', borderRadius: '3px 3px 0 0' }} />
              </div>
            ))}
          </div>
          <div style={nineCols}>
            {CLICKS.map((_, i) => <span key={i} className="xs muted num" style={{ textAlign: 'center' }}>{10 + i}</span>)}
          </div>
          <span className="xs muted">Pic le 15/11 : marché hebdomadaire de Korhogo.</span>
        </div>

        <div className="card">
          <table className="tbl num">
            <thead><tr><th>Zone</th><th className="r">Clics</th><th className="r">Contacts</th><th className="r">Cmd</th></tr></thead>
            <tbody>
              <tr><td>Poro</td><td className="r">153</td><td className="r">15</td><td className="r b">3</td></tr>
              <tr><td>Tchologo</td><td className="r">54</td><td className="r">4</td><td className="r b">0</td></tr>
            </tbody>
          </table>
        </div>
        <p className="hint">Taux de conversion : 1,4 % des clics.</p>
      </div>
      <Foot>
        <button className="btn btn-s" onClick={() => setPaused(!paused)}>{paused ? 'Reprendre' : 'Mettre en pause'}</button>
        <Link className="btn btn-p" to="/campagne">Modifier</Link>
      </Foot>
    </div>
  );
}

/* Écran 24 : espace restaurant */

const OFFERS = [
  { n: 'Avicole Bingerville', kg: 2350, d: 'Livraison lundi 6 h, chaîne du froid', v: 'Vérifié', verified: true, note: '4,8, 61 avis', photo: 'images/poussins-chair.jpg' },
  { n: 'Ferme Yao, Azaguié', kg: 2200, d: 'Livraison lundi 7 h 30, camion frigorifique', v: 'Vérifié', verified: true, note: '4,5, 18 avis', photo: 'images/poussins-lot.jpg' },
  { n: 'Volailles du Sud', kg: 1950, d: 'Retrait à Yopougon uniquement', v: 'Non vérifié', verified: false, note: 'Nouveau', photo: 'images/oeufs-plateaux.jpg' },
];
const WEEKLY_KG = 120;
const RECURRING = [
  ['Tomates fraîches, 60 kg', 'Chaque lundi et jeudi, Coop. maraîchère d’Anyama', 'jeu. 20', 'images/igname-kponan.jpg'],
  ['Mouton entier, 2 têtes', 'Chaque vendredi, Bergerie Soro', 'ven. 21', 'images/beliers-saheliens.jpg'],
];
const INVOICES: [string, string, number, string, 'green' | 'amber'][] = [
  ['FAC-2026-1104', 'Coop. d’Anyama', 186000, 'Payée', 'green'],
  ['FAC-2026-1098', 'Bergerie Soro', 240000, 'À régler le 25/11', 'amber'],
];

/** `quoteId` : la demande envoyée aux fournisseurs (réseau de l'appareil), dont on lit les offres. */
type RestoRequest = { product: string; kg: number; place: string; quoteId?: string };

/** Haut du tableau de bord restaurant : prochaine livraison ou demande en cours, dépenses, origine des produits reçus. */
function RestoOverview({ req }: { req: RestoRequest | null }) {
  const s = useStore();
  const demo = !!s.session().demo;
  const orders = s.orders();
  const last = s.lastOrder();
  const month = today().slice(3);
  const spent = orders.filter((o) => o.date.endsWith(month)).reduce((t, o) => t + o.total, 0);
  /* Origine des produits commandés : la fiche SAV-TRACE de chaque annonce qui en a une. */
  const seen = new Set<string>();
  const origins = orders.flatMap((o) => o.lines).flatMap((line) => {
    const l = s.listing(line.listingId);
    const sheet = l && sheetOf(l);
    if (!l || !sheet || seen.has(sheet.code)) return [];
    seen.add(sheet.code);
    return [{ title: l.title, from: `${sheet.origin.farm}, ${sheet.origin.town}`, code: sheet.code }];
  });
  return (
    <>
      {demo ? (
        <TodayCard eyebrow="Prochaine livraison" title="Lundi, avant 8 h" text="Poulets de chair prêts à cuire, 120 kg. Le fournisseur confirme le créneau la veille.">
          {last && <Link className="btn btn-p" to={`/commande?ref=${last.ref}`}>Suivre la livraison</Link>}
        </TodayCard>
      ) : last ? (
        <TodayCard eyebrow="Commande en cours" title={`Commande ${last.ref}`} text={`${last.lines.length} article${last.lines.length > 1 ? 's' : ''}, ${fcfa(last.total)} FCFA. Gardez votre code de remise pour le livreur.`}>
          <Link className="btn btn-p" to={`/commande?ref=${last.ref}`}>Suivre la livraison</Link>
        </TodayCard>
      ) : req ? (
        <TodayCard eyebrow="Demande en cours" title={req.product} text={`${fcfa(req.kg)} kg par semaine, livraison ${req.place}. Les fournisseurs vérifiés vous répondent avec leur prix.`} />
      ) : (
        <TodayCard eyebrow="Pour commencer" title="Envoyez votre première demande de devis" text="Indiquez le produit, le volume par semaine et le lieu : les fournisseurs vérifiés vous répondent." />
      )}
      <Kpis items={demo ? [
        { label: 'Dépenses du mois', value: '684 000', sub: 'FCFA, 11 commandes' },
        { label: 'Commandes récurrentes', value: 2, sub: '1 à confirmer' },
        { label: 'Devis en attente', value: 1, sub: 'poulets de chair', wide: true },
      ] : [
        { label: 'Dépenses du mois', value: fcfa(spent), sub: 'FCFA' },
        { label: 'Commandes', value: orders.length },
        { label: 'Devis en attente', value: req && s.net().quotes.find((q) => q.id === req.quoteId)?.status !== 'accepted' ? 1 : 0, wide: true },
      ]} />
      <div className="sec">
        <div className="sech"><h2>D’où viennent vos produits</h2></div>
        {origins.length ? (
          <div className="card list">
            {origins.map((o) => (
              <Link key={o.code} className="li" to={`/fiche/${o.code}`}>
                <div className="col grow" style={{ gap: 2, minWidth: 0 }}><span className="small b ell">{o.title}</span><span className="xs muted ell">{o.from}</span></div>
                <span className="xs num link" style={{ flex: 'none' }}>{o.code}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card pad"><span className="small muted">L’origine de vos produits, avec leur fiche de traçabilité, apparaîtra ici après vos commandes.</span></div>
        )}
      </div>
    </>
  );
}

export function Restaurant() {
  const s = useStore();
  const demo = !!s.session().demo;
  const [sel, setSel] = useState(1);
  const [ordered, setOrdered] = useState<string | null>(null);
  const [manage, setManage] = useState(false);
  const [paused, setPaused] = useState<Record<number, boolean>>({});
  /* Un nouveau restaurant saisit sa propre demande ; le compte de démonstration garde celle de la maquette. */
  const saved = s.get<RestoRequest | null>('resto.request', null);
  const req: RestoRequest | null = demo ? { product: 'Poulets de chair prêts à cuire', kg: WEEKLY_KG, place: 'Abidjan-Plateau' } : saved;
  const [product, setProduct] = useState('');
  const [kg, setKg] = useState(0);
  const [place, setPlace] = useState('');
  /* Offres : celles de la maquette pour la démo ; sinon les réponses des fournisseurs à la demande envoyée. */
  const quote = !demo && req?.quoteId ? s.net().quotes.find((q) => q.id === req.quoteId) : undefined;
  const offers = demo ? OFFERS.map((o) => ({ ...o, id: o.n })) : (quote?.offers ?? []).map((o) => ({
    id: o.id, n: o.supplier.org || o.supplier.name, kg: o.price, d: `Délai : ${o.delay}. Contact +225 ${o.supplier.phone}`, v: 'Fournisseur', verified: false, note: `Reçue le ${o.date}`, photo: 'images/aliment-betail.jpg',
  }));
  const chosen = offers[Math.min(sel, offers.length - 1)] ?? offers[0];
  /* Hors démo, « Commander » retient l'offre : le fournisseur la voit et émet ses factures. */
  const kept = quote?.accepted ? offers.find((o) => o.id === quote.accepted) : undefined;

  if (!req) {
    return (
      <div className="app">
        <DashHeader label="Espace professionnel" name={s.session().pro?.['resto.nom'] || s.session().name} action={<Link className="iconbtn" to="/assistance" aria-label="Assistance"><Icon name="chat" /></Link>} />
        <div className="body" style={{ gap: 18 }}>
          <RestoOverview req={null} />
          <div className="col" style={{ gap: 4 }}><h2 style={{ fontSize: 18, fontWeight: 600 }}>Demander un devis</h2><span className="small muted">Les fournisseurs vérifiés de la zone vous répondent avec leur prix.</span></div>
          <div className="field"><label htmlFor="rq-product">Produit</label><input id="rq-product" className="input" placeholder="Ex. poulets de chair prêts à cuire" value={product} onChange={(e) => setProduct(e.target.value)} /></div>
          <div className="field">
            <label htmlFor="rq-kg">Volume par semaine</label>
            <label className="input num" style={{ gap: 6 }}>
              <input id="rq-kg" className="plain grow num" inputMode="numeric" placeholder="0" style={bare} value={kg || ''} onChange={(e) => setKg(Math.min(99999, parseAmount(e.target.value)))} />
              <span className="muted" style={{ flex: 'none' }}>kg</span>
            </label>
          </div>
          <div className="field"><label htmlFor="rq-place">Lieu de livraison</label><input id="rq-place" className="input" placeholder="Ex. Cocody, Riviera 3" value={place} onChange={(e) => setPlace(e.target.value)} /></div>
          <div className="card pad col" style={{ gap: 4 }}><span className="b small">Commandes récurrentes et factures</span><span className="small muted">Quand vous retenez l’offre d’un fournisseur, vous pouvez la recevoir chaque semaine. Ses factures arrivent ici.</span></div>
          <ClientRecurring />
          <ClientInvoices />
        </div>
        <Foot><button className="btn btn-p" disabled={!product.trim() || kg <= 0 || !place.trim()} onClick={() => {
          const quoteId = s.askQuote({ product: product.trim(), qty: `${fcfa(kg)} kg / semaine`, place: place.trim(), org: s.session().pro?.['resto.nom'], per: 'le kg', qtyNum: kg });
          s.put('resto.request', { product: product.trim(), kg, place: place.trim(), quoteId } satisfies RestoRequest);
          showToast('Demande envoyée aux fournisseurs. Leurs offres apparaîtront ici.');
        }}>Envoyer la demande</button></Foot>
        <TabBar />
      </div>
    );
  }

  return (
    <div className="app">
      <DashHeader label="Espace professionnel" name={demo ? 'La Terrasse du Plateau' : s.session().pro?.['resto.nom'] || s.session().name} action={<Link className="iconbtn" to="/assistance" aria-label="Assistance"><Icon name="chat" /></Link>} />
      <div className="body">
        <RestoOverview req={req} />
        <label className="search">
          <Icon name="search" />
          <input className="plain grow" placeholder="Produit et volume, ex. tomate 200 kg" aria-label="Rechercher un produit" style={{ outline: 'none', cursor: 'text', minWidth: 0 }} />
        </label>

        <div className="sec">
          <div className="sech"><h2>Demande de devis</h2><Badge tone={offers.length ? 'blue' : 'grey'}>{offers.length} offre{offers.length > 1 ? 's' : ''}</Badge></div>
          <div className="card pad col" style={{ gap: 4 }}>
            <span className="b small">{req.product}, {fcfa(req.kg)} kg / semaine</span>
            <span className="xs muted">Livraison {req.place}{demo ? ', lundi avant 8 h, réponse avant le 20/11' : ''}</span>
            {!demo && <span className="xs muted">Envoyée aux fournisseurs de SAVAA. Chaque réponse arrive ici avec son prix au kg.</span>}
            {!demo && <button className="link plain" style={{ alignSelf: 'flex-start' }} onClick={() => { if (req.quoteId && !kept) s.closeQuote(req.quoteId); s.put('resto.request', null); }}>{kept ? 'Faire une nouvelle demande' : 'Modifier la demande'}</button>}
          </div>
          {!offers.length && (
            <div className="card pad col" style={{ gap: 4 }}><span className="b small">En attente des fournisseurs</span><span className="small muted">Les fournisseurs reçoivent votre demande dans leur espace. Leurs offres s’afficheront ici dès leur réponse.</span></div>
          )}
          {kept && quote && (
            <>
              <div className="notice n-info" role="status"><Icon name="check" size="sm" /><span><b>Offre retenue : {kept.n}</b>, {fcfa(kept.kg)} FCFA le kg, soit {fcfa(kept.kg * req.kg)} FCFA par semaine. {kept.d}.</span></div>
              <RecurringSetup q={quote} />
            </>
          )}
          {!!offers.length && !kept && <>
          <div className="card list" role="radiogroup">
            {offers.map((o, i) => (
              <button key={o.n} className="li" role="radio" aria-checked={sel === i} onClick={() => { setSel(i); setOrdered(null); }} style={{ background: sel === i ? '#E8F3EA' : '#fff', alignItems: 'flex-start' }}>
                <span className={`radio${sel === i ? ' on' : ''}`} style={{ marginTop: 2 }} />
                <Photo w={44} h={44} radius={6} src={o.photo} />
                <span className="col grow" style={{ gap: 3 }}>
                  <span className="row between" style={{ gap: 8 }}><span className="small b ell">{o.n}</span><span className="b num small" style={{ flex: 'none' }}>{fcfa(o.kg)} / kg</span></span>
                  <span className="xs muted">{o.d}</span>
                  <span className="wrap" style={{ gap: 4 }}><Badge tone={o.verified ? 'green' : 'grey'}>{o.v}</Badge><Badge tone="grey">{o.note}</Badge></span>
                </span>
              </button>
            ))}
          </div>
          <div className="sum" style={{ padding: '0 2px' }}><span className="muted">Coût hebdomadaire estimé</span><span className="b num" style={{ flex: 'none' }}>{fcfa(chosen.kg * req.kg)} FCFA</span></div>
          {ordered === chosen.n ? (
            <div className="notice n-info" role="status">
              <Icon name="check" size="sm" />
              <span><b>Commande transmise à {chosen.n}.</b> {demo ? 'Le fournisseur confirme le créneau de lundi.' : 'Le fournisseur vous confirme le créneau de livraison.'} Paiement simulé à la livraison des premiers {fcfa(req.kg)} kg.</span>
            </div>
          ) : (
            <button className="btn btn-p btn-block" style={{ whiteSpace: 'normal', height: 'auto', minHeight: 48, padding: '8px 18px', lineHeight: 1.25 }} onClick={() => { if (!demo && quote) { s.acceptOffer(quote.id, chosen.id); showToast(`Offre de ${chosen.n} retenue. Le fournisseur prépare la première livraison.`); } else setOrdered(chosen.n); }}>
              Commander chez {chosen.n}
            </button>
          )}
          </>}
        </div>

        {!demo && <ClientRecurring />}
        {!demo && <ClientInvoices />}
        {!demo && !s.net().recurring.some((r) => r.client.phone === s.session().phone) && !s.net().invoices.some((x) => x.client.phone === s.session().phone) && (
          <div className="card pad col" style={{ gap: 4 }}><span className="b small">Commandes récurrentes et factures</span><span className="small muted">Retenez une offre, programmez sa livraison chaque semaine : les factures du fournisseur arrivent ici.</span></div>
        )}

        {demo && <>
        <div className="sec">
          <div className="sech"><h2>Commandes récurrentes</h2><button className="link plain" aria-pressed={manage} onClick={() => setManage(!manage)}>{manage ? 'Terminé' : 'Gérer'}</button></div>
          <div className="card list">
            {RECURRING.map(([t, d, next, ph], i) => (
              <div className="li" key={t}>
                <Photo w={44} h={44} radius={6} src={ph} />
                <div className="col grow" style={{ minWidth: 0 }}><span className="small b">{t}</span><span className="xs muted">{d}</span></div>
                {manage ? (
                  <button className="btn btn-s btn-sm" style={{ flex: 'none' }} onClick={() => setPaused({ ...paused, [i]: !paused[i] })}>{paused[i] ? 'Reprendre' : 'Suspendre'}</button>
                ) : paused[i] ? <Badge tone="amber">Suspendue</Badge> : <span className="small num muted" style={{ flex: 'none' }}>{next}</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="sec">
          <div className="sech"><h2>Factures</h2><button className="link plain" onClick={() => downloadCSV('factures-savaa.csv', [['Facture', 'Fournisseur', 'Montant (FCFA)', 'Statut'], ...INVOICES.map(([n, f, m, st]) => [n, f, m, st])])}>Exporter</button></div>
          <div className="card list">
            {INVOICES.map(([n, f, m, st, tone]) => (
              <div className="li" key={n}><div className="col grow"><span className="small b num">{n}</span><span className="xs muted">{f}, {fcfa(m)} FCFA</span></div><Badge tone={tone}>{st}</Badge></div>
            ))}
          </div>
        </div>
        </>}
      </div>
      <TabBar />
    </div>
  );
}
