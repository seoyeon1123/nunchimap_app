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

/**
 * 개발 환경에서 GPS 를 못 받는 경우(시뮬레이터, 웹 등) 대신 사용할 좌표.
 * __DEV__ 일 때만 적용되고, 배포 빌드에서는 무시됨.
 * 끄고 싶으면 null 로 바꾸면 됨.
 *
 * 환경변수로 덮어쓰려면 .env.local 에:
 *   EXPO_PUBLIC_DEV_LAT=37.5665
 *   EXPO_PUBLIC_DEV_LNG=126.978
 */
export const DEV_USER_LOCATION: { lat: number; lng: number } | null = __DEV__
  ? {
      lat: Number(process.env.EXPO_PUBLIC_DEV_LAT ?? 37.4861165935404),
      lng: Number(process.env.EXPO_PUBLIC_DEV_LNG ?? 126.92922352724),
    }
  : null;
