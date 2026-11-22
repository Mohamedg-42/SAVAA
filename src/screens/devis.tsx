import { useState } from 'react';
import { DAYS, FREQ, fcfa, frDate, useStore, type NetQuote, type NetRecurring } from '../data';
import { downloadCSV } from '../device';
import { showToast } from '../toast';
import { Badge, Header, Icon, TabBar } from '../ui';

/*
  Devis entre acheteurs et fournisseurs (réseau de l'appareil).
  Tout compte (éleveur, producteur, acheteur, restaurant) demande un devis ; les fournisseurs répondent avec un prix unitaire.
  Le demandeur retient une offre ; le fournisseur émet la facture ; le client la règle (paiement simulé).
  Une offre retenue peut devenir une commande récurrente, livrée et facturée à chaque échéance.
*/

const UNITS: [string, string][] = [['kg', 'le kg'], ['sacs', 'le sac'], ['unités', 'l’unité'], ['têtes', 'la tête'], ['litres', 'le litre']];
const err = (msg: string) => <span className="xs" role="alert" style={{ color: '#A0221A' }}>{msg}</span>;

/** Écran /devis : demander un devis aux fournisseurs, suivre les offres, régler les factures. */
export function QuotePage() {
  const s = useStore();
  const [product, setProduct] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState(UNITS[0][0]);
  const [place, setPlace] = useState(s.session().town ?? '');
  const [details, setDetails] = useState('');
  const [tried, setTried] = useState(false);
  const qtyNum = Number(qty.replace(/\D/g, ''));
  const mine = s.net().quotes.filter((q) => q.from.phone === s.session().phone && q.status !== 'closed');

  const send = () => {
    setTried(true);
    if (!product.trim() || !qtyNum || !place.trim()) return;
    const per = UNITS.find(([u]) => u === unit)?.[1] ?? 'l’unité';
    s.askQuote({ product: product.trim(), qty: `${fcfa(qtyNum)} ${unit}`, place: place.trim(), per, qtyNum, details: details.trim() || undefined, org: s.shop().created ? s.shop().name : undefined });
    showToast('Demande envoyée aux fournisseurs. Leurs offres arrivent dans cette page.');
    setProduct(''); setQty(''); setDetails(''); setTried(false);
  };

  return (
    <div className="app">
      <Header title="Devis fournisseurs" back />
      <div className="body">
        <div className="sec">
          <div className="sech"><h2>Nouvelle demande</h2></div>
          <div className="card pad col" style={{ gap: 12 }}>
            <span className="xs muted" style={{ lineHeight: 1.45 }}>Aliment, intrants, matériel, volume de récolte : les fournisseurs de SAVAA vous répondent avec leur prix unitaire. Vous retenez l’offre qui vous convient.</span>
            <div className="field">
              <label htmlFor="dv-product">Produit</label>
              <input id="dv-product" className="input" placeholder="Ex. aliment engraissement bovin, sac de 50 kg" value={product} onChange={(e) => setProduct(e.target.value)} aria-invalid={tried && !product.trim()} />
              {tried && !product.trim() && err('Indiquez le produit recherché.')}
            </div>
            <div className="grid2">
              <div className="field">
                <label htmlFor="dv-qty">Quantité</label>
                <input id="dv-qty" className="input num" inputMode="numeric" placeholder="Ex. 40" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d ]/g, '').slice(0, 7))} aria-invalid={tried && !qtyNum} />
                {tried && !qtyNum && err('Indiquez la quantité.')}
              </div>
              <div className="field">
                <label htmlFor="dv-unit">Unité</label>
                <select id="dv-unit" className="input" value={unit} onChange={(e) => setUnit(e.target.value)}>{UNITS.map(([u]) => <option key={u}>{u}</option>)}</select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="dv-place">Lieu de livraison</label>
              <input id="dv-place" className="input" placeholder="Ex. Sinématiali" value={place} onChange={(e) => setPlace(e.target.value)} aria-invalid={tried && !place.trim()} />
              {tried && !place.trim() && err('Indiquez où livrer.')}
            </div>
            <div className="field">
              <label htmlFor="dv-details">Précisions <span className="muted">(facultatif)</span></label>
              <input id="dv-details" className="input" placeholder="Ex. livraison avant le 5 décembre, marque souhaitée" value={details} onChange={(e) => setDetails(e.target.value)} />
            </div>
            <button className="btn btn-p" onClick={send}>Envoyer la demande</button>
          </div>
        </div>

        <div className="sec">
          <div className="sech"><h2>Mes demandes</h2><Badge tone={mine.length ? 'blue' : 'grey'}>{mine.length}</Badge></div>
          {mine.length === 0 ? (
            <div className="card pad"><span className="small muted">Aucune demande en cours. Les offres des fournisseurs s’afficheront sous chaque demande.</span></div>
          ) : mine.map((q) => <MyQuoteCard key={q.id} q={q} />)}
        </div>

        <ClientRecurring />
        <ClientInvoices />
      </div>
      <TabBar />
    </div>
  );
}

