import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore, type Species } from '../data';
import { simulate } from '../toast';
import { Badge, Foot, Header, Icon, Photo, SectionHead, TabBar } from '../ui';

/* Écran 08 : tableau de bord de l'exploitation. */
export function Dashboard() {
  const s = useStore();
  return (
    <div className="app">
      <header className="hdr" style={{ paddingLeft: 16 }}>
        <div className="col grow" style={{ gap: 1 }}>
          <span className="xs muted">Mon exploitation</span>
          <span className="b ell" style={{ fontSize: 17 }}>Ferme Koné &amp; Fils</span>
        </div>
        <Link className="iconbtn" to="/notifications" aria-label="Notifications, 4 non lues">
          <Icon name="bell" />
          <span className="dot">4</span>
        </Link>
      </header>
      <div className="body">
        <span className="sync"><i></i>Synchronisé il y a 12 min, hors connexion disponible</span>

        <div className="card grid3" style={{ gap: 0 }}>
          <Link to="/cheptel" className="stat" style={{ padding: 14, borderRight: '1px solid #E3E7E4' }}><span className="v">{s.count('bovin')}</span><span className="l">Bovins</span></Link>
          <Link to="/cheptel" className="stat" style={{ padding: 14, borderRight: '1px solid #E3E7E4' }}><span className="v">{s.count('ovin')}</span><span className="l">Ovins</span></Link>
          <Link to="/cheptel" className="stat" style={{ padding: 14 }}><span className="v">{s.count('caprin')}</span><span className="l">Caprins</span></Link>
        </div>

        <div className="sec">
          <div className="sech"><h2>Alertes ouvertes</h2><Badge tone="red">2</Badge></div>
          <div className="card list">
            <Link className="li" to="/animal/FK-0119/sante" style={{ alignItems: 'flex-start' }}>
              <Icon name="alert" style={{ color: '#B42318', marginTop: 2 }} />
              <div className="col grow" style={{ gap: 2 }}><span className="b small ell">FK-0119, Brebis Djallonké</span><span className="xs muted">Boiterie antérieure gauche, signalée ce matin par A. Koné</span></div>
              <Badge tone="amber">Moyenne</Badge>
            </Link>
            <Link className="li" to="/cheptel" style={{ alignItems: 'flex-start' }}>
              <Icon name="calendar" style={{ color: '#F28C28', marginTop: 2 }} />
              <div className="col grow" style={{ gap: 2 }}><span className="b small ell">Rappel vaccinal PPR, 9 ovins</span><span className="xs muted">Échéance le 22/11/2026</span></div>
              <Badge>4 j</Badge>
            </Link>
          </div>
        </div>

        <div className="sec">
          <SectionHead title="Actions rapides" />
          <div className="grid4">
            <Link className="tile" to="/cheptel/ajout"><Icon name="sell" size="lg" />Animal</Link>
            <Link className="tile" to="/animal/FK-0142/observation"><Icon name="pulse" size="lg" />Observation</Link>
            <Link className="tile" to="/animal/FK-0142/sante"><Icon name="scale" size="lg" />Pesée</Link>
            <Link className="tile" to="/vendre"><Icon name="megaphone" size="lg" />Vendre</Link>
          </div>
        </div>

        <div className="sec">
          <SectionHead title="Échéances" link="Calendrier" onClick={() => simulate('Calendrier des échéances')} />
          <div className="card list">
            {[
              ['20', 'nov.', 'Pesée mensuelle, 18 bovins', 'Parc 2'],
              ['22', 'nov.', 'Vaccination PPR, 9 ovins', 'Dr Y. Coulibaly, à confirmer'],
              ['03', 'déc.', 'Mise bas prévue, FK-0087', 'Vache N’Dama, gestation documentée'],
            ].map(([d, m, t, x]) => (
              <div className="li" key={t}>
                <span className="col" style={{ width: 40, alignItems: 'center', gap: 0 }}><span className="b num" style={{ fontSize: 17 }}>{d}</span><span className="xs muted">{m}</span></span>
                <div className="col grow"><span className="small b ell">{t}</span><span className="xs muted ell">{x}</span></div>
              </div>
            ))}
          </div>
        </div>

        <div className="sec">
          <SectionHead title="Ventes" link="Ma boutique" to="/boutique" />
          <div className="grid2">
            <div className="card pad stat"><span className="v">3</span><span className="l">Annonces en ligne</span></div>
            <div className="card pad stat"><span className="v">1</span><span className="l">Commande à préparer</span></div>
          </div>
        </div>
      </div>
      <TabBar />
    </div>
  );
}

