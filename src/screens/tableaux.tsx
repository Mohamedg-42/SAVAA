import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fcfa, useStore, type NetSale } from '../data';
import { showToast } from '../toast';
import { DashHeader, Kpis, QuickActions, TodayCard } from '../dash';
import { Badge, Icon, Photo, PreviewModal, TabBar, type PreviewData } from '../ui';

/* Tableau de bord du vendeur / commerçant (accueil de son espace). */

/* Ventes des 4 dernières semaines, en milliers de FCFA : compte de démonstration seulement. */
const DEMO_WEEKS: [string, number][] = [['S44', 258], ['S45', 352], ['S46', 301], ['S47', 412]];

/** Commandes reçues sur ses annonces : à préparer, prêtes, remises (réseau de l'appareil). */
export function SalesList({ sales }: { sales: NetSale[] }) {
  const s = useStore();
  return (
    <div className="card list">
      {sales.map((x) => (
        <div className="li" key={x.id} style={{ alignItems: 'flex-start' }}>
          {x.photo && <Photo w={44} h={44} radius={6} src={x.photo} />}
          <div className="col grow" style={{ gap: 2, minWidth: 0 }}>
            <span className="small b">{x.qty > 1 ? `${x.qty} × ` : ''}{x.title}</span>
            <span className="xs muted num">{x.orderRef}, payée le {x.date}</span>
            <span className="xs muted">{x.buyer.name}, <span className="num">+225 {x.buyer.phone}</span> · {x.delivery ? 'livraison par transporteur' : 'retrait chez vous'}</span>
            <span className="xs b num">{fcfa(x.price * x.qty)} FCFA</span>
          </div>
          {x.status === 'new' ? (
            <button className="btn btn-p btn-sm" style={{ flex: 'none' }} onClick={() => { s.moveSale(x.id, 'ready'); showToast(x.delivery ? 'Commande prête : le transporteur peut passer.' : 'Commande prête : l’acheteur est prévenu.'); }}>Marquer prête</button>
          ) : x.status === 'ready' && !x.delivery ? (
            <button className="btn btn-s btn-sm" style={{ flex: 'none' }} onClick={() => { s.moveSale(x.id, 'handed'); showToast('Remise confirmée.'); }}>Remise faite</button>
          ) : (
            <Badge tone={x.status === 'ready' ? 'blue' : 'green'}>{x.status === 'ready' ? 'Prête' : 'Remise'}</Badge>
          )}
        </div>
      ))}
    </div>
  );
}

