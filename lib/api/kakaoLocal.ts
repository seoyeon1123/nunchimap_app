/**
 * 카카오 로컬 API — 카페가 우리 DB 에 없을 때 보조 검색으로 사용.
 * REST API 키는 OAuth 와 동일 (EXPO_PUBLIC_KAKAO_REST_API_KEY).
 */
import { KAKAO_REST_API_KEY } from '../config';

export interface KakaoLocalPlace {
  id: string;           // 카카오 place id
  place_name: string;
  address_name: string | null;
  road_address_name: string | null;
  category_name: string | null;
  lat: number;
  lng: number;
}

interface KakaoKeywordDoc {
  id: string;
  place_name: string;
  address_name?: string;
  road_address_name?: string;
  category_name?: string;
  x: string; // lng
  y: string; // lat
}

interface KakaoKeywordResponse {
  documents: KakaoKeywordDoc[];
}

/**
 * 카카오 키워드 검색 — 카페 카테고리(CE7) 로 좁힘.
 * `near` 좌표가 있으면 그 주변 우선.
 */
export async function searchKakaoCafes(
  q: string,
  near?: { lat: number; lng: number },
): Promise<KakaoLocalPlace[]> {
  if (!KAKAO_REST_API_KEY) return [];
  const params = new URLSearchParams({
    query: q,
    category_group_code: 'CE7', // 카페
    size: '15',
  });
  if (near) {
    params.set('x', String(near.lng));
    params.set('y', String(near.lat));
    params.set('radius', '5000');
    params.set('sort', 'distance');
  }
  const res = await fetch(
    `https://dapi.kakao.com/v2/local/search/keyword.json?${params.toString()}`,
    {
      headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` },
    },
  );
  if (!res.ok) {
    throw new Error(`카카오 검색 실패 (${res.status})`);
  }
  const data = (await res.json()) as KakaoKeywordResponse;
  return data.documents.map((d) => ({
    id: d.id,
    place_name: d.place_name,
    address_name: d.address_name ?? null,
    road_address_name: d.road_address_name ?? null,
    category_name: d.category_name ?? null,
    lat: Number(d.y),
    lng: Number(d.x),
  }));
}
