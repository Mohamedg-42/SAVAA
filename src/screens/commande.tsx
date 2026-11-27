import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { fcfa, useStore, type DeliveryQuote, type Order } from '../data';
import { PLACES, loadLabel, vehicleOf } from '../livraison';
import { DeliveryMap } from '../carte';
import { printPage } from '../device';
import { ReliefIcon } from '../relief';
import type { ReliefName } from '../relief-icons';
import { showToast } from '../toast';
import { Badge, Check, Foot, Header, Icon, NotFound, Photo, PhotoAdd, TabBar } from '../ui';

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

/** Véhicule et prix de la livraison, calculés selon la nature, la quantité et la distance (voir livraison.ts). */
function DeliveryChoice({ q, couriers }: { q: DeliveryQuote; couriers: number }) {
  const s = useStore();
  const c = s.cart();
  if (q.load.kg === 0) return <span className="hint">Rien à transporter : un service se règle sur place.</span>;
  if (!q.options.length) {
    return <div className="notice n-warn" role="alert"><Icon name="alert" size="sm" /><span>Aucun véhicule ne peut transporter {loadLabel(q.load)} sur {q.km} km en un seul voyage. Réduisez la quantité, ou choisissez le retrait sur place.</span></div>;
  }
  const best = q.options[0];
  return (
    <div className="col" style={{ gap: 8 }}>
      <span className="small"><b>{loadLabel(q.load)}</b> sur <b className="num">{q.km} km</b>{q.from && q.drop ? `, de ${q.from.name} à ${q.drop.name}` : ''}{q.estimated ? ' (distance estimée, lieu à préciser)' : ''}</span>
      <div className="card list" role="radiogroup" aria-label="Véhicule de livraison">
        {q.options.map((o) => {
          const on = q.chosen?.vehicle.id === o.vehicle.id;
          return (
            <button key={o.vehicle.id} className="li" role="radio" aria-checked={on} onClick={() => s.setCart({ vehicle: o.vehicle.id })} style={{ background: on ? '#E8F3EA' : '#fff', alignItems: 'flex-start' }}>
              <span className={`radio${on ? ' on' : ''}`} style={{ marginTop: 2 }} />
              <span className="col grow" style={{ gap: 2, minWidth: 0 }}>
                <span className="row between" style={{ gap: 8 }}><span className="small b">{o.vehicle.label}</span><span className="small b num" style={{ flex: 'none' }}>{fcfa(o.price)} FCFA</span></span>
                <span className="xs muted">{o.vehicle.id === 'groupage' ? 'Camion partagé avec d’autres commandes, délai plus long' : o.vehicle.what}</span>
                {o === best && q.options.length > 1 && <Badge tone="green" style={{ alignSelf: 'flex-start' }}>Le moins cher</Badge>}
              </span>
            </button>
          );
        })}
      </div>
      {q.chosen?.vehicle.id !== 'groupage' && (
        <button className="row top" role="checkbox" aria-checked={!!c.urgent} onClick={() => s.setCart({ urgent: !c.urgent })} style={{ gap: 10, background: 'none', border: 0, padding: 0, font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
          <Check on={!!c.urgent} /><span className="small">Livraison dans la journée <span className="muted">(+30 %)</span></span>
        </button>
      )}
      <span className="xs muted">{couriers ? `${couriers} livreur${couriers > 1 ? 's' : ''} en service dans la zone peu${couriers > 1 ? 'vent' : 't'} faire ce transport.` : 'Aucun livreur compatible en service dans cette zone pour l’instant : la mission leur sera proposée dès qu’ils seront disponibles.'}</span>
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
  const q = s.deliveryQuote();
  const couriers = c.delivery && q.chosen ? s.couriersFor(q.load, q.km, q.from) : [];
  const needAddress = !demo && c.delivery && (!(c.address ?? '').trim() || !q.drop);
  const noVehicle = c.delivery && q.load.kg > 0 && !q.options.length;

  if (!lines.length) {
    return (
      <div className="app">
        <Header back title="Panier" />
        <div className="body" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 12, padding: 32 }}>
          <ReliefIcon name="marche" size={64} />
          <h2 style={{ fontSize: 19, fontWeight: 600 }}>Votre panier est vide</h2>
          <p className="small muted">Ajoutez une annonce avec « Commander via SAVAA ».</p>
          <Link className="btn btn-p btn-block" to="/explorer">Voir les annonces</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        back
        title={`Panier, ${t.sellers} vendeur${t.sellers > 1 ? 's' : ''}`}
        actions={<button className="plain xs" style={{ marginRight: 8, padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.18)', color: '#fff', fontWeight: 600, cursor: 'pointer' }} onClick={() => s.clearCart()}>Vider</button>}
      />
      <Steps n={1} />
      <div className="body">
        {sellers.map((seller) => {
          const mine = lines.filter((l) => l.listing.seller === seller);
          return (
            <div className="card" key={seller}>
              <div className="row between" style={{ padding: '10px 14px', borderBottom: '1px solid #EDF0EE' }}>
                <Link className="small b ell" to={`/boutique-publique/${encodeURIComponent(seller)}`}>{seller}</Link>
                {mine[0].listing.sellerVerified ? <Badge tone="green">Vérifié</Badge> : <Badge>Non vérifié</Badge>}
              </div>
              {mine.map(({ listing: l, qty, unitPrice, amount }) => {
                const minQty = Math.max(1, l.sheet?.sale.minQty ?? 1);
                const negotiated = unitPrice < s.priceFor(l);
                return (
                  <div className="row top" style={{ padding: '12px 14px', gap: 12 }} key={l.id}>
                    <Link to={`/annonce/${l.id}`} style={{ flex: 'none' }}><Photo w={64} h={64} radius={6} tint={l.tint} src={l.photos?.[0]} /></Link>
                    <div className="col grow" style={{ gap: l.stock ? 6 : 3, minWidth: 0 }}>
                      <Link className="small b" to={`/annonce/${l.id}`}>{l.title}</Link>
                      {!l.stock && <span className="xs muted">{l.animalIds?.length ? `${l.animalIds.join(', ')}, ${l.animalIds.length} animal${l.animalIds.length > 1 ? 'aux' : ''}` : '1 lot'}</span>}
                      <div className="row between" style={{ flexWrap: 'wrap', gap: 8 }}>
                        <span className="price">{fcfa(amount)} FCFA</span>
                        {!!l.stock && (
                          <div className="row" style={{ gap: 0, border: '1px solid #C5CDC7', borderRadius: 8 }}>
                            <button className="iconbtn" style={qtyBtn} aria-label="Retirer un" disabled={qty <= minQty} onClick={() => s.setQty(l.id, qty - 1)}>−</button>
                            <span className="b num" style={{ minWidth: 28, textAlign: 'center' }}>{qty}</span>
                            <button className="iconbtn" style={qtyBtn} aria-label="Ajouter un" disabled={qty >= l.stock} onClick={() => s.setQty(l.id, qty + 1)}>+</button>
                          </div>
                        )}
                      </div>
                      {!!l.stock && <span className="xs muted num">{fcfa(unitPrice)} FCFA {l.unit ?? 'l’unité'}{negotiated ? ' (prix négocié)' : unitPrice < l.price ? ' (prix pro)' : ''}, stock {l.stock}{minQty > 1 ? `, min. ${minQty}` : ''}</span>}
                      {!l.stock && negotiated && <span className="xs" style={{ color: '#145C3A', fontWeight: 600 }}>Prix négocié convenu en messagerie</span>}
                    </div>
                    <button className="iconbtn" style={{ width: 32, height: 32, color: '#5D6862' }} aria-label={`Retirer ${l.title} du panier`} onClick={() => s.removeFromCart(l.id)}><Icon name="close" size="sm" /></button>
                  </div>
                );
              })}
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
                <>
                <div className="field">
                  <label htmlFor="cart-town">Ville ou village de livraison</label>
                  <select id="cart-town" className="input" value={q.drop?.name ?? ''} onChange={(e) => s.setCart({ town: e.target.value })} style={{ color: q.drop ? '#17201B' : '#5D6862' }}>
                    <option value="" disabled>Choisir…</option>
                    {PLACES.map((p) => <option key={p.name}>{p.name}</option>)}
                  </select>
                  <span className="hint">Sert à calculer la distance et le prix de la livraison.</span>
                </div>
                <div className="field">
                  <label htmlFor="cart-address">Adresse de livraison</label>
                  <textarea id="cart-address" className="input" style={{ minHeight: 64 }} placeholder="Village ou quartier, repère, personne à contacter" value={c.address ?? ''} onChange={(e) => s.setCart({ address: e.target.value })} />
                  <span className="hint">Le livreur vous propose un créneau après le paiement.</span>
                </div>
                </>
              )}
              <DeliveryChoice q={q} couriers={couriers.length} />
            </>
          ) : (
            <div className="card pad col" style={{ gap: 4 }}>
              <span className="small b">Retrait chez {sellers.length > 1 ? 'chaque vendeur' : 'le vendeur'}</span>
              <span className="xs muted">{lines.map((l) => l.listing.pickup ?? `${l.listing.place.split(',')[0]} (${l.listing.title})`).join(' et ')}. Code de retrait envoyé après paiement.</span>
            </div>
          )}
        </div>

        <div className="sec">
          <div className="sech"><h2>Protection et règlement</h2><Badge tone="green">Séquestre SAVAA</Badge></div>
          <div className="notice n-info">
            <Icon name="check" size="sm" />
            <span><b>Argent bloqué jusqu’à la remise.</b> Le vendeur n’est payé qu’après vérification de la marchandise et saisie de votre code à 4 chiffres.</span>
          </div>
          {t.total >= 10000 && (
            <div className="seg">
              <button className={!t.isDeposit ? 'on' : ''} onClick={() => s.setCart({ paymentMode: 'full' })}>Totalité (100 %)</button>
              <button className={t.isDeposit ? 'on' : ''} onClick={() => s.setCart({ paymentMode: 'deposit' })}>Acompte 20 %</button>
            </div>
          )}
        </div>

        <div className="card pad col" style={{ gap: 8 }}>
          <div className="sum"><span className="muted">Articles</span><span className="num">{fcfa(t.items)} FCFA</span></div>
          <div className="sum"><span className="muted">Livraison</span><span className="num">{t.shipping ? `${fcfa(t.shipping)} FCFA` : 'Gratuit'}</span></div>
          <div className="sum"><span className="muted">Frais de paiement</span><span>selon le moyen</span></div>
          <div className="sum t"><span>Total commande</span><span className="num">{fcfa(t.total)} FCFA</span></div>
          {t.isDeposit && (
            <>
              <div className="divider" />
              <div className="sum"><span className="b" style={{ color: '#145C3A' }}>Acompte à payer maintenant (20 %)</span><span className="b num" style={{ color: '#145C3A' }}>{fcfa(t.dueNow)} FCFA</span></div>
              <div className="sum"><span className="xs muted">Solde à régler à la remise</span><span className="xs num muted">{fcfa(t.balanceDue)} FCFA</span></div>
            </>
          )}
        </div>
      </div>
      <Foot>
        {noVehicle ? <button className="btn btn-p" disabled>Choisissez le retrait sur place</button> : needAddress ? <button className="btn btn-p" disabled>{q.drop ? 'Indiquez l’adresse de livraison' : 'Choisissez la ville de livraison'}</button> : <Link className="btn btn-p" to="/paiement">{t.isDeposit ? `Régler l’acompte (${fcfa(t.dueNow)} FCFA)` : 'Choisir le paiement'}</Link>}
      </Foot>
    </div>
  );
}

const MOMO = [
  ['Orange Money', 'images/payments/orange-money-real.svg', 'Validation par code secret'],
  ['MTN MoMo', 'images/payments/mtn-momo-real.png', 'Validation par code secret'],
  ['Moov Money', 'images/payments/moov-money-real.png', 'Validation par code secret'],
  ['Wave', 'images/payments/wave.svg', 'Validation dans l’application'],
];
const OTHER = [
  ['Carte bancaire', 'images/payments/mastercard-real.svg', 'Visa, Mastercard, authentification 3-D Secure'],
  ['Virement bancaire', 'images/payments/virement.svg', 'Achats professionnels, 24 à 72 h'],
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
  const totals = s.cartTotals();
  const total = fcfa(totals.dueNow);
  const [payPhone, setPayPhone] = useState(c.payPhone ?? (s.session().phone ? `+225 ${s.session().phone}` : ''));
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
    if (isMomo(c.method)) s.setCart({ payPhone: payPhone.trim() });
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
            <div className="row between" style={{ marginTop: 8 }}>
              <span className="small muted">{totals.isDeposit ? 'Acompte séquestre (20 %)' : 'Montant protégé (séquestre)'}</span>
              <span className="b num" style={{ fontSize: 18 }}>{total} FCFA</span>
            </div>
            {totals.isDeposit && (
              <div className="row between xs muted" style={{ marginTop: 2 }}>
                <span>Solde à la remise après vérification</span>
                <span className="num">{fcfa(totals.balanceDue)} FCFA</span>
              </div>
            )}
          </div>
          <div className="body" style={{ gap: 14 }}>
            <div className="notice n-info">
              <Icon name="check" size="sm" />
              <span>Votre règlement reste bloqué sur le compte séquestre SAVAA jusqu’à validation de votre code de remise.</span>
            </div>
            <div className="sec" style={{ gap: 8 }}>
              <span className="eyebrow">Mobile Money</span>
              <div className="card list">{MOMO.map(methodRow)}</div>
            </div>
            {isMomo(c.method) && (
              <div className="field">
                <label htmlFor="tel">Numéro à débiter</label>
                <input id="tel" className="input num" type="tel" inputMode="tel" placeholder="+225 07 00 00 00 00" value={payPhone} onChange={(e) => setPayPhone(e.target.value)} />
                <span className="hint">Vous validerez le paiement avec votre code secret sur votre téléphone. SAVAA ne le voit jamais.</span>
              </div>
            )}
            <div className="sec" style={{ gap: 8 }}>
              <span className="eyebrow">Autres moyens</span>
              <div className="card list">
                {OTHER.map(methodRow)}
                <div className="li" style={{ opacity: 0.55 }}><img src="images/payments/livraison.svg" alt="Paiement à la livraison" width={40} height={40} style={{ width: 40, height: 40, borderRadius: 8, flex: 'none' }} /><span className="col grow"><span className="small b">Paiement à la livraison</span><span className="xs muted">Indisponible pour les animaux vivants</span></span></div>
                <div className="li" style={{ opacity: 0.55 }}><img src="favicon.svg" alt="Solde SAVAA" width={40} height={40} style={{ width: 40, height: 40, borderRadius: 8, flex: 'none', background: '#E8F3EA', padding: 4 }} /><span className="col grow"><span className="small b">Solde SAVAA</span><span className="xs muted">Fonction future, soumise à agrément</span></span><Badge>Bientôt</Badge></div>
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
  const home = useStore().home();
  if (!o) return noOrder;
  return (
    <div className="app">
      <header className="hdr">
        <button className="iconbtn" aria-label="Fermer" onClick={() => navigate(home)}><Icon name="close" /></button>
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
                <span>{isMomo(o.method) ? `${o.method}${o.payPhone ? `, ${o.payPhone}` : o.demo ? ', 07 •• •• 33 90' : ''}` : o.method}</span>
              </dd>
              <dt>Protection</dt><dd><Badge tone="green">Séquestre actif</Badge></dd>
              <dt>Statut</dt><dd><Badge tone="green">{o.balanceDue ? 'Acompte confirmé' : 'Confirmé'}</Badge></dd>
              <dt>Date</dt><dd className="num">{o.date}, {o.time}</dd>
            </dl>
          </div>
        </div>
        <div className="card pad col" style={{ gap: 8 }}>
          <span className="eyebrow" style={{ marginBottom: 2 }}>Détail par vendeur</span>
          {o.lines.map((l, i) => <div className="sum" key={l.listingId}><span>{lineLabel(o, i)}</span><span className="num" style={{ whiteSpace: 'nowrap', flex: 'none' }}>{fcfa(l.price * l.qty)}</span></div>)}
          {o.shipping > 0 && <div className="sum"><span>Livraison, {o.demo ? 'Transports Ouattara' : `${vehicleOf(o.vehicle)?.label ?? 'transporteur'}${o.km ? `, ${o.km} km` : ''}`}</span><span className="num" style={{ whiteSpace: 'nowrap', flex: 'none' }}>{fcfa(o.shipping)}</span></div>}
          <div className="sum"><span className="muted">Frais de transaction</span><span className="num muted">0</span></div>
          <div className="sum t"><span>{o.balanceDue ? 'Acompte payé (séquestre)' : 'Total payé (séquestre)'}</span><span className="num">{fcfa(o.paidNow ?? o.total)} FCFA</span></div>
          {!!o.balanceDue && (
            <div className="sum"><span className="small muted">Solde restant à la remise</span><span className="small b num">{fcfa(o.balanceDue)} FCFA</span></div>
          )}
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
  const navigate = useNavigate();
  const o = useOrder();
  if (!o) return noOrder;
  const title = o.demo
    ? 'Taurillon FK-0142 + 4 sacs d’aliment'
    : o.lines.map((l) => (l.qty > 1 ? `${l.qty} × ${l.title}` : l.title)).join(' + ');
  /* Livraison : l'avancement vient de la mission du transporteur (réseau de l'appareil). */
  const mission = o.demo ? undefined : s.net().missions.find((m) => m.orderRef === o.ref);
  const stage = mission ? ({ open: 0, accepted: 1, picked: 2, route: 3, delivered: 4 } as const)[mission.status] : 0;
  /* Préparation : faite quand tous les vendeurs connus ont marqué leur part prête. */
  const sales = o.demo ? [] : s.salesOf(o.ref);
  const prepared = sales.length > 0 && sales.every((x) => x.status !== 'new');
  const orderPhotos = o.lines.map((l) => s.listing(l.listingId)?.photos?.[0]).filter(Boolean) as string[];
  const steps: [string, string, string][] = o.demo
    ? [
        ['tld f', 'Paiement confirmé', '18/11, 09:42, Orange Money'],
        ['tld f', 'Préparée par les vendeurs', '18/11, 10:05, laissez-passer joint'],
        ['tld f', 'Prise en charge par le transporteur', '20/11, 07:20, Sinématiali'],
        ['tld a', 'En route', 'Dernière position partagée il y a 6 min'],
        ['tld o', 'Livrée et remise confirmée', ''],
      ]
    : o.delivery && mission
      ? [
          ['tld f', 'Paiement confirmé', `${o.date.slice(0, 5)}, ${o.time}, ${o.method}`],
          [stage >= 2 || prepared ? 'tld f' : 'tld a', 'Préparation par les vendeurs', stage >= 2 ? 'Remise au transporteur' : prepared ? 'Prête, en attente du transporteur' : 'En attente des vendeurs'],
          [stage >= 2 ? 'tld f' : stage === 1 ? 'tld a' : 'tld o', 'Prise en charge par le transporteur', mission.courier ? `${mission.courier.name}, +225 ${mission.courier.phone}` : 'Recherche d’un transporteur'],
          [stage >= 4 ? 'tld f' : stage === 3 ? 'tld a' : 'tld o', 'En route', stage === 3 ? 'Le transporteur est en chemin' : ''],
          [stage >= 4 ? 'tld f' : 'tld o', 'Livrée et remise confirmée', stage >= 4 ? mission.deliveredAt ?? '' : ''],
        ]
      : (() => {
        const handed = sales.length > 0 && sales.every((x) => x.status === 'handed');
        return [
          ['tld f', o.balanceDue ? 'Acompte confirmé (séquestre)' : 'Paiement confirmé (séquestre)', `${o.date.slice(0, 5)}, ${o.time}, ${o.method}`],
          [prepared || handed ? 'tld f' : 'tld a', 'Préparation par les vendeurs', handed ? 'Remise effectuée' : prepared ? (o.delivery ? 'Prête' : 'Prête, vous pouvez passer la retirer') : 'En attente des vendeurs'],
          [handed ? 'tld f' : prepared ? 'tld a' : 'tld o', o.delivery ? 'Prise en charge par le transporteur' : 'Retrait chez le vendeur', handed ? 'Remis à l’acheteur' : ''],
          ...(o.delivery ? [['tld o', 'En route', ''] as [string, string, string]] : []),
          [handed ? 'tld f' : 'tld o', o.delivery ? 'Livrée et remise confirmée' : 'Remise confirmée', handed ? 'Fonds libérés au vendeur' : ''],
        ] as [string, string, string][];
      })();

  const handedPickup = !o.delivery && sales.length > 0 && sales.every((x) => x.status === 'handed');
  const delivered = stage >= 4 || handedPickup;
  const canCancel = !o.demo && !o.cancelled && !delivered && stage < 2 && !prepared;
  const reorder = () => {
    let added = 0;
    for (const line of o.lines) {
      const l = s.listing(line.listingId);
      if (l && l.status === 'online') {
        s.addToCart(l.id, line.qty);
        added++;
      }
    }
    if (added === 0) {
      showToast('Ces articles ne sont plus disponibles.');
      return;
    }
    navigate('/panier');
  };

  return (
    <div className="app">
      <Header back title="Suivi de commande" sub={o.ref} actions={<Link className="link small" style={{ paddingRight: 12, flex: 'none' }} to={`/recu?ref=${o.ref}`}>Reçu</Link>} />
      <div className="body">
        <div className="card pad col" style={{ gap: 8 }}>
          <div className="row between">
            {o.cancelled ? <Badge tone="red">Annulée</Badge> : o.demo ? <Badge tone="blue">En route</Badge> : delivered ? <Badge tone="green">Livrée</Badge> : stage === 3 ? <Badge tone="blue">En route</Badge> : stage >= 1 ? <Badge tone="blue">Transporteur trouvé</Badge> : prepared ? <Badge tone="amber">Prête</Badge> : <Badge tone="green">Payée</Badge>}
            <span className="small muted">{o.cancelled ? 'Commande annulée' : o.demo ? 'Arrivée estimée 10:30' : delivered ? 'Remise confirmée' : 'Créneau confirmé par le vendeur'}</span>
          </div>
          {orderPhotos.length > 0 && (
            <div className="row" style={{ gap: 8 }}>
              {orderPhotos.map((src, i) => <Photo key={i} w={56} h={44} radius={6} src={src} />)}
            </div>
          )}
          <span className="b" style={{ fontSize: 16 }}>{title}</span>
          <span className="small muted">{o.delivery ? `Livraison à ${o.demo ? 'Ferme Ouattara, route de Dikodougou' : o.address ?? 'l’adresse indiquée'}` : 'Retrait sur place'}</span>
          <div className="notice n-info" style={{ marginTop: 2 }}>
            <Icon name="check" size="sm" />
            <span>
              {delivered
                ? 'Remise confirmée : le séquestre est libéré.'
                : o.balanceDue
                  ? `Acompte de ${fcfa(o.paidNow ?? 0)} FCFA en séquestre. Solde à régler à la remise : ${fcfa(o.balanceDue)} FCFA.`
                  : `${fcfa(o.paidNow ?? o.total)} FCFA protégés en séquestre jusqu’à la saisie du code ci-dessous.`}
            </span>
          </div>
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
        {o.delivery && !o.demo && mission?.from && (
          <DeliveryMap label={`Trajet de la livraison, de ${mission.from.name} à ${mission.to?.name ?? 'votre adresse'}`} height={180} routes={[{ id: mission.id, from: mission.from, to: mission.to, label: `Enlèvement : ${mission.from.name}` }]} />
        )}
        {o.delivery && (
          <div className="card pad row">
            <span className="av" style={{ background: '#EEF0EE', color: '#3E4943' }}>{o.demo ? 'TO' : (mission?.courier?.name ?? 'L').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</span>
            <div className="col grow"><span className="b small">{o.demo ? 'Transports Ouattara' : mission?.courier ? mission.courier.name : 'Livreur pas encore attribué'}</span><span className="xs muted">{o.demo ? 'Bétaillère AB 4512 CI, Issa O.' : `${vehicleOf(o.vehicle)?.label ?? 'Véhicule'}${o.km ? `, ${o.km} km` : ''}${mission?.courier ? `, +225 ${mission.courier.phone}` : ', messagerie disponible dès attribution'}`}</span></div>
            <button
              className="iconbtn"
              aria-label="Écrire au transporteur dans l’application"
              style={{ border: '1px solid #C5CDC7' }}
              disabled={!o.demo && !mission?.courier}
              onClick={() => {
                const other = o.demo
                  ? { name: 'Transports Ouattara', phone: '01 40 22 18 05' }
                  : mission?.courier;
                if (!other) return;
                const tid = s.openThread({
                  kind: 'delivery',
                  refId: o.ref,
                  subject: `Livraison commande ${o.ref}`,
                  other,
                  photo: orderPhotos[0],
                });
                navigate(`/messages/${tid}`);
              }}
            >
              <Icon name="chat" />
            </button>
          </div>
        )}
        <div className="card pad col" style={{ gap: 10 }}>
          <span className="b small">Code de remise</span>
          <div className="otp num" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>{o.code.split('').map((d, i) => <div key={i}>{d}</div>)}</div>
          <span className="xs muted" style={{ lineHeight: 1.45 }}>Donnez ce code {o.delivery ? 'au livreur' : 'au vendeur'} uniquement après avoir vérifié la marchandise. La remise est alors horodatée.</span>
        </div>
      </div>
      <Foot>
        {canCancel ? (
          <button
            className="btn btn-s"
            style={{ fontSize: 13, padding: '0 10px', minWidth: 0 }}
            onClick={() => {
              s.cancelOrder(o.ref);
              showToast('Commande annulée. Le montant séquestre est remboursé.');
            }}
          >
            Annuler
          </button>
        ) : (
          <button className="btn btn-s" style={{ fontSize: 13, padding: '0 10px', minWidth: 0 }} onClick={reorder}>Recommander</button>
        )}
        <Link className="btn btn-danger" style={{ fontSize: 13, padding: '0 10px', minWidth: 0 }} to={`/assistance?onglet=reclamation&ref=${o.ref}`}>Signaler</Link>
      </Foot>
    </div>
  );
}

const TABS = [['aide', 'Centre d’aide'], ['assistant', 'Assistant'], ['reclamation', 'Réclamation']] as const;
const MOTIFS = ['Litige livraison, animal', 'Paiement', 'Annonce trompeuse', 'Faux vendeur'];

/* Questions fréquentes : couvre les 8 rubriques du centre d'aide. */
const FAQ: [string, string, string][] = [
  ['Compte', 'Comment modifier mon profil ou ajouter un rôle ?', 'Ouvrez l’onglet Compte puis touchez « Modifier » pour mettre à jour votre nom, commune ou e-mail. Pour ajouter un rôle métier, touchez « + Ajouter un rôle ».'],
  ['Publier', 'Comment me faire aider pour publier ma première annonce ?', 'Depuis l’onglet Vendre, remplissez les 4 étapes (produit, origine, prix, vendeur). Vous pouvez aussi sauvegarder un brouillon ou modifier prix et stock depuis Ma boutique.'],
  ['Paiement', 'Mon paiement est débité mais la commande indique « échoué »', 'Aucun montant n’est perdu : le prestataire rembourse sous 72 h un débit sans commande confirmée. Si ce n’est pas le cas, ouvrez une réclamation « Paiement » avec la référence de transaction.'],
  ['Paiement', 'Comment fonctionne le séquestre et l’acompte de 20 % ?', 'Votre paiement (total ou acompte de 20 %) est bloqué sur SAVAA. Le vendeur n’est payé qu’après vérification du produit et validation de votre code de remise à 4 chiffres.'],
  ['Commande', 'Comment suivre ma livraison ou annuler une commande ?', 'Ouvrez Mes commandes pour voir l’état en direct et discuter avec votre livreur dans l’application. Une commande peut être annulée tant qu’elle n’est pas préparée ou prise en charge.'],
  ['Traçabilité', 'Que signifie « identifiant à vérifier » sur une fiche ?', 'L’éleveur a saisi le numéro de boucle officiel, mais un agent ne l’a pas encore contrôlé sur place. La fiche reste consultable ; le badge passe à « Vérifié » après la visite.'],
  ['Santé', 'Une alerte sanitaire remplace-t-elle un vétérinaire ?', 'Non. L’observation permet d’alerter rapidement les vétérinaires de la zone avec photos et symptômes, mais seul un vétérinaire habilité pose un diagnostic.'],
  ['Sécurité', 'Comment éviter les arnaques sur la marketplace ?', 'Gardez toujours vos conversations, négociations et paiements dans SAVAA. Ne donnez jamais votre code de remise avant d’avoir vu et vérifié la marchandise.'],
];

/* Écran 21 : assistance (aide, assistant, réclamation). */
export function Support() {
  const s = useStore();
  const [params, setParams] = useSearchParams();
  const tab = params.get('onglet') ?? 'aide';
  const orders = s.orders();
  const [motif, setMotif] = useState(MOTIFS[0]);
  const [order, setOrder] = useState(params.get('ref') ?? orders[0]?.ref ?? '');
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [urgent, setUrgent] = useState(true);
  const [sent, setSent] = useState<string | null>(null);
  const [openTicket, setOpenTicket] = useState<string | null>(null);
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
    setText('');
    setPhotos([]);
    showToast(`Ticket ${t.id} envoyé.`);
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
          <div className="search">
            <Icon name="search" />
            <input className="plain grow" placeholder="Décrivez votre question" aria-label="Rechercher dans l’aide" value={q} onChange={(e) => setQ(e.target.value)} style={{ outline: 'none' }} />
            {q && <button className="iconbtn" style={{ width: 28, height: 28 }} aria-label="Effacer" onClick={() => setQ('')}><Icon name="close" size="sm" /></button>}
          </div>
          <div className="grid2" style={{ gap: 8 }}>
            {([
              ['Compte', 'certifie'],
              ['Publier une annonce', 'publier'],
              ['Paiement', 'mobile-money'],
              ['Commande et livraison', 'commandes'],
              ['Traçabilité', 'fiche'],
              ['Santé animale', 'veto'],
              ['Sécurité et fraude', 'remise'],
              ['Réclamation', 'messages'],
            ] as [string, ReliefName][]).map(([c, ic]) => (
              <button key={c} className="card pad row small b" style={{ textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', gap: 8, padding: '10px 12px' }} onClick={() => (c === 'Réclamation' ? setParams({ onglet: 'reclamation' }, { replace: true }) : setQ(c.split(' ')[0]))}>
                <ReliefIcon name={ic} size={26} shadow={false} />
                <span className="grow" style={{ lineHeight: 1.25 }}>{c}</span>
              </button>
            ))}
          </div>
          <div className="sec">
            <div className="sech"><h2>Questions fréquentes</h2></div>
            <div className="card list">
              {faq.length === 0 && <div className="li"><span className="small muted">Aucune réponse trouvée. Écrivez à l’assistant ou ouvrez une réclamation.</span></div>}
              {faq.map(({ f: [, question, answer], i }) => (
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
            <span className="b small">Contacter l’équipe dans SAVAA</span>
            <button className="row small plain" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setParams({ onglet: 'assistant' }, { replace: true })}><Icon name="chat" size="sm" /><span className="grow">Assistant et support intégré</span><span className="muted">réponse sous 4 h ouvrées</span></button>
            <Link className="row small" to="/messages"><Icon name="chat" size="sm" /><span className="grow">Mes conversations vendeurs / livreurs</span><Icon name="chevron" size="sm" /></Link>
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
            <div className="field"><label htmlFor="desc">Description</label><textarea id="desc" className="input" placeholder="Expliquez le problème rencontré…" value={text} onChange={(e) => setText(e.target.value)} /></div>
            <div className="grid3">
              {photos.map((p, i) => <Photo key={i} src={p} label={`Pièce jointe ${i + 1}`} h={80} radius={8} onRemove={() => setPhotos(photos.filter((_, j) => j !== i))} />)}
              {photos.length < 5 && <PhotoAdd height={80} label="Ajouter photo" icon="plus" onAdd={(p) => setPhotos((x) => [...x, p])} />}
            </div>
            <div className="field"><span className="lbl">Priorité</span>
              <div className="seg"><button className={!urgent ? 'on' : ''} onClick={() => setUrgent(false)}>Normale</button><button className={urgent ? 'on' : ''} onClick={() => setUrgent(true)}>Urgente</button></div>
            </div>
            {sent && (
              <div className="notice n-info"><Icon name="check" size="sm" /><span><b>Ticket {sent} créé.</b> Première réponse attendue sous {urgent ? '1 h' : '4 h'}. Le paiement au vendeur reste bloqué en séquestre pendant l’examen.</span></div>
            )}
            <div className="sec">
              <span className="eyebrow">Mes tickets ({s.tickets().length})</span>
              {s.tickets().length === 0 ? (
                <div className="card pad"><span className="small muted">Aucune réclamation ouverte pour le moment.</span></div>
              ) : (
                <div className="card list">
                  {s.tickets().map((t) => {
                    const isOpen = openTicket === t.id;
                    return (
                      <div key={t.id} className="col" style={{ borderBottom: '1px solid #EDF0EE' }}>
                        <button
                          type="button"
                          className="li"
                          style={{ width: '100%', textAlign: 'left', borderBottom: 0 }}
                          onClick={() => setOpenTicket(isOpen ? null : t.id)}
                        >
                          <div className="col grow" style={{ minWidth: 0 }}>
                            <span className="small b ell">{t.id}, {t.motif}</span>
                            <span className="xs muted num">{t.date}, {t.status === 'closed' ? 'clos après vérification' : `${t.urgent ? 'urgent' : 'normal'}${t.order ? `, ${t.order}` : ''}`}</span>
                          </div>
                          {t.status === 'closed' ? <Badge>Résolu</Badge> : <Badge tone="blue">Ouvert</Badge>}
                          <Icon name={isOpen ? 'down' : 'chevron'} size="sm" />
                        </button>
                        {isOpen && (
                          <div className="col" style={{ gap: 8, padding: '0 14px 12px', background: '#F8FAF8' }}>
                            <span className="small muted" style={{ lineHeight: 1.45 }}>{t.text}</span>
                            {t.status === 'open' && (
                              <button
                                className="btn btn-s btn-sm"
                                style={{ alignSelf: 'flex-start' }}
                                onClick={() => { s.closeTicket(t.id); showToast(`Ticket ${t.id} marqué résolu.`); }}
                              >
                                Marquer résolu
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <Foot><button className="btn btn-p" disabled={!text.trim()} onClick={submit}>Envoyer la réclamation</button></Foot>
        </>
      )}
    </div>
  );
}

/* Onglet Commandes (acheteurs) : toutes les commandes, la plus récente en premier, avec statut réel et filtre. */
export function Orders() {
  const s = useStore();
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');
  const orders = s.orders();
  const missions = s.net().missions;

  const statusOf = (o: Order): { label: string; tone: 'blue' | 'green' | 'amber' | 'red'; done: boolean } => {
    if (o.cancelled) return { label: 'Annulée', tone: 'red', done: true };
    if (o.demo) return { label: 'En route', tone: 'blue', done: false };
    const m = o.delivery ? missions.find((x) => x.orderRef === o.ref) : undefined;
    if (m) {
      if (m.status === 'delivered') return { label: 'Livrée', tone: 'green', done: true };
      if (m.status === 'route') return { label: 'En route', tone: 'blue', done: false };
      if (m.status === 'picked' || m.status === 'accepted') return { label: 'En livraison', tone: 'blue', done: false };
    }
    const sales = s.salesOf(o.ref);
    if (sales.length > 0 && sales.every((x) => x.status === 'handed')) return { label: 'Remise confirmée', tone: 'green', done: true };
    if (sales.length > 0 && sales.every((x) => x.status !== 'new')) return { label: 'Prête', tone: 'amber', done: false };
    return { label: o.balanceDue ? 'Acompte payé' : 'Payée', tone: 'green', done: false };
  };

  const shown = orders.filter((o) => {
    const st = statusOf(o);
    if (filter === 'active') return !st.done;
    if (filter === 'done') return st.done;
    return true;
  });

  return (
    <div className="app">
      <header className="hdr" style={{ paddingLeft: 16 }}><h1>Mes commandes</h1></header>
      <div className="body" style={{ gap: 10 }}>
        {orders.length > 0 && (
          <div className="chips">
            <button className={`chip${filter === 'all' ? ' on' : ''}`} onClick={() => setFilter('all')}>Toutes ({orders.length})</button>
            <button className={`chip${filter === 'active' ? ' on' : ''}`} onClick={() => setFilter('active')}>En cours</button>
            <button className={`chip${filter === 'done' ? ' on' : ''}`} onClick={() => setFilter('done')}>Terminées</button>
          </div>
        )}
        {shown.length === 0 ? (
          <div className="card pad col" style={{ alignItems: 'center', textAlign: 'center', gap: 8, padding: '32px 20px' }}>
            <ReliefIcon name="commandes" size={56} />
            <span className="b">{orders.length === 0 ? 'Aucune commande pour l’instant' : 'Aucune commande dans ce filtre'}</span>
            <span className="small muted">{orders.length === 0 ? 'Vos achats apparaîtront ici, avec leur suivi et leur reçu.' : 'Changez de filtre pour voir vos autres commandes.'}</span>
            {orders.length === 0 && <Link className="btn btn-p btn-sm" to="/explorer">Voir les annonces</Link>}
          </div>
        ) : (
          shown.map((o) => {
            const st = statusOf(o);
            const items = o.lines.map((l) => (l.qty > 1 ? `${l.qty} × ${l.title}` : l.title)).join(', ');
            const thumb = s.listing(o.lines[0]?.listingId)?.photos?.[0];
            return (
              <Link key={o.ref} className="card pad row" to={`/commande?ref=${o.ref}`} style={{ gap: 12 }}>
                <Photo w={52} h={52} radius={6} src={thumb} />
                <div className="col grow" style={{ gap: 4 }}>
                  <span className="row between" style={{ gap: 8 }}>
                    <span className="b small num">{o.ref}</span>
                    <Badge tone={st.tone}>{st.label}</Badge>
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
