import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { fcfa, useStore } from '../data';
import { simulate } from '../toast';
import { Badge, Foot, Header, Icon, Photo } from '../ui';

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
  const qtyBtn = { width: 36, height: 36 };
  return (
    <div className="app">
      <Header back title="Panier, 2 vendeurs" />
      <Steps n={1} />
      <div className="body">
        <div className="card">
          <div className="row between" style={{ padding: '10px 14px', borderBottom: '1px solid #EDF0EE' }}><span className="small b">Ferme Koné &amp; Fils</span><Badge tone="green">Vérifié</Badge></div>
          <div className="row top" style={{ padding: '12px 14px', gap: 12 }}>
            <Photo w={64} h={64} radius={6} />
            <div className="col grow" style={{ gap: 3 }}><span className="small b">Taurillon Zébu Goudali</span><span className="xs muted">FK-0142, 1 animal</span><span className="price">650 000 FCFA</span></div>
          </div>
        </div>
        <div className="card">
          <div className="row between" style={{ padding: '10px 14px', borderBottom: '1px solid #EDF0EE' }}><span className="small b">Provenderie du Nord</span><Badge tone="green">Vérifié</Badge></div>
          <div className="row top" style={{ padding: '12px 14px', gap: 12 }}>
            <Photo w={64} h={64} radius={6} tint="w" />
            <div className="col grow" style={{ gap: 6 }}>
              <span className="small b">Aliment bétail engraissement, sac de 50 kg</span>
              <div className="row between" style={{ flexWrap: 'wrap', gap: 8 }}>
                <span className="price">{fcfa(t.feed)} FCFA</span>
                <div className="row" style={{ gap: 0, border: '1px solid #C5CDC7', borderRadius: 8 }}>
                  <button className="iconbtn" style={qtyBtn} aria-label="Retirer un sac" onClick={() => s.setCart({ bags: Math.max(1, c.bags - 1) })}>−</button>
                  <span className="b num" style={{ width: 28, textAlign: 'center' }}>{c.bags}</span>
                  <button className="iconbtn" style={qtyBtn} aria-label="Ajouter un sac" onClick={() => s.setCart({ bags: Math.min(86, c.bags + 1) })}>+</button>
                </div>
              </div>
              <span className="xs muted num">14 500 FCFA le sac, stock 86</span>
            </div>
          </div>
        </div>

        <div className="sec">
          <div className="sech"><h2>Réception</h2></div>
          <div className="seg">
            <button className={c.delivery ? 'on' : ''} onClick={() => s.setCart({ delivery: true })}>Livraison</button>
            <button className={!c.delivery ? 'on' : ''} onClick={() => s.setCart({ delivery: false })}>Retrait sur place</button>
          </div>
          {c.delivery ? (
            <>
              <div className="card list">
                <div className="li" style={{ alignItems: 'flex-start' }}><Icon name="pin" /><div className="col grow"><span className="small b">Ferme Ouattara, route de Dikodougou</span><span className="xs muted">Korhogo, Fatou Ouattara, 05 •• •• 21 48</span></div><span className="link">Modifier</span></div>
                <div className="li" style={{ alignItems: 'flex-start' }}><Icon name="calendar" /><div className="col grow"><span className="small b">Jeudi 20 novembre, 7 h – 11 h</span><span className="xs muted">Créneau proposé par le transporteur</span></div><span className="link">Changer</span></div>
              </div>
              <span className="hint">Transport en bétaillère par un transporteur partenaire.</span>
            </>
          ) : (
            <div className="card pad col" style={{ gap: 4 }}><span className="small b">Retrait chez chaque vendeur</span><span className="xs muted">Sinématiali (taurillon) et Korhogo, zone industrielle (aliment). Code de retrait envoyé après paiement.</span></div>
          )}
        </div>

        <div className="card pad col" style={{ gap: 8 }}>
          <div className="sum"><span className="muted">Articles</span><span className="num">{fcfa(t.items)} FCFA</span></div>
          <div className="sum"><span className="muted">Livraison</span><span className="num">{t.shipping ? `${fcfa(t.shipping)} FCFA` : 'Gratuit'}</span></div>
          <div className="sum"><span className="muted">Frais de paiement</span><span>selon le moyen</span></div>
          <div className="sum t"><span>Total estimé</span><span className="num">{fcfa(t.total)} FCFA</span></div>
        </div>
      </div>
      <Foot><Link className="btn btn-p" to="/paiement">Choisir le paiement</Link></Foot>
    </div>
  );
}

