import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { simulate } from '../toast';
import { Badge, Foot, Icon, NotFound, Photo, SectionHead, TabBar, type Tone } from '../ui';

/* Seule annonce détaillée de la maquette (écran 06). */
const DETAIL_ID = 'FK-0142';

type Listing = {
  /** Présent seulement si l'annonce a une page de détail. */
  id?: string;
  sp?: boolean;
  title: string;
  details: string;
  price: string;
  place: string;
  photo: string;
  account: [string, Tone];
  trace: [string, Tone];
  verified: boolean;
  delivery: boolean;
};

const LISTINGS: Listing[] = [
  { sp: true, title: 'Taurillons Zébu, lot de 3', details: '18 à 22 mois, 260 à 290 kg', price: '1 680 000 FCFA le lot', place: 'Ferkessédougou, 54 km, Ranch Tuo', photo: 'Photo, lot', account: ['Compte vérifié', 'green'], trace: ['3 fiches', 'blue'], verified: true, delivery: true },
  { id: DETAIL_ID, title: 'Taurillon Zébu Goudali', details: '26 mois, 312 kg, pesé le 04/11', price: '650 000 FCFA', place: 'Sinématiali, 12 km, Ferme Koné', photo: 'Photo, taurillon', account: ['Compte vérifié', 'green'], trace: ['Fiche vérifiée', 'green'], verified: true, delivery: true },
  { title: 'Taurillon N’Dama', details: '20 mois, poids non renseigné', price: '415 000 FCFA', place: 'Korhogo, 4 km, Bamba S.', photo: 'Photo, N’Dama', account: ['Non vérifié', 'grey'], trace: ['Fiche déclarée', 'grey'], verified: false, delivery: false },
  { title: 'Taurillon métis Goudali × N’Dama', details: '24 mois, 275 kg', price: '560 000 FCFA, négociable', place: 'Napiéolédougou, 22 km, Ferme Silué', photo: 'Photo, métis', account: ['Compte vérifié', 'green'], trace: ['Fiche documentée', 'blue'], verified: true, delivery: false },
];

function ListingCard({ l }: { l: Listing }) {
  const body = (
    <>
      <Photo label={l.photo} />
      <div className="col grow" style={{ gap: 3 }}>
        {l.sp && <Badge tone="sp" style={{ alignSelf: 'flex-start' }}>Sponsorisé</Badge>}
        <span className="b small" style={{ lineHeight: 1.3 }}>{l.title}</span>
        <span className="xs muted ell">{l.details}</span>
        <span className="price">{l.price}</span>
        <span className="xs muted ell">{l.place}</span>
        <span className="wrap" style={{ gap: 4, marginTop: 2 }}><Badge tone={l.account[1]}>{l.account[0]}</Badge><Badge tone={l.trace[1]}>{l.trace[0]}</Badge></span>
      </div>
    </>
  );
  /* Sans page de détail en démo : carte non cliquable plutôt qu'un lien vers une autre annonce. */
  return l.id ? <Link className="hc" to={`/annonce/${l.id}`}>{body}</Link> : <div className="hc">{body}</div>;
}

function Skeleton() {
  const bar = (w: string, h: number, c = '#E9ECEA') => <div style={{ height: h, width: w, background: c, borderRadius: 3 }} />;
  return (
    <div className="hc" aria-hidden="true">
      <div className="ph" style={{ background: '#E9ECEA' }} />
      <div className="col grow" style={{ gap: 9, paddingTop: 4 }}>{bar('80%', 12)}{bar('55%', 10, '#EEF0EE')}{bar('40%', 14)}{bar('65%', 10, '#EEF0EE')}</div>
    </div>
  );
}

function SearchHeader() {
  const navigate = useNavigate();
  return (
    <header className="hdr" style={{ gap: 2, paddingRight: 12 }}>
      <button className="iconbtn" aria-label="Retour" onClick={() => navigate('/accueil')}><Icon name="back" /></button>
      <label className="search grow" style={{ height: 42 }}>
        <Icon name="search" />
        <input className="plain grow" defaultValue="taurillon" aria-label="Rechercher" style={{ outline: 'none', color: '#17201B' }} />
      </label>
    </header>
  );
}