/** Une demande de devis vue par son auteur : offres reçues, offre retenue, livraison récurrente. */
export function MyQuoteCard({ q, recurring = true }: { q: NetQuote; recurring?: boolean }) {
  const s = useStore();
  const per = q.per ?? 'le kg';
  const kept = q.offers.find((o) => o.id === q.accepted);
  return (
    <div className="card pad col" style={{ gap: 10 }}>
      <div className="row between top" style={{ gap: 8 }}>
        <div className="col" style={{ gap: 2, minWidth: 0 }}>
          <span className="b small">{q.product}</span>
          <span className="xs muted">{q.qty}, livraison {q.place}, demandé le {q.date}</span>
          {q.details && <span className="xs muted">{q.details}</span>}
        </div>
        {kept ? <Badge tone="green">Offre retenue</Badge> : q.offers.length ? <Badge tone="blue">{q.offers.length} offre{q.offers.length > 1 ? 's' : ''}</Badge> : <Badge>En attente</Badge>}
      </div>
      {kept ? (
        <>
          <div className="notice n-info"><Icon name="check" size="sm" /><span><b>{kept.supplier.org || kept.supplier.name}</b>, {fcfa(kept.price)} FCFA {per}{q.qtyNum ? `, soit ${fcfa(kept.price * q.qtyNum)} FCFA` : ''}. Le fournisseur vous contacte au sujet de la livraison et vous envoie la facture. Contact : <span className="num">+225 {kept.supplier.phone}</span>.</span></div>
          {recurring && <RecurringSetup q={q} />}
        </>
      ) : q.offers.length === 0 ? (
        <span className="xs muted">Les fournisseurs ont reçu votre demande. Leurs offres apparaîtront ici.</span>
      ) : (
        <div className="card list" style={{ boxShadow: 'none' }}>
          {[...q.offers].sort((a, b) => a.price - b.price).map((o) => (
            <div className="li" key={o.id} style={{ alignItems: 'flex-start' }}>
              <div className="col grow" style={{ gap: 2, minWidth: 0 }}>
                <span className="small b">{o.supplier.org || o.supplier.name}</span>
                <span className="xs muted">{fcfa(o.price)} FCFA {per}{q.qtyNum ? `, total ${fcfa(o.price * q.qtyNum)} FCFA` : ''}</span>
                <span className="xs muted">Délai : {o.delay}. Reçue le {o.date}</span>
              </div>
              <button className="btn btn-p btn-sm" style={{ flex: 'none' }} onClick={() => { s.acceptOffer(q.id, o.id); showToast(`Offre de ${o.supplier.org || o.supplier.name} retenue. Les autres fournisseurs ne la voient plus.`); }}>Retenir</button>
            </div>
          ))}
        </div>
      )}
      {!kept && <button className="link plain" style={{ alignSelf: 'flex-start' }} onClick={() => { s.closeQuote(q.id); showToast('Demande annulée.'); }}>Annuler la demande</button>}
    </div>
  );
}

