// Diseñado por: Edward Labrador  ·  Para: ELITE GROUP - Integral Services LLC
'use client';

import { useEffect, useRef } from 'react';
import type { HeatPoint } from '@/lib/api';
import { mapsLoader as loader } from '@/lib/mapsLoader';

interface HeatMapProps {
  points: HeatPoint[];
  height?: number;
  center?: { lat: number; lng: number };
  zoom?:   number;
}

export function HeatMap({ points, height = 480, center = { lat: 31.0, lng: -99.0 }, zoom = 6 }: HeatMapProps) {
  const mapRef  = useRef<HTMLDivElement>(null);
  const layerRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const mapInst  = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    loader.load().then(async () => {
      if (!mapRef.current) return;

      const { Map: GMap } = await google.maps.importLibrary('maps') as google.maps.MapsLibrary;
      const { HeatmapLayer } = await google.maps.importLibrary('visualization') as google.maps.VisualizationLibrary;

      if (!mapInst.current) {
        mapInst.current = new GMap(mapRef.current, {
          center,
          zoom,
          mapId: 'VERONARIDE_HEATMAP',
          mapTypeControl: false,
          streetViewControl: false,
        });
      }

      if (layerRef.current) layerRef.current.setMap(null);

      const heatData = points.map(p => ({
        location: new google.maps.LatLng(p.lat, p.lng),
        weight:   p.weight,
      }));

      layerRef.current = new HeatmapLayer({
        data:   heatData,
        map:    mapInst.current,
        radius: 30,
        opacity: 0.7,
      });
    });
  }, [points, center, zoom]);

  return (
    <div
      ref={mapRef}
      style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden' }}
    />
  );
}
