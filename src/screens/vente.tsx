import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fcfa, priceLabel, today, useStore, type Listing } from '../data';
import { downloadCSV } from '../device';
import { showToast } from '../toast';
import { Badge, Check, Foot, Header, Icon, Photo, PhotoAdd } from '../ui';

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
  const [name, setName] = useState(shop.name);
  const [logo, setLogo] = useState(shop.logo);
  const [desc, setDesc] = useState(shop.desc);
  const [town, setTown] = useState(shop.town);
  const [cats, setCats] = useState<Record<string, boolean>>({ Bovins: true, 'Ovins et caprins': true });
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
            <input id="shop-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <span className="lbl">Ce que vous vendez</span>
          <ChipPicker items={SHOP_CATS} sel={cats} onToggle={(t) => setCats({ ...cats, [t]: !cats[t] })} />
        </div>
        <div className="field">
          <label htmlFor="shop-desc">Présentation</label>
          <textarea id="shop-desc" className="input" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="shop-town">Commune</label>
            <select id="shop-town" className="input" value={town} onChange={(e) => setTown(e.target.value)}>
              {['Sinématiali', 'Korhogo', 'Ferkessédougou', 'Boundiali', 'Napiéolédougou'].map((t) => <option key={t}>{t}</option>)}
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
            <option value="om">Orange Money, 07 48 12 33 90</option>
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
        <Link className="btn btn-s" to="/accueil" style={{ flex: '0 0 auto' }}>Plus tard</Link>
        <button className="btn btn-p" disabled={!ready} onClick={() => { s.setShop({ name: name.trim(), desc: desc.trim(), town, logo }); navigate('/vendre'); }}>Créer et publier</button>
      </Foot>
    </div>
  );
}

/* Écran 12 : ma boutique */

type ShopTab = 'ads' | 'orders' | 'reviews';

const thumb = <Photo w={52} h={52} radius={6} />;
const LISTING_BADGE: Record<Listing['status'], [string, 'green' | 'amber' | 'blue' | 'red']> = {
  online: ['En ligne', 'green'],
  review: ['En revue', 'amber'],
  sold: ['Vendu', 'blue'],
  out: ['Rupture', 'red'],
};

