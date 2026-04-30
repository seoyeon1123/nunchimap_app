import type { PlaceMarker } from '@/lib/types';

export type MapBounds = {
  sw: { lat: number; lng: number };
  ne: { lat: number; lng: number };
  center: { lat: number; lng: number };
  level: number;
};

export type KakaoMapHandle = {
  setCenter: (lat: number, lng: number, level?: number) => void;
};

export type KakaoMapProps = {
  latitude?: number;
  longitude?: number;
  level?: number;
  markers?: PlaceMarker[];
  onBoundsChange?: (b: MapBounds) => void;
  onMarkerPress?: (placeId: number) => void;
  onReady?: () => void;
};