const MOMO = [
  ['Orange Money', 'OM', 'Validation par code secret'],
  ['MTN MoMo', 'MTN', 'Validation par code secret'],
  ['Moov Money', 'MV', 'Validation par code secret'],
  ['Wave', 'WV', 'Validation dans l’application'],
];
const OTHER = [
  ['Carte bancaire', 'CB', 'Visa, Mastercard, authentification 3-D Secure'],
  ['Virement bancaire', 'VIR', 'Achats professionnels, 24 à 72 h'],
];

/* Écran 18 : paiement simulé (choix, attente, échec). */
export function Payment() {
  const s = useStore();
  const navigate = useNavigate();
  const c = s.cart();
  const total = fcfa(s.cartTotals().total);
  const [step, setStep] = useState<'choose' | 'pending' | 'failed'>('choose');
  const isMomo = MOMO.some((m) => m[0] === c.method);

  const methodRow = ([name, code, sub]: string[]) => (
    <button key={name} className="li" onClick={() => s.setCart({ method: name })} style={{ background: c.method === name ? '#E8F3EA' : '#fff' }}>
      <span className="mono">{code}</span>
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
            {isMomo && (
              <div className="field">
                <label htmlFor="tel">Numéro à débiter</label>
                <input id="tel" className="input num" defaultValue="+225 07 48 12 33 90" />
                <span className="hint">Vous validerez le paiement avec votre code secret sur votre téléphone. SAVAA ne le voit jamais.</span>
              </div>
            )}
            <div className="sec" style={{ gap: 8 }}>
              <span className="eyebrow">Autres moyens</span>
              <div className="card list">
                {OTHER.map(methodRow)}
                <div className="li" style={{ opacity: 0.55 }}><span className="mono">LIV</span><span className="col grow"><span className="small b">Paiement à la livraison</span><span className="xs muted">Indisponible pour les animaux vivants</span></span></div>
                <div className="li" style={{ opacity: 0.55 }}><span className="mono">SAV</span><span className="col grow"><span className="small b">Solde SAVAA</span><span className="xs muted">Fonction future, soumise à agrément</span></span><Badge>Bientôt</Badge></div>
              </div>
            </div>
            <p className="xs muted">Paiement opéré par un prestataire agréé. SAVAA ne conserve aucune donnée de carte.</p>
          </div>
          <Foot><button className="btn btn-p" onClick={() => setStep('pending')}>Payer {total} FCFA</button></Foot>
        </>
      )}
      {step === 'pending' && (
        <div className="body" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 14, padding: 28 }}>
          <div style={{ width: 64, height: 64, borderRadius: 32, border: '4px solid #E3E7E4', borderTopColor: '#145C3A' }} />
          <h2 style={{ fontSize: 20, fontWeight: 600 }}>Validez sur votre téléphone</h2>
          <p className="small muted" style={{ lineHeight: 1.5 }}>Une demande de {total} FCFA a été envoyée via {c.method}. Composez votre code secret pour confirmer.</p>
          <div className="card pad" style={{ width: '100%', textAlign: 'left' }}>
            <dl className="kv"><dt>Transaction</dt><dd className="num">TX-7Q4K-21983</dd><dt>Statut</dt><dd><Badge tone="blue">Initié</Badge></dd><dt>Expire dans</dt><dd className="num">4 min 32 s</dd></dl>
          </div>
          <div className="col" style={{ width: '100%', gap: 8, marginTop: 6 }}>
            <span className="eyebrow">Démonstration : choisir la réponse du prestataire</span>
            <button className="btn btn-p btn-block" onClick={() => navigate('/recu', { replace: true })}>Confirmé</button>
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
            <dl className="kv"><dt>Transaction</dt><dd className="num">TX-7Q4K-21983</dd><dt>Statut</dt><dd><Badge tone="red">Échoué</Badge></dd><dt>Commande</dt><dd>Conservée 24 h</dd></dl>
          </div>
          <button className="btn btn-p btn-block" onClick={() => setStep('choose')}>Réessayer ou changer de moyen</button>
          <Link className="btn btn-ghost btn-block" to="/assistance">Contacter l’assistance</Link>
        </div>
      )}
    </div>
  );
}

