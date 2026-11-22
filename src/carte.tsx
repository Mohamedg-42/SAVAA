import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Place } from './livraison';

/*
  Carte des livraisons (Leaflet, fond OpenStreetMap, sans clé).
  Zone du livreur en cercle, enlèvements en points pleins, livraisons en points creux, trajet en trait.
  Hors connexion, le fond ne se charge pas : la carte le dit, la liste des missions reste utilisable.
*/

export type MapRoute = { id: string; from: Place; to?: Place; label: string; active?: boolean };

const GREEN = '#145C3A';
const ORANGE = '#C2410C';

export function DeliveryMap({ zone, routes, height = 240, label }: { zone?: { center: Place; km: number }; routes: MapRoute[]; height?: number; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [offline, setOffline] = useState(false);
  const key = JSON.stringify({ zone, routes });

  useEffect(() => {
    let map: import('leaflet').Map | undefined;
    let gone = false;
    import('leaflet').then((L) => {
      if (gone || !box.current) return;
      map = L.map(box.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
      const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 17, attribution: '© OpenStreetMap' });
      let errors = 0;
      tiles.on('tileerror', () => { errors++; if (errors > 3) setOffline(true); });
      tiles.addTo(map);
      const pts: [number, number][] = [];
      if (zone) {
        L.circle([zone.center.lat, zone.center.lng], { radius: zone.km * 1000, color: GREEN, weight: 1.5, fillColor: GREEN, fillOpacity: 0.08 }).addTo(map).bindTooltip(`Votre zone : ${zone.km} km autour de ${zone.center.name}`);
        L.circleMarker([zone.center.lat, zone.center.lng], { radius: 6, color: '#fff', weight: 2, fillColor: GREEN, fillOpacity: 1 }).addTo(map).bindTooltip(`Votre base : ${zone.center.name}`);
        const r = zone.km / 111;
        pts.push([zone.center.lat - r, zone.center.lng - r], [zone.center.lat + r, zone.center.lng + r]);
      }
      for (const m of routes) {
        const color = m.active === false ? '#8A958F' : ORANGE;
        if (m.to) {
          L.polyline([[m.from.lat, m.from.lng], [m.to.lat, m.to.lng]], { color, weight: 2, dashArray: m.active === false ? '4 4' : undefined }).addTo(map);
          L.circleMarker([m.to.lat, m.to.lng], { radius: 6, color, weight: 2, fillColor: '#fff', fillOpacity: 1 }).addTo(map).bindTooltip(`Livraison : ${m.to.name}`);
          pts.push([m.to.lat, m.to.lng]);
        }
        L.circleMarker([m.from.lat, m.from.lng], { radius: 7, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 }).addTo(map).bindTooltip(m.label);
        pts.push([m.from.lat, m.from.lng]);
      }
      if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [24, 24], maxZoom: 12 });
      else if (pts.length === 1) map.setView(pts[0], 11);
      else map.setView([9.458, -5.629], 9);
    });
    return () => { gone = true; map?.remove(); };
    /* La carte est refaite quand la zone ou les trajets changent (clé sérialisée). */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div className="col" style={{ gap: 6 }}>
      <div ref={box} role="img" aria-label={label} style={{ height, borderRadius: 10, overflow: 'hidden', border: '1px solid #E3E7E4', background: '#EEF1EF', zIndex: 0 }} />
      <div className="row xs muted" style={{ gap: 12, flexWrap: 'wrap' }}>
        {zone && <span className="row" style={{ gap: 4 }}><i style={{ width: 10, height: 10, borderRadius: 5, background: GREEN, display: 'inline-block' }} />Votre base et votre zone</span>}
        {routes.length > 0 && <span className="row" style={{ gap: 4 }}><i style={{ width: 10, height: 10, borderRadius: 5, background: ORANGE, display: 'inline-block' }} />Enlèvement</span>}
        {routes.some((r) => r.to) && <span className="row" style={{ gap: 4 }}><i style={{ width: 10, height: 10, borderRadius: 5, border: `2px solid ${ORANGE}`, display: 'inline-block', boxSizing: 'border-box' }} />Livraison</span>}
      </div>
      {offline && <span className="xs" style={{ color: '#8A4B00' }}>Fond de carte indisponible sans connexion. Les distances restent calculées.</span>}
    </div>
  );
}
