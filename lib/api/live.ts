import { api } from '../api';
import { API_BASE_URL } from '../config';
import { getToken } from '../token';
import type { LivePost, LiveSummary } from '../types';

export interface PostLiveInput {
  place_id: number;
  occupancy: 1 | 2 | 3;
  text?: string;
  check_in_id?: number;
  photo_url?: string;
}

export interface UploadLivePhotoResponse {
  url: string;
  path: string;
}

/**
 * 라이브 글 사진 업로드 (multipart). 응답의 url 을 받아서 postLive 에 photo_url 로 전달.
 */
export async function uploadLivePhoto(
  uri: string,
  mime: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg',
): Promise<UploadLivePhotoResponse> {
  const form = new FormData();
  const filename = `photo.${mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'}`;
  // RN 의 FormData 는 { uri, name, type } 형태의 객체를 직접 받음
  form.append('photo', {
    uri,
    name: filename,
    type: mime,
  } as unknown as Blob);

  const token = await getToken();
  const res = await fetch(`${API_BASE_URL}/api/uploads/live-photo`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!res.ok) {
    const msg =
      (parsed as { error?: string })?.error ??
      `업로드 실패 (${res.status})`;
    throw new Error(msg);
  }
  return parsed as UploadLivePhotoResponse;
}

export interface PostLiveResponse {
  id: number;
  expires_at: string;
}

export interface PlaceLiveResponse {
  posts: LivePost[];
  summary: LiveSummary;
}

export async function postLive(input: PostLiveInput): Promise<PostLiveResponse> {
  return api<PostLiveResponse>('/api/live-posts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function fetchPlaceLive(
  placeId: number,
): Promise<PlaceLiveResponse> {
  return api<PlaceLiveResponse>(`/api/places/${placeId}/live`);
}

export async function deleteLive(id: number): Promise<void> {
  await api<{ ok: boolean }>(`/api/live-posts/${id}`, { method: 'DELETE' });
}

export async function reportLive(id: number, reason?: string): Promise<void> {
  await api<{ ok: boolean }>(`/api/live-posts/${id}/report`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason ?? null }),
  });
}