/* Écran 19 : confirmation et reçu. */
export function Receipt() {
  const s = useStore();
  const c = s.cart();
  const t = s.cartTotals();
  const navigate = useNavigate();
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
          <p className="small muted">Statut transmis par le prestataire le 18/11/2026 à 09:42</p>
        </div>
        <div className="card">
          <div className="col" style={{ padding: 14, borderBottom: '1px dashed #C5CDC7' }}><span className="xs muted">Référence commande</span><span className="b num" style={{ fontSize: 17 }}>SAV-2026-11-004812</span></div>
          <div className="pad">
            <dl className="kv">
              <dt>Transaction</dt><dd className="num">TX-7Q4K-21983</dd>
              <dt>Moyen</dt><dd>{MOMO.some((m) => m[0] === c.method) ? `${c.method}, 07 •• •• 33 90` : c.method}</dd>
              <dt>Statut</dt><dd><Badge tone="green">Confirmé</Badge></dd>
              <dt>Date</dt><dd className="num">18/11/2026, 09:42</dd>
            </dl>
          </div>
        </div>
        <div className="card pad col" style={{ gap: 8 }}>
          <span className="eyebrow" style={{ marginBottom: 2 }}>Détail par vendeur</span>
          <div className="sum"><span>Ferme Koné &amp; Fils, taurillon</span><span className="num">650 000</span></div>
          <div className="sum"><span>Provenderie du Nord, {c.bags} sacs</span><span className="num">{fcfa(t.feed)}</span></div>
          {t.shipping > 0 && <div className="sum"><span>Livraison, Transports Ouattara</span><span className="num">{fcfa(t.shipping)}</span></div>}
          <div className="sum"><span className="muted">Frais de transaction</span><span className="num muted">0</span></div>
          <div className="sum t"><span>Total payé</span><span className="num">{fcfa(t.total)} FCFA</span></div>
        </div>
        <button className="btn btn-s btn-block" onClick={() => simulate('Téléchargement du reçu PDF')}><Icon name="download" />Télécharger le reçu (PDF)</button>
      </div>
      <Foot><Link className="btn btn-p" to="/commande">Suivre la commande</Link></Foot>
    </div>
  );
}

