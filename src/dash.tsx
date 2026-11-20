import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from './data';
import { Icon, type IconName } from './ui';

/*
  Éléments communs des tableaux de bord métier : en-tête avec la photo du compte, carte du jour,
  chiffres clés et actions rapides. Pour un compte neuf, les chiffres viennent de ses propres données (souvent 0).
*/

const initialsOf = (name: string) =>
  name.split(/\s+/).filter((w) => /^\p{L}/u.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

/** Photo du compte (ou initiales), réutilisée par l'en-tête et la page Compte. */
export function Avatar({ size = 44, name }: { size?: number; name: string }) {
  const photo = useStore().session().photo;
  return photo ? (
    <span className="av" style={{ width: size, height: size, backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }} aria-hidden="true" />
  ) : (
    <span className="av" style={{ width: size, height: size, fontSize: Math.round(size / 3) }} aria-hidden="true">{initialsOf(name)}</span>
  );
}

/** En-tête vert d'un espace métier : photo, métier, nom, et une action à droite. */
export function DashHeader({ label, name, action }: { label: string; name: string; action?: ReactNode }) {
  return (
    <header className="hdr" style={{ paddingLeft: 16, gap: 12, minHeight: 72 }}>
      <Link to="/compte" aria-label="Mon compte" style={{ flex: 'none', display: 'flex' }}><Avatar name={name} /></Link>
      <div className="col grow" style={{ gap: 1, minWidth: 0 }}>
        <span className="xs" style={{ color: '#CFE0D4' }}>{label}</span>
        <span className="b ell" style={{ fontSize: 17 }}>{name}</span>
      </div>
      {action}
    </header>
  );
}

/** Carte du jour : ce que l'acteur doit faire maintenant. `alert` la met en rouge (urgence sanitaire). */
export function TodayCard({ eyebrow, title, text, alert, children }: { eyebrow: string; title: string; text?: ReactNode; alert?: boolean; children?: ReactNode }) {
  return (
    <div className="col" style={{ gap: 8, padding: 14, borderRadius: 12, background: alert ? '#FDECEA' : '#E8F3EA', border: `1px solid ${alert ? '#F3C7C2' : '#CFE0D4'}` }}>
      <span className="xs b" style={{ color: alert ? '#A0221A' : '#145C3A', letterSpacing: '.04em', textTransform: 'uppercase' }}>{eyebrow}</span>
      <span className="b" style={{ fontSize: 17, lineHeight: 1.3 }}>{title}</span>
      {text && <span className="small" style={{ color: alert ? '#4A2A27' : '#3E4A44', lineHeight: 1.45 }}>{text}</span>}
      {children && <div className="row" style={{ gap: 8, marginTop: 4, flexWrap: 'wrap' }}>{children}</div>}
    </div>
  );
}

export type Kpi = { label: string; value: ReactNode; sub?: string; tone?: 'red' | 'amber'; wide?: boolean };

/** Chiffres clés en grille de deux. */
export function Kpis({ items }: { items: Kpi[] }) {
  return (
    <div className="grid2">
      {items.map((k) => (
        <div key={k.label} className="card pad col" style={{ gap: 2, gridColumn: k.wide ? 'span 2' : undefined }}>
          <span className="xs muted">{k.label}</span>
          <span className="b num" style={{ fontSize: 20, color: k.tone === 'red' ? '#A0221A' : k.tone === 'amber' ? '#8A4B00' : undefined }}>{k.value}</span>
          {k.sub && <span className="xs muted">{k.sub}</span>}
        </div>
      ))}
    </div>
  );
}

export type QuickAction = { label: string; icon: IconName; to?: string; onClick?: () => void };

/** Actions rapides en tuiles. */
export function QuickActions({ items }: { items: QuickAction[] }) {
  return (
    <div className={items.length === 3 ? 'grid3' : 'grid4'}>
      {items.map((a) => a.to ? (
        <Link key={a.label} className="tile" to={a.to}><Icon name={a.icon} size="lg" />{a.label}</Link>
      ) : (
        <button key={a.label} className="tile" onClick={a.onClick} style={{ font: 'inherit', cursor: 'pointer' }}><Icon name={a.icon} size="lg" />{a.label}</button>
      ))}
    </div>
  );
}
