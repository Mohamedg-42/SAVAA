import { useId } from 'react';
import { RELIEF, type ReliefName } from './relief-icons';

/**
 * Icône SAVAA en léger relief. Décorative : le mot à côté porte le sens.
 * `shadow={false}` retire l'ombre au sol, utile en petite taille (dans une puce).
 */
export function ReliefIcon({ name, size = 32, shadow = true }: { name: ReliefName; size?: number; shadow?: boolean }) {
  const uid = 'ri' + useId().replace(/[^A-Za-z0-9]/g, '');
  let body: string = RELIEF[name].split('__P__').join(uid);
  if (!shadow) body = body.replace(/<ellipse cx="32" cy="58"[^>]*opacity="\.14"\/>/, '');
  return (
    <svg className="relief" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false"
      style={{ flex: 'none', display: 'block' }} dangerouslySetInnerHTML={{ __html: body }} />
  );
}
