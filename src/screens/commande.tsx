import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { fcfa, useStore, type Order } from '../data';
import { printPage } from '../device';
import { Badge, Foot, Header, Icon, NotFound, Photo, PhotoAdd, TabBar } from '../ui';

function Steps({ n }: { n: number }) {
  return (
    <div style={{ background: '#fff', padding: '10px 16px 12px', borderBottom: '1px solid #E3E7E4', flex: 'none' }}>
      <div className="steps">{[1, 2, 3].map((i) => <i key={i} className={i <= n ? 'on' : ''} />)}</div>
      <div className="row between xs muted" style={{ marginTop: 6 }}>
        {['Panier et livraison', 'Paiement', 'Reçu'].map((t, i) => <span key={t} style={i + 1 === n ? { color: '#17201B', fontWeight: 600 } : undefined}>{t}</span>)}
      </div>
    </div>
  );
}

/* Écran 17 : panier et livraison. */
export function Cart() {
  const s = useStore();
  const c = s.cart();
  const t = s.cartTotals();
  const lines = s.cartLines();
  const sellers = [...new Set(lines.map((l) => l.listing.seller))];
  const qtyBtn = { width: 36, height: 36 };
  const demo = !!s.session().demo;
  const needAddress = !demo && c.delivery && !(c.address ?? '').trim();

  if (!lines.length) {
    return (
      <div className="app">
        <Header back title="Panier" />
        <div className="body" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 12, padding: 32 }}>
          <Icon name="cart" style={{ width: 52, height: 52, color: '#5D6862', strokeWidth: 1.4 }} />
          <h2 style={{ fontSize: 19, fontWeight: 600 }}>Votre panier est vide</h2>
          <p className="small muted">Ajoutez une annonce avec « Commander via SAVAA ».</p>
          <Link className="btn btn-p btn-block" to="/explorer">Voir les annonces</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Header back title={`Panier, ${t.sellers} vendeur${t.sellers > 1 ? 's' : ''}`} />
      <Steps n={1} />
      <div className="body">
        {sellers.map((seller) => {
          const mine = lines.filter((l) => l.listing.seller === seller);
          return (
            <div className="card" key={seller}>
              <div className="row between" style={{ padding: '10px 14px', borderBottom: '1px solid #EDF0EE' }}>
                <span className="small b ell">{seller}</span>
                {mine[0].listing.sellerVerified ? <Badge tone="green">Vérifié</Badge> : <Badge>Non vérifié</Badge>}
              </div>
              {mine.map(({ listing: l, qty, amount }) => (
                <div className="row top" style={{ padding: '12px 14px', gap: 12 }} key={l.id}>
                  <Photo w={64} h={64} radius={6} tint={l.tint} src={l.photos?.[0]} />
                  <div className="col grow" style={{ gap: l.stock ? 6 : 3, minWidth: 0 }}>
                    <span className="small b">{l.title}</span>
                    {!l.stock && <span className="xs muted">{l.animalIds?.length ? `${l.animalIds.join(', ')}, ${l.animalIds.length} animal${l.animalIds.length > 1 ? 'aux' : ''}` : '1 lot'}</span>}
                    <div className="row between" style={{ flexWrap: 'wrap', gap: 8 }}>
                      <span className="price">{fcfa(amount)} FCFA</span>
                      {!!l.stock && (
                        <div className="row" style={{ gap: 0, border: '1px solid #C5CDC7', borderRadius: 8 }}>
                          <button className="iconbtn" style={qtyBtn} aria-label="Retirer un" disabled={qty <= 1} onClick={() => s.setQty(l.id, qty - 1)}>−</button>
                          <span className="b num" style={{ minWidth: 28, textAlign: 'center' }}>{qty}</span>
                          <button className="iconbtn" style={qtyBtn} aria-label="Ajouter un" disabled={qty >= l.stock} onClick={() => s.setQty(l.id, qty + 1)}>+</button>
                        </div>
                      )}
                    </div>
                    {!!l.stock && <span className="xs muted num">{fcfa(l.price)} FCFA {l.unit ?? 'l’unité'}, stock {l.stock}</span>}
                  </div>
                  <button className="iconbtn" style={{ width: 32, height: 32, color: '#5D6862' }} aria-label={`Retirer ${l.title} du panier`} onClick={() => s.removeFromCart(l.id)}><Icon name="close" size="sm" /></button>
                </div>
              ))}
            </div>
          );
        })}

        <div className="sec">
          <div className="sech"><h2>Réception</h2></div>
          <div className="seg">
            <button className={c.delivery ? 'on' : ''} onClick={() => s.setCart({ delivery: true })}>Livraison</button>
            <button className={!c.delivery ? 'on' : ''} onClick={() => s.setCart({ delivery: false })}>Retrait sur place</button>
          </div>
          {c.delivery ? (
            <>
              {demo ? (
                <div className="card list">
                  <div className="li" style={{ alignItems: 'flex-start' }}><Icon name="pin" /><div className="col grow"><span className="small b">Ferme Ouattara, route de Dikodougou</span><span className="xs muted">Korhogo, Fatou Ouattara, 05 •• •• 21 48</span></div></div>
                  <div className="li" style={{ alignItems: 'flex-start' }}><Icon name="calendar" /><div className="col grow"><span className="small b">Jeudi 20 novembre, 7 h – 11 h</span><span className="xs muted">Créneau proposé par le transporteur</span></div></div>
                </div>
              ) : (
                <div className="field">
                  <label htmlFor="cart-address">Adresse de livraison</label>
                  <textarea id="cart-address" className="input" style={{ minHeight: 64 }} placeholder="Village ou quartier, repère, personne à contacter" value={c.address ?? ''} onChange={(e) => s.setCart({ address: e.target.value })} />
                  <span className="hint">Le transporteur vous propose un créneau après le paiement.</span>
                </div>
              )}
              <span className="hint">Transport en bétaillère par un transporteur partenaire.</span>
            </>
          ) : (
            <div className="card pad col" style={{ gap: 4 }}>
              <span className="small b">Retrait chez {sellers.length > 1 ? 'chaque vendeur' : 'le vendeur'}</span>
              <span className="xs muted">{lines.map((l) => l.listing.pickup ?? `${l.listing.place.split(',')[0]} (${l.listing.title})`).join(' et ')}. Code de retrait envoyé après paiement.</span>
            </div>
          )}
        </div>

        <div className="card pad col" style={{ gap: 8 }}>
          <div className="sum"><span className="muted">Articles</span><span className="num">{fcfa(t.items)} FCFA</span></div>
          <div className="sum"><span className="muted">Livraison</span><span className="num">{t.shipping ? `${fcfa(t.shipping)} FCFA` : 'Gratuit'}</span></div>
          <div className="sum"><span className="muted">Frais de paiement</span><span>selon le moyen</span></div>
          <div className="sum t"><span>Total estimé</span><span className="num">{fcfa(t.total)} FCFA</span></div>
        </div>
      </div>
      <Foot>
        {needAddress ? <button className="btn btn-p" disabled>Indiquez l’adresse de livraison</button> : <Link className="btn btn-p" to="/paiement">Choisir le paiement</Link>}
      </Foot>
    </div>
  );
}

