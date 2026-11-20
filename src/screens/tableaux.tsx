import { Link } from 'react-router-dom';
import { fcfa, useStore } from '../data';
import { DashHeader, Kpis, QuickActions, TodayCard } from '../dash';
import { Badge, Icon, TabBar } from '../ui';

/* Tableau de bord du vendeur / commerçant (accueil de son espace). */

/* Ventes des 4 dernières semaines, en milliers de FCFA : compte de démonstration seulement. */
const DEMO_WEEKS: [string, number][] = [['S44', 258], ['S45', 352], ['S46', 301], ['S47', 412]];

export function VendorHome() {
  const s = useStore();
  const demo = !!s.session().demo;
  const shop = s.shop();
  const mine = s.myListings();
  const online = mine.filter((l) => l.status === 'online');
  const review = mine.filter((l) => l.status === 'review');
  const out = mine.filter((l) => l.status === 'out');
  const lowStock = online.filter((l) => l.stock !== undefined && l.stock < 10);
  const unread = s.unread();
  const max = Math.max(...DEMO_WEEKS.map(([, v]) => v));

  return (
    <div className="app">
      <DashHeader
        label="Espace vendeur"
        name={shop.created ? shop.name : s.session().name}
        action={<Link className="iconbtn" to="/notifications" aria-label={`Notifications, ${unread} non lue${unread > 1 ? 's' : ''}`}><Icon name="bell" />{unread > 0 && <span className="dot">{unread}</span>}</Link>}
      />
      <div className="body">
        {demo ? (
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
            { label: 'Ventes de la semaine', value: 0, sub: 'FCFA' },
            { label: 'Commandes en cours', value: 0 },
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

        <div className="sec">
          <div className="sech"><h2>À traiter</h2></div>
          {demo ? (
            <div className="card list">
              <div className="li"><Badge tone="red">Refusée</Badge><span className="small grow">Annonce « Tourteau de coton » : photo floue</span></div>
              <Link className="li" to="/assistance"><Badge tone="amber">Message</Badge><span className="small grow">Un acheteur attend une réponse depuis 3 h</span><Icon name="chevron" size="sm" /></Link>
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
          { label: 'Publier', icon: 'plus', to: '/vendre' },
          { label: 'Mettre en avant', icon: 'megaphone', to: '/campagne' },
          { label: 'Messages', icon: 'chat', to: '/assistance' },
          { label: 'Statistiques', icon: 'scale', to: '/campagne/stats' },
        ]} />
      </div>
      <TabBar />
    </div>
  );
}
