import { api } from '../api';
import type {
  PlaceMarker,
  PlaceDetailResponse,
  Signal,
} from '../types';

export interface PlacesQuery {
  bbox: { sw: { lat: number; lng: number }; ne: { lat: number; lng: number } };
  signals?: Signal[];
  tags?: string[];
}

export async function fetchPlacesInBbox(
  q: PlacesQuery,
): Promise<PlaceMarker[]> {
  const { sw, ne } = q.bbox;
  const params = new URLSearchParams({
    bbox: `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`,
  });
  if (q.signals && q.signals.length > 0) {
    params.set('signal', q.signals.join(','));
  }
  if (q.tags && q.tags.length > 0) {
    params.set('tags', q.tags.join(','));
  }
  const data = await api<{ places: PlaceMarker[] }>(
    `/api/places?${params.toString()}`,
  );
  return data.places;
}

export async function fetchPlaceDetail(id: number): Promise<PlaceDetailResponse> {
  return api<PlaceDetailResponse>(`/api/places/${id}`);
}

export async function searchPlaces(
  q: string,
  near?: { lat: number; lng: number },
  limit = 20,
): Promise<PlaceMarker[]> {
  const params = new URLSearchParams({ q, limit: String(limit) });
  if (near) params.set('near', `${near.lat},${near.lng}`);
  const data = await api<{ places: PlaceMarker[] }>(
    `/api/places/search?${params.toString()}`,
  );
  return data.places;
}

export async function voteTag(
  placeId: number,
  tagCode: string,
  vote: boolean,
): Promise<void> {
  await api<{ ok: boolean }>(`/api/places/${placeId}/tag-vote`, {
    method: 'POST',
    body: JSON.stringify({ tag_code: tagCode, vote }),
  });
}

export async function addFavorite(placeId: number): Promise<void> {
  await api(`/api/places/${placeId}/favorite`, { method: 'POST' });
}

export async function removeFavorite(placeId: number): Promise<void> {
  await api(`/api/places/${placeId}/favorite`, { method: 'DELETE' });
}

export async function fetchFavorites(): Promise<PlaceMarker[]> {
  const data = await api<{ places: PlaceMarker[] }>('/api/me/favorites');
  return data.places;
}

export interface CreatePlaceInput {
  kakao_place_id: string;
  name: string;
  address?: string;
  road_address?: string;
  lat: number;
  lng: number;
}

export interface CreatePlaceResponse {
  id: number;
  created: boolean;
}

export async function createPlace(
  input: CreatePlaceInput,
): Promise<CreatePlaceResponse> {
  return api<CreatePlaceResponse>('/api/places', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export interface PopularTimesResponse {
  day_of_week: number; // 0=일 ... 6=토
  total: number;
  buckets: { hour: number; count: number }[]; // 항상 24개
}

export async function fetchPopularTimes(
  placeId: number,
  dayOfWeek?: number,
): Promise<PopularTimesResponse> {
  const qs = dayOfWeek != null ? `?day=${dayOfWeek}` : '';
  return api<PopularTimesResponse>(
    `/api/places/${placeId}/popular-times${qs}`,
  );
}