/* Écran 09 : cheptel filtrable. */
export function Herd() {
  const s = useStore();
  const [filter, setFilter] = useState<Species | 'all'>('all');
  const [q, setQ] = useState('');
  const rows = s
    .animals()
    .filter((a) => filter === 'all' || a.species === filter)
    .filter((a) => !q || (a.id + a.name).toLowerCase().includes(q.toLowerCase()));
  const chips: [Species | 'all', string, number][] = [
    ['all', 'Tous', s.total()],
    ['bovin', 'Bovins', s.count('bovin')],
    ['ovin', 'Ovins', s.count('ovin')],
    ['caprin', 'Caprins', s.count('caprin')],
  ];
  return (
    <div className="app">
      <Header back title={`Cheptel (${s.total()})`} actions={<Link className="iconbtn" to="/cheptel/ajout" aria-label="Ajouter un animal"><Icon name="plus" /></Link>} />
      <div style={{ background: '#fff', borderBottom: '1px solid #E3E7E4', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, flex: 'none' }}>
        <label className="search">
          <Icon name="search" />
          <input className="plain grow" placeholder="N° interne, identifiant officiel, nom" value={q} onChange={(e) => setQ(e.target.value)} style={{ outline: 'none' }} />
        </label>
        <div className="chips">
          {chips.map(([id, t, n]) => (
            <button key={id} className={`chip${filter === id ? ' on' : ''}`} onClick={() => setFilter(id)}>{t} <span className="n">{n}</span></button>
          ))}
        </div>
      </div>
      <div className="body" style={{ padding: '12px 16px', gap: 8 }}>
        <span className="xs muted">{rows.length} affichés, tri par n° interne</span>
        {rows.length === 0 ? (
          <div className="card pad small muted" style={{ textAlign: 'center' }}>Aucun animal ne correspond.</div>
        ) : (
          <div className="card list">
            {rows.map((a) => (
              <Link className="li" key={a.id} to={a.status === 'Alerte' ? `/animal/${a.id}/sante` : `/animal/${a.id}`}>
                <Photo w={48} h={48} radius={6} />
                <div className="col grow" style={{ gap: 2 }}>
                  <span className="row" style={{ gap: 6, minWidth: 0 }}><span className="b small num" style={{ whiteSpace: 'nowrap', flex: 'none' }}>{a.id}</span><span className="small ell">{a.name}</span></span>
                  <span className="xs muted ell">{a.details}</span>
                </div>
                <Badge tone={a.tone}>{a.status}</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Foot><Link className="btn btn-p" to="/cheptel/ajout">Ajouter un animal</Link></Foot>
    </div>
  );
}

/* Écran 09b : identification d'un nouvel animal. */
export function AddAnimal() {
  const s = useStore();
  const navigate = useNavigate();
  const [species, setSpecies] = useState<Species>('bovin');
  const [sex, setSex] = useState('Femelle');
  const [f, setF] = useState({ officialId: '', breed: 'N’Dama', birth: '14/08/2026', coat: 'Fauve', marks: 'Tache blanche sur le front, encoche oreille droite.', entry: '14/08/2026, née sur place', mother: 'FK-0087', father: '' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  /* Prochain n° interne : le plus grand FK-xxxx du cheptel + 1 (FK-0151 dans la maquette). */
  const id = `FK-${String(Math.max(...s.animals().map((a) => Number(a.id.slice(3)) || 0)) + 1).padStart(4, '0')}`;

  const save = () => {
    const label = { bovin: 'Bovin', ovin: 'Ovin', caprin: 'Caprin' }[species];
    s.addAnimal({
      id,
      species,
      name: `${label} ${f.breed}`,
      details: `${sex}, ${sex === 'Mâle' ? 'né' : 'née'} le ${f.birth}`,
      status: f.officialId ? 'ID à vérifier' : 'ID manquant',
      tone: f.officialId ? 'amber' : 'grey',
      officialId: f.officialId || undefined,
    });
    navigate(`/animal/${id}`, { replace: true });
  };

  return (
    <div className="app">
      <Header close title="Nouvel animal" actions={<span className="small muted" style={{ paddingRight: 12 }}>Brouillon local</span>} />
      <div className="body" style={{ gap: 20 }}>
        <div className="field">
          <span className="lbl">Espèce</span>
          <div className="seg">
            {(['bovin', 'ovin', 'caprin'] as Species[]).map((sp) => (
              <button key={sp} className={species === sp ? 'on' : ''} onClick={() => setSpecies(sp)}>{{ bovin: 'Bovin', ovin: 'Ovin', caprin: 'Caprin' }[sp]}</button>
            ))}
          </div>
        </div>

        <div className="sec" style={{ gap: 12 }}>
          <span className="eyebrow">Identification</span>
          <div className="field">
            <label htmlFor="oid">Identifiant officiel</label>
            <input id="oid" className="input" placeholder="Ex. CI-BOV-2026-000000" value={f.officialId} onChange={set('officialId')} />
            <span className="hint">Numéro de la boucle officielle, s’il existe. Il sera contrôlé par un agent.</span>
          </div>
          <div className="grid2">
            <div className="field"><label>N° interne</label><div className="input num" style={{ background: '#EEF0EE' }} title="Attribué automatiquement">{id}</div></div>
            <div className="field"><label htmlFor="breed">Race / type</label><input id="breed" className="input" value={f.breed} onChange={set('breed')} /></div>
          </div>
          <div className="field">
            <span className="lbl">Sexe</span>
            <div className="seg">
              {['Femelle', 'Mâle'].map((x) => <button key={x} className={sex === x ? 'on' : ''} onClick={() => setSex(x)}>{x}</button>)}
            </div>
          </div>
          <div className="grid2">
            <div className="field"><label htmlFor="birth">Naissance</label><input id="birth" className="input num" value={f.birth} onChange={set('birth')} /><span className="hint">ou âge estimé</span></div>
            <div className="field"><label htmlFor="coat">Robe</label><input id="coat" className="input" value={f.coat} onChange={set('coat')} /></div>
          </div>
          <div className="field"><label htmlFor="marks">Signes distinctifs</label><textarea id="marks" className="input" value={f.marks} onChange={set('marks')} /></div>
        </div>

        <div className="sec" style={{ gap: 12 }}>
          <span className="eyebrow">Photos et justificatifs</span>
          <div className="grid3">
            <Photo label="Profil gauche" h={96} radius={8} />
            <Photo label="Boucle" h={96} radius={8} />
            <button className="addph" style={{ height: 96, cursor: 'pointer' }} onClick={() => simulate('Prise de photo')}><Icon name="camera" />Ajouter</button>
          </div>
          <button className="row card pad plain" style={{ width: '100%' }} onClick={() => simulate('Ajout de justificatif')}>
            <Icon name="file" />
            <span className="col grow"><span className="small b">Joindre un document</span><span className="xs muted">Certificat, carnet de vaccination, facture d’achat</span></span>
          </button>
        </div>

        <div className="sec" style={{ gap: 12 }}>
          <span className="eyebrow">Origine et ascendance</span>
          <div className="field"><label htmlFor="entry">Date d’entrée sur l’exploitation</label><input id="entry" className="input num" value={f.entry} onChange={set('entry')} /></div>
          <div className="grid2">
            <div className="field"><label htmlFor="mother">Mère</label><input id="mother" className="input num" value={f.mother} onChange={set('mother')} /></div>
            <div className="field"><label htmlFor="father">Père</label><input id="father" className="input" placeholder="Inconnu" value={f.father} onChange={set('father')} /></div>
          </div>
        </div>
      </div>
      <Foot>
        <button className="btn btn-s" style={{ flex: '0 0 auto' }} onClick={() => navigate(-1)}>Annuler</button>
        <button className="btn btn-p" onClick={save}>Enregistrer la fiche</button>
      </Foot>
    </div>
  );
}