const MOMO = [
  ['Orange Money', '/images/payments/orange-money-real.svg', 'Validation par code secret'],
  ['MTN MoMo', '/images/payments/mtn-momo-real.png', 'Validation par code secret'],
  ['Moov Money', '/images/payments/moov-money-real.png', 'Validation par code secret'],
  ['Wave', '/images/payments/wave.svg', 'Validation dans l’application'],
];
const OTHER = [
  ['Carte bancaire', '/images/payments/mastercard-real.svg', 'Visa, Mastercard, authentification 3-D Secure'],
  ['Virement bancaire', '/images/payments/virement.svg', 'Achats professionnels, 24 à 72 h'],
];
const PAY_LOGO: Record<string, string> = Object.fromEntries([...MOMO, ...OTHER].map(([n, logo]) => [n, logo]));
const isMomo = (method: string) => MOMO.some((m) => m[0] === method);

/** Délai laissé pour valider sur le téléphone avant l'échec automatique. */
const DELAY = 300;

/* Écran 18 : paiement simulé (choix, attente, échec). */
export function Payment() {
  const s = useStore();
  const navigate = useNavigate();
  const c = s.cart();
  const total = fcfa(s.cartTotals().total);
  const [step, setStep] = useState<'choose' | 'pending' | 'failed'>('choose');
  const [left, setLeft] = useState(DELAY);
  const [tx] = useState(() => `TX-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.floor(Math.random() * 90000) + 10000}`);

  useEffect(() => {
    if (step !== 'pending') return;
    const t = setInterval(() => setLeft((x) => x - 1), 1000);
    return () => clearInterval(t);
  }, [step]);
  useEffect(() => {
    if (step === 'pending' && left <= 0) setStep('failed');
  }, [left, step]);

  if (!s.cartLines().length && step === 'choose') return <Navigate to="/panier" replace />;

  const pay = () => {
    setLeft(DELAY);
    setStep('pending');
  };
  const confirm = () => {
    const o = s.placeOrder();
    navigate(`/recu?ref=${o.ref}`, { replace: true });
  };

  const methodRow = ([name, logo, sub]: string[]) => (
    <button key={name} className="li" onClick={() => s.setCart({ method: name })} style={{ background: c.method === name ? '#E8F3EA' : '#fff' }}>
      <img src={logo} alt={name} width={44} height={44} style={{ width: 44, height: 44, borderRadius: 8, flex: 'none', objectFit: 'contain', background: '#fff', border: '1px solid #E3E7E4', padding: 3 }} />
      <span className="col grow"><span className="small b">{name}</span><span className="xs muted">{sub}</span></span>
      <span className={`radio${c.method === name ? ' on' : ''}`} />
    </button>
  );

  return (
    <div className="app">
      <Header back title="Paiement" />
      {step === 'choose' && (
        <>
          <div style={{ background: '#fff', padding: '10px 16px 12px', borderBottom: '1px solid #E3E7E4', flex: 'none' }}>
            <div className="steps"><i className="on" /><i className="on" /><i /></div>
            <div className="row between" style={{ marginTop: 8 }}><span className="small muted">Montant à payer</span><span className="b num" style={{ fontSize: 18 }}>{total} FCFA</span></div>
          </div>
          <div className="body" style={{ gap: 14 }}>
            <div className="sec" style={{ gap: 8 }}>
              <span className="eyebrow">Mobile Money</span>
              <div className="card list">{MOMO.map(methodRow)}</div>
            </div>
            {isMomo(c.method) && (
              <div className="field">
                <label htmlFor="tel">Numéro à débiter</label>
                <input id="tel" className="input num" type="tel" inputMode="tel" placeholder="+225 07 00 00 00 00" defaultValue={s.session().phone ? `+225 ${s.session().phone}` : ''} />
                <span className="hint">Vous validerez le paiement avec votre code secret sur votre téléphone. SAVAA ne le voit jamais.</span>
              </div>
            )}
            <div className="sec" style={{ gap: 8 }}>
              <span className="eyebrow">Autres moyens</span>
              <div className="card list">
                {OTHER.map(methodRow)}
                <div className="li" style={{ opacity: 0.55 }}><img src="/images/payments/livraison.svg" alt="Paiement à la livraison" width={40} height={40} style={{ width: 40, height: 40, borderRadius: 8, flex: 'none' }} /><span className="col grow"><span className="small b">Paiement à la livraison</span><span className="xs muted">Indisponible pour les animaux vivants</span></span></div>
                <div className="li" style={{ opacity: 0.55 }}><img src="/favicon.svg" alt="Solde SAVAA" width={40} height={40} style={{ width: 40, height: 40, borderRadius: 8, flex: 'none', background: '#E8F3EA', padding: 4 }} /><span className="col grow"><span className="small b">Solde SAVAA</span><span className="xs muted">Fonction future, soumise à agrément</span></span><Badge>Bientôt</Badge></div>
              </div>
            </div>
            <p className="xs muted">Paiement opéré par un prestataire agréé. SAVAA ne conserve aucune donnée de carte.</p>
          </div>
          <Foot><button className="btn btn-p" onClick={pay}>Payer {total} FCFA</button></Foot>
        </>
      )}
      {step === 'pending' && (
        <div className="body" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 14, padding: 28 }}>
          <div className="spin" style={{ width: 64, height: 64, borderRadius: 32, border: '4px solid #E3E7E4', borderTopColor: '#145C3A' }} />
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Validez sur votre téléphone</h2>
          <p className="small muted" style={{ lineHeight: 1.5 }}>Une demande de {total} FCFA a été envoyée via {c.method}. Composez votre code secret pour confirmer.</p>
          <div className="card pad" style={{ width: '100%', textAlign: 'left' }}>
            <dl className="kv"><dt>Transaction</dt><dd className="num">{tx}</dd><dt>Statut</dt><dd><Badge tone="blue">Initié</Badge></dd><dt>Expire dans</dt><dd className="num">{Math.floor(left / 60)} min {String(left % 60).padStart(2, '0')} s</dd></dl>
          </div>
          <div className="col" style={{ width: '100%', gap: 8, marginTop: 6 }}>
            <span className="eyebrow">Démonstration : choisir la réponse du prestataire</span>
            <button className="btn btn-p btn-block" onClick={confirm}>Confirmé</button>
            <button className="btn btn-s btn-block" onClick={() => setStep('failed')}>Échec ou délai expiré</button>
          </div>
        </div>
      )}
      {step === 'failed' && (
        <div className="body" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 14, padding: 28 }}>
          <Icon name="fail" style={{ width: 56, height: 56, color: '#B42318', strokeWidth: 1.4 }} />
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Paiement non abouti</h2>
          <p className="small muted" style={{ lineHeight: 1.5 }}>Le prestataire a renvoyé « échoué » : solde insuffisant ou délai de validation dépassé. Aucun montant n’a été débité.</p>
          <div className="card pad" style={{ width: '100%', textAlign: 'left' }}>
            <dl className="kv"><dt>Transaction</dt><dd className="num">{tx}</dd><dt>Statut</dt><dd><Badge tone="red">Échoué</Badge></dd><dt>Commande</dt><dd>Conservée 24 h</dd></dl>
          </div>
          <button className="btn btn-p btn-block" onClick={() => setStep('choose')}>Réessayer ou changer de moyen</button>
          <Link className="btn btn-ghost btn-block" to="/assistance">Contacter l’assistance</Link>
        </div>
      )}
    </div>
  );
}

