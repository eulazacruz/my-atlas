'use client';

import 'leaflet/dist/leaflet.css';
import { Battery, Crosshair, MapPin, Navigation, Shield } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { Avatar, Glass, PageHeader, Section, Switch } from '@/components/ui/primitives';
import type { LocationRow, Profile } from '@/lib/types';
import { firstName, initials, timeAgo } from '@/lib/utils';

function distanceKm(a: LocationRow, b: LocationRow) {
  const R = 6371;
  const dLat = ((b.lat! - a.lat!) * Math.PI) / 180;
  const dLng = ((b.lng! - a.lng!) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat! * Math.PI) / 180) * Math.cos((b.lat! * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function LocationScreen() {
  const { rows, me, partner, save } = useAtlas();
  const { resolvedTheme } = useTheme();
  const mapEl = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const locs = rows('locations');
  const mine = locs.find((l) => l.id === me?.id);
  const theirs = locs.find((l) => l.id === partner?.id && l.sharing);
  const valid = (l?: LocationRow) => !!l && l.lat != null && l.lng != null;

  // cria o mapa (Leaflet + CARTO monocromático)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !mapEl.current || mapRef.current) return;
      const map = L.map(mapEl.current, { zoomControl: false, attributionControl: true }).setView([-7.9, -34.9], 12);
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // camada de mapa clara/escura
  useEffect(() => {
    if (!ready) return;
    (async () => {
      const L = (await import('leaflet')).default;
      const map = mapRef.current;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.eachLayer((l: any) => l instanceof L.TileLayer && map.removeLayer(l));
      L.tileLayer(`https://{s}.basemaps.cartocdn.com/${resolvedTheme === 'light' ? 'light_all' : 'dark_all'}/{z}/{x}/{y}{r}.png`, {
        attribution: '© OpenStreetMap · © CARTO',
        maxZoom: 19,
      }).addTo(map);
    })();
  }, [ready, resolvedTheme]);

  // marcadores com o avatar de cada um
  useEffect(() => {
    if (!ready) return;
    (async () => {
      const L = (await import('leaflet')).default;
      const layer = layerRef.current;
      layer.clearLayers();
      const pts: [number, number][] = [];
      const add = (l: LocationRow | undefined, p: Profile | null, isMe: boolean) => {
        if (!valid(l) || !p) return;
        const html = `<div class="atlas-pin ${isMe ? 'me' : 'them'}"><span>${p.avatarUrl ? `<img src="${p.avatarUrl}" referrerpolicy="no-referrer"/>` : initials(p.displayName)}</span></div>`;
        L.marker([l!.lat!, l!.lng!], { icon: L.divIcon({ html, className: '', iconSize: [46, 46], iconAnchor: [23, 23] }) }).addTo(layer);
        if (l!.accuracy) L.circle([l!.lat!, l!.lng!], { radius: l!.accuracy, color: isMe ? '#ffffff' : '#a3a3a3', weight: 1, fillOpacity: 0.08 }).addTo(layer);
        pts.push([l!.lat!, l!.lng!]);
      };
      add(mine, me, true);
      add(theirs, partner, false);
      if (pts.length === 2) mapRef.current.fitBounds(pts, { padding: [70, 70], maxZoom: 15 });
      else if (pts.length === 1) mapRef.current.setView(pts[0], 15);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, mine?.lat, mine?.lng, theirs?.lat, theirs?.lng, me?.avatarUrl, partner?.avatarUrl]);

  if (!me || !partner) return null;
  const toggle = (v: boolean) => save('locations', { id: me.id, sharing: v, lat: mine?.lat ?? null, lng: mine?.lng ?? null, accuracy: mine?.accuracy ?? null, speed: mine?.speed ?? null, battery: mine?.battery ?? null, updatedAt: new Date().toISOString() });
  const dist = valid(mine) && valid(theirs) ? distanceKm(mine!, theirs!) : null;

  const Card = ({ p, l, isMe }: { p: Profile; l?: LocationRow; isMe: boolean }) => (
    <Glass className="flex-1 p-4">
      <div className="flex items-center gap-2">
        <Avatar profile={p} size={30} />
        <p className="truncate text-[14px] font-semibold">{isMe ? 'Você' : firstName(p.displayName)}</p>
      </div>
      {valid(l) && (isMe ? l!.sharing : true) ? (
        <div className="mt-2 space-y-0.5 text-[12px] muted">
          <p>Atualizado {timeAgo(l!.updatedAt)}</p>
          {l!.speed != null && l!.speed > 1 && <p className="flex items-center gap-1"><Navigation size={11} /> {Math.round(l!.speed * 3.6)} km/h</p>}
          {l!.battery != null && <p className="flex items-center gap-1"><Battery size={12} /> {l!.battery}%</p>}
        </div>
      ) : (
        <p className="mt-2 text-[12px] muted">{isMe ? 'Compartilhamento desligado' : 'Não está compartilhando'}</p>
      )}
    </Glass>
  );

  return (
    <div>
      <PageHeader title="Localização" subtitle="Em tempo real" back />
      <Section>
        <div className="glass relative isolate overflow-hidden p-0" style={{ height: "52dvh" }}>
          <div ref={mapEl} className="absolute inset-0 rounded-[26px]" />
          <button
            aria-label="Centralizar"
            onClick={() => {
              const pts = [mine, theirs].filter(valid).map((l) => [l!.lat!, l!.lng!]);
              if (pts.length === 2) mapRef.current?.fitBounds(pts, { padding: [70, 70] });
              else if (pts[0]) mapRef.current?.setView(pts[0], 15);
            }}
            className="glass absolute bottom-3 right-3 z-[500] grid h-11 w-11 place-items-center !rounded-full"
          >
            <Crosshair size={18} />
          </button>
          {dist !== null && (
            <div className="glass absolute left-3 top-3 z-[500] !rounded-full px-3.5 py-2 text-[13px] font-semibold">
              <MapPin size={13} className="mr-1 inline" />
              {dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`} de distância
            </div>
          )}
        </div>
      </Section>
      <Section>
        <div className="flex gap-3">
          <Card p={me} l={mine} isMe />
          <Card p={partner} l={theirs} isMe={false} />
        </div>
      </Section>
      <Section title="Privacidade">
        <Glass className="flex items-center gap-3 p-4">
          <Shield size={18} />
          <div className="flex-1">
            <p className="text-[15px] font-medium">Compartilhar minha localização</p>
            <p className="text-[12px] muted">Só seu par vê. No Android continua em segundo plano, com um aviso fixo na barra.</p>
          </div>
          <Switch checked={!!mine?.sharing} onChange={toggle} label="Compartilhar localização" />
        </Glass>
      </Section>
    </div>
  );
}
