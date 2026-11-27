import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { fcfa, useStore, type NetThread } from '../data';
import { readImage } from '../device';
import { ReliefIcon } from '../relief';
import { showToast } from '../toast';
import { Badge, Header, Icon, NotFound, Photo, PreviewModal, TabBar } from '../ui';

const KIND_LABEL: Record<NetThread['kind'], string> = {
  listing: 'Annonce',
  order: 'Commande',
  delivery: 'Livraison',
};

const QUICK_LISTING = [
  'Bonjour, est-ce toujours disponible ?',
  'Peut-on voir le produit avant l’achat ?',
  'Livrez-vous dans ma commune ?',
];

const QUICK_DELIVERY = [
  'Bonjour, à quelle heure arrivez-vous ?',
  'Je suis disponible pour la remise.',
  'Merci pour la confirmation.',
];

function otherOf(t: NetThread, myPhone: string) {
  return t.participants.find((p) => p.phone !== myPhone) ?? t.participants[0];
}

function initials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'SA';
}

/* Liste des conversations internes SAVAA (/messages). */
export function Messages() {
  const s = useStore();
  const [filter, setFilter] = useState<'all' | 'listing' | 'order' | 'unread'>('all');
  const [q, setQ] = useState('');
  const sess = s.session();
  const myPhone = sess.demo ? '07 48 12 33 90' : sess.phone;
  const all = s.threads();
  const unread = s.unreadMessages();

  const shown = all.filter((t) => {
    const isUnread = t.messages.length > 0 && !t.readBy.includes(myPhone);
    if (filter === 'unread' && !isUnread) return false;
    if (filter === 'listing' && t.kind !== 'listing') return false;
    if (filter === 'order' && t.kind === 'listing') return false;
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      const other = otherOf(t, myPhone)?.name ?? '';
      const last = t.messages[t.messages.length - 1]?.text ?? '';
      return `${other} ${t.subject} ${last}`.toLowerCase().includes(needle);
    }
    return true;
  });

  return (
    <div className="app">
      <Header
        back
        title="Messages"
        sub={unread > 0 ? `${unread} conversation${unread > 1 ? 's' : ''} non lue${unread > 1 ? 's' : ''}` : `${all.length} conversation${all.length > 1 ? 's' : ''}`}
      />
      <div className="body">
        <div className="search">
          <Icon name="search" size="sm" />
          <input
            className="plain grow"
            style={{ outline: 'none', minWidth: 0 }}
            aria-label="Rechercher une conversation"
            placeholder="Rechercher un vendeur, un produit…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button className="iconbtn" style={{ width: 28, height: 28 }} aria-label="Effacer la recherche" onClick={() => setQ('')}>
              <Icon name="close" size="sm" />
            </button>
          )}
        </div>

        <div className="chips">
          <button className={`chip${filter === 'all' ? ' on' : ''}`} onClick={() => setFilter('all')}>Tout ({all.length})</button>
          <button className={`chip${filter === 'unread' ? ' on' : ''}`} onClick={() => setFilter('unread')}>Non lus ({unread})</button>
          <button className={`chip${filter === 'listing' ? ' on' : ''}`} onClick={() => setFilter('listing')}>Annonces</button>
          <button className={`chip${filter === 'order' ? ' on' : ''}`} onClick={() => setFilter('order')}>Livraisons</button>
        </div>

        {shown.length === 0 ? (
          <div className="card pad col" style={{ alignItems: 'center', textAlign: 'center', gap: 10, padding: '28px 16px' }}>
            <ReliefIcon name="messages" size={56} />
            <span className="b">{all.length === 0 ? 'Aucune conversation pour le moment' : 'Aucune conversation ne correspond'}</span>
            <span className="small muted">
              {all.length === 0
                ? 'Contactez un vendeur depuis une annonce ou écrivez à votre livreur depuis le suivi de commande.'
                : 'Essayez un autre filtre ou une autre recherche.'}
            </span>
            {all.length === 0 && (
              <Link className="btn btn-p btn-sm" to="/explorer">Explorer les annonces</Link>
            )}
          </div>
        ) : (
          <div className="card list">
            {shown.map((t) => {
              const other = otherOf(t, myPhone);
              const last = t.messages[t.messages.length - 1];
              const isUnread = t.messages.length > 0 && !t.readBy.includes(myPhone);
              const pendingOffer = t.messages.some((m) => m.offer?.status === 'pending');
              return (
                <Link key={t.id} className="li" to={`/messages/${t.id}`} style={isUnread ? { background: '#F3F9F4' } : undefined}>
                  {t.photo ? (
                    <Photo src={t.photo} w={46} h={46} radius={8} />
                  ) : (
                    <span className="av" style={{ background: '#E8F3EA', color: '#145C3A' }}>{initials(other?.name ?? 'SAVAA')}</span>
                  )}
                  <div className="col grow" style={{ minWidth: 0, gap: 2 }}>
                    <div className="row" style={{ gap: 6 }}>
                      <span className={`small ell grow ${isUnread ? 'b' : ''}`} style={{ fontWeight: isUnread ? 700 : 600 }}>{other?.name ?? 'Compte SAVAA'}</span>
                      <span className="xs muted num" style={{ flex: 'none' }}>{t.updatedAt.split(', ')[1] ?? t.updatedAt}</span>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      <Badge tone={t.kind === 'listing' ? 'green' : 'blue'}>{KIND_LABEL[t.kind]}</Badge>
                      {pendingOffer && <Badge tone="amber">Offre</Badge>}
                      <span className="xs muted ell">{t.subject}</span>
                    </div>
                    <span className={`xs ell ${isUnread ? 'b' : 'muted'}`} style={{ color: isUnread ? '#17201B' : undefined }}>
                      {last
                        ? `${last.from.phone === myPhone ? 'Vous : ' : ''}${last.audio ? `Note vocale (${last.audioSec ? `0:${String(last.audioSec).padStart(2, '0')}` : 'audio'})` : last.text || (last.photo ? 'Photo envoyée' : '')}`
                        : 'Conversation ouverte, envoyez le premier message'}
                    </span>
                  </div>
                  {isUnread && <span style={{ width: 9, height: 9, borderRadius: 9, background: '#145C3A', flex: 'none' }} aria-label="Non lu" />}
                  <Icon name="chevron" size="sm" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <TabBar />
    </div>
  );
}

/* Fil de discussion interne (/messages/:id), avec notes vocales, offres de prix, appel (livraison) et photos. */
export function ThreadView() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const s = useStore();
  const thread = s.thread(id);
  const sess = s.session();
  const myPhone = sess.demo ? '07 48 12 33 90' : sess.phone;

  const [draft, setDraft] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [offerOpen, setOfferOpen] = useState(params.get('offre') === '1');
  const [offerVal, setOfferVal] = useState('');
  const [zoomPhoto, setZoomPhoto] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const secRef = useRef(0);
  const dropRecRef = useRef(false);

  useEffect(() => {
    if (thread) s.markThreadRead(thread.id);
  }, [thread?.id, thread?.messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages.length]);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => {
      secRef.current += 1;
      setRecSec(secRef.current);
      if (secRef.current >= 30) recRef.current?.stop();
    }, 1000);
    return () => clearInterval(t);
  }, [recording]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
  }, []);

  if (!thread) return <NotFound title="Conversation" text="Cette conversation n’existe pas ou n’est plus accessible." to="/messages" cta="Retour aux messages" />;

  const other = otherOf(thread, myPhone);
  const otherDigits = (other?.phone ?? '').replace(/\D/g, '');
  const canCall = thread.kind !== 'listing' && otherDigits.length >= 8;
  const linkedListing = thread.kind === 'listing' && thread.refId ? s.listing(thread.refId) : undefined;
  const contextLink = thread.kind === 'listing' && thread.refId
    ? `/annonce/${thread.refId}`
    : thread.refId
      ? `/commande?ref=${encodeURIComponent(thread.refId)}`
      : null;

  const send = () => {
    if (!draft.trim() && !photo) return;
    s.sendMessage(thread.id, draft.trim() || 'Photo jointe', photo ? { photo } : undefined);
    setDraft('');
    setPhoto(null);
  };

  const startVoice = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      showToast('L’enregistrement vocal n’est pas pris en charge sur ce navigateur.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      secRef.current = 0;
      dropRecRef.current = false;
      setRecSec(0);
      const mr = new MediaRecorder(stream);
      recRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
        setRecording(false);
        if (dropRecRef.current || chunksRef.current.length === 0) return;
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            s.sendMessage(thread.id, '', { audio: reader.result, audioSec: Math.max(1, secRef.current) });
          }
        };
        reader.readAsDataURL(blob);
      };
      mr.start();
      setRecording(true);
    } catch {
      showToast('Accès au micro refusé ou indisponible.');
    }
  };

  const stopVoice = (cancel = false) => {
    dropRecRef.current = cancel;
    if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop();
    else setRecording(false);
  };

  const orderAtPrice = (amount: number) => {
    if (!linkedListing) return;
    s.addToCart(linkedListing.id, 1, amount);
    showToast(`Ajouté au panier au prix convenu (${fcfa(amount)} FCFA).`);
    navigate('/panier');
  };

  const sendOffer = () => {
    const amount = Number(offerVal.replace(/\D/g, ''));
    if (!amount || amount < 500) {
      showToast('Indiquez un montant valide en FCFA.');
      return;
    }
    s.sendMessage(thread.id, `Je propose ${fcfa(amount)} FCFA.`, { offerAmount: amount });
    setOfferVal('');
    setOfferOpen(false);
    showToast('Offre envoyée dans la conversation.');
  };

  const pickPhoto = async (file?: File) => {
    if (!file) return;
    try {
      const dataUrl = await readImage(file);
      setPhoto(dataUrl);
    } catch {
      showToast('Impossible de charger cette photo.');
    }
  };

  const quickReplies = thread.kind === 'listing' ? QUICK_LISTING : QUICK_DELIVERY;

  return (
    <div className="app">
      <Header
        back
        title={other?.name ?? 'Conversation'}
        sub={thread.subject}
        actions={
          <div className="row" style={{ gap: 6, paddingRight: 8 }}>
            {canCall && (
              <a className="iconbtn" href={`tel:+225${otherDigits}`} aria-label={`Appeler ${other?.name}`} title="Appeler">
                <Icon name="phone" />
              </a>
            )}
            {contextLink && (
              <Link className="btn btn-s btn-sm" style={{ flex: 'none' }} to={contextLink}>
                {thread.kind === 'listing' ? 'Annonce' : 'Suivi'}
              </Link>
            )}
          </div>
        }
      />

      <div className="body" style={{ gap: 10 }}>
        {/* Bandeau contexte (annonce ou livraison) */}
        <div className="card pad row" style={{ gap: 10, background: '#F3F9F4', borderColor: '#CFE0D4' }}>
          {thread.photo && <Photo src={thread.photo} w={44} h={44} radius={8} />}
          <div className="col grow" style={{ minWidth: 0, gap: 2 }}>
            <div className="row" style={{ gap: 6 }}>
              <Badge tone={thread.kind === 'listing' ? 'green' : 'blue'}>{KIND_LABEL[thread.kind]}</Badge>
              {thread.negotiable && <Badge tone="amber">Négociable</Badge>}
            </div>
            <span className="small b ell">{thread.subject}</span>
            {thread.price != null && <span className="xs muted num">Prix affiché : {fcfa(thread.price)} FCFA</span>}
          </div>
        </div>

        {/* Rappel de sécurité */}
        <div className="row xs muted" style={{ justifyContent: 'center', gap: 6, textAlign: 'center' }}>
          <Icon name="info" size="sm" />
          <span>Pour votre sécurité, gardez vos échanges et paiements dans SAVAA.</span>
        </div>

        {/* Fil de messages */}
        <div className="col" style={{ gap: 8, flex: '1 0 auto' }}>
          {thread.messages.length === 0 && (
            <div className="card pad" style={{ textAlign: 'center' }}>
              <span className="small muted">Démarrez la conversation avec {other?.name}. Utilisez un message rapide ci-dessous ou écrivez votre question.</span>
            </div>
          )}

          {thread.messages.map((m) => {
            const mine = m.from.phone === myPhone;
            return (
              <div key={m.id} className="col" style={{ alignItems: mine ? 'flex-end' : 'flex-start', gap: 3 }}>
                <div className={`bubble ${mine ? 'me' : 'bot'}`}>
                  {m.photo && (
                    <img
                      src={m.photo}
                      alt="Photo jointe"
                      onClick={() => setZoomPhoto(m.photo ?? null)}
                      style={{ width: '100%', maxWidth: 220, borderRadius: 8, marginBottom: m.text ? 6 : 0, display: 'block', cursor: 'zoom-in' }}
                    />
                  )}
                  {m.offer && (
                    <div
                      className="col"
                      style={{
                        gap: 6,
                        padding: '8px 10px',
                        borderRadius: 8,
                        marginBottom: 6,
                        background: mine ? 'rgba(255,255,255,0.16)' : '#fff',
                        border: mine ? '1px solid rgba(255,255,255,0.28)' : '1px solid #D5DDD7',
                        color: mine ? '#fff' : '#17201B',
                      }}
                    >
                      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                        <span className="xs b">Offre de prix</span>
                        <Badge tone={m.offer.status === 'accepted' ? 'green' : m.offer.status === 'declined' ? 'red' : 'amber'}>
                          {m.offer.status === 'accepted' ? 'Acceptée' : m.offer.status === 'declined' ? 'Refusée' : 'En attente'}
                        </Badge>
                      </div>
                      <span className="b num" style={{ fontSize: 15 }}>{fcfa(m.offer.amount)} FCFA</span>
                      {!mine && m.offer.status === 'pending' && (
                        <div className="row" style={{ gap: 6, marginTop: 2 }}>
                          <button
                            className="btn btn-p btn-sm"
                            onClick={() => { s.answerOffer(thread.id, m.id, 'accepted'); showToast('Offre acceptée.'); }}
                          >
                            Accepter
                          </button>
                          <button
                            className="btn btn-s btn-sm"
                            onClick={() => { s.answerOffer(thread.id, m.id, 'declined'); showToast('Offre refusée.'); }}
                          >
                            Refuser
                          </button>
                        </div>
                      )}
                      {m.offer.status === 'accepted' && linkedListing && linkedListing.status === 'online' && !linkedListing.mine && (
                        <button
                          className="btn btn-p btn-sm"
                          style={{ marginTop: 4 }}
                          onClick={() => orderAtPrice(m.offer!.amount)}
                        >
                          Commander à {fcfa(m.offer.amount)} FCFA
                        </button>
                      )}
                    </div>
                  )}
                  {m.audio && (
                    <div className="col" style={{ gap: 4 }}>
                      <audio controls src={m.audio} style={{ width: 210, height: 34 }} />
                      <span className="xs" style={{ opacity: 0.8 }}>Note vocale{m.audioSec ? `, 0:${String(m.audioSec).padStart(2, '0')}` : ''}</span>
                    </div>
                  )}
                  {m.text && <span>{m.text}</span>}
                </div>
                <span className="xs muted num" style={{ padding: '0 4px' }}>{m.time}</span>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {/* Réponses rapides */}
        {thread.messages.length < 3 && (
          <div className="chips">
            {quickReplies.map((txt) => (
              <button key={txt} className="chip" onClick={() => s.sendMessage(thread.id, txt)}>{txt}</button>
            ))}
          </div>
        )}

        {/* Panneau d'offre de prix (si annonce négociable) */}
        {offerOpen && thread.kind === 'listing' && (
          <div className="card pad col" style={{ gap: 8, background: '#FFF9F0', borderColor: '#F2D2A9' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="small b">Proposer un prix</span>
              <button className="iconbtn" style={{ width: 28, height: 28 }} aria-label="Fermer" onClick={() => setOfferOpen(false)}>
                <Icon name="close" size="sm" />
              </button>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <input
                className="input num grow"
                inputMode="numeric"
                placeholder={thread.price ? `Ex. ${fcfa(Math.round(thread.price * 0.9))}` : 'Montant en FCFA'}
                value={offerVal}
                onChange={(e) => setOfferVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendOffer(); }}
              />
              <button className="btn btn-p btn-sm" style={{ flex: 'none' }} onClick={sendOffer}>Envoyer l’offre</button>
            </div>
          </div>
        )}

        {/* Aperçu photo prête à envoyer */}
        {photo && (
          <div className="card pad row" style={{ gap: 10 }}>
            <img src={photo} alt="Aperçu" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} />
            <span className="xs muted grow">Photo prête à envoyer</span>
            <button className="btn btn-ghost btn-sm" style={{ flex: 'none' }} onClick={() => setPhoto(null)}>Retirer</button>
          </div>
        )}
      </div>

      {/* Barre de saisie (texte, photo, note vocale, offre) */}
      <div className="foot" style={{ flexDirection: 'column', gap: 8, padding: '10px 14px max(14px, env(safe-area-inset-bottom))' }}>
        {recording ? (
          <div className="row" style={{ gap: 8, width: '100%', background: '#FDECEA', padding: '6px 10px', borderRadius: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: 5, background: '#B42318', flex: 'none' }} />
            <span className="small b grow num" style={{ color: '#8F1E16' }}>Enregistrement… 0:{String(recSec).padStart(2, '0')} / 0:30</span>
            <button className="btn btn-ghost btn-sm" style={{ flex: 'none' }} onClick={() => stopVoice(true)}>Annuler</button>
            <button className="btn btn-p btn-sm" style={{ flex: 'none' }} onClick={() => stopVoice(false)}>Envoyer</button>
          </div>
        ) : (
          <div className="row" style={{ gap: 6, width: '100%' }}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => { void pickPhoto(e.target.files?.[0]); e.target.value = ''; }}
            />
            <button
              className="iconbtn"
              style={{ border: '1px solid #C5CDC7', flex: 'none', width: 40, height: 40 }}
              aria-label="Joindre une photo"
              onClick={() => fileRef.current?.click()}
            >
              <Icon name="camera" size="sm" />
            </button>
            <button
              className="iconbtn"
              style={{ border: '1px solid #C5CDC7', flex: 'none', width: 40, height: 40 }}
              aria-label="Enregistrer une note vocale"
              onClick={() => void startVoice()}
            >
              <Icon name="mic" size="sm" />
            </button>
            {thread.kind === 'listing' && thread.negotiable && (
              <button
                className="btn btn-s btn-sm"
                style={{ flex: 'none', padding: '0 8px' }}
                onClick={() => setOfferOpen((v) => !v)}
              >
                Offre
              </button>
            )}
            <input
              className="input grow"
              placeholder="Message…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            />
            <button
              className="btn btn-p"
              style={{ flex: 'none', padding: '0 12px' }}
              aria-label="Envoyer"
              disabled={!draft.trim() && !photo}
              onClick={send}
            >
              <Icon name="send" size="sm" />
            </button>
          </div>
        )}
      </div>
      <PreviewModal
        data={zoomPhoto ? { title: 'Photo de la conversation', subtitle: thread.subject, images: [zoomPhoto] } : null}
        onClose={() => setZoomPhoto(null)}
      />
    </div>
  );
}
