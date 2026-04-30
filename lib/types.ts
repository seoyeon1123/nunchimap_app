/**
 * 백엔드 API 응답 공유 타입.
 * 웹의 src/lib/places.ts 와 1:1 대응 — 추후 OpenAPI/codegen 으로 자동화 가능.
 */

export type Signal = 'green' | 'yellow' | 'red' | 'gray';
export type ReviewMethod = 'gps' | 'ocr' | 'manual';

export interface PlaceMarker {
  id: number;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  cached_signal: Signal | null;
  cached_median_duration: number | null;
  cached_checkin_count: number | null;
}

export interface PlaceDetail {
  id: number;
  name: string;
  address: string | null;
  road_address: string | null;
  lat: number;
  lng: number;
  cached_signal: Signal | null;
  cached_median_duration: number | null;
  cached_checkin_count: number | null;
  cached_updated_at: string | null;
  is_closed: boolean;
}

export interface RecentReview {
  id: number;
  method: ReviewMethod;
  signal: 'green' | 'yellow' | 'red';
  duration_min: number | null;
  text_review: string | null;
  created_at: string;
}

export interface TagAgg {
  code: string;
  label: string;
  yes: number;
  total: number;
}

export interface PlaceDetailResponse {
  place: PlaceDetail;
  recent_reviews: RecentReview[];
  tags: TagAgg[];
  verified_count: number;
  is_favorited?: boolean; // 로그인 사용자만 채워짐
}

export interface MyCheckIn {
  id: number;
  place_id: number;
  place_name: string | null;
  method: ReviewMethod;
  signal: 'green' | 'yellow' | 'red';
  duration_min: number | null;
  created_at: string;
}
