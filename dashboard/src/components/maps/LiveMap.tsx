// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import { useEffect, useRef, useState } from 'react';
import type { OnlineDriver, HeatPoint } from '@/lib/api';
import { mapsLoader as loader } from '@/lib/mapsLoader';

interface LiveMapProps {
  drivers:    OnlineDriver[];
  heatPoints?: HeatPoint[];
  height?:    number;
}

const HEAT_GRADIENT = [
  'rgba(0,255,0,0)',      // transparente (sin demanda)
  'rgba(0,255,0,0.6)',    // verde
  'rgba(255,255,0,0.7)',  // amarillo
  'rgba(255,160,0,0.85)', // naranja
  'rgba(255,60,0,0.9)',   // rojo-naranja
  'rgba(220,0,0,1)',      // rojo
];

export function LiveMap({ drivers, heatPoints = [], height = 400 }: LiveMapProps) {
  const mapRef       = useRef<HTMLDivElement>(null);
  const mapInstance  = useRef<google.maps.Map | null>(null);
  const markers      = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const heatLayer    = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const [showHeat, setShowHeat] = useState(true);

  // Inicializar mapa centrado en Texas
  useEffect(() => {
    loader.load().then(async () => {
      if (!mapRef.current) return;
      const { Map: GMap } = await google.maps.importLibrary('maps') as google.maps.MapsLibrary;
      mapInstance.current = new GMap(mapRef.current, {
        center:             { lat: 31.0, lng: -99.0 },
        zoom:               6,
        mapId:              'VERONARIDE_ADMIN_MAP',
        mapTypeControl:     false,
        streetViewControl:  false,
        fullscreenControl:  true,
      });
    });
  }, []);

  // Actualizar marcadores de conductores
  useEffect(() => {
    if (!mapInstance.current) return;
    loader.load().then(async () => {
      const { AdvancedMarkerElement } = await google.maps.importLibrary('marker') as google.maps.MarkerLibrary;
      const seen = new Set<string>();

      for (const driver of drivers) {
        seen.add(driver.driverId);
        const pos = { lat: driver.latitude, lng: driver.longitude };

        if (markers.current.has(driver.driverId)) {
          markers.current.get(driver.driverId)!.position = pos;
        } else {
          const pin = document.createElement('div');
          pin.innerHTML = '🚗';
          pin.style.cssText = 'font-size:20px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
          const marker = new AdvancedMarkerElement({
            map:      mapInstance.current!,
            position: pos,
            content:  pin,
            title:    driver.name ?? driver.driverId,
          });
          markers.current.set(driver.driverId, marker);
        }
      }

      for (const [id, marker] of markers.current) {
        if (!seen.has(id)) {
          marker.map = null;
          markers.current.delete(id);
        }
      }
    });
  }, [drivers]);

  // Actualizar capa de calor cuando cambian los puntos o el toggle
  useEffect(() => {
    if (!mapInstance.current) return;
    loader.load().then(async () => {
      await google.maps.importLibrary('visualization');

      if (heatLayer.current) {
        heatLayer.current.setMap(null);
        heatLayer.current = null;
      }

      if (!showHeat || heatPoints.length === 0) return;

      const maxWeight = Math.max(...heatPoints.map(p => p.weight), 1);

      const data = heatPoints.map(p => ({
        location: new google.maps.LatLng(p.lat, p.lng),
        weight:   p.weight / maxWeight,
      }));

      heatLayer.current = new google.maps.visualization.HeatmapLayer({
        data,
        map:       mapInstance.current!,
        radius:    35,
        opacity:   0.75,
        gradient:  HEAT_GRADIENT,
      });
    });
  }, [heatPoints, showHeat]);

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={mapRef}
        style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden' }}
      />

      {/* Controles sobre el mapa */}
      <div style={{
        position: 'absolute', top: 12, left: 12,
        display: 'flex', gap: 8, flexDirection: 'column',
      }}>
        {/* Toggle heatmap */}
        <button
          onClick={() => setShowHeat(v => !v)}
          title={showHeat ? 'Ocultar zonas de demanda' : 'Mostrar zonas de demanda'}
          style={{
            background: showHeat ? 'rgba(239,68,68,0.9)' : 'rgba(255,255,255,0.9)',
            color:      showHeat ? '#fff' : '#374151',
            border:     'none',
            borderRadius: 8,
            padding:    '6px 12px',
            fontSize:   12,
            fontWeight: 600,
            cursor:     'pointer',
            backdropFilter: 'blur(4px)',
            boxShadow:  '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          🔥 {showHeat ? 'Demanda ON' : 'Demanda OFF'}
        </button>
      </div>

      {/* Leyenda */}
      {showHeat && heatPoints.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 16, left: 16,
          background: 'rgba(255,255,255,0.92)',
          borderRadius: 10,
          padding: '8px 12px',
          fontSize: 11,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          backdropFilter: 'blur(4px)',
        }}>
          <p style={{ fontWeight: 700, marginBottom: 6, color: '#111' }}>Demanda</p>
          {[
            { color: '#00cc00', label: 'Baja' },
            { color: '#ffdd00', label: 'Media' },
            { color: '#ff8c00', label: 'Alta' },
            { color: '#dc0000', label: 'Muy alta' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
              <span style={{ color: '#374151' }}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
