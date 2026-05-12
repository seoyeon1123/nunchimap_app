import { api } from '../api';

export interface StartCheckInResponse {
  check_in_id: number;
  started_at: string;
  place_name: string;
}

export async function startGpsCheckIn(input: {
  place_id: number;
  gps_lat: number;
  gps_lng: number;
  accuracy_m?: number;
}): Promise<StartCheckInResponse> {
  return api<StartCheckInResponse>('/api/check-ins/start', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export interface FinishCheckInResponse {
  ok: boolean;
  duration_min: number;
  place_id: number;
}

export async function finishGpsCheckIn(
  checkInId: number,
  input: {
    signal: 'green' | 'yellow' | 'red';
    tags?: string[];
    text?: string;
  },
): Promise<FinishCheckInResponse> {
  return api<FinishCheckInResponse>(`/api/check-ins/${checkInId}/finish`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export interface ManualCheckInResponse {
  ok: boolean;
  check_in_id: number;
}

export async function postManualReview(input: {
  place_id: number;
  duration_min: number;
  signal: 'green' | 'yellow' | 'red';
  tags?: string[];
  text?: string;
}): Promise<ManualCheckInResponse> {
  return api<ManualCheckInResponse>('/api/check-ins/manual', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function deleteCheckIn(
  checkInId: number,
): Promise<{ ok: boolean; place_id: number }> {
  return api<{ ok: boolean; place_id: number }>(
    `/api/check-ins/${checkInId}`,
    { method: 'DELETE' },
  );
}

export interface ActiveCheckIn {
  check_in_id: number;
  place_id: number;
  place_name: string | null;
  started_at: string;
}

export async function fetchActiveCheckIn(): Promise<ActiveCheckIn | null> {
  const data = await api<{ active: ActiveCheckIn | null }>(
    '/api/check-ins/active',
  );
  return data.active;
}

export async function reportCheckIn(
  checkInId: number,
  reason?: string,
): Promise<{ ok: boolean; place_id: number }> {
  return api<{ ok: boolean; place_id: number }>(
    `/api/check-ins/${checkInId}/report`,
    {
      method: 'POST',
      body: JSON.stringify({ reason: reason ?? null }),
    },
  );
}