export function Shop() {
  const s = useStore();
  const shop = s.shop();
  const mine = s.myListings();
  const [tab, setTab] = useState<ShopTab>('ads');
  const statCell: CSSProperties = { padding: 10, borderRight: '1px solid #E3E7E4', minWidth: 0 };
  const initials = shop.name.split(/\s+/).filter((w) => /^\p{L}/u.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const tabs: [ShopTab, string][] = [['ads', `Annonces (${4 + mine.length})`], ['orders', 'Commandes (3)'], ['reviews', 'Avis (23)']];

  return (
    <div className="app">
      <Header back title="Ma boutique" actions={<Link className="link" to="/annonce/FK-0142" style={{ paddingRight: 12, flex: 'none' }}>Vue acheteur</Link>} />
      <div className="body flush">
        <div style={{ background: '#fff', padding: 16, display: 'flex', flexDirection: 'column', gap: 14, borderBottom: '1px solid #E3E7E4' }}>
          <div className="row" style={{ gap: 14 }}>
            {shop.logo ? <Photo src={shop.logo} label="Logo" w={60} h={60} radius={10} /> : <span className="av" style={{ width: 60, height: 60, fontSize: 20, borderRadius: 10 }}>{initials}</span>}
            <div className="col grow" style={{ gap: 3, minWidth: 0 }}>
              <span className="b ell" style={{ fontSize: 17 }}>{shop.name}</span>
              <span className="xs muted">Éleveur, bovins et ovins, {shop.town}</span>
              <div className="wrap" style={{ marginTop: 2 }}><Badge tone="green">Compte vérifié</Badge><Badge tone="amber">Exploitation : visite le 25/11</Badge></div>
            </div>
          </div>
          <div className="grid4" style={{ gap: 0, border: '1px solid #E3E7E4', borderRadius: 10 }}>
            <div className="stat" style={statCell}><span className="v" style={{ fontSize: 18 }}>41</span><span className="l">ventes</span></div>
            <div className="stat" style={statCell}><span className="v" style={{ fontSize: 18 }}>4,7</span><span className="l">23 avis</span></div>
            <div className="stat" style={statCell}><span className="v" style={{ fontSize: 18 }}>2 h</span><span className="l">réponse</span></div>
            <div className="stat" style={{ ...statCell, borderRight: 0 }}><span className="v" style={{ fontSize: 18 }}>98 %</span><span className="l">livrées</span></div>
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
          {tab === 'ads' && (
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
                      <Badge tone={tone}>{label}</Badge>
                    )}
                  </div>
                );
              })}
              <Link className="li" to="/annonce/FK-0142">{thumb}<div className="col grow"><span className="small b ell">Taurillon Zébu Goudali</span><span className="xs muted num">650 000 FCFA, 214 vues, 9 contacts</span></div><Badge tone="blue">Vendu</Badge></Link>
              <Link className="li" to="/campagne/stats"><Photo w={52} h={52} radius={6} src="/images/beliers-saheliens.jpg" /><div className="col grow"><span className="small b ell">Béliers Sahéliens, lot de 6</span><span className="xs muted num">117 500 / tête, stock 6</span></div><Badge tone="sp">Sponsorisé</Badge></Link>
              <div className="li"><Photo w={52} h={52} radius={6} src="/images/genisse-metisse.jpg" /><div className="col grow"><span className="small b ell">Génisse métisse, 19 mois</span><span className="xs muted num">480 000 FCFA, en modération</span></div><Badge tone="amber">En revue</Badge></div>
              <div className="li"><Photo w={52} h={52} radius={6} tint="w" /><div className="col grow"><span className="small b ell">Fumier composté, sac 40 kg</span><span className="xs muted num">2 000 FCFA, stock 0</span></div><Badge tone="red">Rupture</Badge></div>
            </div>
          )}
          {tab === 'orders' && (
            <div className="card list">
              <Link className="li" to="/commande"><div className="col grow"><span className="small b">SAV-2026-11-004812</span><span className="xs muted">Fatou Ouattara, taurillon, 650 000 FCFA</span></div><Badge tone="blue">En livraison</Badge></Link>
              <div className="li"><div className="col grow"><span className="small b">SAV-2026-11-004655</span><span className="xs muted">Maquis Le Carrefour, 2 béliers</span></div><Badge tone="amber">À préparer</Badge></div>
              <div className="li"><div className="col grow"><span className="small b">SAV-2026-10-003910</span><span className="xs muted">Boucherie Fofana, 1 bœuf</span></div><Badge tone="green">Livrée</Badge></div>
            </div>
          )}
          {tab === 'reviews' && (
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
    </div>
  );
}

/* Écran 13 : publier une annonce (onglet « Vendre ») */

const CATEGORIES = ['Animaux, Bovins', 'Animaux, Ovins', 'Animaux, Caprins', 'Volailles', 'Récoltes', 'Aliments et intrants', 'Matériel'];

/* Brouillon d'annonce gardé sur le téléphone (bouton « Brouillon »). */
const DRAFT_KEY = 'savaa-brouillon-annonce';
type Draft = { category: string; picked: string[]; photos: string[]; title: string; price: number; qty: number; neg: boolean; delivery: boolean };
function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

