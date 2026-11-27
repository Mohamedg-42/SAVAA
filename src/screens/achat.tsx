import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CI_REGIONS, fcfa, proPriceOf, useStore, type Listing } from '../data';
import { share } from '../device';
import { LogoInline } from '../logo';
import { photoFor } from '../photos';
import { ReliefIcon } from '../relief';
import type { ReliefName } from '../relief-icons';
import { showToast } from '../toast';
import { sheetOf, sheetStatus } from '../trace';
import { Badge, Foot, Header, Icon, NotFound, Photo, PreviewModal, SectionHead, TabBar, type Tone } from '../ui';

/* Annonce détaillée de la maquette (écran 06) : son contenu est repris tel quel. */
const DETAIL_ID = 'FK-0142';

/** Minuscules sans accents, pour la recherche. */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const matches = (l: Listing, q: string) => {
  const hay = fold(`${l.title} ${l.category} ${l.details} ${l.place} ${l.seller} ${l.description ?? ''}`);
  return fold(q).split(/\s+/).filter(Boolean).every((w) => hay.includes(w.replace(/s$/, '')));
};
const hasSheet = (l: Listing) => !!l.animalIds?.length || (/fiche/i.test(l.trace[0]) && !/déclarée/i.test(l.trace[0]));

/** Carte d'annonce en grille (Explorer, Favoris) : photo en haut avec compteur multi-photos, cœur favori, deux cartes par ligne. */
function GridCard({ l }: { l: Listing }) {
  const s = useStore();
  const count = l.photos?.length ?? 1;
  const price = s.priceFor(l);
  const fav = s.isFavorite(l.id);
  return (
    <Link className="pc" to={`/annonce/${l.id}`} style={{ minWidth: 0 }}>
      <div style={{ position: 'relative' }}>
        <Photo label={l.photo} tint={l.tint} src={l.photos?.[0]} h={112} />
        <button
          type="button"
          className="iconbtn"
          aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          aria-pressed={fav}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); s.toggleFavorite(l.id); }}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 30,
            height: 30,
            borderRadius: 15,
            background: 'rgba(255,255,255,.92)',
            color: fav ? '#F28C28' : '#17201B',
          }}
        >
          <Icon name="heart" size="sm" style={{ fill: fav ? '#F28C28' : 'none' }} />
        </button>
        {count > 1 && (
          <span
            className="num"
            style={{
              position: 'absolute',
              right: 6,
              bottom: 6,
              background: 'rgba(23,32,27,.72)',
              color: '#fff',
              fontSize: 10.5,
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 4,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Icon name="camera" size="sm" style={{ width: 12, height: 12 }} />
            {count}
          </span>
        )}
      </div>
      <div className="in" style={{ gap: 3 }}>
        {l.sponsored && <Badge tone="sp" style={{ alignSelf: 'flex-start' }}>Sponsorisé</Badge>}
        <span className="small b" style={{ lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{l.title}</span>
        <span className="price">{fcfa(price)} FCFA{l.unit && <span className="xs muted" style={{ fontWeight: 400 }}> {l.unit}</span>}{price < l.price && <span className="xs" style={{ fontWeight: 600, color: '#1F5FA8' }}> pro</span>}</span>
        <span className="xs muted ell">{l.place.split(',')[0]}, {l.sellerShort ?? l.seller}</span>
        <span className="wrap" style={{ gap: 4, marginTop: 2 }}>
          {l.sellerVerified ? <Badge tone="green">Vérifié</Badge> : <Badge>Non vérifié</Badge>}
          <Badge tone={l.trace[1]}>{l.trace[0]}</Badge>
        </span>
      </div>
    </Link>
  );
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

function SearchHeader({ q, onQ }: { q: string; onQ?: (v: string) => void }) {
  const navigate = useNavigate();
  const home = useStore().home();
  return (
    <header className="hdr" style={{ gap: 4, paddingRight: 8 }}>
      <button className="iconbtn" aria-label="Retour" onClick={() => navigate(home)}><Icon name="back" /></button>
      <label className="search grow" style={{ height: 42 }}>
        <Icon name="search" />
        <input className="plain grow" type="search" value={q} onChange={(e) => onQ?.(e.target.value)} readOnly={!onQ} placeholder="Animal, récolte, aliment…" aria-label="Rechercher" style={{ outline: 'none', color: '#17201B' }} />
      </label>
      <Link className="iconbtn" to="/scanner" aria-label="Scanner un QR code de traçabilité"><Icon name="camera" /></Link>
    </header>
  );
}

const CATEGORY_SEARCH: Record<string, string> = { 'Ovins et caprins': 'ovins', 'Volailles et poussins': 'volailles', 'Aliments et intrants': 'aliment', Reproducteurs: 'reproducteur' };
const CATEGORIES = ['Bovins', 'Ovins et caprins', 'Volailles et poussins', 'Reproducteurs', 'Récoltes', 'Aliments et intrants', 'Matériel', 'Services'];
/* Icône en relief de chaque catégorie, dans la puce de l'accueil vu sans compte. */
const CATEGORY_ICON: Record<string, ReliefName> = {
  Bovins: 'bovin', 'Ovins et caprins': 'mouton', 'Volailles et poussins': 'volaille', Reproducteurs: 'certifie',
  'Récoltes': 'mais', 'Aliments et intrants': 'sac', 'Matériel': 'daba', Services: 'veto',
};

/** Bannière des annonces sponsorisées (acheteurs) : défile seule toutes les 4 s, ou au doigt. */
function SponsoredBanner({ items }: { items: Listing[] }) {
  const s = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (items.length < 2 || paused || reduce) return;
    const t = setInterval(() => {
      const el = ref.current;
      if (!el) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % items.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    }, 4000);
    return () => clearInterval(t);
  }, [items.length, paused]);

  if (!items.length) return null;
  const go = (i: number) => ref.current?.scrollTo({ left: i * ref.current.clientWidth, behavior: 'smooth' });

  return (
    <div className="col" style={{ gap: 8 }} onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} onTouchStart={() => setPaused(true)}>
      <div
        ref={ref}
        role="region"
        aria-label="Annonces sponsorisées"
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', borderRadius: 12 }}
      >
        {items.map((l) => (
          <Link
            key={l.id}
            to={`/annonce/${l.id}`}
            className="hero-slide"
            style={{
              flex: '0 0 100%', scrollSnapAlign: 'start', height: 168, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 14, color: '#fff',
              backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.05) 30%, rgba(0,0,0,.72)), url(${l.photos?.[0] ?? photoFor(l.photo, l.tint)})`, backgroundSize: 'cover', backgroundPosition: 'center',
            }}
          >
            <Badge tone="sp" style={{ alignSelf: 'flex-start' }}>Sponsorisé</Badge>
            <div className="col" style={{ gap: 2 }}>
              <span className="b ell" style={{ fontSize: 17 }}>{l.title}</span>
              <span className="num" style={{ fontWeight: 700, fontSize: 16 }}>{fcfa(s.priceFor(l))} FCFA{l.unit ? <span style={{ fontWeight: 400, fontSize: 13 }}> {l.unit}</span> : null}</span>
              <span className="xs ell" style={{ color: '#E3E7E4' }}>{l.place.split(',')[0]}, {l.sellerShort ?? l.seller}</span>
            </div>
          </Link>
        ))}
      </div>
      {items.length > 1 && (
        <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
          {items.map((l, i) => (
            <button key={l.id} aria-label={`Annonce sponsorisée ${i + 1} sur ${items.length}`} aria-current={i === index} onClick={() => go(i)}
              style={{ width: i === index ? 18 : 8, height: 8, borderRadius: 4, border: 0, padding: 0, cursor: 'pointer', background: i === index ? '#145C3A' : '#C5CDC7', transition: 'width .2s' }} />
          ))}
        </div>
      )}
    </div>
  );
}

/* Écran 02 : accueil. */
export function Home() {
  const s = useStore();
  const cartCount = s.cartLines().length;
  const unread = s.unread();
  const online = s.listings().filter((l) => l.status === 'online');
  const sponsored = online.filter((l) => l.sponsored);
  const [cat, setCat] = useState<string | null>(null);
  const [localTown, setLocalTown] = useState('');
  const [pickingTown, setPickingTown] = useState(false);
  const catQuery = cat ? CATEGORY_SEARCH[cat] ?? cat : '';
  /* Sans commune connue (visiteur), on ne suppose aucune ville : SAVAA couvre tout le pays. */
  const activeTown = localTown || s.session().town || (s.shop().created ? s.shop().town : '');
  const activeRegion = CI_REGIONS.find((g) => g.towns.includes(activeTown))?.region.replace(/^District d[’']/, '').replace(/\s*\(.+\)/, '');
  const locationLabel = !activeTown ? 'Toute la Côte d’Ivoire' : !activeRegion || activeRegion === activeTown ? activeTown : `${activeTown}, ${activeRegion}`;

  const catalog = online.filter((l) => matches(l, catQuery));
  const near = activeTown
    ? [...online].sort((a, b) => (fold(b.place).includes(fold(activeTown)) ? 1 : 0) - (fold(a.place).includes(fold(activeTown)) ? 1 : 0)).slice(0, 8)
    : online.slice(0, 8);
  const featured = sponsored[0] ?? online[0];
  const mosaic = online.filter((l) => l.photos?.[0] || l.photo).slice(0, 6);

  const chooseTown = (town: string) => {
    setLocalTown(town);
    if (s.session().loggedIn) s.setSession({ town: town || undefined });
    setPickingTown(false);
  };

  return (
    <div className="app">
      <header className="hdr hdr-home" style={{ padding: '10px 8px 10px 16px' }}>
        <div className="col grow" style={{ gap: 2 }}>
          <LogoInline tone="white" height={34} animated name={false} />
          <button
            type="button"
            className="row xs plain"
            style={{ gap: 4, color: '#CFE0D4', cursor: 'pointer', alignSelf: 'flex-start' }}
            onClick={() => setPickingTown((v) => !v)}
            aria-expanded={pickingTown}
          >
            <Icon name="pin" size="sm" />
            <span className="ell">{locationLabel}</span>
            <Icon name="down" size="sm" />
          </button>
        </div>
        {s.session().loggedIn && (
          <Link className="iconbtn" to="/messages" aria-label={`Messages, ${s.unreadMessages()} non lu${s.unreadMessages() > 1 ? 's' : ''}`}>
            <Icon name="chat" />{s.unreadMessages() > 0 && <span className="dot">{s.unreadMessages()}</span>}
          </Link>
        )}
        <Link className="iconbtn" to="/notifications" aria-label={`Notifications, ${unread} non lue${unread > 1 ? 's' : ''}`}><Icon name="bell" />{unread > 0 && <span className="dot">{unread}</span>}</Link>
        <Link className="iconbtn" to="/panier" aria-label={`Panier, ${cartCount} article${cartCount > 1 ? 's' : ''}`}><Icon name="cart" />{cartCount > 0 && <span className="dot">{cartCount}</span>}</Link>
      </header>
      <div className="body flush">
        <div className="home-search" style={{ background: '#145C3A', padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pickingTown && (
            <select
              aria-label="Choisir votre localité"
              className="input"
              value={activeTown}
              onChange={(e) => chooseTown(e.target.value)}
              style={{ backgroundColor: '#fff', color: '#17201B' }}
            >
              <option value="">Toute la Côte d’Ivoire</option>
              {CI_REGIONS.map((g) => (
                <optgroup key={g.region} label={g.region}>
                  {g.towns.map((t) => <option key={t} value={t}>{t}</option>)}
                </optgroup>
              ))}
            </select>
          )}
          <Link className="search" to="/explorer?q=" style={{ borderColor: '#fff' }}><Icon name="search" /><span>Animal, récolte, aliment, matériel…</span></Link>
        </div>
        <div className="home-main" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Vendeurs : tuiles d'accès rapide. Acheteurs et visiteurs : bannière des annonces sponsorisées. */}
          {s.canSell() ? (
            <div className="grid4">
              <Link className="tile" to="/explorer"><ReliefIcon name="explorer" size={30} />Explorer</Link>
              <Link className="tile" to="/vendre"><ReliefIcon name="publier" size={30} />Vendre</Link>
              <Link className="tile" to="/commandes"><ReliefIcon name="commandes" size={30} />Commandes</Link>
              <Link className="tile" to="/messages"><ReliefIcon name="messages" size={30} />Messages</Link>
            </div>
          ) : (
            <SponsoredBanner items={sponsored} />
          )}

          <div className="sec">
            <SectionHead title="Catégories" />
            <div className="chips">
              {CATEGORIES.map((c) => (
                <button key={c} className={`chip${cat === c ? ' on' : ''}`} aria-pressed={cat === c} onClick={() => setCat(cat === c ? null : c)} style={{ paddingLeft: 7 }}>
                  <span className="chip-ic"><ReliefIcon name={CATEGORY_ICON[c]} size={24} shadow={false} /></span>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Catalogue juste sous les catégories : une catégorie touchée filtre la liste. */}
          <div className="sec">
            <SectionHead title={cat ? `Catalogue, ${cat.toLowerCase()}` : 'Catalogue'} link="Tout voir" to={`/explorer?q=${encodeURIComponent(catQuery)}`} />
            {catalog.length === 0 ? (
              <div className="card pad"><span className="small muted">Aucune annonce dans cette catégorie pour l’instant.</span></div>
            ) : (
              <div className="rail" style={{ display: 'flex', gap: 10, overflowX: 'auto', margin: '0 -16px', padding: '0 16px 2px' }}>
                {catalog.map((l) => (
                  <Link key={l.id} className="pc" to={`/annonce/${l.id}`} style={{ flex: 'none', width: 152 }}>
                    <div style={{ position: 'relative' }}>
                      <Photo label={l.photo} tint={l.tint} src={l.photos?.[0]} h={112} />
                      {(l.photos?.length ?? 0) > 1 && (
                        <span className="num" style={{ position: 'absolute', right: 6, bottom: 6, background: 'rgba(23,32,27,.72)', color: '#fff', fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 4 }}>
                          {l.photos?.length} photos
                        </span>
                      )}
                    </div>
                    <div className="in">
                      <span className="small b ell">{l.title}</span>
                      <span className="price ell">{fcfa(s.priceFor(l))} FCFA</span>
                      <span className="xs muted ell">{l.place}</span>
                      {l.sponsored ? <Badge tone="sp" style={{ alignSelf: 'flex-start' }}>Sponsorisé</Badge> : <Badge tone={l.trace[1]} style={{ alignSelf: 'flex-start' }}>{l.trace[0]}</Badge>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Les acheteurs ont déjà la bannière sponsorisée : « Mis en avant » reste pour les vendeurs. */}
          {s.canSell() && featured && (
            <div className="sec">
              <SectionHead title="Mis en avant" link="Tout voir" to="/explorer?q=" />
              <Link className="pc" to={`/annonce/${featured.id}`}>
                <Photo label={featured.photo} tint={featured.tint} src={featured.photos?.[0]} h={170} />
                <div className="in" style={{ padding: 12, gap: 4 }}>
                  <div className="row between"><span className="b ell">{featured.title}</span>{featured.sponsored && <Badge tone="sp">Sponsorisé</Badge>}</div>
                  <span className="price">{fcfa(s.priceFor(featured))} FCFA{featured.unit && <span className="small muted" style={{ fontWeight: 400 }}> {featured.unit}</span>}</span>
                  <span className="xs muted ell">{featured.place}, {featured.seller}</span>
                </div>
              </Link>
            </div>
          )}

          <div className="sec">
            <SectionHead title={activeTown ? `Près de ${activeTown}` : 'Sélection du moment'} link="Tout voir" to="/explorer?q=" />
            <div className="rail" style={{ display: 'flex', gap: 10, overflowX: 'auto', margin: '0 -16px', padding: '0 16px 2px', scrollbarWidth: 'none' }}>
              {near.map((l) => (
                <Link key={l.id} className="pc" to={`/annonce/${l.id}`} style={{ flex: 'none', width: 152 }}>
                  <Photo label={l.photo} tint={l.tint} src={l.photos?.[0]} h={112} />
                  <div className="in">
                    <span className="small b ell">{l.title}</span>
                    <span className="price ell">{fcfa(s.priceFor(l))} FCFA</span>
                    <span className="xs muted ell">{l.place}</span>
                    <Badge tone={l.trace[1]} style={{ alignSelf: 'flex-start' }}>{l.trace[0]}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {mosaic.length > 0 && (
            <div className="sec">
              <SectionHead title={activeRegion ? `En images, ${activeRegion}` : 'En images sur SAVAA'} link="Explorer" to="/explorer" />
              <div className="grid3 mosaic" style={{ gap: 8 }}>
                {mosaic.map((l) => (
                  <Link key={l.id} to={`/annonce/${l.id}`} className="mosaic-item" style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', height: 88, display: 'flex', alignItems: 'flex-end', padding: 6, backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,.68)), url(${l.photos?.[0] ?? photoFor(l.photo, l.tint)})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                    <span className="xs b ell" style={{ color: '#fff' }}>{l.category.split(',')[0]}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <TabBar />
    </div>
  );
}

/* Écran 05 : catalogue avec filtres complets, tri et recherche. Avec `favorites` (/favoris) : annonces gardées avec le cœur. */
type SortMode = 'pertinence' | 'price_asc' | 'price_desc' | 'recent';

function parseDateFr(d: string): number {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(d);
  return m ? Number(`${m[3]}${m[2]}${m[1]}`) : 0;
}

export function Catalog({ favorites = false }: { favorites?: boolean }) {
  const s = useStore();
  const [params, setParams] = useSearchParams();
  const favMode = favorites || params.get('favoris') === '1';
  const q = params.get('q') ?? '';
  const [verified, setVerified] = useState(false);
  const [delivery, setDelivery] = useState(false);
  const [trace, setTrace] = useState(false);
  const [nego, setNego] = useState(false);
  const [cat, setCat] = useState('');
  const [place, setPlace] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState<SortMode>('pertinence');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const online = s.listings().filter((l) => l.status === 'online');
  const categories = [...new Set(online.map((l) => l.category.split(',')[0].trim()))].sort();
  const places = [...new Set(online.map((l) => l.place.split(',')[0].trim()))].sort();

  const minN = Number(minPrice.replace(/\D/g, '')) || 0;
  const maxN = Number(maxPrice.replace(/\D/g, '')) || 0;

  const pool = favMode
    ? s.listings().filter((l) => s.isFavorite(l.id) && matches(l, q))
    : online.filter((l) => matches(l, q));

  const filtered = pool.filter((l) => {
    const p = s.priceFor(l);
    if (verified && !l.sellerVerified) return false;
    if (delivery && !l.delivery) return false;
    if (trace && !hasSheet(l)) return false;
    if (nego && !l.negotiable) return false;
    if (cat && l.category.split(',')[0].trim() !== cat) return false;
    if (place && l.place.split(',')[0].trim() !== place) return false;
    if (minN > 0 && p < minN) return false;
    if (maxN > 0 && p > maxN) return false;
    return true;
  });

  const items = [...filtered].sort((a, b) => {
    if (sort === 'price_asc') return s.priceFor(a) - s.priceFor(b);
    if (sort === 'price_desc') return s.priceFor(b) - s.priceFor(a);
    if (sort === 'recent') return parseDateFr(b.date) - parseDateFr(a.date);
    return (b.sponsored ? 1 : 0) - (a.sponsored ? 1 : 0);
  });

  const active = [verified, delivery, trace, nego, Boolean(cat), Boolean(place), minN > 0, maxN > 0].filter(Boolean).length;
  const resetFilters = () => {
    setVerified(false); setDelivery(false); setTrace(false); setNego(false);
    setCat(''); setPlace(''); setMinPrice(''); setMaxPrice('');
  };

  return (
    <div className="app">
      {favMode ? (
        <header className="hdr" style={{ paddingLeft: 16 }}>
          <h1>Mes favoris</h1>
        </header>
      ) : (
        <SearchHeader q={q} onQ={(v) => setParams(v ? { q: v } : {}, { replace: true })} />
      )}
      <div style={{ background: '#fff', borderBottom: '1px solid #E3E7E4', padding: '10px 16px', flex: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {favMode && (
          <div className="search">
            <Icon name="search" size="sm" />
            <input className="plain grow" style={{ outline: 'none', minWidth: 0 }} aria-label="Rechercher dans mes favoris" placeholder="Filtrer mes favoris…" value={q} onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })} />
            {q && <button className="iconbtn" style={{ width: 28, height: 28 }} aria-label="Effacer" onClick={() => setParams({}, { replace: true })}><Icon name="close" size="sm" /></button>}
          </div>
        )}
        <div className="chips">
          <button className={`chip${drawerOpen || active > 0 ? ' on' : ''}`} onClick={() => setDrawerOpen((v) => !v)}>
            <Icon name="filter" size="sm" />Filtres{active > 0 ? ` (${active})` : ''}
          </button>
          <button className={`chip${verified ? ' on' : ''}`} onClick={() => setVerified(!verified)}>Vendeur vérifié</button>
          <button className={`chip${delivery ? ' on' : ''}`} onClick={() => setDelivery(!delivery)}>Livraison</button>
          <button className={`chip${nego ? ' on' : ''}`} onClick={() => setNego(!nego)}>Négociable</button>
          <button className={`chip${trace ? ' on' : ''}`} onClick={() => setTrace(!trace)}>Avec fiche animale</button>
        </div>
        {drawerOpen && (
          <div className="card pad col" style={{ gap: 10, background: '#F8FAF8' }}>
            <div className="grid2" style={{ gap: 8 }}>
              <div className="field">
                <label htmlFor="flt-cat" className="xs muted">Catégorie</label>
                <select id="flt-cat" className="input" value={cat} onChange={(e) => setCat(e.target.value)}>
                  <option value="">Toutes</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="flt-place" className="xs muted">Localité</label>
                <select id="flt-place" className="input" value={place} onChange={(e) => setPlace(e.target.value)}>
                  <option value="">Toute la Côte d’Ivoire</option>
                  {places.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="flt-min" className="xs muted">Prix min (FCFA)</label>
                <input id="flt-min" className="input num" inputMode="numeric" placeholder="Ex. 10 000" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="flt-max" className="xs muted">Prix max (FCFA)</label>
                <input id="flt-max" className="input num" inputMode="numeric" placeholder="Ex. 500 000" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
              </div>
            </div>
            <div className="row between">
              <button className="btn btn-ghost btn-sm" style={{ flex: 'none' }} onClick={resetFilters}>Réinitialiser</button>
              <button className="btn btn-p btn-sm" style={{ flex: 'none' }} onClick={() => setDrawerOpen(false)}>Voir {items.length} résultat{items.length > 1 ? 's' : ''}</button>
            </div>
          </div>
        )}
        <div className="row between small" style={{ gap: 8 }}>
          <span className="muted num ell">{items.length} résultat{items.length > 1 ? 's' : ''}{favMode ? ' en favoris' : place ? `, ${place}` : ', Côte d’Ivoire'}</span>
          <label className="row xs" style={{ gap: 6, flex: 'none' }}>
            <span className="muted">Tri :</span>
            <select
              aria-label="Trier les annonces"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              style={{ border: '1px solid #C5CDC7', borderRadius: 6, padding: '4px 8px', background: '#fff', fontSize: 12.5, fontWeight: 600, color: '#17201B' }}
            >
              <option value="pertinence">Pertinence</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
              <option value="recent">Plus récentes</option>
            </select>
          </label>
        </div>
      </div>
      <div className="body" style={{ padding: '12px 16px', gap: 10 }}>
        {items.length ? (
          <div className="grid2">{items.map((l) => <GridCard key={l.id} l={l} />)}</div>
        ) : (
          <div className="card pad col" style={{ alignItems: 'center', textAlign: 'center', gap: 8, padding: '28px 20px' }}>
            <span className="b">{favMode && !pool.length ? 'Aucun favori pour l’instant' : 'Aucune annonce avec ces filtres'}</span>
            <span className="small muted">{favMode && !pool.length ? 'Touchez le cœur sur une annonce pour la garder ici.' : 'Élargissez la zone ou retirez un filtre.'}</span>
            {(active > 0 || q) && <button className="btn btn-s btn-sm" onClick={() => { resetFilters(); setParams({}, { replace: true }); }}>Réinitialiser les filtres</button>}
          </div>
        )}
        {!favMode && <Link to="/favoris" className="xs muted" style={{ textAlign: 'center', textDecoration: 'underline' }}>Mes favoris ({s.favorites().length})</Link>}
      </div>
      <TabBar />
    </div>
  );
}

/* Écran 05b : erreur réseau, puis chargement au nouvel essai. */
export function CatalogOffline() {
  const s = useStore();
  const navigate = useNavigate();
  const [st, setSt] = useState<'err' | 'load' | 'ok'>('err');
  useEffect(() => {
    if (st !== 'load') return;
    const t = setTimeout(() => setSt('ok'), 1200);
    return () => clearTimeout(t);
  }, [st]);
  const found = s.listings().filter((l) => l.status === 'online' && matches(l, 'taurillon')).length;

  return (
    <div className="app">
      <SearchHeader q="taurillon" />
      {st === 'err' && (
        <div className="body" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 12, padding: 32 }}>
          <Icon name="offline" style={{ width: 52, height: 52, color: '#5D6862', strokeWidth: 1.4 }} />
          <h2 style={{ fontSize: 19, fontWeight: 600 }}>Pas de connexion</h2>
          <p className="small muted" style={{ lineHeight: 1.5 }}>Impossible de charger les annonces. Vos favoris et les annonces déjà vues restent consultables.</p>
          <button className="btn btn-p btn-block" onClick={() => setSt('load')} style={{ marginTop: 8 }}>Réessayer</button>
          <button className="btn btn-s btn-block" onClick={() => navigate('/favoris')}>Voir mes favoris ({s.favorites().length})</button>
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
          <p className="small muted">{found} annonce{found > 1 ? 's' : ''} trouvée{found > 1 ? 's' : ''} pour « taurillon ».</p>
          <Link className="btn btn-p btn-block" to="/explorer?q=taurillon" replace>Afficher les résultats</Link>
        </div>
      )}
      <TabBar />
    </div>
  );
}

const STATUS: Record<Listing['status'], [string, Tone]> = {
  online: ['Disponible', 'green'],
  review: ['En revue', 'amber'],
  sold: ['Vendu', 'blue'],
  out: ['Rupture', 'red'],
  archived: ['Retirée de la vente', 'grey'],
};

/* Écran 06 : détail de l'annonce avec galerie multi-photos interactive. */
export function ListingDetail() {
  const { id = '' } = useParams();
  const l = useStore().listing(id);
  if (!l) return <NotFound title="Annonce" text="Cette annonce n’existe pas ou n’est plus en ligne." to="/explorer" cta="Voir les annonces" />;
  return <ListingDetailInner key={l.id} l={l} />;
}

function ListingDetailInner({ l }: { l: Listing }) {
  const sheet = sheetOf(l);
  const s = useStore();
  const navigate = useNavigate();
  const fav = s.isFavorite(l.id);
  const full = l.id === DETAIL_ID;
  const round = { background: '#fff', width: 40, height: 40, borderRadius: 20 };
  const buyable = l.status === 'online' && !l.mine;
  const inCart = s.cart().items.some((i) => i.listingId === l.id);
  const animals = (l.animalIds ?? []).map((a) => s.animal(a)).filter(Boolean);
  const [status, statusTone] = STATUS[l.status];
  const order = () => {
    if (!inCart) s.addToCart(l.id);
    navigate('/panier');
  };
  const contactSeller = (withOffer = false) => {
    if (!s.session().loggedIn) {
      navigate('/connexion', { state: { next: `/annonce/${l.id}` } });
      return;
    }
    const tid = s.openThread({
      kind: 'listing',
      refId: l.id,
      subject: l.title,
      other: { name: l.seller, phone: l.ownerPhone ?? `SELLER-${l.id}` },
      price: s.priceFor(l),
      negotiable: l.negotiable,
      photo: currentPhoto,
    });
    navigate(withOffer ? `/messages/${tid}?offre=1` : `/messages/${tid}`);
  };

  const gallery = l.photos?.length ? l.photos : [photoFor(l.photo, l.tint)];
  const [photoIdx, setPhotoIdx] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const currentPhoto = gallery[photoIdx] ?? gallery[0];
  const currentCaption = l.photoLabels?.[photoIdx] ?? (full && photoIdx === 0 ? 'Photo, taurillon de profil' : undefined);
  const similar = s
    .listings()
    .filter((x) => x.id !== l.id && x.status === 'online' && x.category.split(',')[0] === l.category.split(',')[0])
    .slice(0, 4);

  return (
    <div className="app wide">
      <div className="body flush">
        <div className="detail">
        <div className="detail-media">
        <div
          className="ph detail-photo"
          onClick={() => setZoomOpen(true)}
          style={{
            height: 270,
            alignItems: 'stretch',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 10,
            cursor: 'zoom-in',
            backgroundImage: `url(${currentPhoto})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="row between" onClick={(e) => e.stopPropagation()}>
            <button className="iconbtn" aria-label="Retour" style={round} onClick={() => navigate(-1)}><Icon name="back" /></button>
            <div className="row" style={{ gap: 8 }}>
              <button
                className="iconbtn"
                aria-label="Partager cette annonce"
                style={round}
                onClick={() => void share(l.title, `${l.title}, ${fcfa(s.priceFor(l))} FCFA sur SAVAA`)}
              >
                <Icon name="share" />
              </button>
              <button className="iconbtn" aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'} aria-pressed={fav} style={{ ...round, color: fav ? '#F28C28' : '#17201B' }} onClick={() => s.toggleFavorite(l.id)}>
                <Icon name="heart" style={{ fill: fav ? '#F28C28' : 'none' }} />
              </button>
            </div>
          </div>
          {gallery.length > 1 && (
            <div className="row between" style={{ pointerEvents: 'auto' }} onClick={(e) => e.stopPropagation()}>
              <button
                className="iconbtn"
                aria-label="Photo précédente"
                onClick={() => setPhotoIdx((photoIdx - 1 + gallery.length) % gallery.length)}
                style={{ width: 32, height: 32, borderRadius: 16, background: 'rgba(23,32,27,.62)', color: '#fff' }}
              >
                <Icon name="back" size="sm" />
              </button>
              <button
                className="iconbtn"
                aria-label="Photo suivante"
                onClick={() => setPhotoIdx((photoIdx + 1) % gallery.length)}
                style={{ width: 32, height: 32, borderRadius: 16, background: 'rgba(23,32,27,.62)', color: '#fff' }}
              >
                <Icon name="chevron" size="sm" />
              </button>
            </div>
          )}
          <div className="row between">
            {currentCaption ? <span>{currentCaption}</span> : <span style={{ background: 'transparent' }} />}
            <span className="num">{photoIdx + 1} / {gallery.length}</span>
          </div>
        </div>

        {/* Bandeau de vignettes photos cliquables */}
        {gallery.length > 1 && (
          <div
            role="region"
            aria-label="Galerie photos de l’annonce"
            className="detail-thumbs"
            style={{
              background: '#fff',
              padding: '10px 16px',
              borderBottom: '1px solid #E3E7E4',
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
            }}
          >
            {gallery.map((src, i) => (
              <button
                key={src + i}
                onClick={() => setPhotoIdx(i)}
                aria-label={`Afficher la photo ${i + 1} sur ${gallery.length}`}
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
        )}
        </div>

        <div className="detail-info">
        <div className="detail-head" style={{ background: '#fff', padding: 16, display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid #E3E7E4' }}>
          <span className="xs muted">{l.category}, publiée le {l.date}</span>
          <h1 style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.3 }}>{full ? 'Taurillon Zébu Goudali, 26 mois' : l.title}</h1>
          <div className="row" style={{ gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span className="num" style={{ fontSize: 24, fontWeight: 700, color: '#145C3A' }}>{fcfa(s.priceFor(l))} FCFA</span>
            {l.unit && <span className="small muted">{l.unit}</span>}
            {s.priceFor(l) < l.price && <><Badge tone="blue">Prix pro</Badge><span className="small muted" style={{ textDecoration: 'line-through' }}>{fcfa(l.price)} FCFA</span></>}
            {(full || l.negotiable) && <span className="small muted">négociable</span>}
          </div>
          {proPriceOf(l) && s.priceFor(l) === l.price && (
            <span className="xs muted">
              {s.has('resto') ? <>Un prix pro existe : <Link className="link" to={`/profil-metier?next=${encodeURIComponent(`/annonce/${l.id}`)}`}>renseignez votre RCCM</Link> pour en bénéficier.</> : 'Prix pro disponible pour les restaurants et hôtels vérifiés.'}
            </span>
          )}
          <div className="wrap">
            {l.sponsored && <Badge tone="sp">Sponsorisé</Badge>}
            <Badge tone={statusTone}>{status}</Badge>
            <Badge>{l.delivery ? 'Livraison possible' : 'Retrait sur place'}</Badge>
            <Badge>{l.stock ? `Stock ${l.stock}` : animals.length > 1 ? `${animals.length} animaux` : l.category.startsWith('Animaux') ? '1 animal' : '1 lot'}</Badge>
          </div>
        </div>
        <div className="detail-body" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card pad">
            {full ? (
              <dl className="kv">
                <dt>Poids</dt><dd className="num">312 kg, pesé le 04/11</dd>
                <dt>Sexe / âge</dt><dd>Mâle, 26 mois</dd>
                <dt>Localisation</dt><dd>Sinématiali, Poro</dd>
                <dt>Livraison</dt><dd>Transporteur partenaire, à partir de 25 000 FCFA</dd>
              </dl>
            ) : (
              <dl className="kv">
                <dt>Détails</dt><dd>{l.details}</dd>
                <dt>Localisation</dt><dd>{l.place}</dd>
                <dt>Livraison</dt><dd>{l.delivery ? 'Transporteur partenaire, à partir de 25 000 FCFA' : 'Retrait chez le vendeur'}</dd>
              </dl>
            )}
          </div>

          {full ? (
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
          ) : l.category.startsWith('Animaux') && (
            <div className="sec">
              <div className="sech"><h2>Traçabilité</h2><Badge tone={l.trace[1]}>{l.trace[0]}</Badge></div>
              {animals.length ? (
                <div className="card list">
                  {animals.map((a) => a && (
                    <Link key={a.id} className="li" to={`/animal/${a.id}`}>
                      <Photo w={44} h={44} radius={6} src={a.photo} />
                      <div className="col grow"><span className="small b ell">{a.id}, {a.name}</span><span className="xs muted ell">{a.details}</span></div>
                      <Icon name="chevron" size="sm" />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="small muted">Les fiches de ces animaux sont tenues par le vendeur. Demandez-les avant d’acheter.</p>
              )}
            </div>
          )}

          {sheet && (
            <div className="sec">
              <div className="sech"><h2>Fiche produit</h2><Badge tone={sheetStatus(l).tone}>{sheetStatus(l).label}</Badge></div>
              <Link className="card pad col" to={`/fiche/${sheet.code}`} style={{ gap: 8 }}>
                <div className="row between"><span className="small muted">Code de traçabilité</span><span className="small b num">{sheet.code}</span></div>
                <div className="row between"><span className="small muted">Origine</span><span className="small b ell" style={{ minWidth: 0 }}>{sheet.origin.farm}, {sheet.origin.town}</span></div>
                <div className="divider" />
                <span className="link row between">Voir la fiche produit<Icon name="chevron" size="sm" /></span>
              </Link>
            </div>
          )}

          <div className="sec">
            <SectionHead title="Vendeur" />
            {(() => {
              const revs = s.reviewsFor(l.seller);
              const avg = revs.length ? (revs.reduce((acc, r) => acc + r.rating, 0) / revs.length).toFixed(1).replace('.', ',') : null;
              const shopUrl = `/boutique-publique/${encodeURIComponent(l.seller)}`;
              return (
                <Link className="card pad col" to={shopUrl} style={{ gap: 12 }}>
                  <div className="row">
                    {full ? (
                      <Photo w={40} h={40} radius={20} src="images/ferme-kone-logo.jpg" />
                    ) : (
                      <span className="av">{l.seller.split(/\s+/).filter((w) => /^\p{L}/u.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}</span>
                    )}
                    <div className="col grow"><span className="b small">{l.seller}</span><span className="xs muted">{full ? 'Sur SAVAA depuis mars 2025, répond en 2 h environ' : l.place.split(',')[0]}</span></div>
                    <Icon name="chevron" size="sm" />
                  </div>
                  <div className="grid3" style={{ gap: 8 }}>
                    <div className="col" style={{ gap: 2 }}><span className="xs muted">Compte</span>{l.sellerVerified ? <Badge tone="green" style={{ alignSelf: 'flex-start' }}>Vérifié</Badge> : <Badge style={{ alignSelf: 'flex-start' }}>Non vérifié</Badge>}</div>
                    <div className="col" style={{ gap: 2 }}><span className="xs muted">Annonces</span><span className="small b num">{s.listings().filter((x) => x.seller === l.seller && x.status === 'online').length}</span></div>
                    <div className="col" style={{ gap: 2 }}><span className="xs muted">Avis</span><span className="small b num">{avg ? `${avg} / 5 (${revs.length})` : 'Aucun avis'}</span></div>
                  </div>
                  <div className="divider" />
                  <span className="link row between">Voir la boutique et les avis<Icon name="chevron" size="sm" /></span>
                </Link>
              );
            })()}
          </div>

          {(() => {
            const revs = s.reviewsFor(l.seller);
            const shopUrl = `/boutique-publique/${encodeURIComponent(l.seller)}?onglet=avis`;
            return (
              <div className="sec">
                <SectionHead title={`Avis clients (${revs.length})`} link="Laisser un avis" to={shopUrl} />
                {revs.length === 0 ? (
                  <div className="card pad row between">
                    <span className="small muted">Aucun avis sur ce vendeur pour le moment.</span>
                    <Link className="link small" to={shopUrl}>Donner mon avis</Link>
                  </div>
                ) : (
                  <div className="col" style={{ gap: 8 }}>
                    {revs.slice(0, 2).map((r) => (
                      <div key={r.id} className="card pad col" style={{ gap: 4 }}>
                        <div className="row between">
                          <span className="small b">{r.author}</span>
                          <span className="small b num" style={{ color: '#145C3A' }}>{r.rating} / 5</span>
                        </div>
                        <span className="small muted">{r.comment}</span>
                        <span className="xs muted">{r.verified ? 'Achat vérifié, ' : ''}{r.date}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {(full || l.description) && (
            <div className="sec">
              <SectionHead title="Description" />
              <p className="small" style={{ lineHeight: 1.55 }}>{full ? 'Taurillon né sur l’exploitation, élevé au pâturage avec complément au tourteau de coton. Bon état général, calme à la manipulation. Visite possible sur rendez-vous à Sinématiali.' : l.description}</p>
            </div>
          )}

          {similar.length > 0 && (
            <div className="sec">
              <SectionHead title="Annonces similaires" link="Tout voir" to="/explorer" />
              <div className="rail" style={{ display: 'flex', gap: 10, overflowX: 'auto', margin: '0 -16px', padding: '0 16px 2px' }}>
                {similar.map((item) => (
                  <Link key={item.id} className="pc" to={`/annonce/${item.id}`} style={{ flex: 'none', width: 146 }}>
                    <Photo label={item.photo} tint={item.tint} src={item.photos?.[0]} h={96} />
                    <div className="in">
                      <span className="small b ell">{item.title}</span>
                      <span className="price ell">{fcfa(s.priceFor(item))} FCFA</span>
                      <span className="xs muted ell">{item.place.split(',')[0]}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {!l.mine && <Link className="row small" to={`/assistance?onglet=reclamation&ref=${l.id}`} style={{ color: '#A0221A', gap: 6 }}><Icon name="flag" size="sm" />Signaler cette annonce</Link>}
        </div>
        </div>
        </div>
      </div>
      <Foot>
        {l.mine ? (
          <Link className="btn btn-p" to="/boutique">Voir ma boutique</Link>
        ) : (
          <>
            <button className="btn btn-s" onClick={() => contactSeller(false)} style={{ flex: '0 0 auto', padding: '0 10px', fontSize: 13 }}><Icon name="chat" size="sm" />Écrire</button>
            {l.negotiable && buyable && (
              <button className="btn btn-s" onClick={() => contactSeller(true)} style={{ flex: '0 0 auto', padding: '0 10px', fontSize: 13 }}><ReliefIcon name="offre" size={20} shadow={false} />Offre</button>
            )}
            {buyable ? (
              <button className="btn btn-p" style={{ padding: '0 12px', fontSize: 13, minWidth: 0 }} onClick={order}>{inCart ? 'Panier' : 'Commander'}</button>
            ) : (
              <button className="btn btn-p" style={{ padding: '0 12px', fontSize: 13, minWidth: 0 }} disabled>{status}</button>
            )}
          </>
        )}
      </Foot>
      <PreviewModal
        data={zoomOpen ? { title: l.title, subtitle: currentCaption ?? l.place, images: gallery, startIndex: photoIdx } : null}
        onClose={() => setZoomOpen(false)}
      />
    </div>
  );
}

/* Page publique d'un vendeur : annonces en ligne, avis clients et contact dans l'application. */
export function PublicShop() {
  const { seller = '' } = useParams();
  const [params] = useSearchParams();
  const s = useStore();
  const navigate = useNavigate();
  const name = decodeURIComponent(seller);
  const listings = s.listings().filter((l) => l.seller === name && l.status === 'online');
  const allFromSeller = s.listings().filter((l) => l.seller === name);
  const reviews = s.reviewsFor(name);
  const [tab, setTab] = useState<'ads' | 'avis'>(params.get('onglet') === 'avis' ? 'avis' : 'ads');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  if (allFromSeller.length === 0 && reviews.length === 0) {
    return <NotFound title="Boutique" text="Ce vendeur n’a pas encore d’annonce publique." to="/explorer" cta="Voir les annonces" />;
  }

  const ref = allFromSeller[0];
  const verified = ref?.sellerVerified ?? false;
  const place = ref?.place.split(',')[0] ?? 'Côte d’Ivoire';
  const avg = reviews.length ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1).replace('.', ',') : '–';
  const isFermeKone = name === 'Ferme Koné & Fils';

  const contact = () => {
    if (!s.session().loggedIn) {
      navigate('/connexion', { state: { next: `/boutique-publique/${encodeURIComponent(name)}` } });
      return;
    }
    const tid = s.openThread({
      kind: 'listing',
      refId: ref?.id,
      subject: ref ? ref.title : `Boutique ${name}`,
      other: { name, phone: ref?.ownerPhone ?? `SELLER-${name}` },
      price: ref ? s.priceFor(ref) : undefined,
      negotiable: ref?.negotiable,
      photo: ref?.photos?.[0],
    });
    navigate(`/messages/${tid}`);
  };

  const submitReview = () => {
    if (!s.session().loggedIn) {
      navigate('/connexion', { state: { next: `/boutique-publique/${encodeURIComponent(name)}?onglet=avis` } });
      return;
    }
    if (!comment.trim()) return;
    s.addReview({ seller: name, rating, comment });
    setComment('');
    setRating(5);
    showToast('Merci, votre avis a été publié.');
  };

  return (
    <div className="app">
      <Header back title={name} sub={place} />
      <div className="body" style={{ gap: 14 }}>
        <div className="card pad col" style={{ gap: 12 }}>
          <div className="row" style={{ gap: 12 }}>
            {isFermeKone ? (
              <Photo w={52} h={52} radius={26} src="images/ferme-kone-logo.jpg" />
            ) : (
              <span className="av" style={{ width: 52, height: 52, fontSize: 18 }}>
                {name.split(/\s+/).filter((w) => /^\p{L}/u.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
              </span>
            )}
            <div className="col grow" style={{ minWidth: 0, gap: 4 }}>
              <span className="b">{name}</span>
              <div className="wrap" style={{ gap: 6 }}>
                {verified ? <Badge tone="green">Vendeur vérifié</Badge> : <Badge>Non vérifié</Badge>}
                <span className="xs muted">{place}</span>
              </div>
            </div>
          </div>
          <div className="grid3" style={{ gap: 8 }}>
            <div className="col"><span className="xs muted">Annonces</span><span className="b num">{listings.length}</span></div>
            <div className="col"><span className="xs muted">Note</span><span className="b num">{avg}{avg !== '–' ? ' / 5' : ''}</span></div>
            <div className="col"><span className="xs muted">Avis</span><span className="b num">{reviews.length}</span></div>
          </div>
          <button className="btn btn-p btn-block" onClick={contact}><Icon name="chat" />Contacter dans SAVAA</button>
        </div>

        <div className="utabs" role="tablist" style={{ margin: '0 -16px' }}>
          <button role="tab" aria-selected={tab === 'ads'} className={tab === 'ads' ? 'on' : ''} onClick={() => setTab('ads')}>Annonces ({listings.length})</button>
          <button role="tab" aria-selected={tab === 'avis'} className={tab === 'avis' ? 'on' : ''} onClick={() => setTab('avis')}>Avis ({reviews.length})</button>
        </div>

        {tab === 'ads' ? (
          listings.length ? (
            <div className="grid2">{listings.map((item) => <GridCard key={item.id} l={item} />)}</div>
          ) : (
            <div className="card pad"><span className="small muted">Aucune annonce en ligne actuellement.</span></div>
          )
        ) : (
          <div className="col" style={{ gap: 12 }}>
            <div className="card pad col" style={{ gap: 10 }}>
              <span className="small b">Laisser un avis sur {name}</span>
              <div className="row" style={{ gap: 6 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`chip${rating === n ? ' on' : ''}`}
                    onClick={() => setRating(n)}
                  >
                    {n} ★
                  </button>
                ))}
              </div>
              <textarea
                className="input"
                style={{ minHeight: 72 }}
                placeholder="Qualité du produit, respect des délais, communication…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <button className="btn btn-p btn-sm" disabled={!comment.trim()} onClick={submitReview}>Publier l’avis</button>
            </div>
            {reviews.length === 0 ? (
              <div className="card pad"><span className="small muted">Aucun avis pour l’instant.</span></div>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="card pad col" style={{ gap: 4 }}>
                  <div className="row between">
                    <span className="small b">{r.author}</span>
                    <span className="small b num" style={{ color: '#145C3A' }}>{r.rating} / 5</span>
                  </div>
                  <span className="small muted">{r.comment}</span>
                  <span className="xs muted">{r.verified ? 'Achat vérifié, ' : ''}{r.date}</span>
                  {r.reply && (
                    <div style={{ marginTop: 4, padding: '8px 10px', borderRadius: 8, background: '#F3F9F4', borderLeft: '3px solid #145C3A' }}>
                      <span className="xs b" style={{ color: '#145C3A', display: 'block' }}>Réponse de {name}{r.replyDate ? `, ${r.replyDate}` : ''}</span>
                      <span className="xs muted">{r.reply}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <TabBar />
    </div>
  );
}