/** Programmer la livraison récurrente d'une offre retenue (si elle ne l'est pas déjà). */
export function RecurringSetup({ q }: { q: NetQuote }) {
  const s = useStore();
  const [freq, setFreq] = useState<NetRecurring['freq']>('week');
  const [day, setDay] = useState(1);
  if (s.net().recurring.some((r) => r.quoteId === q.id)) return null;
  return (
    <div className="col" style={{ gap: 8 }}>
      <span className="small b">Recevoir cette commande à intervalle régulier</span>
      <div className="grid2">
        <div className="field">
          <label htmlFor={`rc-freq-${q.id}`}>Fréquence</label>
          <select id={`rc-freq-${q.id}`} className="input" value={freq} onChange={(e) => setFreq(e.target.value as NetRecurring['freq'])}>{Object.entries(FREQ).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select>
        </div>
        <div className="field">
          <label htmlFor={`rc-day-${q.id}`}>Jour de livraison</label>
          <select id={`rc-day-${q.id}`} className="input" value={day} onChange={(e) => setDay(Number(e.target.value))}>{DAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}</select>
        </div>
      </div>
      <button className="btn btn-s" onClick={() => { s.startRecurring(q.id, freq, day); showToast(`Commande récurrente programmée : ${FREQ[freq].toLowerCase()}, le ${DAYS[day - 1]}.`); }}>Programmer la commande récurrente</button>
    </div>
  );
}

/** Commandes récurrentes du client, avec suspension et reprise. */
export function ClientRecurring() {
  const s = useStore();
  const list = s.net().recurring.filter((r) => r.client.phone === s.session().phone);
  if (!list.length) return null;
  return (
    <div className="sec">
      <div className="sech"><h2>Commandes récurrentes</h2><Badge tone="blue">{list.filter((r) => r.status === 'active').length} active{list.filter((r) => r.status === 'active').length > 1 ? 's' : ''}</Badge></div>
      <div className="card list">
        {list.map((r) => (
          <div className="li" key={r.id}>
            <div className="col grow" style={{ gap: 2, minWidth: 0 }}>
              <span className="small b">{r.label}</span>
              <span className="xs"><span className="num" style={{ whiteSpace: 'nowrap' }}>{fcfa(r.qtyNum)} × {fcfa(r.price)} FCFA</span> {r.per}, soit <span className="num" style={{ whiteSpace: 'nowrap' }}>{fcfa(r.qtyNum * r.price)} FCFA</span> par livraison</span>
              <span className="xs muted">{FREQ[r.freq]}, le {DAYS[r.day - 1]}, chez {r.supplier.org || r.supplier.name}</span>
              <span className="xs muted">{r.status === 'paused' ? 'Suspendue' : `Prochaine livraison le ${frDate(r.next)}`}{r.deliveries ? `, ${r.deliveries} livrée${r.deliveries > 1 ? 's' : ''}` : ''}</span>
            </div>
            <button className="btn btn-s btn-sm" style={{ flex: 'none' }} onClick={() => { s.setRecurring(r.id, { status: r.status === 'paused' ? 'active' : 'paused' }); showToast(r.status === 'paused' ? 'Commande reprise.' : 'Commande suspendue : le fournisseur ne livre plus jusqu’à la reprise.'); }}>{r.status === 'paused' ? 'Reprendre' : 'Suspendre'}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Factures reçues des fournisseurs, à régler (paiement simulé). */
export function ClientInvoices() {
  const s = useStore();
  const list = s.net().invoices.filter((x) => x.client.phone === s.session().phone);
  if (!list.length) return null;
  const due = list.filter((x) => x.status === 'due').reduce((t, x) => t + x.amount, 0);
  return (
    <div className="sec">
      <div className="sech">
        <h2>Factures</h2>
        <button className="link plain" onClick={() => downloadCSV('factures-savaa.csv', [['Facture', 'Fournisseur', 'Objet', 'Montant (FCFA)', 'Émise le', 'Échéance', 'Statut'], ...list.map((x) => [x.ref, x.supplier.org || x.supplier.name, x.label, x.amount, x.date, x.due, x.status === 'paid' ? `Payée le ${x.paidAt}` : 'À régler'])])}>Exporter</button>
      </div>
      {due > 0 && <span className="small">Reste à régler : <b className="num">{fcfa(due)} FCFA</b></span>}
      <div className="card list">
        {list.map((x) => (
          <div className="li" key={x.id} style={{ alignItems: 'flex-start' }}>
            <div className="col grow" style={{ gap: 2, minWidth: 0 }}>
              <span className="small b num">{x.ref}</span>
              <span className="xs muted">{x.supplier.org || x.supplier.name}, {x.label}</span>
              <span className="xs muted num">{fcfa(x.amount)} FCFA, {x.status === 'paid' ? `payée le ${x.paidAt}` : `à régler avant le ${x.due}`}</span>
            </div>
            {x.status === 'paid' ? <Badge tone="green">Payée</Badge> : (
              <button className="btn btn-p btn-sm" style={{ flex: 'none' }} onClick={() => { s.payInvoice(x.id); showToast(`Facture ${x.ref} réglée (paiement simulé).`); }}>Payer</button>
            )}
          </div>
        ))}
      </div>
      <span className="xs muted">Paiement simulé : aucun argent n’est débité dans cette démonstration.</span>
    </div>
  );
}
