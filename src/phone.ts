/* Numéros de téléphone ivoiriens : 10 chiffres depuis 2021. */

/** Préfixes en service : mobiles (01 Moov, 05 MTN, 07 Orange) et fixes (21, 25, 27). */
const PREFIXES = ['01', '05', '07', '21', '25', '27'];

/** Chiffres seuls, sans l'indicatif +225 ou 00225 s'il a été tapé ou collé. Au plus 10 chiffres. */
export function phoneDigits(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('00225') && d.length > 10) d = d.slice(5);
  else if (d.startsWith('225') && d.length > 10) d = d.slice(3);
  return d.slice(0, 10);
}

/** « 0701020304 » → « 07 01 02 03 04 ». */
export function formatPhone(raw: string): string {
  return phoneDigits(raw).replace(/(\d{2})(?=\d)/g, '$1 ');
}

/** Message d'erreur du numéro, ou null s'il est valable. */
export function phoneError(raw: string): string | null {
  const d = phoneDigits(raw);
  if (!d) return 'Indiquez votre numéro de téléphone.';
  if (d.length < 10) return `Le numéro doit avoir 10 chiffres (${d.length} pour l’instant), par exemple 07 01 02 03 04.`;
  if (!PREFIXES.includes(d.slice(0, 2))) return 'Ce numéro ne correspond pas à un numéro ivoirien : il commence par 01, 05, 07, 21, 25 ou 27.';
  return null;
}

/** Un nom ou un prénom doit contenir au moins une lettre. */
export const nameOk = (v: string) => /\p{L}/u.test(v);

/** Code reçu par SMS, simulé dans la démonstration. */
export const DEMO_CODE = '1234';
