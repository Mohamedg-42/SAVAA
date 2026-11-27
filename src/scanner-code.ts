/** Extrait la route SAVAA depuis une URL de QR code ou un code saisi manuellement. */
export function resolveQrCode(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const ficheMatch = /\/fiche\/([A-Z0-9-]+)/i.exec(s) ?? /^(SAV-TRACE-[A-Z0-9-]+)$/i.exec(s);
  if (ficheMatch) return `/fiche/${ficheMatch[1].toUpperCase()}`;
  const animalMatch = /\/animal\/([A-Z0-9-]+)/i.exec(s) ?? /^(FK-\d+)$/i.exec(s);
  if (animalMatch) return `/animal/${animalMatch[1].toUpperCase()}`;
  const listingMatch = /\/annonce\/([A-Z0-9-]+)/i.exec(s);
  if (listingMatch) return `/annonce/${listingMatch[1]}`;
  return null;
}