/** Commande demandée par `?ref=`, sinon la plus récente. */
function useOrder(): Order | undefined {
  const s = useStore();
  const [params] = useSearchParams();
  const ref = params.get('ref');
  return ref ? s.order(ref) : s.lastOrder();
}

/** Libellé d'une ligne de reçu, au format de la maquette pour sa commande. */
const lineLabel = (o: Order, i: number) => {
  const l = o.lines[i];
  if (o.demo) return i === 0 ? 'Ferme Koné & Fils, taurillon' : `Provenderie du Nord, ${l.qty} sacs`;
  return `${l.seller}, ${l.title}${l.qty > 1 ? ` × ${l.qty}` : ''}`;
};

const noOrder = <NotFound title="Commande" text="Aucune commande pour l’instant." to="/explorer" cta="Voir les annonces" />;

/* Écran 19 : confirmation et reçu. */
export function Receipt() {
  const o = useOrder();
  const navigate = useNavigate();
  if (!o) return noOrder;
  return (
    <div className="app">
      <header className="hdr">
        <button className="iconbtn" aria-label="Fermer" onClick={() => navigate('/accueil')}><Icon name="close" /></button>
        <h1>Reçu</h1>
      </header>
      <div className="body">
        <div className="col" style={{ alignItems: 'center', textAlign: 'center', gap: 8, padding: '8px 0 4px' }}>
          <Icon name="check" style={{ width: 52, height: 52, color: '#145C3A', strokeWidth: 1.4 }} />
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Paiement confirmé</h2>
          <p className="small muted">Statut transmis par le prestataire le {o.date} à {o.time}</p>
        </div>
        <div className="card">
          <div className="col" style={{ padding: 14, borderBottom: '1px dashed #C5CDC7' }}><span className="xs muted">Référence commande</span><span className="b num" style={{ fontSize: 17 }}>{o.ref}</span></div>
          <div className="pad">
            <dl className="kv">
              <dt>Transaction</dt><dd className="num">{o.tx}</dd>
              <dt>Moyen</dt>
              <dd className="row" style={{ gap: 6 }}>
                {PAY_LOGO[o.method] && <img src={PAY_LOGO[o.method]} alt={o.method} width={20} height={20} style={{ width: 20, height: 20, borderRadius: 4, flex: 'none' }} />}
                <span>{isMomo(o.method) ? `${o.method}, 07 •• •• 33 90` : o.method}</span>
              </dd>
              <dt>Statut</dt><dd><Badge tone="green">Confirmé</Badge></dd>
              <dt>Date</dt><dd className="num">{o.date}, {o.time}</dd>
            </dl>
          </div>
        </div>
        <div className="card pad col" style={{ gap: 8 }}>
          <span className="eyebrow" style={{ marginBottom: 2 }}>Détail par vendeur</span>
          {o.lines.map((l, i) => <div className="sum" key={l.listingId}><span>{lineLabel(o, i)}</span><span className="num">{fcfa(l.price * l.qty)}</span></div>)}
          {o.shipping > 0 && <div className="sum"><span>Livraison, Transports Ouattara</span><span className="num">{fcfa(o.shipping)}</span></div>}
          <div className="sum"><span className="muted">Frais de transaction</span><span className="num muted">0</span></div>
          <div className="sum t"><span>Total payé</span><span className="num">{fcfa(o.total)} FCFA</span></div>
        </div>
        <button className="btn btn-s btn-block no-print" onClick={printPage}><Icon name="download" />Télécharger le reçu (PDF)</button>
      </div>
      <Foot><Link className="btn btn-p" to={`/commande?ref=${o.ref}`}>Suivre la commande</Link></Foot>
    </div>
  );
}

