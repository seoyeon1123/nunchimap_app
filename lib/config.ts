/**
 * 앱 설정. EXPO_PUBLIC_* 환경변수만 클라이언트 번들에 포함됨.
 * .env / .env.local 에 EXPO_PUBLIC_API_BASE_URL 정의해서 쓴다.
 *
 * 개발 시:
 *   - Expo Go (실기기): EXPO_PUBLIC_API_BASE_URL=http://<내PC IP>:3000
 *   - Web/시뮬레이터:    http://localhost:3000
 *   - 배포:              https://nunchimap.vercel.app
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export const KAKAO_REST_API_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? '';
export const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY ?? '';