/* Écran 02 : accueil. */
export function Home() {
  return (
    <div className="app">
      <header className="hdr" style={{ padding: '10px 8px 10px 16px' }}>
        <div className="col grow" style={{ gap: 0 }}>
          <span className="b" style={{ fontSize: 18, letterSpacing: '0.06em' }}>SAVAA</span>
          <span className="row xs" style={{ gap: 4, color: '#CFE0D4' }}><Icon name="pin" size="sm" /><span className="ell">Korhogo, Poro</span></span>
        </div>
        <Link className="iconbtn" to="/notifications" aria-label="Notifications, 4 non lues"><Icon name="bell" /><span className="dot">4</span></Link>
        <Link className="iconbtn" to="/panier" aria-label="Panier, 2 articles"><Icon name="cart" /><span className="dot">2</span></Link>
      </header>
      <div className="body flush">
        <div style={{ background: '#145C3A', padding: '4px 16px 16px' }}>
          <Link className="search" to="/explorer" style={{ borderColor: '#fff' }}><Icon name="search" /><span>Animal, récolte, aliment, matériel…</span></Link>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="grid4">
            <Link className="tile" to="/explorer"><Icon name="search" size="lg" />Explorer</Link>
            <Link className="tile" to="/vendre"><Icon name="sell" size="lg" />Vendre</Link>
            <Link className="tile" to="/commande"><Icon name="truck" size="lg" />Commandes</Link>
            <Link className="tile" to="/assistance"><Icon name="chat" size="lg" />Aide</Link>
          </div>

          <div className="sec">
            <SectionHead title="Catégories" />
            <div className="chips">
              {['Bovins', 'Ovins et caprins', 'Volailles et poussins', 'Reproducteurs', 'Récoltes', 'Aliments et intrants', 'Matériel', 'Services'].map((c) => (
                <Link key={c} className="chip" to="/explorer">{c}</Link>
              ))}
            </div>
          </div>

          <div className="sec">
            <div className="sech"><h2>Prix du marché à Poro</h2><span className="xs muted">cette semaine</span></div>
            <div className="card">
              <table className="tbl num">
                <thead><tr><th>Produit</th><th className="r">Fourchette</th><th className="r">7 jours</th></tr></thead>
                <tbody>
                  <tr><td>Bovin sur pied, kg vif</td><td className="r b">1 450 – 1 700</td><td className="r" style={{ color: '#145C3A' }}>+2 %</td></tr>
                  <tr><td>Bélier adulte, tête</td><td className="r b">85 000 – 140 000</td><td className="r" style={{ color: '#145C3A' }}>+6 %</td></tr>
                  <tr><td>Maïs grain, kg</td><td className="r b">210 – 245</td><td className="r muted">stable</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="sec">
            <SectionHead title="Mis en avant" link="Tout voir" to="/explorer" />
            <Link className="pc" to="/explorer">
              <Photo label="Photo, béliers" h={170} />
              <div className="in" style={{ padding: 12, gap: 4 }}>
                <div className="row between"><span className="b ell">Béliers Sahéliens, lot de 6</span><Badge tone="sp">Sponsorisé</Badge></div>
                <span className="price">117 500 FCFA <span className="small muted" style={{ fontWeight: 400 }}>la tête</span></span>
                <span className="xs muted ell">Ferkessédougou, Bergerie Soro</span>
              </div>
            </Link>
          </div>

          <div className="sec">
            <SectionHead title="Près de vous" link="Tout voir" to="/explorer" />
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', margin: '0 -16px', padding: '0 16px 2px', scrollbarWidth: 'none' }}>
              {[
                ['Taurillon Zébu Goudali', '650 000 FCFA', 'Sinématiali, 12 km', 'Photo, taurillon', 'Fiche vérifiée', 'green', undefined],
                ['Aliment bétail 50 kg', '14 500 FCFA', 'Korhogo, 3 km', 'Photo, sacs d’aliment', 'Livraison', 'grey', 'w'],
                ['Poussins chair, J1', '650 FCFA', 'Korhogo, par 100', 'Photo, poussins', 'Profil non vérifié', 'grey', 's'],
                ['Igname Kponan', '425 FCFA / kg', 'Dikodougou, 38 km', 'Photo, igname', 'Min. 200 kg', 'grey', 'w'],
              ].map(([t, p, place, ph, b, tone, tint]) => (
                <Link key={t} className="pc" to={t === 'Taurillon Zébu Goudali' ? `/annonce/${DETAIL_ID}` : '/explorer'} style={{ flex: 'none', width: 152 }}>
                  <Photo label={ph} tint={tint as 'w' | 's' | undefined} h={112} />
                  <div className="in">
                    <span className="small b ell">{t}</span>
                    <span className="price">{p}</span>
                    <span className="xs muted ell">{place}</span>
                    <Badge tone={tone as Tone} style={{ alignSelf: 'flex-start' }}>{b}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      <TabBar />
    </div>
  );
}

/* Écran 05 : résultats de recherche (chargement simulé à l'ouverture). */
export function Catalog() {
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(true);
  const [delivery, setDelivery] = useState(false);
  const [trace, setTrace] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(t);
  }, []);
  const items = LISTINGS.filter((l) => (!verified || l.verified) && (!delivery || l.delivery));

  return (
    <div className="app">
      <SearchHeader />
      <div style={{ background: '#fff', borderBottom: '1px solid #E3E7E4', padding: '10px 16px', flex: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="chips">
          <span className="chip"><Icon name="filter" size="sm" />Filtres (3)</span>
          <span className="chip on">Bovins</span>
          <button className={`chip${verified ? ' on' : ''}`} onClick={() => setVerified(!verified)}>Vendeur vérifié</button>
          <button className={`chip${delivery ? ' on' : ''}`} onClick={() => setDelivery(!delivery)}>Livraison</button>
          <button className={`chip${trace ? ' on' : ''}`} onClick={() => setTrace(!trace)}>Avec fiche animale</button>
        </div>
        <div className="row between small"><span className="muted num">{loading ? '…' : items.length} résultats, Poro et Tchologo</span><span className="b">Tri : pertinence</span></div>
      </div>
      <div className="body" style={{ padding: '12px 16px', gap: 10 }}>
        {loading ? (
          <>{[1, 2, 3].map((k) => <Skeleton key={k} />)}</>
        ) : items.length ? (
          items.map((l) => <ListingCard key={l.title} l={l} />)
        ) : (
          <div className="card pad col" style={{ alignItems: 'center', textAlign: 'center', gap: 8, padding: '28px 20px' }}>
            <span className="b">Aucune annonce avec ces filtres</span>
            <span className="small muted">Élargissez la zone ou retirez un filtre.</span>
            <button className="btn btn-s btn-sm" onClick={() => { setVerified(false); setDelivery(false); setTrace(false); }}>Réinitialiser les filtres</button>
          </div>
        )}
        <Link to="/explorer/hors-ligne" className="xs muted" style={{ textAlign: 'center', textDecoration: 'underline' }}>Voir l’état « pas de connexion »</Link>
      </div>
      <TabBar />
    </div>
  );
}

/* Écran 05b : erreur réseau, puis chargement au nouvel essai. */
export function CatalogOffline() {
  const [st, setSt] = useState<'err' | 'load' | 'ok'>('err');
  useEffect(() => {
    if (st !== 'load') return;
    const t = setTimeout(() => setSt('ok'), 1200);
    return () => clearTimeout(t);
  }, [st]);

  return (
    <div className="app">
      <SearchHeader />
      {st === 'err' && (
        <div className="body" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 12, padding: 32 }}>
          <Icon name="offline" style={{ width: 52, height: 52, color: '#5D6862', strokeWidth: 1.4 }} />
          <h2 style={{ fontSize: 19, fontWeight: 600 }}>Pas de connexion</h2>
          <p className="small muted" style={{ lineHeight: 1.5 }}>Impossible de charger les annonces. Vos favoris et les annonces déjà vues restent consultables.</p>
          <button className="btn btn-p btn-block" onClick={() => setSt('load')} style={{ marginTop: 8 }}>Réessayer</button>
          <button className="btn btn-s btn-block" onClick={() => simulate('Favoris hors connexion')}>Voir mes favoris (3)</button>
        </div>
      )}
      {st === 'load' && (
        <div className="body" style={{ padding: '12px 16px', gap: 10 }}>
          <span className="xs muted">Chargement des annonces…</span>
          {[1, 2, 3, 4].map((k) => <Skeleton key={k} />)}
        </div>
      )}
      {st === 'ok' && (
        <div className="body" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 12, padding: 32 }}>
          <h2 style={{ fontSize: 19, fontWeight: 600 }}>Connexion rétablie</h2>
          <p className="small muted">4 annonces trouvées pour « taurillon ».</p>
          <Link className="btn btn-p btn-block" to="/explorer" replace>Afficher les résultats</Link>
        </div>
      )}
      <TabBar />
    </div>
  );
}

