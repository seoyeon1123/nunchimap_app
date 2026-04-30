/**
 * 거리/시간 유틸 — haversine 기반.
 */

const R = 6_371_000; // 지구 반지름 m

export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(sa));
}

/** "320m" 또는 "1.2km" 형태로 포맷 */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

/** 도보 기준 — 1.4 m/s ≈ 분당 84m */
export function walkMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / 84));
}

export function formatDistanceWithWalk(meters: number): string {
  return `${formatDistance(meters)} · 도보 ${walkMinutes(meters)}분`;
}