export function VendorHome() {
  const s = useStore();
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const demo = !!s.session().demo;
  const shop = s.shop();
  const mine = s.myListings();
  const online = mine.filter((l) => l.status === 'online');
  const review = mine.filter((l) => l.status === 'review');
  const out = mine.filter((l) => l.status === 'out');
  const lowStock = online.filter((l) => l.stock !== undefined && l.stock < 10);
  const unread = s.unread();
  const max = Math.max(...DEMO_WEEKS.map(([, v]) => v));
  /* Commandes reçues des acheteurs (réseau de l'appareil). */
  const sales = s.mySales();
  const toPrep = sales.filter((x) => x.status === 'new');
  const inProgress = sales.filter((x) => x.status !== 'handed');
  const salesTotal = sales.reduce((t, x) => t + x.price * x.qty, 0);
  const orderCount = new Set(sales.map((x) => x.orderRef)).size;

  return (
    <div className="app">
      <DashHeader
        label="Espace vendeur"
        name={shop.created ? shop.name : s.session().name}
        action={<Link className="iconbtn" to="/notifications" aria-label={`Notifications, ${unread} non lue${unread > 1 ? 's' : ''}`}><Icon name="bell" />{unread > 0 && <span className="dot">{unread}</span>}</Link>}
      />
      <div className="body">
        {toPrep.length ? (
          <TodayCard eyebrow="Aujourd’hui" title={`${toPrep.length} commande${toPrep.length > 1 ? 's' : ''} à préparer`} text={`${toPrep.map((x) => (x.qty > 1 ? `${x.qty} × ${x.title}` : x.title)).join(', ')}. Marquez-les prêtes dès qu’elles sont emballées.`} />
        ) : demo ? (
          <TodayCard eyebrow="Aujourd’hui" title="3 commandes à préparer avant 15 h" text="Le transporteur passe à 15 h 30 : 10 sacs d’aliment, 2 plateaux d’œufs, 1 lot de poussins.">
            <Link className="btn btn-p" to="/boutique">Préparer les commandes</Link>
          </TodayCard>
        ) : review.length ? (
          <TodayCard eyebrow="Aujourd’hui" title={`${review.length} annonce${review.length > 1 ? 's' : ''} en relecture`} text="L’équipe SAVAA vérifie vos annonces et leur fiche avant la mise en ligne, en général sous 24 h.">
            <Link className="btn btn-p" to="/boutique">Voir ma boutique</Link>
          </TodayCard>
        ) : online.length ? (
          <TodayCard eyebrow="Aujourd’hui" title="Aucune commande à préparer" text="Vos commandes apparaîtront ici dès qu’un acheteur paie. Une mise en avant rend vos annonces plus visibles.">
            <Link className="btn btn-p" to="/campagne">Mettre en avant</Link>
          </TodayCard>
        ) : (
          <TodayCard eyebrow="Pour commencer" title="Publiez votre premier produit" text="Photo, origine, prix : la fiche de traçabilité se remplit en 4 étapes.">
            <Link className="btn btn-p" to="/vendre">Publier un produit</Link>
          </TodayCard>
        )}

        <Kpis
          items={demo ? [
            { label: 'Ventes de la semaine', value: '412 500', sub: 'FCFA, 14 commandes' },
            { label: 'Commandes en cours', value: 5, sub: 'dont 3 à préparer' },
            { label: 'Annonces en ligne', value: 12, sub: '1 en modération' },
            { label: 'Stock bas', value: 2, sub: 'produits sous 10 unités', tone: 'red' },
          ] : [
            { label: 'Ventes reçues', value: fcfa(salesTotal), sub: `FCFA, ${orderCount} commande${orderCount > 1 ? 's' : ''}` },
            { label: 'Commandes en cours', value: inProgress.length, sub: toPrep.length ? `dont ${toPrep.length} à préparer` : undefined },
            { label: 'Annonces en ligne', value: online.length, sub: `${review.length} en modération` },
            { label: 'Stock bas', value: lowStock.length, sub: 'produits sous 10 unités', tone: lowStock.length ? 'red' : undefined },
          ]}
        />

        {demo && (
          <div className="card pad col" style={{ gap: 10 }}>
            <span className="b small">Ventes des 4 dernières semaines</span>
            <div className="row" style={{ alignItems: 'flex-end', gap: 14, height: 92, padding: '0 6px' }} role="img" aria-label={DEMO_WEEKS.map(([w, v]) => `${w} : ${v} 000 FCFA`).join(', ')}>
              {DEMO_WEEKS.map(([w, v], i) => (
                <div key={w} className="col grow" style={{ alignItems: 'center', gap: 4 }}>
                  <span className="xs num muted">{v}k</span>
                  <div style={{ width: '100%', height: Math.round((v / max) * 56), background: i === DEMO_WEEKS.length - 1 ? '#145C3A' : '#CFE0D4', borderRadius: 4 }} />
                  <span className="xs muted">{w}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {sales.length > 0 && (
          <div className="sec">
            <div className="sech"><h2>Commandes reçues</h2><Badge tone={toPrep.length ? 'amber' : 'green'}>{toPrep.length ? `${toPrep.length} à préparer` : 'À jour'}</Badge></div>
            <SalesList sales={sales} />
          </div>
        )}

        <div className="sec">
          <div className="sech"><h2>À traiter</h2></div>
          {demo ? (
            <div className="card list">
              <button
                type="button"
                className="li"
                onClick={() => setPreview({
                  title: 'Annonce « Tourteau de coton »',
                  subtitle: 'Motif de refus en modération',
                  badge: ['Refusée', 'red'],
                  images: ['images/tourteau-coton.jpg'],
                  details: [['Motif', 'Photo floue ou illisible'], ['Action', 'Remplacez la photo principale depuis Vendre puis soumettez à nouveau']],
                })}
              >
                <Badge tone="red">Refusée</Badge><span className="small grow">Annonce « Tourteau de coton » : photo floue</span><Icon name="chevron" size="sm" />
              </button>
              <Link className="li" to="/messages"><Badge tone="amber">Message</Badge><span className="small grow">Un acheteur attend une réponse depuis 3 h</span><Icon name="chevron" size="sm" /></Link>
            </div>
          ) : review.length + out.length + lowStock.length === 0 ? (
            <div className="card pad"><span className="small muted">Rien à traiter pour l’instant.</span></div>
          ) : (
            <div className="card list">
              {review.map((l) => <Link key={l.id} className="li" to={`/annonce/${l.id}`}><Badge tone="amber">En revue</Badge><span className="small grow ell">{l.title}</span><Icon name="chevron" size="sm" /></Link>)}
              {out.map((l) => <Link key={l.id} className="li" to={`/annonce/${l.id}`}><Badge>Indisponible</Badge><span className="small grow ell">{l.title}</span><Icon name="chevron" size="sm" /></Link>)}
              {lowStock.map((l) => <Link key={l.id} className="li" to={`/annonce/${l.id}`}><Badge tone="red">Stock {fcfa(l.stock ?? 0)}</Badge><span className="small grow ell">{l.title}</span><Icon name="chevron" size="sm" /></Link>)}
            </div>
          )}
        </div>

        <QuickActions items={[
          { label: 'Publier', relief: 'publier', to: '/vendre' },
          { label: 'Mettre en avant', relief: 'promo', to: '/campagne' },
          { label: 'Messages', relief: 'messages', to: '/messages' },
          { label: 'Statistiques', relief: 'stats', to: '/campagne/stats' },
        ]} />
      </div>
      <PreviewModal data={preview} onClose={() => setPreview(null)} />
      <TabBar />
    </div>
  );
}