export function Publish() {
  const s = useStore();
  const navigate = useNavigate();
  const herd = s.animals();

  const [draft] = useState(loadDraft);
  const [step, setStep] = useState<1 | 2 | 'sent'>(1);
  const [category, setCategory] = useState(draft?.category ?? CATEGORIES[0]);
  const [picked, setPicked] = useState<string[]>(draft?.picked ?? ['FK-0091']);
  const [picker, setPicker] = useState(false);
  /* Photos : libellés de la maquette, ou images ajoutées (data URL). */
  const [photos, setPhotos] = useState<string[]>(draft?.photos ?? ['1', '2', 'Vidéo']);
  const [title, setTitle] = useState(draft?.title ?? 'Génisse métisse Goudali × N’Dama, 19 mois');
  const [price, setPrice] = useState(draft?.price ?? 480000);
  const [qty, setQty] = useState(draft?.qty ?? 1);
  const [neg, setNeg] = useState(draft?.neg ?? true);
  const [delivery, setDelivery] = useState(draft?.delivery ?? true);
  const [published, setPublished] = useState<string | null>(null);
  const shop = s.shop();

  const isAnimal = category.startsWith('Animaux');
  const chosen = herd.filter((a) => picked.includes(a.id));
  const unit = isAnimal ? (qty > 1 ? 'têtes' : 'tête') : 'unité';
  const ready = title.trim() !== '' && price > 0 && qty > 0 && (!isAnimal || chosen.length > 0);

  const togglePick = (id: string) => {
    const next = picked.includes(id) ? picked.filter((p) => p !== id) : [...picked, id];
    setPicked(next);
    setQty(Math.max(1, next.length));
  };

  const saveDraft = () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ category, picked, photos, title, price, qty, neg, delivery } satisfies Draft));
      showToast('Brouillon enregistré sur le téléphone');
    } catch {
      showToast('Brouillon trop lourd : retirez une photo et réessayez.');
    }
  };

  const images = photos.filter((p) => p.startsWith('data:'));
  const send = () => {
    const id = `L-${Date.now().toString(36).toUpperCase()}`;
    s.addListing({
      id,
      title: title.trim(),
      details: isAnimal ? (chosen.length === 1 ? chosen[0].details : `${chosen.length} animaux : ${chosen.map((a) => a.id).join(', ')}`) : `${qty} ${unit} disponibles`,
      price,
      unit: qty > 1 ? (isAnimal ? 'la tête' : 'l’unité') : undefined,
      negotiable: neg,
      place: `${shop.town}, Poro`,
      seller: shop.name,
      sellerShort: shop.name,
      sellerVerified: true,
      category,
      photo: 'Photo',
      photos: images,
      trace: isAnimal ? [chosen.length > 1 ? `${chosen.length} fiches` : 'Fiche liée', 'blue'] : ['Nouveau', 'grey'],
      animalIds: isAnimal ? chosen.map((a) => a.id) : undefined,
      delivery,
      stock: qty > 1 ? qty : undefined,
      status: 'review',
      mine: true,
      date: today(),
    });
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* rien */
    }
    setPublished(id);
    setStep('sent');
  };

  const header = (
    <header className="hdr">
      {step === 2 ? (
        <button className="iconbtn" aria-label="Retour" onClick={() => setStep(1)}><Icon name="back" /></button>
      ) : (
        <button className="iconbtn" aria-label="Fermer" onClick={() => navigate(-1)}><Icon name="close" /></button>
      )}
      <h1>{step === 'sent' ? 'Annonce envoyée' : 'Nouvelle annonce'}</h1>
      {step !== 'sent' && <span className="small muted" style={{ paddingRight: 12, flex: 'none' }}>{step} / 2</span>}
    </header>
  );

  const steps = (
    <div style={{ background: '#fff', padding: '0 16px 12px', borderBottom: '1px solid #E3E7E4', flex: 'none' }}>
      <div className="steps"><i className="on" /><i className={step === 2 ? 'on' : ''} /></div>
    </div>
  );

  if (step === 'sent') {
    return (
      <div className="app">
        {header}
        <div className="body" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 14, padding: 28 }}>
          <Icon name="check" style={{ width: 52, height: 52, color: '#145C3A', strokeWidth: 1.4 }} />
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Annonce envoyée en relecture</h2>
          <p className="small muted" style={{ lineHeight: 1.5 }}>L’équipe SAVAA vérifie l’annonce avant sa mise en ligne, en général sous 24 h. Vous serez prévenu par notification.</p>
          <div className="card pad" style={{ width: '100%', textAlign: 'left' }}>
            <dl className="kv">
              <dt>Annonce</dt><dd className="ell">{title}</dd>
              <dt>Prix</dt><dd className="num">{fcfa(price)} FCFA</dd>
              <dt>Statut</dt><dd><Badge tone="amber">En revue</Badge></dd>
            </dl>
          </div>
          <Link className="btn btn-p btn-block" to="/campagne">Mettre en avant</Link>
          <Link className="btn btn-s btn-block" to="/boutique">Voir ma boutique</Link>
          {published && <Link className="btn btn-ghost btn-block" to={`/annonce/${published}`}>Voir l’annonce</Link>}
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="app">
        {header}
        {steps}
        <div className="body" style={{ gap: 20 }}>
          <div className="sec" style={{ gap: 8 }}>
            <span className="lbl">Aperçu dans les résultats</span>
            <div className="hc">
              <Photo label={photos[0] && !images[0] ? `Photo ${photos[0]}` : 'Photo'} src={images[0]} w={84} h={84} radius={images[0] ? 8 : undefined} />
              <div className="col grow" style={{ gap: 3 }}>
                <span className="b small" style={{ lineHeight: 1.3 }}>{title}</span>
                <span className="price">{fcfa(price)} FCFA{neg ? ', négociable' : ''}</span>
                <span className="xs muted ell">{shop.town}, {shop.name}</span>
                <span className="wrap" style={{ gap: 4, marginTop: 2 }}>
                  <Badge tone="green">Compte vérifié</Badge>
                  {isAnimal && <Badge tone="blue">{chosen.length > 1 ? `${chosen.length} fiches` : 'Fiche liée'}</Badge>}
                </span>
              </div>
            </div>
          </div>
          <div className="card pad">
            <dl className="kv">
              <dt>Catégorie</dt><dd>{category}</dd>
              {isAnimal && <><dt>Animaux</dt><dd>{chosen.map((a) => a.id).join(', ')}</dd></>}
              <dt>Quantité</dt><dd className="num">{qty} {unit}</dd>
              <dt>Prix</dt><dd className="num">{fcfa(price)} FCFA{qty > 1 ? ` / ${isAnimal ? 'tête' : 'unité'}` : ''}</dd>
              <dt>Négociable</dt><dd>{neg ? 'Oui' : 'Non'}</dd>
              <dt>Livraison</dt><dd>{delivery ? 'Transporteur SAVAA' : 'Retrait sur place'}</dd>
              <dt>Photos</dt><dd className="num">{photos.length}</dd>
            </dl>
          </div>
          {photos.length < 3 && (
            <div className="notice n-warn"><Icon name="alert" size="sm" /><span>Ajoutez au moins 3 photos pour une annonce plus visible.</span></div>
          )}
          <Link className="card pad row" to="/campagne">
            <Icon name="megaphone" style={{ color: '#145C3A' }} />
            <span className="col grow"><span className="small b">Mettre en avant après validation</span><span className="xs muted">Option payante. L’annonce portera la mention « Sponsorisé ».</span></span>
            <Icon name="chevron" size="sm" />
          </Link>
          <p className="hint">Chaque annonce est relue par l’équipe SAVAA avant sa mise en ligne, en général sous 24 h.</p>
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
      <div className="body" style={{ gap: 20 }}>
        <div className="field">
          <label htmlFor="pub-cat">Catégorie</label>
          <select id="pub-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        {isAnimal && (
          <div className="field">
            <span className="lbl">Animaux concernés</span>
            {chosen.length === 0 && <span className="hint">Choisissez au moins un animal du cheptel.</span>}
            {chosen.map((a) => (
              <div key={a.id} className="card row" style={{ padding: '10px 12px' }}>
                <button className="plain" aria-label={`Retirer ${a.id}`} onClick={() => togglePick(a.id)}><Check on /></button>
                <div className="col grow"><span className="small b ell">{a.id}, {a.name}</span><span className="xs muted">Fiche liée automatiquement à l’annonce</span></div>
                {a.tone === 'green' ? <Badge tone="green">Fiche à jour</Badge> : <Badge tone={a.tone}>{a.status}</Badge>}
              </div>
            ))}
            <button className="link plain" style={{ alignSelf: 'flex-start' }} onClick={() => setPicker(!picker)} aria-expanded={picker}>
              {picker ? 'Fermer la liste du cheptel' : '+ Choisir d’autres animaux du cheptel'}
            </button>
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
          </div>
        )}

        <div className="field">
          <span className="lbl">Photos et vidéo</span>
          <div className="grid4">
            {photos.map((p, i) => (p.startsWith('data:')
              ? <Photo key={i} src={p} label={`Photo ${i + 1}`} h={76} radius={8} onRemove={() => setPhotos(photos.filter((_, j) => j !== i))} />
              : <Photo key={i} label={p} h={76} radius={8} />))}
            {photos.length < 8 && <PhotoAdd height={76} label="" icon="plus" onAdd={(p) => setPhotos((x) => (x.length < 8 ? [...x, p] : x))} />}
          </div>
          <span className="hint">Prenez l’animal de profil, en plein jour. Au moins 3 photos.</span>
        </div>

        <div className="field">
          <label htmlFor="pub-title">Titre</label>
          <input id="pub-title" className="input" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="pub-price">Prix (FCFA)</label>
            <input id="pub-price" className="input num b" inputMode="numeric" value={price ? fcfa(price) : ''} onChange={(e) => setPrice(parseAmount(e.target.value))} />
          </div>
          <div className="field">
            <label htmlFor="pub-qty">Quantité</label>
            <label className="input num" style={{ gap: 6 }}>
              <input id="pub-qty" className="plain grow num" inputMode="numeric" style={bare} value={qty || ''} onChange={(e) => setQty(Math.min(999, parseAmount(e.target.value)))} />
              <span className="muted" style={{ flex: 'none' }}>{unit}</span>
            </label>
          </div>
        </div>
        <ToggleRow on={neg} onClick={() => setNeg(!neg)} title="Prix négociable" sub="Les acheteurs peuvent faire une offre" />
        <div className="field">
          <label>Localisation</label>
          <div className="input sel"><span className="ell">Sinématiali, Poro</span><Icon name="pin" size="sm" /></div>
        </div>
        <ToggleRow on={delivery} onClick={() => setDelivery(!delivery)} title="Livraison par un transporteur SAVAA" sub="Frais calculés et payés par l’acheteur" />
        <Link className="card pad row" to="/assistance" style={{ background: '#E8F3EA', borderColor: '#CFE0D4' }}>
          <Icon name="phone" style={{ color: '#145C3A' }} />
          <span className="col grow"><span className="small b">Besoin d’aide pour publier ?</span><span className="xs muted">Un conseiller vous rappelle et remplit l’annonce avec vous.</span></span>
        </Link>
        <p className="hint">Chaque annonce est relue par l’équipe SAVAA avant sa mise en ligne, en général sous 24 h.</p>
      </div>
      <Foot>
        <button className="btn btn-s" style={{ flex: '0 0 auto' }} onClick={saveDraft}>Brouillon</button>
        <button className="btn btn-p" disabled={!ready} onClick={() => setStep(2)}>Continuer</button>
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

