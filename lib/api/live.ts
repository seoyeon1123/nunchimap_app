import { api } from '../api';
import type { LivePost, LiveSummary } from '../types';

export interface PostLiveInput {
  place_id: number;
  occupancy: 1 | 2 | 3;
  text?: string;
  check_in_id?: number;
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
