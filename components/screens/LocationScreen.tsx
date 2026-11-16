'use client';

import 'leaflet/dist/leaflet.css';
import { Battery, Crosshair, Layers, LocateFixed, MapPin, Navigation, Route, Shield } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { Avatar, Glass, PageHeader, Section, Switch } from '@/components/ui/primitives';
import { ensureLocationPermission, isNative, openExternal } from '@/lib/native';
import type { LocationRow, Profile } from '@/lib/types';
import { firstName, initials, timeAgo } from '@/lib/utils';

function distanceKm(a: LocationRow, b: LocationRow) {
  const R = 6371;
  const dLat = ((b.lat! - a.lat!) * Math.PI) / 180;
  const dLng = ((b.lng! - a.lng!) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat! * Math.PI) / 180) * Math.cos((b.lat! * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

const geoCache = new Map<string, string>();
let geoQueue = Promise.resolve();
/** Endereço aproximado (OpenStreetMap / Nominatim — gratuito). */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geoCache.has(key)) return geoCache.get(key)!;
  const run = async () => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=pt-BR`);
      const j = await r.json();
      const a = j.address ?? {};
      const street = [a.road ?? a.pedestrian ?? a.footway, a.house_number].filter(Boolean).join(', ');
      const area = a.suburb ?? a.neighbourhood ?? a.quarter ?? a.village;
      const city = a.city ?? a.town ?? a.municipality;
      const txt = [street, area, city].filter(Boolean).join(' · ') || j.display_name || '';
      geoCache.set(key, txt);
      return txt;
    } catch {
      return '';
    }
  };
  const p = geoQueue.then(run);
  geoQueue = p.then(() => new Promise((r) => setTimeout(r, 1100)));
  return p;
}

function useAddress(l?: LocationRow) {
  const [addr, setAddr] = useState('');
  const lat = l?.lat, lng = l?.lng;
  useEffect(() => {
    if (lat == null || lng == null) return setAddr('');
    let on = true;
    reverseGeocode(lat, lng).then((t) => on && setAddr(t));
    return () => { on = false; };
  }, [lat, lng]);
  return addr;
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
  const [sat, setSat] = useState(false);
  const fitted = useRef(false);
  const [live, setLive] = useState<LocationRow | null>(null);
  const locs = rows('locations');
  const stored = locs.find((l) => l.id === me?.id);
  // posição do próprio aparelho em tempo real (GPS), mais precisa que a última salva
  const mine: LocationRow | undefined = stored ? (live && stored.sharing ? { ...stored, ...live, sharing: stored.sharing } : stored) : undefined;
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
      if (sat) {
        // satélite de alta resolução (Esri World Imagery — gratuito) + nomes de ruas
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '© Esri · Maxar', maxZoom: 20, maxNativeZoom: 19 }).addTo(map);
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', { maxZoom: 20, maxNativeZoom: 19, opacity: 0.85 }).addTo(map);
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 20, maxNativeZoom: 19 }).addTo(map);
      } else {
        L.tileLayer(`https://{s}.basemaps.cartocdn.com/${resolvedTheme === 'light' ? 'rastertiles/voyager' : 'dark_all'}/{z}/{x}/{y}{r}.png`, {
          attribution: '© OpenStreetMap · © CARTO',
          maxZoom: 20,
          maxNativeZoom: 19,
        }).addTo(map);
      }
    })();
  }, [ready, resolvedTheme, sat]);

  // GPS do próprio aparelho enquanto a tela está aberta
  useEffect(() => {
    if (!stored?.sharing) return;
    let stop = () => {};
    let alive = true;
    (async () => {
      const set = (lat: number, lng: number, accuracy: number | null, speed: number | null) =>
        alive && setLive({ id: me?.id ?? '', sharing: true, lat, lng, accuracy: accuracy != null ? Math.round(accuracy) : null, speed, battery: stored?.battery ?? null, updatedAt: new Date().toISOString() });
      if (isNative()) {
        const { Geolocation } = await import('@capacitor/geolocation');
        const id = await Geolocation.watchPosition({ enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 }, (p) => p && set(p.coords.latitude, p.coords.longitude, p.coords.accuracy, p.coords.speed ?? null)).catch(() => null);
        stop = () => { if (id) Geolocation.clearWatch({ id }); };
      } else if (navigator.geolocation) {
        const id = navigator.geolocation.watchPosition((p) => set(p.coords.latitude, p.coords.longitude, p.coords.accuracy, p.coords.speed), () => {}, { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 });
        stop = () => navigator.geolocation.clearWatch(id);
      }
      if (!alive) stop();
    })();
    return () => { alive = false; stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored?.sharing]);

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
      if (!fitted.current) {
        if (pts.length === 2) mapRef.current.fitBounds(pts, { padding: [70, 70], maxZoom: 17 });
        else if (pts.length === 1) mapRef.current.setView(pts[0], 17);
        if (pts.length) fitted.current = true;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, mine?.lat, mine?.lng, mine?.accuracy, theirs?.lat, theirs?.lng, me?.avatarUrl, partner?.avatarUrl]);

  const myAddr = useAddress(mine?.sharing ? mine : undefined);
  const theirAddr = useAddress(theirs);
  if (!me || !partner) return null;
  const toggle = async (v: boolean) => {
    if (v && !(await ensureLocationPermission(true))) return;
    save('locations', { id: me.id, sharing: v, lat: mine?.lat ?? null, lng: mine?.lng ?? null, accuracy: mine?.accuracy ?? null, speed: mine?.speed ?? null, battery: mine?.battery ?? null, updatedAt: new Date().toISOString() });
  };
  const dist = valid(mine) && valid(theirs) ? distanceKm(mine!, theirs!) : null;

  const Card = ({ p, l, isMe, addr }: { p: Profile; l?: LocationRow; isMe: boolean; addr: string }) => {
    return (
    <Glass className="min-w-0 flex-1 p-4">
      <div className="flex items-center gap-2">
        <Avatar profile={p} size={30} />
        <p className="truncate text-[14px] font-semibold">{isMe ? 'Você' : firstName(p.displayName)}</p>
      </div>
      {valid(l) && (isMe ? l!.sharing : true) ? (
        <div className="mt-2 space-y-0.5 text-[12px] muted">
          {addr && <p className="line-clamp-2 text-[12.5px] font-medium text-black dark:text-white">{addr}</p>}
          <p>Atualizado {timeAgo(l!.updatedAt)}{l!.accuracy ? ` · ±${l!.accuracy} m` : ''}</p>
          {l!.speed != null && l!.speed > 1 && <p className="flex items-center gap-1"><Navigation size={11} /> {Math.round(l!.speed * 3.6)} km/h</p>}
          {l!.battery != null && <p className="flex items-center gap-1"><Battery size={12} /> {l!.battery}%</p>}
        </div>
      ) : (
        <p className="mt-2 text-[12px] muted">{isMe ? 'Compartilhamento desligado' : 'Não está compartilhando'}</p>
      )}
      {!isMe && valid(l) && (
        <button onClick={() => openExternal(`https://www.google.com/maps/dir/?api=1&destination=${l!.lat},${l!.lng}&travelmode=driving`)} className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-black text-[12.5px] font-semibold text-white dark:bg-white dark:text-black">
          <Route size={14} /> Como chegar
        </button>
      )}
    </Glass>
    );
  };

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
          <button aria-label="Minha posição" onClick={() => valid(mine) && mapRef.current?.setView([mine!.lat!, mine!.lng!], 18)} className="glass absolute bottom-16 right-3 z-[500] grid h-11 w-11 place-items-center !rounded-full">
            <LocateFixed size={18} />
          </button>
          <button aria-label="Satélite" onClick={() => setSat((v) => !v)} className="glass absolute right-3 top-3 z-[500] flex h-11 items-center gap-1.5 !rounded-full px-3.5 text-[12.5px] font-semibold">
            <Layers size={16} /> {sat ? 'Mapa' : 'Satélite'}
          </button>
          {!mine?.sharing && (
            <div className="absolute inset-x-3 bottom-3 z-[600] rounded-[22px] bg-black/80 p-4 text-white backdrop-blur-xl">
              <p className="text-[14px] font-semibold">Ative sua localização</p>
              <p className="mt-0.5 text-[12px] text-white/60">Usa o GPS do celular para mostrar onde você está, com precisão de poucos metros.</p>
              <button onClick={() => toggle(true)} className="mt-3 h-10 w-full rounded-full bg-white text-[14px] font-semibold text-black">Compartilhar minha localização</button>
            </div>
          )}
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
          <Card p={me} l={mine} isMe addr={myAddr} />
          <Card p={partner} l={theirs} isMe={false} addr={theirAddr} />
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