export function Campaign() {
  const [fmt, setFmt] = useState<string>('top');
  const [zones, setZones] = useState<Record<string, boolean>>({ Poro: true, Tchologo: true });
  const [buyers, setBuyers] = useState<Record<string, boolean>>({ Particuliers: true, Restaurants: true });
  const [bill, setBill] = useState('Forfait');
  const [budget, setBudget] = useState(15000);
  const [cap, setCap] = useState(1500);

  const ready = Object.values(zones).some(Boolean) && Object.values(buyers).some(Boolean) && budget > 0;
  const days = cap > 0 ? Math.ceil(budget / cap) : 0;

  return (
    <div className="app">
      <Header back title="Mettre en avant" />
      <div className="body" style={{ gap: 20 }}>
        <div className="card row" style={{ padding: '10px 12px' }}>
          <Photo w={48} h={48} radius={6} src="/images/beliers-saheliens.jpg" />
          <div className="col grow"><span className="small b ell">Béliers Sahéliens, lot de 6</span><span className="xs muted num">117 500 FCFA / tête, en ligne</span></div>
          <Link className="link" to="/boutique" style={{ flex: 'none' }}>Changer</Link>
        </div>

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
          <div className="field"><label htmlFor="cp-start">Début</label><input id="cp-start" className="input num" defaultValue="10/11/2026" /></div>
          <div className="field"><label htmlFor="cp-end">Fin</label><input id="cp-end" className="input num" defaultValue="24/11/2026" /></div>
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
            <Photo label="Photo" w={84} h={84} src="/images/beliers-saheliens.jpg" />
            <div className="col grow" style={{ gap: 3 }}>
              <Badge tone="sp" style={{ alignSelf: 'flex-start' }}>Sponsorisé</Badge>
              <span className="b small ell">Béliers Sahéliens, lot de 6</span>
              <span className="price">117 500 FCFA</span>
              <span className="xs muted ell">Sinématiali, Ferme Koné &amp; Fils</span>
            </div>
          </div>
        </div>
        <p className="hint">Relue par SAVAA avant diffusion. Paiement de la campagne simulé dans cette démonstration.</p>
      </div>
      <Foot>
        {ready ? (
          <Link className="btn btn-p" to="/campagne/stats">Soumettre à validation</Link>
        ) : (
          <button className="btn btn-p" disabled>Soumettre à validation</button>
        )}
      </Foot>
    </div>
  );
}

