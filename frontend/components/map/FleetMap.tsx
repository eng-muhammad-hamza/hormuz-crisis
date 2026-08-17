'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store';
import { STATUS_COLORS, THEMES } from '@/lib/theme';
import { haversineDistance } from '@/lib/utils';
import { Button } from '@/components/ui/primitives';
import { playSound } from '@/lib/audio';
import { AnimatedIcon } from '@/components/ui/AnimatedIcon';
import type { Ship } from '@/types';
import type * as Leaflet from 'leaflet';

type L = typeof Leaflet;

export default function FleetMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const LRef = useRef<L | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markersRef = useRef<Map<string, Leaflet.Marker>>(new Map());
  const trailsRef = useRef<Map<string, Leaflet.Polyline>>(new Map());
  const trailDataRef = useRef<Map<string, [number, number][]>>(new Map());
  const pathLinesRef = useRef<Map<string, Leaflet.Polyline>>(new Map());
  const zonesRef = useRef<Map<string, Leaflet.Polygon>>(new Map());
  const weatherRef = useRef<Map<string, Leaflet.Circle>>(new Map());
  const proxRef = useRef<Leaflet.Circle[]>([]);
  const tileRef = useRef<Leaflet.TileLayer | null>(null);
  const drawPtsRef = useRef<[number, number][]>([]);
  const drawPolyRef = useRef<Leaflet.Polyline | null>(null);
  const drawMkrsRef = useRef<Leaflet.CircleMarker[]>([]);

  const [ready, setReady] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [zoneName, setZoneName] = useState('');
  const [drawCount, setDrawCount] = useState(0);

  const {
    fleet,
    selectedShipId,
    selectShip,
    theme,
    drawingZone,
    setDrawingZone,
    send,
    role,
    pickingWaypointFor,
    setPickingWaypointFor,
  } = useStore();

  const fleetRef = useRef(fleet);
  fleetRef.current = fleet;

  // ── 1. Load Leaflet Dynamically ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    import('leaflet').then((mod) => {
      LRef.current = mod.default ?? (mod as unknown as L);
      setReady(true);
    });
  }, []);

  // ── 2. Init Map ──
  useEffect(() => {
    const L = LRef.current;
    if (!ready || !L || !containerRef.current || mapRef.current) return;

    // Fix default icon path issue in Next.js
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const cfg = THEMES[theme];
    const map = L.map(containerRef.current, {
      center: [26.2, 55.4],
      zoom: 7,
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true,
    });

    const tile = L.tileLayer(cfg.mapTile, {
      attribution: cfg.mapAttribution,
      subdomains: 'abcd',
      maxZoom: 18,
    });
    tile.addTo(map);
    tileRef.current = tile;
    mapRef.current = map;

    // Zone drawing & waypoint picking click handler
    map.on('click', (e: Leaflet.LeafletMouseEvent) => {
      const state = useStore.getState();

      // Waypoint picking
      if (state.pickingWaypointFor) {
        playSound('command');
        const waypoint: [number, number] = [e.latlng.lat, e.latlng.lng];
        state.send('issue_directive', {
          shipId: state.pickingWaypointFor,
          directiveType: 'WAYPOINT',
          params: { waypoint },
        });
        state.setPickingWaypointFor(null);
        return;
      }

      // Drawing zone
      if (!state.drawingZone || !LRef.current) return;
      playSound('click');
      const Lc = LRef.current;
      const pt: [number, number] = [e.latlng.lat, e.latlng.lng];
      drawPtsRef.current = [...drawPtsRef.current, pt];

      const mkr = Lc.circleMarker(pt, {
        radius: 6,
        color: '#F59E0B',
        fillColor: '#F59E0B',
        fillOpacity: 1,
        weight: 2,
      });
      mkr.addTo(map);
      drawMkrsRef.current.push(mkr);

      if (drawPolyRef.current) map.removeLayer(drawPolyRef.current);
      if (drawPtsRef.current.length >= 2) {
        drawPolyRef.current = Lc.polyline(drawPtsRef.current, {
          color: '#F59E0B',
          weight: 2.5,
          dashArray: '6 4',
          opacity: 0.9,
        });
        drawPolyRef.current.addTo(map);
      }
      setDrawCount((c) => c + 1);
    });

    return () => {
      map.off();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // ── 3. Swap Tile Layer on Theme Change ──
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map || !tileRef.current) return;
    const cfg = THEMES[theme];
    map.removeLayer(tileRef.current);
    const tile = L.tileLayer(cfg.mapTile, {
      attribution: cfg.mapAttribution,
      subdomains: 'abcd',
      maxZoom: 18,
    });
    tile.addTo(map);
    tileRef.current = tile;

    // Recolor weather circles to match daylight/dark console
    const isLight = theme === 'light';
    weatherRef.current.forEach((circle, k) => {
      const wzId = k.replace('wz-', '');
      const wz = fleetRef.current?.weatherZones.find((z) => z.id === wzId);
      const intensity = wz?.intensity || 'moderate';
      const col = isLight
        ? intensity === 'severe'
          ? '#0284C7'
          : intensity === 'moderate'
          ? '#0EA5E9'
          : '#38BDF8'
        : intensity === 'severe'
        ? '#F59E0B'
        : intensity === 'moderate'
        ? '#EAB308'
        : '#38BDF8';
      const strokeColor = isLight ? 'rgba(2, 132, 199, 0.45)' : col;
      circle.setStyle({
        color: strokeColor,
        fillColor: col,
        fillOpacity: isLight ? 0.03 : 0.08,
        weight: isLight ? 1.2 : 1.5,
      });
    });
  }, [theme]);

  // ── 4. Ship Marker SVG Factory ──
  const makeIcon = useCallback((ship: Ship, selected: boolean) => {
    const L = LRef.current;
    if (!L) return null;
    const color = STATUS_COLORS[ship.status] || '#00E5FF';
    const distressed = [
      'distressed',
      'out_of_fuel',
      'stranded',
    ].includes(ship.status);

    // Animated sonar distress pulse rings
    const distressRings = distressed
      ? `
      <circle cx="20" cy="20" r="12" fill="none" stroke="${color}" stroke-width="1.8">
        <animate attributeName="r" values="8;24;8" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.9;0;0.9" dur="1.5s" repeatCount="indefinite"/>
      </circle>
      <circle cx="20" cy="20" r="16" fill="none" stroke="${color}" stroke-width="1.2">
        <animate attributeName="r" values="12;28;12" dur="1.5s" begin="0.4s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.7;0;0.7" dur="1.5s" begin="0.4s" repeatCount="indefinite"/>
      </circle>
    `
      : '';

    // Selection targeting reticle
    const selectReticle = selected
      ? `
      <circle cx="20" cy="20" r="18" fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-dasharray="4 2">
        <animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="8s" repeatCount="indefinite"/>
      </circle>
    `
      : '';

    const filterId = `glow-${ship.shipId}`;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
        <defs>
          <filter id="${filterId}" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="${
              selected ? 2.5 : 1.2
            }" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        ${distressRings}
        ${selectReticle}

        <!-- Rotating Vessel Chevron -->
        <g transform="rotate(${
          ship.heading - 90
        }, 20, 20)" filter="url(#${filterId})">
          <!-- Outer directional hull -->
          <path d="M20,4 L28,29 L20,23 L12,29 Z" fill="${color}" stroke="${
      selected ? '#FFFFFF' : '#030712'
    }" stroke-width="${selected ? 1.5 : 0.8}" />
          <!-- Inner core cockpit dot -->
          <circle cx="20" cy="17" r="2.5" fill="${
            selected ? '#FFFFFF' : '#030712'
          }" opacity="0.9"/>
        </g>
      </svg>
    `;

    return L.divIcon({
      html: svg,
      className: 'leaflet-ship-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  }, []);

  // ── 5. Sync Fleet State → Leaflet Map ──
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map || !fleet) return;

    // Ships
    for (const ship of fleet.ships) {
      const isSelected = selectedShipId === ship.shipId;
      const icon = makeIcon(ship, isSelected);
      if (!icon) continue;

      // Wake trail
      if (!trailDataRef.current.has(ship.shipId)) {
        trailDataRef.current.set(ship.shipId, [
          [ship.position[0], ship.position[1]],
        ]);
      }
      const trail = trailDataRef.current.get(ship.shipId)!;
      const last = trail[trail.length - 1];
      if (
        haversineDistance(
          last[0],
          last[1],
          ship.position[0],
          ship.position[1]
        ) > 0.05
      ) {
        trail.push([ship.position[0], ship.position[1]]);
        if (trail.length > 80) trail.shift();
      }

      const trailColor = STATUS_COLORS[ship.status] || '#00E5FF';
      if (trail.length > 1) {
        const ex = trailsRef.current.get(ship.shipId);
        if (ex) {
          ex.setLatLngs(trail);
          ex.setStyle({ color: trailColor });
        } else {
          const tl = L.polyline(trail, {
            color: trailColor,
            weight: 2,
            opacity: 0.45,
            dashArray: '3 5',
          }).addTo(map);
          trailsRef.current.set(ship.shipId, tl);
        }
      }

      // Marker
      const mk = markersRef.current.get(ship.shipId);
      if (mk) {
        mk.setIcon(icon);
        mk.setLatLng(ship.position as Leaflet.LatLngExpression);
        if (isSelected) mk.setZIndexOffset(2000);
        else mk.setZIndexOffset(1000);
      } else {
        const m = L.marker(ship.position as Leaflet.LatLngExpression, {
          icon,
          zIndexOffset: 1000,
        })
          .addTo(map)
          .on('click', () => {
            playSound('click');
            selectShip(ship.shipId === selectedShipId ? null : ship.shipId);
          });

        m.bindTooltip(
          `<div style="font-family:var(--font-sans);font-size:12px;line-height:1.6;background:rgba(10, 18, 36, 0.95);border:1px solid #00E5FF;padding:8px 12px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.6)">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:4px;margin-bottom:4px">
              <b style="color:#00E5FF;font-size:13px">${ship.name}</b>
              <span style="color:#94A3B8;font-size:11px;font-family:monospace">${ship.shipId}</span>
            </div>
            <div style="color:#CBD5E1;font-size:11px">
              ${ship.cargo} · ${ship.speed} KN · ${Math.round(ship.heading)}°<br/>
              Fuel: <b style="color:#FFFFFF">${Math.round(ship.fuel)}t</b> · ${
            STATUS_COLORS[ship.status]
              ? `<span style="color:${
                  STATUS_COLORS[ship.status]
                };font-weight:bold">${ship.status.toUpperCase()}</span>`
              : ''
          }
            </div>
          </div>`,
          {
            permanent: false,
            direction: 'top',
            offset: [0, -22],
            className: 'leaflet-tooltip-custom',
            opacity: 1,
          }
        );
        markersRef.current.set(ship.shipId, m);
      }

      // Projected Navigation Route Path (for selected ship)
      if (isSelected && ship.path?.length > 1) {
        const remaining = ship.path.slice(
          Math.max(0, (ship.pathIndex || 1) - 1)
        );
        const ex = pathLinesRef.current.get(ship.shipId);
        if (ex) {
          ex.setLatLngs(remaining);
        } else {
          const pl = L.polyline(remaining, {
            color: '#00E5FF',
            weight: 3,
            opacity: 0.8,
            dashArray: '8 6',
          }).addTo(map);
          pathLinesRef.current.set(ship.shipId, pl);
        }
      } else {
        const ex = pathLinesRef.current.get(ship.shipId);
        if (ex) {
          map.removeLayer(ex);
          pathLinesRef.current.delete(ship.shipId);
        }
      }
    }

    // Proximity Collision Warning Rings (< 2km between active vessels)
    proxRef.current.forEach((c) => map.removeLayer(c));
    proxRef.current = [];
    const active = fleet.ships.filter(
      (s) => !s.arrived && s.status !== 'stopped'
    );
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        if (
          haversineDistance(
            active[i].position[0],
            active[i].position[1],
            active[j].position[0],
            active[j].position[1]
          ) < 2
        ) {
          const mid: Leaflet.LatLngExpression = [
            (active[i].position[0] + active[j].position[0]) / 2,
            (active[i].position[1] + active[j].position[1]) / 2,
          ];
          const c = L.circle(mid, {
            radius: 2000,
            color: '#FF3366',
            fillColor: '#FF3366',
            fillOpacity: 0.12,
            weight: 2,
            dashArray: '5 5',
          }).addTo(map);
          proxRef.current.push(c);
        }
      }
    }

    // Ports
    for (const port of fleet.ports) {
      const k = `port-${port.id}`;
      if (!markersRef.current.has(k)) {
        const pi = L.divIcon({
          html: `
            <div style="width:18px;height:18px;background:#030712;border:2.5px solid #00E5FF;border-radius:50%;box-shadow:0 0 12px #00E5FF;display:flex;align-items:center;justify-content:center">
              <div style="width:6px;height:6px;background:#00E5FF;border-radius:50%"></div>
            </div>`,
          className: '',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        const m = L.marker(port.position as Leaflet.LatLngExpression, {
          icon: pi,
          zIndexOffset: 500,
        }).addTo(map);
        m.bindTooltip(
          `<div style="font-family:var(--font-sans);font-size:12px;font-weight:bold;color:#00E5FF;padding:4px 8px">
            ⚓ ${port.name.toUpperCase()}
          </div>`,
          { direction: 'top', opacity: 1, className: 'leaflet-tooltip-custom' }
        );
        markersRef.current.set(k, m);
      }
    }

    // Weather Zones
    for (const wz of fleet.weatherZones) {
      const k = `wz-${wz.id}`;
      if (!weatherRef.current.has(k)) {
        const isLight = theme === 'light';
        const col = isLight
          ? wz.intensity === 'severe'
            ? '#0284C7'
            : wz.intensity === 'moderate'
            ? '#0EA5E9'
            : '#38BDF8'
          : wz.intensity === 'severe'
          ? '#F59E0B'
          : wz.intensity === 'moderate'
          ? '#EAB308'
          : '#38BDF8';
        const strokeColor = isLight ? 'rgba(2, 132, 199, 0.45)' : col;
        const c = L.circle(wz.center as Leaflet.LatLngExpression, {
          radius: wz.radius * 111000,
          color: strokeColor,
          fillColor: col,
          fillOpacity: isLight ? 0.03 : 0.08,
          weight: isLight ? 1.2 : 1.5,
          dashArray: '5 6',
        }).addTo(map);
        c.bindTooltip(
          `<div style="font-family:var(--font-sans);font-size:12px;padding:4px 6px">
            ⛈ <b>${wz.name}</b><br/>
            ${wz.intensity.toUpperCase()} · ${wz.windSpeed} KNOTS
          </div>`,
          { direction: 'top', opacity: 1 }
        );
        weatherRef.current.set(k, c);
      }
    }

    // Restricted Zones (Geofences)
    const curIds = new Set(fleet.zones.map((z) => z.id));
    zonesRef.current.forEach((ly, id) => {
      if (!curIds.has(id)) {
        map.removeLayer(ly);
        zonesRef.current.delete(id);
      }
    });

    for (const zone of fleet.zones) {
      if (!zone.active || zonesRef.current.has(zone.id)) continue;
      const poly = L.polygon(zone.polygon as Leaflet.LatLngExpression[], {
        color: '#FF3366',
        fillColor: '#FF3366',
        fillOpacity: 0.16,
        weight: 2,
        dashArray: '6 4',
      }).addTo(map);

      poly.bindTooltip(
        `<span style="font-family:var(--font-sans);font-size:12px;font-weight:bold;color:#FF3366">RESTRICTED: ${zone.name}</span>`,
        { direction: 'top', opacity: 1 }
      );

      if (role === 'command' || role === 'admin') {
        poly.on('click', () => {
          const popupId = `zone-remove-${zone.id}`;
          const html = `
            <div style="font-family:var(--font-sans);font-size:12px;padding:12px;background:#0A1224;border-radius:10px;color:#F8FAFC">
              <div style="color:#FF3366;font-weight:bold;margin-bottom:8px">RESTRICTED ZONE: ${zone.name}</div>
              <button id="${popupId}" style="background:#FF3366;color:#FFFFFF;border:none;border-radius:6px;padding:6px 14px;font-size:12px;font-weight:bold;cursor:pointer;width:100%">
                REMOVE ZONE
              </button>
            </div>`;
          poly.bindPopup(html).openPopup();
          setTimeout(() => {
            const btn = document.getElementById(popupId);
            if (btn) {
              btn.onclick = () => {
                playSound('command');
                send('remove_zone', { zoneId: zone.id });
                map.closePopup();
              };
            }
          }, 60);
        });
      }
      zonesRef.current.set(zone.id, poly);
    }
  }, [fleet, selectedShipId, makeIcon, selectShip, role, send]);

  // ── 6. Drawing Mode Reset / Setup ──
  useEffect(() => {
    if (!drawingZone) {
      const map = mapRef.current;
      if (map) {
        if (drawPolyRef.current) {
          map.removeLayer(drawPolyRef.current);
          drawPolyRef.current = null;
        }
        drawMkrsRef.current.forEach((m) => map.removeLayer(m));
        drawMkrsRef.current = [];
      }
      drawPtsRef.current = [];
      setDrawCount(0);
      setDrawing(false);
    } else {
      setDrawing(true);
    }
  }, [drawingZone]);

  const commitZone = useCallback(() => {
    const pts = drawPtsRef.current;
    if (pts.length < 3) {
      alert('Place at least 3 points on the map to define a closed zone.');
      return;
    }
    playSound('command');
    const name =
      zoneName.trim() ||
      `ZONE-${Date.now().toString(36).toUpperCase().slice(-4)}`;
    send('add_zone', {
      zone: { name, polygon: pts, reason: 'Command operator defined' },
    });
    setZoneName('');
    setDrawingZone(false);
  }, [zoneName, send, setDrawingZone]);

  return (
    <div className="absolute inset-0">
      <div
        ref={containerRef}
        className={`absolute inset-0 w-full h-full ${
          drawing || pickingWaypointFor ? 'cursor-crosshair' : ''
        }`}
      />

      {/* ── Zone Drawing HUD Banner ── */}
      <AnimatePresence>
        {drawing && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 p-4 rounded-2xl bg-slate-900/95 border border-amber-500 shadow-2xl shadow-amber-500/20 backdrop-blur-xl"
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_10px_#F59E0B] animate-pulse" />
              <span className="text-xs sm:text-sm font-bold text-amber-300 uppercase tracking-wide">
                ZONE DRAWING: {drawCount} VERTICES{' '}
                {drawCount < 3 ? `(NEED ${3 - drawCount} MORE)` : '· READY'}
              </span>
            </div>
            <input
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              placeholder="Zone identifier…"
              className="text-xs sm:text-sm px-3 py-1.5 bg-slate-950 text-slate-100 border border-slate-700 rounded-lg outline-none w-44 focus:border-amber-400"
            />
            <Button
              tone="warning"
              size="sm"
              disabled={drawCount < 3}
              onClick={commitZone}
              iconName="check"
            >
              Commit Zone
            </Button>
            <Button
              tone="ghost"
              size="sm"
              onClick={() => setDrawingZone(false)}
            >
              Cancel
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Waypoint Picking HUD Banner ── */}
      <AnimatePresence>
        {pickingWaypointFor && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 p-4 rounded-2xl bg-slate-900/95 border border-cyan-400 shadow-2xl shadow-cyan-400/25 backdrop-blur-xl"
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_#00E5FF] animate-pulse" />
              <span className="text-xs sm:text-sm font-bold text-cyan-300 uppercase tracking-wide">
                DROP WAYPOINT ON MAP FOR{' '}
                {
                  fleet?.ships.find((s) => s.shipId === pickingWaypointFor)
                    ?.name
                }
              </span>
            </div>
            <Button
              tone="ghost"
              size="sm"
              onClick={() => setPickingWaypointFor(null)}
            >
              Cancel
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tactical Map Legend ── */}
      <div className="absolute bottom-5 left-5 z-20 bg-slate-950/85 backdrop-blur-xl rounded-xl p-3.5 text-xs shadow-2xl border border-slate-800">
        <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-800/80 pb-1">
          STATUS LEGEND
        </h5>
        <div className="flex flex-col gap-1.5">
          {[
            { c: '#10B981', l: 'Normal Transit' },
            { c: '#F59E0B', l: 'Rerouting / Weather' },
            { c: '#FF3366', l: 'Mayday / Distress' },
            { c: '#64748B', l: 'Holding Position' },
            { c: '#A855F7', l: 'Mutual Aid Active' },
          ].map((item) => (
            <div key={item.l} className="flex items-center gap-2.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: item.c,
                  boxShadow: `0 0 8px ${item.c}`,
                }}
              />
              <span className="text-slate-300 font-medium text-xs">
                {item.l}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Active Restricted Zones Float List (for Command) ── */}
      {role === 'command' &&
        fleet &&
        fleet.zones.filter((z) => z.active).length > 0 &&
        !drawing && (
          <div className="absolute top-5 right-5 z-20 bg-slate-950/85 backdrop-blur-xl rounded-xl p-3.5 w-60 max-h-56 overflow-y-auto border border-slate-800 shadow-2xl">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 pb-1.5 border-b border-slate-800 flex items-center justify-between">
              <span>RESTRICTED ZONES</span>
              <span className="text-rose-400 font-bold">
                ({fleet.zones.filter((z) => z.active).length})
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {fleet.zones
                .filter((z) => z.active)
                .map((zone) => (
                  <div
                    key={zone.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-rose-400 font-semibold truncate mr-2">
                      {zone.name}
                    </span>
                    <button
                      onClick={() => {
                        playSound('command');
                        send('remove_zone', { zoneId: zone.id });
                      }}
                      className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-950/60 text-rose-300 border border-rose-500/50 hover:bg-rose-900 cursor-pointer transition-colors"
                    >
                      REMOVE
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

      {/* ── Draw Restricted Zone Button ── */}
      {role === 'command' && !drawing && (
        <button
          onClick={() => {
            playSound('click');
            setDrawingZone(true);
          }}
          className="absolute bottom-5 right-5 z-20 px-4 py-2.5 rounded-xl bg-slate-900/90 backdrop-blur-xl border border-amber-500/60 text-amber-300 hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.35)] text-xs sm:text-sm font-bold tracking-wide uppercase flex items-center gap-2 cursor-pointer transition-all shadow-xl"
        >
          <AnimatedIcon name="shield" size={16} />
          <span>DRAW RESTRICTED ZONE</span>
        </button>
      )}
    </div>
  );
}
