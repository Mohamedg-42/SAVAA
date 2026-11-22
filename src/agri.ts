/* Producteur agricole : lecture des quantités déclarées dans les lots de récolte. */

/** Volume en kg lu dans la quantité saisie : « 5 000 kg », « 3 t », « 240 sacs de 100 kg ». 0 si illisible. */
export function volumeKg(qty: string): number {
  const t = qty.toLowerCase().replace(/\s(?=\d{3}\b)/g, '').replace(',', '.');
  const bags = /(\d+(?:\.\d+)?)\s*sacs?\s*de\s*(\d+(?:\.\d+)?)\s*kg/.exec(t);
  if (bags) return Number(bags[1]) * Number(bags[2]);
  const tons = /(\d+(?:\.\d+)?)\s*(?:t\b|tonnes?)/.exec(t);
  if (tons) return Number(tons[1]) * 1000;
  const kg = /(\d+(?:\.\d+)?)\s*kg/.exec(t);
  return kg ? Number(kg[1]) : 0;
}
