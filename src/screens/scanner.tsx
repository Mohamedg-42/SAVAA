import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { resolveQrCode } from '../scanner-code';
import { showToast } from '../toast';
import { Badge, Header, Icon, TabBar } from '../ui';

type BarcodeHit = { rawValue?: string };
type Detector = { detect: (src: HTMLVideoElement) => Promise<BarcodeHit[]> };
type BarcodeDetectorCtor = new (opts: { formats: string[] }) => Detector;

const SAMPLE_CODES: [string, string][] = [
  ['SAV-TRACE-2026-014217', 'Taurillon Zébu Goudali'],
  ['FK-0142', 'Fiche animale FK-0142'],
  ['SAV-TRACE-2026-008341', 'Igname Kponan'],
];

/* Scanner QR code mobile (caméra + saisie manuelle en repli). */
export function QrScanner() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [manual, setManual] = useState('');
  const [camState, setCamState] = useState<'idle' | 'active' | 'unsupported' | 'denied'>('idle');
  const [autoDetect, setAutoDetect] = useState(false);

  const openCode = (value: string) => {
    const target = resolveQrCode(value);
    if (!target) {
      showToast('Code non reconnu. Format attendu : SAV-TRACE-… ou FK-…');
      return;
    }
    navigate(target);
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: number | null = null;
    let cancelled = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamState('unsupported');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCamState('active');
        const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
        if (Ctor) {
          setAutoDetect(true);
          const detector = new Ctor({ formats: ['qr_code'] });
          timer = window.setInterval(async () => {
            const v = videoRef.current;
            if (!v || v.readyState < 2) return;
            try {
              const hits = await detector.detect(v);
              const val = hits[0]?.rawValue;
              if (val) {
                const target = resolveQrCode(val);
                if (target) {
                  if (timer) window.clearInterval(timer);
                  stream?.getTracks().forEach((t) => t.stop());
                  showToast('QR code détecté.');
                  navigate(target, { replace: true });
                }
              }
            } catch {
              /* frame ignorée */
            }
          }, 450);
        }
      } catch {
        if (!cancelled) setCamState('denied');
      }
    };

    void start();
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [navigate]);

  return (
    <div className="app">
      <Header back title="Scanner un QR code" sub="Traçabilité SAV-TRACE ou fiche animale" />
      <div className="body" style={{ gap: 16 }}>
        <div
          className="card col"
          style={{
            overflow: 'hidden',
            background: '#111914',
            color: '#fff',
            minHeight: 240,
            position: 'relative',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: '100%', height: 240, objectFit: 'cover', display: camState === 'active' ? 'block' : 'none' }}
          />
          {camState === 'active' && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                width: 170,
                height: 170,
                border: '2px solid #F28C28',
                borderRadius: 14,
                boxShadow: '0 0 0 999px rgba(0,0,0,0.35)',
                pointerEvents: 'none',
              }}
            />
          )}
          {camState !== 'active' && (
            <div className="col" style={{ alignItems: 'center', textAlign: 'center', gap: 8, padding: 24 }}>
              <Icon name="camera" size="lg" style={{ color: '#CFE0D4' }} />
              <span className="small b">
                {camState === 'idle'
                  ? 'Activation de la caméra…'
                  : camState === 'denied'
                    ? 'Accès caméra refusé ou indisponible'
                    : 'Caméra non disponible sur cet appareil'}
              </span>
              <span className="xs" style={{ color: '#CFE0D4', lineHeight: 1.45 }}>
                Saisissez directement le code SAV-TRACE ou le numéro d’animal ci-dessous.
              </span>
            </div>
          )}
        </div>

        {camState === 'active' && (
          <div className="row between xs muted">
            <span>Pointez le QR code de la fiche ou de la boucle.</span>
            <Badge tone={autoDetect ? 'green' : 'amber'}>{autoDetect ? 'Scan auto actif' : 'Saisie manuelle'}</Badge>
          </div>
        )}

        <form
          className="card pad col"
          style={{ gap: 10 }}
          onSubmit={(e) => { e.preventDefault(); openCode(manual); }}
        >
          <span className="small b">Entrer un code manuellement</span>
          <div className="row" style={{ gap: 8 }}>
            <input
              className="input num grow"
              placeholder="Ex. SAV-TRACE-2026-014217 ou FK-0142"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
            />
            <button type="submit" className="btn btn-p btn-sm" style={{ flex: 'none' }} disabled={!manual.trim()}>
              Ouvrir
            </button>
          </div>
        </form>

        <div className="sec">
          <span className="eyebrow">Exemples à tester</span>
          <div className="card list">
            {SAMPLE_CODES.map(([code, label]) => (
              <button key={code} type="button" className="li" onClick={() => openCode(code)}>
                <div className="col grow" style={{ minWidth: 0 }}>
                  <span className="small b num">{code}</span>
                  <span className="xs muted">{label}</span>
                </div>
                <Icon name="chevron" size="sm" />
              </button>
            ))}
          </div>
        </div>
      </div>
      <TabBar />
    </div>
  );
}