/* Écran 15 : résultats de campagne */

const CLICKS = [14, 19, 22, 18, 27, 41, 25, 23, 18];
const CLICKS_MAX = Math.max(...CLICKS);
const nineCols: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(9, minmax(0, 1fr))', gap: 8 };

export function CampaignStats() {
  const [paused, setPaused] = useState(false);

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
  { n: 'Avicole Bingerville', kg: 2350, d: 'Livraison lundi 6 h, chaîne du froid', v: 'Vérifié', verified: true, note: '4,8, 61 avis' },
  { n: 'Ferme Yao, Azaguié', kg: 2200, d: 'Livraison lundi 7 h 30, camion frigorifique', v: 'Vérifié', verified: true, note: '4,5, 18 avis' },
  { n: 'Volailles du Sud', kg: 1950, d: 'Retrait à Yopougon uniquement', v: 'Non vérifié', verified: false, note: 'Nouveau' },
];
const WEEKLY_KG = 120;
const RECURRING = [
  ['Tomates fraîches, 60 kg', 'Chaque lundi et jeudi, Coop. maraîchère d’Anyama', 'jeu. 20'],
  ['Mouton entier, 2 têtes', 'Chaque vendredi, Bergerie Soro', 'ven. 21'],
];
const INVOICES: [string, string, number, string, 'green' | 'amber'][] = [
  ['FAC-2026-1104', 'Coop. d’Anyama', 186000, 'Payée', 'green'],
  ['FAC-2026-1098', 'Bergerie Soro', 240000, 'À régler le 25/11', 'amber'],
];

