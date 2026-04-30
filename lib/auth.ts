/**
 * 카카오 OAuth — Expo Go 에서도 동작하게 expo-auth-session 의 PKCE 흐름 사용.
 * 받은 code 는 백엔드 /api/auth/kakao-app 에서 카카오 토큰으로 교환되고
 * 우리 JWT 가 응답으로 반환됨.
 *
 * 카카오 디벨로퍼스 → 앱 설정 → 플랫폼 → Web 에 redirect URI 등록 필요:
 *   exp://<dev-server>           ← Expo Go (개발)
 *   nunchimap://                 ← 빌드된 앱 (URL scheme: app.json scheme 와 일치)
 *
 * authorize 화면에 카카오는 https 만 허용 — 그래서 백엔드의 /api/auth/kakao/callback 을
 * proxy 로 한 번 거치게 만들고, 백엔드가 다시 앱 deep link 로 redirect 하는 패턴이
 * 가장 안전하지만, MVP 단계에선 직접 redirect 시도.
 */
import * as AuthSession from 'expo-auth-session';
import { API_BASE_URL } from './config';
import { api } from './api';
import { setToken, clearToken } from './token';

const DISCOVERY = {
  authorizationEndpoint: 'https://kauth.kakao.com/oauth/authorize',
  tokenEndpoint: 'https://kauth.kakao.com/oauth/token',
};

export interface MeUser {
  id: number;
  nickname: string;
}

/**
 * 카카오 로그인 트리거. 성공 시 user 반환, 실패 시 throw.
 * 컴포넌트에서 useAuthRequest 훅을 쓰는 게 일반적이지만, 여기선 1회성 함수형 흐름이면
 * 호출부가 단순해지므로 startAsync 패턴 사용.
 */
export async function loginWithKakao(clientId: string): Promise<MeUser> {
  // Kakao 는 exp:// 거부 → Expo Go 에선 localhost URL 로 우회.
  // expo-auth-session 이 인앱 브라우저의 redirect 를 URL 매칭으로 인터셉트하므로
  // localhost 에 실제 서버가 없어도 OK.
  // 빌드된 앱(EAS) 에선 nunchimap:// 스킴이 진짜 동작하니까 makeRedirectUri 사용.
  const isExpoGo = !!(globalThis as { Expo?: { isDevice?: boolean } }).Expo
    || process.env.EXPO_PUBLIC_RUNTIME !== 'standalone';
  const redirectUri = isExpoGo
    ? 'http://localhost:8081/auth/kakao/callback'
    : AuthSession.makeRedirectUri({ scheme: 'nunchimap' });
  // 카카오 디벨로퍼스에 등록할 정확한 값 확인용
  // eslint-disable-next-line no-console
  console.log('[auth] kakao redirect_uri =', redirectUri);

  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    scopes: ['profile_nickname', 'profile_image'],
    usePKCE: false, // 카카오는 PKCE 미지원 (Confidential Client)
  });
  await request.makeAuthUrlAsync(DISCOVERY);
  const result = await request.promptAsync(DISCOVERY);

  if (result.type !== 'success') {
    throw new Error(`로그인 실패 (${result.type})`);
  }
  const code = result.params.code;
  if (!code) throw new Error('인증 코드 없음');

  // 백엔드가 카카오와 토큰 교환 후 우리 JWT 반환
  const data = await api<{ token: string; user: MeUser }>(
    '/api/auth/kakao-app',
    {
      method: 'POST',
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    },
  );
  await setToken(data.token);
  return data.user;
}

export async function logout(): Promise<void> {
  await clearToken();
}

export async function fetchMe(): Promise<MeUser | null> {
  try {
    const data = await api<{ user: MeUser | null }>('/api/me');
    return data.user;
  } catch {
    return null;
  }
}

// 미사용 import 경고 방지 — Vercel 배포 후 base 확인 디버그용으로 노출
export const _BASE = API_BASE_URL;
