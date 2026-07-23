// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Hook compartido para controles de zoom del mapa
// Usado en driver/home y passenger/home
// ═══════════════════════════════════════════════════════════════

import { useRef, RefObject } from 'react';
import MapView from 'react-native-maps';

type Coords = { latitude: number; longitude: number };

const DEFAULT_ZOOM = 17;
const ZOOM_STEP    = 2;
const ZOOM_MIN     = 10;
const ZOOM_MAX     = 21;

export function useMapZoom(mapRef: RefObject<MapView>) {
  const mapZoomRef = useRef(DEFAULT_ZOOM);

  const handleZoomIn = async () => {
    const camera  = await mapRef.current?.getCamera();
    const newZoom = Math.min((camera?.zoom ?? mapZoomRef.current) + ZOOM_STEP, ZOOM_MAX);
    mapZoomRef.current = newZoom;
    mapRef.current?.animateCamera({ zoom: newZoom }, { duration: 300 });
  };

  const handleZoomOut = async () => {
    const camera  = await mapRef.current?.getCamera();
    const newZoom = Math.max((camera?.zoom ?? mapZoomRef.current) - ZOOM_STEP, ZOOM_MIN);
    mapZoomRef.current = newZoom;
    mapRef.current?.animateCamera({ zoom: newZoom }, { duration: 300 });
  };

  // center es opcional: si GPS aún no tiene fix, solo resetea el zoom sin mover el centro
  const handleZoomReset = (center?: Coords | null) => {
    mapZoomRef.current = DEFAULT_ZOOM;
    if (center) {
      mapRef.current?.animateCamera({ center, zoom: DEFAULT_ZOOM }, { duration: 400 });
    } else {
      mapRef.current?.animateCamera({ zoom: DEFAULT_ZOOM }, { duration: 400 });
    }
  };

  return { mapZoomRef, handleZoomIn, handleZoomOut, handleZoomReset };
}
