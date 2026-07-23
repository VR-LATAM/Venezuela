/* eslint-disable @typescript-eslint/no-explicit-any */
declare namespace google {
  namespace maps {
    class Map { constructor(el: HTMLElement, opts?: any); }
    class LatLng { constructor(lat: number, lng: number); }

    function importLibrary(name: string): Promise<any>;

    interface MapsLibrary       { Map: typeof Map }
    interface MarkerLibrary     { AdvancedMarkerElement: typeof marker.AdvancedMarkerElement }
    interface VisualizationLibrary { HeatmapLayer: typeof visualization.HeatmapLayer }

    namespace marker {
      class AdvancedMarkerElement {
        constructor(opts?: any);
        position: any;
        map: any;
      }
    }

    namespace visualization {
      class HeatmapLayer {
        constructor(opts?: any);
        setMap(map: any): void;
        setData(data: any): void;
      }
    }
  }
}