/* Écran 06 : détail de l'annonce. */
export function ListingDetail() {
  const { id } = useParams();
  if (id !== DETAIL_ID) return <NotFound title="Annonce" text="Cette annonce n’existe pas ou n’est plus en ligne." to="/explorer" cta="Voir les annonces" />;
  return <ListingDetailInner />;
}

function ListingDetailInner() {
  const navigate = useNavigate();
  const [fav, setFav] = useState(false);
  const round = { background: '#fff', width: 40, height: 40, borderRadius: 20 };
  return (
    <div className="app">
      <div className="body flush">
        <div className="ph" style={{ height: 270, alignItems: 'stretch', flexDirection: 'column', justifyContent: 'space-between', padding: 10 }}>
          <div className="row between">
            <button className="iconbtn" aria-label="Retour" style={round} onClick={() => navigate(-1)}><Icon name="back" /></button>
            <button className="iconbtn" aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'} style={{ ...round, color: fav ? '#F28C28' : '#17201B' }} onClick={() => setFav(!fav)}>
              <Icon name="heart" style={{ fill: fav ? '#F28C28' : 'none' }} />
            </button>
          </div>
          <div className="row between"><span>Photo, taurillon de profil</span><span className="num">1 / 6</span></div>
        </div>
        <div style={{ background: '#fff', padding: 16, display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid #E3E7E4' }}>
          <span className="xs muted">Animaux, Bovins, publiée le 06/11/2026</span>
          <h1 style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.3 }}>Taurillon Zébu Goudali, 26 mois</h1>
          <div className="row" style={{ gap: 8, alignItems: 'baseline' }}><span className="num" style={{ fontSize: 24, fontWeight: 700, color: '#145C3A' }}>650 000 FCFA</span><span className="small muted">négociable</span></div>
          <div className="wrap"><Badge tone="green">Disponible</Badge><Badge>Livraison possible</Badge><Badge>1 animal</Badge></div>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card pad">
            <dl className="kv">
              <dt>Poids</dt><dd className="num">312 kg, pesé le 04/11</dd>
              <dt>Sexe / âge</dt><dd>Mâle, 26 mois</dd>
              <dt>Localisation</dt><dd>Sinématiali, Poro</dd>
              <dt>Livraison</dt><dd>Transporteur partenaire, à partir de 25 000 FCFA</dd>
            </dl>
          </div>

          <div className="sec">
            <div className="sech"><h2>Traçabilité</h2><Badge tone="green">Fiche vérifiée</Badge></div>
            <Link className="card pad col" to={`/animal/${DETAIL_ID}`} style={{ gap: 10 }}>
              <div className="row between"><span className="small muted">Identifiant officiel</span><Badge tone="amber">À vérifier</Badge></div>
              <div className="row between"><span className="small muted">Vaccinations</span><span className="small b">4 dont 3 vérifiées</span></div>
              <div className="row between"><span className="small muted">Dernier traitement</span><span className="small b num">15/08/2026</span></div>
              <div className="row between"><span className="small muted">Ascendance</span><span className="small b">Père documenté</span></div>
              <div className="divider" />
              <span className="link row between">Consulter la fiche animale et les preuves<Icon name="chevron" size="sm" /></span>
            </Link>
          </div>

          <div className="sec">
            <SectionHead title="Vendeur" />
            <div className="card pad col" style={{ gap: 12 }}>
              <div className="row"><span className="av">FK</span><div className="col grow"><span className="b small">Ferme Koné &amp; Fils</span><span className="xs muted">Sur SAVAA depuis mars 2025, répond en 2 h environ</span></div></div>
              <div className="grid3" style={{ gap: 8 }}>
                <div className="col" style={{ gap: 2 }}><span className="xs muted">Compte</span><Badge tone="green" style={{ alignSelf: 'flex-start' }}>Vérifié</Badge></div>
                <div className="col" style={{ gap: 2 }}><span className="xs muted">Ventes</span><span className="small b num">41</span></div>
                <div className="col" style={{ gap: 2 }}><span className="xs muted">Avis</span><span className="small b num">4,7 / 5 (23)</span></div>
              </div>
            </div>
          </div>

          <div className="sec">
            <SectionHead title="Description" />
            <p className="small" style={{ lineHeight: 1.55 }}>Taurillon né sur l’exploitation, élevé au pâturage avec complément au tourteau de coton. Bon état général, calme à la manipulation. Visite possible sur rendez-vous à Sinématiali.</p>
          </div>
          <Link className="row small" to="/assistance?onglet=reclamation" style={{ color: '#A0221A', gap: 6 }}><Icon name="flag" size="sm" />Signaler cette annonce</Link>
        </div>
      </div>
      <Foot>
        <Link className="btn btn-s" to="/assistance?onglet=assistant" style={{ flex: '0 0 auto' }}><Icon name="chat" />Contacter</Link>
        <Link className="btn btn-p" to="/panier">Commander via SAVAA</Link>
      </Foot>
    </div>
  );
}