/* Écran 20 : suivi de commande. */
export function Tracking() {
  const s = useStore();
  const o = useOrder();
  if (!o) return noOrder;
  const title = o.demo
    ? 'Taurillon FK-0142 + 4 sacs d’aliment'
    : o.lines.map((l) => (l.qty > 1 ? `${l.qty} × ${l.title}` : l.title)).join(' + ');
  const orderPhotos = o.lines.map((l) => s.listing(l.listingId)?.photos?.[0]).filter(Boolean) as string[];
  const steps: [string, string, string][] = o.demo
    ? [
        ['tld f', 'Paiement confirmé', '18/11, 09:42, Orange Money'],
        ['tld f', 'Préparée par les vendeurs', '18/11, 10:05, laissez-passer joint'],
        ['tld f', 'Prise en charge par le transporteur', '20/11, 07:20, Sinématiali'],
        ['tld a', 'En route', 'Dernière position partagée il y a 6 min'],
        ['tld o', 'Livrée et remise confirmée', ''],
      ]
    : [
        ['tld f', 'Paiement confirmé', `${o.date.slice(0, 5)}, ${o.time}, ${o.method}`],
        ['tld a', 'Préparation par les vendeurs', 'En attente des vendeurs'],
        ['tld o', o.delivery ? 'Prise en charge par le transporteur' : 'Retrait chez le vendeur', ''],
        ...(o.delivery ? [['tld o', 'En route', ''] as [string, string, string]] : []),
        ['tld o', o.delivery ? 'Livrée et remise confirmée' : 'Remise confirmée', ''],
      ];

  return (
    <div className="app">
      <Header back title="Suivi de commande" sub={o.ref} />
      <div className="body">
        <div className="card pad col" style={{ gap: 8 }}>
          <div className="row between">
            {o.demo ? <Badge tone="blue">En route</Badge> : <Badge tone="green">Payée</Badge>}
            <span className="small muted">{o.demo ? 'Arrivée estimée 10:30' : 'Créneau confirmé par le vendeur'}</span>
          </div>
          {orderPhotos.length > 0 && (
            <div className="row" style={{ gap: 8 }}>
              {orderPhotos.map((src, i) => <Photo key={i} w={56} h={44} radius={6} src={src} />)}
            </div>
          )}
          <span className="b" style={{ fontSize: 16 }}>{title}</span>
          <span className="small muted">{o.delivery ? `Livraison à ${o.demo ? 'Ferme Ouattara, route de Dikodougou' : o.address ?? 'l’adresse indiquée'}` : 'Retrait sur place'}</span>
        </div>
        <div className="card pad">
          <div className="tl">
            {steps.map(([dot, t, d]) => (
              <div className="tli" key={t}>
                <span className={dot} />
                <div className="col"><span className={dot === 'tld o' ? 'small muted' : 'b small'}>{t}</span>{d && <span className="xs muted num">{d}</span>}</div>
              </div>
            ))}
          </div>
        </div>
        {o.delivery && (
          <div className="card pad row">
            <span className="av" style={{ background: '#EEF0EE', color: '#3E4943' }}>TO</span>
            <div className="col grow"><span className="b small">Transports Ouattara</span><span className="xs muted">{o.demo ? 'Bétaillère AB 4512 CI, Issa O.' : 'Chauffeur attribué à la prise en charge'}</span></div>
            <Link className="iconbtn" to="/assistance?onglet=assistant" aria-label="Écrire au transporteur via l’assistance" style={{ border: '1px solid #C5CDC7' }}><Icon name="chat" /></Link>
          </div>
        )}
        <div className="card pad col" style={{ gap: 10 }}>
          <span className="b small">Code de remise</span>
          <div className="otp num" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>{o.code.split('').map((d, i) => <div key={i}>{d}</div>)}</div>
          <span className="xs muted" style={{ lineHeight: 1.45 }}>Donnez ce code {o.delivery ? 'au livreur' : 'au vendeur'} uniquement après avoir vérifié la marchandise. La remise est alors horodatée.</span>
        </div>
      </div>
      <Foot><Link className="btn btn-danger" to={`/assistance?onglet=reclamation&ref=${o.ref}`}>Signaler un problème</Link></Foot>
    </div>
  );
}

