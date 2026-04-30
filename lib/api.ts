/**
 * Fetch 래퍼.
 *  - BASE_URL 자동 prefix
 *  - 저장된 JWT 가 있으면 Authorization: Bearer 헤더 자동 첨부
 *  - 401 이면 토큰 무효화 + 외부에 알림 (useMe 등이 invalidate 가능)
 *  - JSON 응답 자동 파싱, !ok 면 ApiError 던짐
 */
import { API_BASE_URL } from './config';
import { clearToken, getToken } from './token';

export class ApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`API ${status}`);
  }
}

// 401 발생 시 호출되는 콜백. _layout.tsx 에서 등록.
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(cb: (() => void) | null) {
  onUnauthorized = cb;
}

export async function api<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const res = await fetch(url, { ...init, headers });

  if (res.status === 401) {
    await clearToken();
    // 토큰이 있던 사용자만 강제 로그아웃 처리 — me 호출 등 익명 401 은 무시
    if (token && onUnauthorized) onUnauthorized();
  }

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  if (!res.ok) throw new ApiError(res.status, parsed);
  return parsed as T;
}