/* Écran 20 : suivi de commande. */
export function Tracking() {
  const { bags } = useStore().cart();
  return (
    <div className="app">
      <Header back title="Suivi de commande" sub="SAV-2026-11-004812" />
      <div className="body">
        <div className="card pad col" style={{ gap: 6 }}>
          <div className="row between"><Badge tone="blue">En route</Badge><span className="small muted">Arrivée estimée 10:30</span></div>
          <span className="b" style={{ fontSize: 16 }}>{bags ? `Taurillon FK-0142 + ${bags} sac${bags > 1 ? 's' : ''} d’aliment` : 'Taurillon FK-0142'}</span>
          <span className="small muted">Livraison à Ferme Ouattara, route de Dikodougou</span>
        </div>
        <div className="card pad">
          <div className="tl">
            {[
              ['tld f', 'Paiement confirmé', '18/11, 09:42, Orange Money'],
              ['tld f', 'Préparée par les vendeurs', '18/11, 10:05, laissez-passer joint'],
              ['tld f', 'Prise en charge par le transporteur', '20/11, 07:20, Sinématiali'],
              ['tld a', 'En route', 'Dernière position partagée il y a 6 min'],
              ['tld o', 'Livrée et remise confirmée', ''],
            ].map(([dot, t, d]) => (
              <div className="tli" key={t}>
                <span className={dot} />
                <div className="col"><span className={dot === 'tld o' ? 'small muted' : 'b small'}>{t}</span>{d && <span className="xs muted num">{d}</span>}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card pad row">
          <span className="av" style={{ background: '#EEF0EE', color: '#3E4943' }}>TO</span>
          <div className="col grow"><span className="b small">Transports Ouattara</span><span className="xs muted">Bétaillère AB 4512 CI, Issa O.</span></div>
          <button className="iconbtn" aria-label="Appeler le transporteur" style={{ border: '1px solid #C5CDC7' }} onClick={() => simulate('Appel du transporteur, numéro masqué')}><Icon name="phone" /></button>
        </div>
        <div className="card pad col" style={{ gap: 10 }}>
          <span className="b small">Code de remise</span>
          <div className="otp num" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}><div>4</div><div>8</div><div>2</div><div>7</div></div>
          <span className="xs muted" style={{ lineHeight: 1.45 }}>Donnez ce code au livreur uniquement après avoir vérifié l’animal et les sacs. La remise est alors horodatée.</span>
        </div>
      </div>
      <Foot><Link className="btn btn-danger" to="/assistance?onglet=reclamation">Signaler un problème</Link></Foot>
    </div>
  );
}

const TABS = [['aide', 'Centre d’aide'], ['assistant', 'Assistant'], ['reclamation', 'Réclamation']] as const;

/* Écran 21 : assistance (aide, assistant, réclamation). */
export function Support() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('onglet') ?? 'aide';
  const [sent, setSent] = useState(false);
  const [urgent, setUrgent] = useState(true);
  const [draft, setDraft] = useState('');
  const [chat, setChat] = useState<string[]>([]);
  const send = () => {
    if (!draft.trim()) return;
    setChat((c) => [...c, draft.trim()]);
    setDraft('');
  };

  return (
    <div className="app">
      <Header back title="Assistance" />
      <div className="utabs">
        {TABS.map(([id, t]) => <button key={id} className={tab === id ? 'on' : ''} onClick={() => setParams({ onglet: id }, { replace: true })}>{t}</button>)}
      </div>

      {tab === 'aide' && (
        <div className="body">
          <label className="search"><Icon name="search" /><input className="plain grow" placeholder="Décrivez votre question" style={{ outline: 'none' }} /></label>
          <div className="grid2" style={{ gap: 8 }}>
            {['Compte', 'Publier une annonce', 'Paiement', 'Commande et livraison', 'Traçabilité', 'Santé animale', 'Sécurité et fraude', 'Réclamation'].map((c) => <span key={c} className="card pad small b">{c}</span>)}
          </div>
          <div className="sec">
            <div className="sech"><h2>Questions fréquentes</h2></div>
            <div className="card list">
              {['Mon paiement est débité mais la commande indique « échoué »', 'Que signifie « identifiant à vérifier » sur une fiche ?', 'Comment me faire aider pour publier ma première annonce ?'].map((q) => (
                <div className="li" key={q}><span className="grow small">{q}</span><Icon name="chevron" size="sm" /></div>
              ))}
            </div>
          </div>
          <div className="card pad col" style={{ gap: 10 }}>
            <span className="b small">Contacter l’équipe</span>
            <div className="row small"><Icon name="chat" size="sm" /><span className="grow">Messagerie SAVAA</span><span className="muted">réponse sous 4 h ouvrées</span></div>
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
              <div className="bubble bot">Bonjour Fatou. Votre commande SAV-2026-11-004812 est en route. Que puis-je faire pour vous ?</div>
              <div className="bubble me">Le livreur aura du retard ?</div>
              <div className="bubble bot">Le transporteur indique une arrivée vers 10 h 30, soit 30 min après le créneau. Vous pouvez l’appeler depuis le suivi, ou signaler un retard si le délai dépasse 2 h.</div>
              <div className="bubble me">Le taurillon boite légèrement à la descente.</div>
              <div className="bubble bot">Ne donnez pas encore le code de remise. Je vous mets en relation avec un conseiller pour ouvrir une réclamation. Pour l’état de l’animal, contactez un vétérinaire.</div>
              {chat.map((m, i) => (
                <div key={i} className="col" style={{ gap: 8 }}>
                  <div className="bubble me">{m}</div>
                  <div className="bubble bot" ref={i === chat.length - 1 ? (el) => el?.scrollIntoView({ block: 'end' }) : undefined}>Assistant simulé dans la démo. Pour une vraie réponse, parlez à un conseiller.</div>
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
              <select id="motif" className="input" defaultValue="liv"><option value="liv">Litige livraison, animal</option><option>Paiement</option><option>Annonce trompeuse</option><option>Faux vendeur</option></select>
            </div>
            <div className="field"><label htmlFor="cmd">Commande concernée</label>
              <select id="cmd" className="input num"><option>SAV-2026-11-004812</option></select>
            </div>
            <div className="field"><label htmlFor="desc">Description</label><textarea id="desc" className="input" defaultValue="Le taurillon boite de l’antérieur droit à la descente de la bétaillère. Je n’ai pas encore donné le code de remise." /></div>
            <div className="grid3"><Photo label="VID_0921" h={80} radius={8} /><button className="addph" style={{ height: 80 }} onClick={() => simulate('Ajout de photo ou vidéo')}>Ajouter</button></div>
            <div className="field"><span className="lbl">Priorité</span>
              <div className="seg"><button className={!urgent ? 'on' : ''} onClick={() => setUrgent(false)}>Normale</button><button className={urgent ? 'on' : ''} onClick={() => setUrgent(true)}>Urgente</button></div>
            </div>
            {sent && (
              <div className="notice n-info"><Icon name="check" size="sm" /><span><b>Ticket TK-1093 créé.</b> Attribué à Mariam (support). Première réponse attendue sous {urgent ? '1 h' : '4 h'}. Le paiement au vendeur reste en attente pendant l’examen.</span></div>
            )}
            <div className="sec">
              <span className="eyebrow">Mes tickets</span>
              <div className="card list">
                <div className="li"><div className="col grow"><span className="small b">TK-1071, annonce trompeuse signalée</span><span className="xs muted num">12/11, clos après vérification</span></div><Badge>Résolu</Badge></div>
              </div>
            </div>
          </div>
          <Foot><button className="btn btn-p" disabled={sent} onClick={() => setSent(true)}>{sent ? 'Réclamation envoyée' : 'Envoyer la réclamation'}</button></Foot>
        </>
      )}
    </div>
  );
}