const TABS = [['aide', 'Centre d’aide'], ['assistant', 'Assistant'], ['reclamation', 'Réclamation']] as const;
const MOTIFS = ['Litige livraison, animal', 'Paiement', 'Annonce trompeuse', 'Faux vendeur'];

/* Questions fréquentes : la réponse s'ouvre sous la question. */
const FAQ = [
  ['Mon paiement est débité mais la commande indique « échoué »', 'Aucun montant n’est perdu : le prestataire rembourse sous 72 h un débit sans commande confirmée. Si ce n’est pas le cas, ouvrez une réclamation « Paiement » avec la référence de transaction.'],
  ['Que signifie « identifiant à vérifier » sur une fiche ?', 'L’éleveur a saisi le numéro de boucle officiel, mais un agent ne l’a pas encore contrôlé sur place. La fiche reste consultable ; le badge passe à « Vérifié » après la visite.'],
  ['Comment me faire aider pour publier ma première annonce ?', 'Depuis l’onglet Vendre, touchez « Besoin d’aide pour publier ? ». Un conseiller vous rappelle et remplit l’annonce avec vous.'],
];

/* Écran 21 : assistance (aide, assistant, réclamation). */
export function Support() {
  const s = useStore();
  const [params, setParams] = useSearchParams();
  const tab = params.get('onglet') ?? 'aide';
  const orders = s.orders();
  const [motif, setMotif] = useState(MOTIFS[0]);
  const [order, setOrder] = useState(params.get('ref') ?? orders[0]?.ref ?? '');
  const [text, setText] = useState(s.session().demo ? 'Le taurillon boite de l’antérieur droit à la descente de la bétaillère. Je n’ai pas encore donné le code de remise.' : '');
  const [photos, setPhotos] = useState<string[]>([]);
  const [urgent, setUrgent] = useState(true);
  const [sent, setSent] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const chat = s.chat();

  const send = () => {
    if (!draft.trim()) return;
    s.addChat(draft.trim());
    setDraft('');
  };
  const submit = () => {
    const t = s.addTicket({ motif, order, text: text.trim(), urgent, photos });
    setSent(t.id);
  };
  const faq = FAQ.map((f, i) => ({ f, i })).filter(({ f }) => !q.trim() || f.join(' ').toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="app">
      <Header back title="Assistance" />
      <div className="utabs">
        {TABS.map(([id, t]) => <button key={id} className={tab === id ? 'on' : ''} onClick={() => setParams({ onglet: id }, { replace: true })}>{t}</button>)}
      </div>

      {tab === 'aide' && (
        <div className="body">
          <label className="search"><Icon name="search" /><input className="plain grow" placeholder="Décrivez votre question" aria-label="Rechercher dans l’aide" value={q} onChange={(e) => setQ(e.target.value)} style={{ outline: 'none' }} /></label>
          <div className="grid2" style={{ gap: 8 }}>
            {['Compte', 'Publier une annonce', 'Paiement', 'Commande et livraison', 'Traçabilité', 'Santé animale', 'Sécurité et fraude', 'Réclamation'].map((c) => (
              <button key={c} className="card pad small b" style={{ textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer' }} onClick={() => (c === 'Réclamation' ? setParams({ onglet: 'reclamation' }, { replace: true }) : setQ(c.split(' ')[0]))}>{c}</button>
            ))}
          </div>
          <div className="sec">
            <div className="sech"><h2>Questions fréquentes</h2></div>
            <div className="card list">
              {faq.length === 0 && <div className="li"><span className="small muted">Aucune réponse trouvée. Écrivez à l’assistant ou ouvrez une réclamation.</span></div>}
              {faq.map(({ f: [question, answer], i }) => (
                <div key={question}>
                  <button className="li" style={{ width: '100%', textAlign: 'left' }} aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
                    <span className="grow small">{question}</span><Icon name={open === i ? 'down' : 'chevron'} size="sm" />
                  </button>
                  {open === i && <p className="small muted" style={{ padding: '0 14px 12px', lineHeight: 1.5 }}>{answer}</p>}
                </div>
              ))}
            </div>
          </div>
          <div className="card pad col" style={{ gap: 10 }}>
            <span className="b small">Contacter l’équipe</span>
            <button className="row small plain" style={{ textAlign: 'left' }} onClick={() => setParams({ onglet: 'assistant' }, { replace: true })}><Icon name="chat" size="sm" /><span className="grow">Messagerie SAVAA</span><span className="muted">réponse sous 4 h ouvrées</span></button>
            <div className="row small"><Icon name="phone" size="sm" /><span className="grow">Téléphone et WhatsApp</span><span className="muted">[numéro à confirmer]</span></div>
            <span className="xs muted">Horaires : lundi au samedi, [plages à confirmer]</span>
          </div>
        </div>
      )}

      {tab === 'assistant' && (
        <>
          <div className="body" style={{ gap: 10 }}>
            <p className="xs muted" style={{ textAlign: 'center' }}>Assistant automatique. Il ne remplace pas un vétérinaire.</p>
            <div className="col" style={{ gap: 8 }}>
              {s.session().demo ? (
                <>
                  <div className="bubble bot">Bonjour Fatou. Votre commande SAV-2026-11-004812 est en route. Que puis-je faire pour vous ?</div>
                  <div className="bubble me">Le livreur aura du retard ?</div>
                  <div className="bubble bot">Le transporteur indique une arrivée vers 10 h 30, soit 30 min après le créneau. Vous pouvez l’appeler depuis le suivi, ou signaler un retard si le délai dépasse 2 h.</div>
                  <div className="bubble me">Le taurillon boite légèrement à la descente.</div>
                  <div className="bubble bot">Ne donnez pas encore le code de remise. Je vous mets en relation avec un conseiller pour ouvrir une réclamation. Pour l’état de l’animal, contactez un vétérinaire.</div>
                </>
              ) : (
                <div className="bubble bot">Bonjour{s.session().name ? ` ${s.session().name.split(' ')[0]}` : ''}. Que puis-je faire pour vous ?{orders[0] ? ` Votre dernière commande est ${orders[0].ref}.` : ''}</div>
              )}
              {chat.map((m, i) => (
                <div key={i} className="col" style={{ gap: 8 }}>
                  <div className="bubble me">{m}</div>
                  <div className="bubble bot" ref={i === chat.length - 1 ? (el) => el?.scrollIntoView({ block: 'end' }) : undefined}>Bien reçu. Un conseiller reprend la conversation dès que possible. Si l’état de l’animal vous inquiète, appelez votre vétérinaire.</div>
                </div>
              ))}
            </div>
            <button className="btn btn-p btn-block" onClick={() => setParams({ onglet: 'reclamation' }, { replace: true })}>Parler à un conseiller</button>
          </div>
          <div className="foot" style={{ padding: '10px 12px 14px' }}>
            <input className="input grow" placeholder="Écrire un message" aria-label="Message" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
            <button className="iconbtn" aria-label="Envoyer" style={{ background: '#145C3A', color: '#fff' }} onClick={send}><Icon name="send" /></button>
          </div>
        </>
      )}

      {tab === 'reclamation' && (
        <>
          <div className="body">
            <div className="field"><label htmlFor="motif">Motif</label>
              <select id="motif" className="input" value={motif} onChange={(e) => setMotif(e.target.value)}>{MOTIFS.map((m) => <option key={m}>{m}</option>)}</select>
            </div>
            <div className="field"><label htmlFor="cmd">Commande concernée</label>
              <select id="cmd" className="input num" value={order} onChange={(e) => setOrder(e.target.value)}>
                {orders.map((o) => <option key={o.ref}>{o.ref}</option>)}
                <option value="">Aucune commande</option>
              </select>
            </div>
            <div className="field"><label htmlFor="desc">Description</label><textarea id="desc" className="input" value={text} onChange={(e) => setText(e.target.value)} /></div>
            <div className="grid3">
              {photos.length === 0 && <Photo label="VID_0921" h={80} radius={8} />}
              {photos.map((p, i) => <Photo key={i} src={p} label={`Pièce jointe ${i + 1}`} h={80} radius={8} onRemove={() => setPhotos(photos.filter((_, j) => j !== i))} />)}
              {photos.length < 5 && <PhotoAdd height={80} label="Ajouter" icon="plus" onAdd={(p) => setPhotos((x) => [...x, p])} />}
            </div>
            <div className="field"><span className="lbl">Priorité</span>
              <div className="seg"><button className={!urgent ? 'on' : ''} onClick={() => setUrgent(false)}>Normale</button><button className={urgent ? 'on' : ''} onClick={() => setUrgent(true)}>Urgente</button></div>
            </div>
            {sent && (
              <div className="notice n-info"><Icon name="check" size="sm" /><span><b>Ticket {sent} créé.</b> Attribué à Mariam (support). Première réponse attendue sous {urgent ? '1 h' : '4 h'}. Le paiement au vendeur reste en attente pendant l’examen.</span></div>
            )}
            <div className="sec">
              <span className="eyebrow">Mes tickets</span>
              <div className="card list">
                {s.tickets().map((t) => (
                  <div className="li" key={t.id}>
                    <div className="col grow"><span className="small b">{t.id}, {t.text.length > 40 && t.status === 'open' ? t.motif.toLowerCase() : t.text.toLowerCase()}</span><span className="xs muted num">{t.date}, {t.status === 'closed' ? 'clos après vérification' : `${t.urgent ? 'urgent' : 'normal'}${t.order ? `, ${t.order}` : ''}`}</span></div>
                    {t.status === 'closed' ? <Badge>Résolu</Badge> : <Badge tone="blue">Ouvert</Badge>}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Foot><button className="btn btn-p" disabled={!!sent || !text.trim()} onClick={submit}>{sent ? 'Réclamation envoyée' : 'Envoyer la réclamation'}</button></Foot>
        </>
      )}
    </div>
  );
}

/* Onglet Commandes (acheteurs) : toutes les commandes, la plus récente en premier. */
export function Orders() {
  const s = useStore();
  const orders = s.orders();
  return (
    <div className="app">
      <header className="hdr" style={{ paddingLeft: 16 }}><h1>Mes commandes</h1></header>
      <div className="body" style={{ gap: 10 }}>
        {orders.length === 0 ? (
          <div className="card pad col" style={{ alignItems: 'center', textAlign: 'center', gap: 8, padding: '32px 20px' }}>
            <Icon name="truck" style={{ width: 44, height: 44, color: '#5D6862', strokeWidth: 1.4 }} />
            <span className="b">Aucune commande pour l’instant</span>
            <span className="small muted">Vos achats apparaîtront ici, avec leur suivi et leur reçu.</span>
            <Link className="btn btn-p btn-sm" to="/explorer">Voir les annonces</Link>
          </div>
        ) : (
          orders.map((o) => {
            const items = o.lines.map((l) => (l.qty > 1 ? `${l.qty} × ${l.title}` : l.title)).join(', ');
            const thumb = s.listing(o.lines[0]?.listingId)?.photos?.[0];
            return (
              <Link key={o.ref} className="card pad row" to={`/commande?ref=${o.ref}`} style={{ gap: 12 }}>
                <Photo w={52} h={52} radius={6} src={thumb} />
                <div className="col grow" style={{ gap: 4 }}>
                  <span className="row between" style={{ gap: 8 }}>
                    <span className="b small num">{o.ref}</span>
                    {o.demo ? <Badge tone="blue">En route</Badge> : <Badge tone="green">Payée</Badge>}
                  </span>
                  <span className="small ell">{items}</span>
                  <span className="row between xs muted num">
                    <span>{o.date}, {o.delivery ? 'livraison' : 'retrait sur place'}</span>
                    <span className="b" style={{ color: '#17201B' }}>{fcfa(o.total)} FCFA</span>
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
      <TabBar />
    </div>
  );
}
