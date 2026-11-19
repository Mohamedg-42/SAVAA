/**
 * Logo horizontal pour les en-têtes : symbole + nom côte à côte.
 * `tone="white"` sur fond vert (reliefs et nom blancs), `"color"` sur fond clair.
 */
export function LogoInline({ height = 28, tone = 'color' }: { height?: number; tone?: 'color' | 'white' }) {
  const ink = tone === 'white' ? '#FFFFFF' : '#145C3A';
  const hole = tone === 'white' ? '#145C3A' : '#FFFFFF';
  return (
    <span className="row" style={{ gap: Math.round(height / 4), alignItems: 'center', flex: 'none' }} role="img" aria-label="SAVAA">
      <svg viewBox="200 160 800 500" height={height} style={{ display: 'block', flex: 'none' }} aria-hidden="true">
        <circle cx="600" cy="285" r="122" fill="#F28C28" />
        <path d="M220 618 L426 285 Q470 213 521 285 L600 420 L679 285 Q730 213 774 285 L980 618 L829 618 L700 414 L600 577 L500 414 L371 618 Z" fill={ink} />
        <path d="M448 415 L500 331 L551 415 Z" fill={hole} />
        <path d="M649 415 L700 331 L752 415 Z" fill={hole} />
        <path d="M350 638 C470 566 730 566 850 638" fill="none" stroke="#F28C28" strokeWidth="30" strokeLinecap="round" />
      </svg>
      <span aria-hidden="true" style={{ fontWeight: 700, fontSize: Math.round(height * 0.68), letterSpacing: '0.04em', color: ink, lineHeight: 1 }}>SAVAA</span>
    </span>
  );
}

/*
  Logo SAVAA (fichier source : public/logo-savaa.svg).
  Deux reliefs en forme de A, un soleil orange derrière, un sillon, le nom.
  `rising` : le soleil se lève derrière les reliefs, puis le sillon se trace et le nom apparaît.
*/
export function Logo({ width = 280, rising = false, name = true }: { width?: number | string; rising?: boolean; name?: boolean }) {
  return (
    <svg
      className={rising ? 'logo-rising' : undefined}
      viewBox={name ? '180 120 840 720' : '200 120 800 540'}
      width={width}
      role="img"
      aria-label="SAVAA"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        {/* Horizon : le soleil n'apparaît qu'au-dessus du pied des reliefs. */}
        <clipPath id="savaa-horizon"><rect x="0" y="0" width="1200" height="600" /></clipPath>
        <radialGradient id="savaa-glow">
          <stop offset="0" stopColor="#F28C28" stopOpacity="0.45" />
          <stop offset="1" stopColor="#F28C28" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g clipPath="url(#savaa-horizon)">
        {rising && <circle className="logo-glow" cx="600" cy="285" r="300" fill="url(#savaa-glow)" />}
        <circle className="logo-sun" cx="600" cy="285" r="122" fill="#F28C28" />
      </g>
      <path d="M220 618 L426 285 Q470 213 521 285 L600 420 L679 285 Q730 213 774 285 L980 618 L829 618 L700 414 L600 577 L500 414 L371 618 Z" fill="#145C3A" />
      <path d="M448 415 L500 331 L551 415 Z" fill="#FFFFFF" />
      <path d="M649 415 L700 331 L752 415 Z" fill="#FFFFFF" />
      <path className="logo-furrow" pathLength={1} d="M350 638 C470 566 730 566 850 638" fill="none" stroke="#F28C28" strokeWidth="24" strokeLinecap="round" />
      {name && (
        <text className="logo-name" x="600" y="806" textAnchor="middle" fontFamily="IBM Plex Sans, Arial, sans-serif" fontSize="172" fontWeight="700" letterSpacing="3" fill="#145C3A">SAVAA</text>
      )}
    </svg>
  );
}
