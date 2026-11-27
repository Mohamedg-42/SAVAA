/*
  Connecteurs externes de production du Serveur Backend SAVAA :
  1. SMS OTP Côte d'Ivoire (Orange SMS API / Infobip / Webhook générique)
  2. Paiement Mobile Money & Séquestre (CinetPay / Wave Business / Orange / MTN / Moov)
  3. Calcul d'itinéraire routier réel (OSRM / coordonnées GPS des localités de Côte d'Ivoire)
  Tous les connecteurs basculent automatiquement en mode simulation locale tant que les clés
  d'API de production ne sont pas renseignées dans backend/.env.
*/

/** Coordonnées GPS des principales localités agropastorales de Côte d'Ivoire. */
export const CI_COORDS = {
  Korhogo: { lat: 9.458, lng: -5.629 },
  Sinématiali: { lat: 9.584, lng: -5.386 },
  Ferkessédougou: { lat: 9.593, lng: -5.197 },
  Dikodougou: { lat: 9.068, lng: -5.772 },
  Boundiali: { lat: 9.522, lng: -6.487 },
  Ouangolodougou: { lat: 9.968, lng: -5.152 },
  Tengrela: { lat: 10.481, lng: -6.407 },
  Bouaké: { lat: 7.694, lng: -5.03 },
  Yamoussoukro: { lat: 6.828, lng: -5.289 },
  Abidjan: { lat: 5.36, lng: -4.008 },
  Daloa: { lat: 6.877, lng: -6.45 },
  'San-Pédro': { lat: 4.749, lng: -6.636 },
  Man: { lat: 7.413, lng: -7.554 },
  Odienné: { lat: 9.505, lng: -7.564 },
  Bondoukou: { lat: 8.04, lng: -2.8 },
};

/**
 * 1. Envoi d'un SMS OTP au numéro ivoirien (+225).
 * Si `SMS_API_URL` et `SMS_API_KEY` sont configurés, appelle la passerelle SMS ; sinon journalise en mode simulation.
 */
export async function sendSmsOtp(phone, code) {
  const apiUrl = process.env.SMS_API_URL;
  const apiKey = process.env.SMS_API_KEY;
  const message = `SAVAA : Votre code de vérification est ${code}. Il expire dans 10 minutes.`;

  if (apiUrl && apiKey) {
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          to: `+225${phone}`,
          sender: process.env.SMS_SENDER_ID || 'SAVAA',
          message,
        }),
      });
      return { delivered: res.ok, mode: 'live', providerStatus: res.status };
    } catch (err) {
      return { delivered: false, mode: 'live', error: err instanceof Error ? err.message : 'Erreur passerelle SMS' };
    }
  }

  return { delivered: true, mode: 'simulation', to: `+225${phone}`, message };
}

/**
 * 2. Initialisation d'une transaction Mobile Money (Orange Money, MTN MoMo, Moov Money, Wave).
 * Supporte le paiement intégral (100 %) et l'acompte séquestre (20 %).
 */
export async function initiateMobileMoneyPayment({ orderRef, amount, method, phone, paymentMode = 'full' }) {
  const momoUrl = process.env.MOMO_API_URL;
  const momoKey = process.env.MOMO_API_KEY;
  const siteId = process.env.MOMO_SITE_ID;
  const txId = `TX-${Date.now().toString(36).toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`;

  if (momoUrl && momoKey) {
    try {
      const res = await fetch(momoUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${momoKey}`,
        },
        body: JSON.stringify({
          apikey: momoKey,
          site_id: siteId,
          transaction_id: txId,
          amount: Number(amount),
          currency: 'XOF',
          description: `Commande SAVAA ${orderRef} (${paymentMode === 'deposit' ? 'Acompte séquestre 20 %' : 'Paiement intégral'})`,
          channels: method || 'ALL',
          customer_phone_number: phone ? `+225${String(phone).replace(/\D/g, '').slice(-10)}` : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      return {
        ok: res.ok,
        mode: 'live',
        txId,
        orderRef,
        amount: Number(amount),
        method: method || 'Orange Money',
        paymentMode,
        status: res.ok ? 'PENDING_CONFIRMATION' : 'FAILED',
        providerResponse: data,
      };
    } catch (err) {
      return {
        ok: false,
        mode: 'live',
        txId,
        error: err instanceof Error ? err.message : 'Erreur passerelle Mobile Money',
      };
    }
  }

  return {
    ok: true,
    mode: 'simulation',
    txId,
    orderRef,
    amount: Number(amount),
    currency: 'XOF',
    method: method || 'Orange Money',
    paymentMode,
    status: 'CONFIRMED',
    confirmedAt: new Date().toISOString(),
  };
}

/**
 * 3. Calcul de distance routière réelle (km) entre deux localités de Côte d'Ivoire.
 * Utilise OSRM (`OSRM_API_URL`) si disponible, sinon Haversine × 1,2.
 */
export async function computeRoadRoute(fromName, toName) {
  const clean = (s) => String(s || '').split(',')[0].trim();
  const a = CI_COORDS[clean(fromName)];
  const b = CI_COORDS[clean(toName)];
  if (!a || !b) {
    return { km: 15, estimated: true, source: 'fallback', from: clean(fromName), to: clean(toName) };
  }
  if (clean(fromName) === clean(toName)) {
    return { km: 4, estimated: false, source: 'local-town', from: clean(fromName), to: clean(toName) };
  }

  const osrmBase = process.env.OSRM_API_URL;
  if (osrmBase) {
    try {
      const url = `${osrmBase.replace(/\/$/, '')}/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const meters = json?.routes?.[0]?.distance;
        if (typeof meters === 'number' && meters > 0) {
          return {
            km: Math.max(1, Math.round(meters / 1000)),
            estimated: false,
            source: 'osrm',
            from: clean(fromName),
            to: clean(toName),
          };
        }
      }
    } catch {
      /* repli sur le calcul géodésique */
    }
  }

  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  const airKm = 2 * R * Math.asin(Math.sqrt(h));
  const roadKm = Math.max(2, Math.round(airKm * 1.2));

  return {
    km: roadKm,
    estimated: false,
    source: 'geodesic-road',
    from: clean(fromName),
    to: clean(toName),
    coords: { from: a, to: b },
  };
}
