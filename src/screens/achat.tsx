import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CI_REGIONS, fcfa, proPriceOf, useStore, type Listing } from '../data';
import { LogoInline } from '../logo';
import { photoFor } from '../photos';
import { sheetOf, sheetStatus } from '../trace';
import { Badge, Foot, Icon, NotFound, Photo, SectionHead, TabBar, type Tone } from '../ui';

/* Annonce détaillée de la maquette (écran 06) : son contenu est repris tel quel. */
const DETAIL_ID = 'FK-0142';

/** Minuscules sans accents, pour la recherche. */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const matches = (l: Listing, q: string) => {
  const hay = fold(`${l.title} ${l.category} ${l.details} ${l.place} ${l.seller}`);
  return fold(q).split(/\s+/).filter(Boolean).every((w) => hay.includes(w.replace(/s$/, '')));
};
const hasSheet = (l: Listing) => !!l.animalIds?.length || (/fiche/i.test(l.trace[0]) && !/déclarée/i.test(l.trace[0]));

/** Carte d'annonce en grille (Explorer, Favoris) : photo en haut avec compteur multi-photos, deux cartes par ligne. */
function GridCard({ l }: { l: Listing }) {
  const count = l.photos?.length ?? 1;
  const price = useStore().priceFor(l);
  return (
    <Link className="pc" to={`/annonce/${l.id}`} style={{ minWidth: 0 }}>
      <div style={{ position: 'relative' }}>
        <Photo label={l.photo} tint={l.tint} src={l.photos?.[0]} h={112} />
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

function GridSkeleton() {
  return (
    <div className="pc" aria-hidden="true" style={{ minWidth: 0 }}>
      <div className="ph" style={{ height: 112, background: '#E9ECEA' }} />
      <div className="in" style={{ gap: 8 }}>
        <div style={{ height: 12, width: '85%', background: '#E9ECEA', borderRadius: 3 }} />
        <div style={{ height: 14, width: '55%', background: '#E9ECEA', borderRadius: 3 }} />
        <div style={{ height: 10, width: '70%', background: '#EEF0EE', borderRadius: 3 }} />
      </div>
    </div>
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
    <header className="hdr" style={{ gap: 2, paddingRight: 12 }}>
      <button className="iconbtn" aria-label="Retour" onClick={() => navigate(home)}><Icon name="back" /></button>
      <label className="search grow" style={{ height: 42 }}>
        <Icon name="search" />
        <input className="plain grow" type="search" value={q} onChange={(e) => onQ?.(e.target.value)} readOnly={!onQ} placeholder="Animal, récolte, aliment…" aria-label="Rechercher" style={{ outline: 'none', color: '#17201B' }} />
      </label>
    </header>
  );
}

/* Les vignettes « Près de vous », reliées à leurs annonces. */
const NEAR: [string, string, string, string, string, string, Tone, 'w' | 's' | undefined][] = [
  ['FK-0142', 'Taurillon Zébu Goudali', '650 000 FCFA', 'Sinématiali, 12 km', 'Photo, taurillon', 'Fiche vérifiée', 'green', undefined],
  ['ALIM-50', 'Aliment bétail 50 kg', '14 500 FCFA', 'Korhogo, 3 km', 'Photo, sacs d’aliment', 'Livraison', 'grey', 'w'],
  ['POUSSINS', 'Poussins chair, J1', '650 FCFA', 'Korhogo, par 100', 'Photo, poussins', 'Profil non vérifié', 'grey', 's'],
  ['IGNAME', 'Igname Kponan', '425 FCFA / kg', 'Dikodougou, 38 km', 'Photo, igname', 'Min. 200 kg', 'grey', 'w'],
  ['L-OEUFS', 'Œufs frais, plateau 30', '2 600 FCFA', 'Korhogo, Soba', 'Photo, œufs', 'Ponte du jour', 'green', 's'],
  ['L-CAJOU', 'Noix de cajou KOR 49', '420 FCFA / kg', 'Sinématiali, 12 km', 'Photo, cajou', 'KOR 49 vérifié', 'blue', 'w'],
  ['L-BOUC-REPRO', 'Bouc Djallonké', '75 000 FCFA', 'Boundiali, 98 km', 'Photo, bouc', 'Fiche vérifiée', 'green', undefined],
  ['L-COUVEUSE', 'Couveuse 528 œufs', '385 000 FCFA', 'Korhogo, centre', 'Photo, couveuse', 'Garantie 1 an', 'green', 's'],
];
const CATEGORY_SEARCH: Record<string, string> = { 'Ovins et caprins': 'ovins', 'Volailles et poussins': 'volailles', 'Aliments et intrants': 'aliment', Reproducteurs: 'reproducteur' };
const CATEGORIES = ['Bovins', 'Ovins et caprins', 'Volailles et poussins', 'Reproducteurs', 'Récoltes', 'Aliments et intrants', 'Matériel', 'Services'];

/** Bannière des annonces sponsorisées (acheteurs) : défile seule toutes les 4 s, ou au doigt. */
function SponsoredBanner({ items }: { items: Listing[] }) {
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
            style={{
              flex: '0 0 100%', scrollSnapAlign: 'start', height: 168, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 14, color: '#fff',
              backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.05) 30%, rgba(0,0,0,.72)), url(${l.photos?.[0] ?? photoFor(l.photo, l.tint)})`, backgroundSize: 'cover', backgroundPosition: 'center',
            }}
          >
            <Badge tone="sp" style={{ alignSelf: 'flex-start' }}>Sponsorisé</Badge>
            <div className="col" style={{ gap: 2 }}>
              <span className="b ell" style={{ fontSize: 17 }}>{l.title}</span>
              <span className="num" style={{ fontWeight: 700, fontSize: 16 }}>{fcfa(l.price)} FCFA{l.unit ? <span style={{ fontWeight: 400, fontSize: 13 }}> {l.unit}</span> : null}</span>
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
  const sponsored = s.listings().filter((l) => l.sponsored && l.status === 'online');
  const [cat, setCat] = useState<string | null>(null);
  const catQuery = cat ? CATEGORY_SEARCH[cat] ?? cat : '';
  const catalog = s.listings().filter((l) => l.status === 'online' && matches(l, catQuery));
  /* Sans commune connue (visiteur), on ne suppose aucune ville : SAVAA couvre tout le pays. */
  const activeTown = s.session().town || (s.shop().created ? s.shop().town : '');
  const activeRegion = CI_REGIONS.find((g) => g.towns.includes(activeTown))?.region.replace(/^District d[’']/, '').replace(/\s*\(.+\)/, '');
  const locationLabel = !activeTown ? 'Toute la Côte d’Ivoire' : !activeRegion || activeRegion === activeTown ? activeTown : `${activeTown}, ${activeRegion}`;

  return (
    <div className="app">
      <header className="hdr" style={{ padding: '10px 8px 10px 16px' }}>
        <div className="col grow" style={{ gap: 2 }}>
          <LogoInline tone="white" height={34} animated name={false} />
          <span className="row xs" style={{ gap: 4, color: '#CFE0D4' }}>
            <Icon name="pin" size="sm" />
            <span className="ell">{locationLabel}</span>
          </span>
        </div>
        <Link className="iconbtn" to="/notifications" aria-label={`Notifications, ${unread} non lue${unread > 1 ? 's' : ''}`}><Icon name="bell" />{unread > 0 && <span className="dot">{unread}</span>}</Link>
        <Link className="iconbtn" to="/panier" aria-label={`Panier, ${cartCount} article${cartCount > 1 ? 's' : ''}`}><Icon name="cart" />{cartCount > 0 && <span className="dot">{cartCount}</span>}</Link>
      </header>
      <div className="body flush">
        <div style={{ background: '#145C3A', padding: '4px 16px 16px' }}>
          <Link className="search" to="/explorer?q=" style={{ borderColor: '#fff' }}><Icon name="search" /><span>Animal, récolte, aliment, matériel…</span></Link>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Vendeurs : tuiles d'accès rapide. Acheteurs et visiteurs : bannière des annonces sponsorisées. */}
          {s.canSell() ? (
            <div className="grid4">
              <Link className="tile" to="/explorer"><Icon name="search" size="lg" />Explorer</Link>
              <Link className="tile" to="/vendre"><Icon name="sell" size="lg" />Vendre</Link>
              <Link className="tile" to="/commandes"><Icon name="truck" size="lg" />Commandes</Link>
              <Link className="tile" to="/assistance"><Icon name="chat" size="lg" />Aide</Link>
            </div>
          ) : (
            <SponsoredBanner items={sponsored} />
          )}

          <div className="sec">
            <SectionHead title="Catégories" />
            <div className="chips">
              {CATEGORIES.map((c) => (
                <button key={c} className={`chip${cat === c ? ' on' : ''}`} aria-pressed={cat === c} onClick={() => setCat(cat === c ? null : c)}>{c}</button>
              ))}
            </div>
          </div>

          {/* Catalogue juste sous les catégories : une catégorie touchée filtre la liste. */}
          <div className="sec">
            <SectionHead title={cat ? `Catalogue, ${cat.toLowerCase()}` : 'Catalogue'} link="Tout voir" to={`/explorer?q=${encodeURIComponent(catQuery)}`} />
            {catalog.length === 0 ? (
              <div className="card pad"><span className="small muted">Aucune annonce dans cette catégorie pour l’instant.</span></div>
            ) : (
              /* Même présentation que « Près de vous » : petites cartes qui défilent. */
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', margin: '0 -16px', padding: '0 16px 2px' }}>
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
                      <span className="price ell">{fcfa(l.price)} FCFA</span>
                      <span className="xs muted ell">{l.place}</span>
                      {l.sponsored ? <Badge tone="sp" style={{ alignSelf: 'flex-start' }}>Sponsorisé</Badge> : <Badge tone={l.trace[1]} style={{ alignSelf: 'flex-start' }}>{l.trace[0]}</Badge>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Les acheteurs ont déjà la bannière sponsorisée : « Mis en avant » reste pour les vendeurs. */}
          {s.canSell() && (
            <div className="sec">
              <SectionHead title="Mis en avant" link="Tout voir" to="/explorer?q=" />
              <Link className="pc" to="/annonce/L-BELIERS">
                <Photo label="Photo, béliers" h={170} />
                <div className="in" style={{ padding: 12, gap: 4 }}>
                  <div className="row between"><span className="b ell">Béliers Sahéliens, lot de 6</span><Badge tone="sp">Sponsorisé</Badge></div>
                  <span className="price">117 500 FCFA <span className="small muted" style={{ fontWeight: 400 }}>la tête</span></span>
                  <span className="xs muted ell">Ferkessédougou, Bergerie Soro</span>
                </div>
              </Link>
            </div>
          )}

          <div className="sec">
            <SectionHead title="Près de vous" link="Tout voir" to="/explorer?q=" />
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', margin: '0 -16px', padding: '0 16px 2px', scrollbarWidth: 'none' }}>
              {NEAR.map(([id, t, p, place, ph, b, tone, tint]) => (
                <Link key={id} className="pc" to={`/annonce/${id}`} style={{ flex: 'none', width: 152 }}>
                  <Photo label={ph} tint={tint} h={112} />
                  <div className="in">
                    <span className="small b ell">{t}</span>
                    <span className="price">{p}</span>
                    <span className="xs muted ell">{place}</span>
                    <Badge tone={tone} style={{ alignSelf: 'flex-start' }}>{b}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="sec">
            <SectionHead title="En images dans le Poro" link="Explorer" to="/explorer" />
            <div className="grid3" style={{ gap: 8 }}>
              {[
                ['L-REPRO-GOUD', '/images/taureau-reproducteur.jpg', 'Reproducteurs'],
                ['L-CHEVRES-SAH', '/images/chevres-saheliennes.jpg', 'Caprins'],
                ['L-BREBIS-LOT', '/images/troupeau-ovins.jpg', 'Ovins'],
                ['L-MAIS', '/images/mais-jaune.jpg', 'Céréales'],
                ['L-TOURTEAU', '/images/tourteau-coton.jpg', 'Provende'],
                ['L-VETO-SRV', '/images/visite-veterinaire.jpg', 'Suivi véto'],
              ].map(([id, img, lbl]) => (
                <Link key={id} to={`/annonce/${id}`} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', height: 88, display: 'flex', alignItems: 'flex-end', padding: 6, backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,.68)), url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                  <span className="xs b ell" style={{ color: '#fff' }}>{lbl}</span>
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

/* Écran 05 : résultats de recherche (chargement simulé à l'ouverture). Avec `favorites` (onglet Favoris, /favoris) : les annonces gardées avec le cœur. */
export function Catalog({ favorites = false }: { favorites?: boolean }) {
  const s = useStore();
  const [params, setParams] = useSearchParams();
  const favMode = favorites || params.get('favoris') === '1';
  /* Explorer s'ouvre sur toutes les annonces en ligne, sans recherche ni filtre imposés. */
  const q = params.get('q') ?? '';
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [delivery, setDelivery] = useState(false);
  const [trace, setTrace] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(t);
  }, []);

  const pool = favMode ? s.listings().filter((l) => s.isFavorite(l.id)) : s.listings().filter((l) => l.status === 'online' && matches(l, q));
  const items = pool.filter((l) => (!verified || l.sellerVerified) && (!delivery || l.delivery) && (!trace || hasSheet(l)));
  const active = [verified, delivery, trace].filter(Boolean).length;

  return (
    <div className="app">
      {favMode ? (
        <header className="hdr" style={{ paddingLeft: 16 }}>
          <h1>Mes favoris</h1>
        </header>
      ) : (
        <SearchHeader q={q} onQ={(v) => setParams({ q: v }, { replace: true })} />
      )}
      <div style={{ background: '#fff', borderBottom: '1px solid #E3E7E4', padding: '10px 16px', flex: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="chips">
          <span className="chip"><Icon name="filter" size="sm" />Filtres ({active})</span>
          {!favMode && <span className="chip on">{q.trim() ? q.trim()[0].toUpperCase() + q.trim().slice(1) : 'Tout'}</span>}
          <button className={`chip${verified ? ' on' : ''}`} onClick={() => setVerified(!verified)}>Vendeur vérifié</button>
          <button className={`chip${delivery ? ' on' : ''}`} onClick={() => setDelivery(!delivery)}>Livraison</button>
          <button className={`chip${trace ? ' on' : ''}`} onClick={() => setTrace(!trace)}>Avec fiche animale</button>
        </div>
        <div className="row between small"><span className="muted num">{loading ? '…' : items.length} résultat{items.length > 1 ? 's' : ''}{favMode ? ' en favoris' : ', partout en Côte d’Ivoire'}</span><span className="b">Tri : pertinence</span></div>
      </div>
      <div className="body" style={{ padding: '12px 16px', gap: 10 }}>
        {loading ? (
          <div className="grid2">{[1, 2, 3, 4].map((k) => <GridSkeleton key={k} />)}</div>
        ) : items.length ? (
          <div className="grid2">{items.map((l) => <GridCard key={l.id} l={l} />)}</div>
        ) : (
          <div className="card pad col" style={{ alignItems: 'center', textAlign: 'center', gap: 8, padding: '28px 20px' }}>
            <span className="b">{favMode && !pool.length ? 'Aucun favori pour l’instant' : 'Aucune annonce avec ces filtres'}</span>
            <span className="small muted">{favMode && !pool.length ? 'Touchez le cœur sur une annonce pour la garder ici.' : 'Élargissez la zone ou retirez un filtre.'}</span>
            {active > 0 && <button className="btn btn-s btn-sm" onClick={() => { setVerified(false); setDelivery(false); setTrace(false); }}>Réinitialiser les filtres</button>}
          </div>
        )}
        {!favMode && <Link to="/favoris" className="xs muted" style={{ textAlign: 'center', textDecoration: 'underline' }}>Mes favoris ({s.favorites().length})</Link>}
        {!favMode && <Link to="/explorer/hors-ligne" className="xs muted" style={{ textAlign: 'center', textDecoration: 'underline' }}>Voir l’état « pas de connexion »</Link>}
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

  const gallery = l.photos?.length ? l.photos : [photoFor(l.photo, l.tint)];
  const [photoIdx, setPhotoIdx] = useState(0);
  const currentPhoto = gallery[photoIdx] ?? gallery[0];
  const currentCaption = l.photoLabels?.[photoIdx] ?? (full && photoIdx === 0 ? 'Photo, taurillon de profil' : undefined);
  const similar = s
    .listings()
    .filter((x) => x.id !== l.id && x.status === 'online' && x.category.split(',')[0] === l.category.split(',')[0])
    .slice(0, 4);

  return (
    <div className="app">
      <div className="body flush">
        <div
          className="ph"
          style={{
            height: 270,
            alignItems: 'stretch',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 10,
            backgroundImage: `url(${currentPhoto})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="row between">
            <button className="iconbtn" aria-label="Retour" style={round} onClick={() => navigate(-1)}><Icon name="back" /></button>
            <button className="iconbtn" aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'} aria-pressed={fav} style={{ ...round, color: fav ? '#F28C28' : '#17201B' }} onClick={() => s.toggleFavorite(l.id)}>
              <Icon name="heart" style={{ fill: fav ? '#F28C28' : 'none' }} />
            </button>
          </div>
          {gallery.length > 1 && (
            <div className="row between" style={{ pointerEvents: 'auto' }}>
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

        <div style={{ background: '#fff', padding: 16, display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid #E3E7E4' }}>
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
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
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
            <div className="card pad col" style={{ gap: 12 }}>
              <div className="row">
                {full ? (
                  <Photo w={40} h={40} radius={20} src="/images/ferme-kone-logo.jpg" />
                ) : (
                  <span className="av">{l.seller.split(/\s+/).filter((w) => /^\p{L}/u.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}</span>
                )}
                <div className="col grow"><span className="b small">{l.seller}</span><span className="xs muted">{full ? 'Sur SAVAA depuis mars 2025, répond en 2 h environ' : l.place.split(',')[0]}</span></div>
              </div>
              {full ? (
                <div className="grid3" style={{ gap: 8 }}>
                  <div className="col" style={{ gap: 2 }}><span className="xs muted">Compte</span><Badge tone="green" style={{ alignSelf: 'flex-start' }}>Vérifié</Badge></div>
                  <div className="col" style={{ gap: 2 }}><span className="xs muted">Ventes</span><span className="small b num">41</span></div>
                  <div className="col" style={{ gap: 2 }}><span className="xs muted">Avis</span><span className="small b num">4,7 / 5 (23)</span></div>
                </div>
              ) : (
                <div className="col" style={{ gap: 2 }}><span className="xs muted">Compte</span>{l.sellerVerified ? <Badge tone="green" style={{ alignSelf: 'flex-start' }}>Vérifié</Badge> : <Badge style={{ alignSelf: 'flex-start' }}>Non vérifié</Badge>}</div>
              )}
            </div>
          </div>

          {(full || l.description) && (
            <div className="sec">
              <SectionHead title="Description" />
              <p className="small" style={{ lineHeight: 1.55 }}>{full ? 'Taurillon né sur l’exploitation, élevé au pâturage avec complément au tourteau de coton. Bon état général, calme à la manipulation. Visite possible sur rendez-vous à Sinématiali.' : l.description}</p>
            </div>
          )}

          {similar.length > 0 && (
            <div className="sec">
              <SectionHead title="Annonces similaires" link="Tout voir" to="/explorer" />
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', margin: '0 -16px', padding: '0 16px 2px' }}>
                {similar.map((item) => (
                  <Link key={item.id} className="pc" to={`/annonce/${item.id}`} style={{ flex: 'none', width: 146 }}>
                    <Photo label={item.photo} tint={item.tint} src={item.photos?.[0]} h={96} />
                    <div className="in">
                      <span className="small b ell">{item.title}</span>
                      <span className="price ell">{fcfa(item.price)} FCFA</span>
                      <span className="xs muted ell">{item.place.split(',')[0]}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {!l.mine && <Link className="row small" to="/assistance?onglet=reclamation" style={{ color: '#A0221A', gap: 6 }}><Icon name="flag" size="sm" />Signaler cette annonce</Link>}
        </div>
      </div>
      <Foot>
        {l.mine ? (
          <Link className="btn btn-p" to="/boutique">Voir ma boutique</Link>
        ) : (
          <>
            <Link className="btn btn-s" to="/assistance?onglet=assistant" style={{ flex: '0 0 auto' }}><Icon name="chat" />Contacter</Link>
            {buyable ? (
              <button className="btn btn-p" onClick={order}>{inCart ? 'Voir le panier' : 'Commander via SAVAA'}</button>
            ) : (
              <button className="btn btn-p" disabled>{status}</button>
            )}
          </>
        )}
      </Foot>
    </div>
  );
}