export function Restaurant() {
  const [sel, setSel] = useState(1);
  const [ordered, setOrdered] = useState<string | null>(null);
  const [manage, setManage] = useState(false);
  const [paused, setPaused] = useState<Record<number, boolean>>({});
  const chosen = OFFERS[sel];

  return (
    <div className="app">
      <header className="hdr green" style={{ paddingLeft: 16 }}>
        <div className="col grow" style={{ gap: 1 }}>
          <span className="xs" style={{ color: '#CFE0D4' }}>Espace professionnel</span>
          <span className="b ell" style={{ fontSize: 17 }}>La Terrasse du Plateau</span>
        </div>
        <Link className="iconbtn" to="/assistance" aria-label="Assistance"><Icon name="chat" /></Link>
      </header>
      <div className="body">
        <label className="search">
          <Icon name="search" />
          <input className="plain grow" placeholder="Produit et volume, ex. tomate 200 kg" aria-label="Rechercher un produit" style={{ outline: 'none', cursor: 'text', minWidth: 0 }} />
        </label>

        <div className="sec">
          <div className="sech"><h2>Demande de devis</h2><Badge tone="blue">{OFFERS.length} offres</Badge></div>
          <div className="card pad col" style={{ gap: 4 }}>
            <span className="b small">Poulets de chair prêts à cuire, {WEEKLY_KG} kg / semaine</span>
            <span className="xs muted">Livraison Abidjan-Plateau, lundi avant 8 h, réponse avant le 20/11</span>
          </div>
          <div className="card list" role="radiogroup">
            {OFFERS.map((o, i) => (
              <button key={o.n} className="li" role="radio" aria-checked={sel === i} onClick={() => { setSel(i); setOrdered(null); }} style={{ background: sel === i ? '#E8F3EA' : '#fff', alignItems: 'flex-start' }}>
                <span className={`radio${sel === i ? ' on' : ''}`} style={{ marginTop: 2 }} />
                <span className="col grow" style={{ gap: 3 }}>
                  <span className="row between" style={{ gap: 8 }}><span className="small b ell">{o.n}</span><span className="b num small" style={{ flex: 'none' }}>{fcfa(o.kg)} / kg</span></span>
                  <span className="xs muted">{o.d}</span>
                  <span className="wrap" style={{ gap: 4 }}><Badge tone={o.verified ? 'green' : 'grey'}>{o.v}</Badge><Badge tone="grey">{o.note}</Badge></span>
                </span>
              </button>
            ))}
          </div>
          <div className="sum" style={{ padding: '0 2px' }}><span className="muted">Coût hebdomadaire estimé</span><span className="b num" style={{ flex: 'none' }}>{fcfa(chosen.kg * WEEKLY_KG)} FCFA</span></div>
          {ordered === chosen.n ? (
            <div className="notice n-info" role="status">
              <Icon name="check" size="sm" />
              <span><b>Commande transmise à {chosen.n}.</b> Le fournisseur confirme le créneau de lundi. Paiement simulé à la livraison des premières {WEEKLY_KG} kg.</span>
            </div>
          ) : (
            <button className="btn btn-p btn-block" style={{ whiteSpace: 'normal', height: 'auto', minHeight: 48, padding: '8px 18px', lineHeight: 1.25 }} onClick={() => setOrdered(chosen.n)}>
              Commander chez {chosen.n}
            </button>
          )}
        </div>

        <div className="sec">
          <div className="sech"><h2>Commandes récurrentes</h2><button className="link plain" aria-pressed={manage} onClick={() => setManage(!manage)}>{manage ? 'Terminé' : 'Gérer'}</button></div>
          <div className="card list">
            {RECURRING.map(([t, d, next], i) => (
              <div className="li" key={t}>
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
      </div>
    </div>
  );
}
