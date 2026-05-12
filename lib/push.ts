/**
 * 푸시 알림 권한 요청 + Expo Push 토큰 발급 + 백엔드 등록.
 *
 * 호출 시점: 사용자가 로그인 직후 (useAuth) — 권한 거부돼도 흐름은 계속.
 * Expo Go: dev 환경에선 EAS projectId 가 필요. 누락되면 토큰 발급 자체가 실패할 수 있음.
 */
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { registerPushToken, unregisterPushToken } from './api/pushTokens';

const STORAGE_KEY = 'nm_push_token';

// 앱이 foreground 일 때 알림 도착 시 표시 방식
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * 권한 요청 + 토큰 발급 → 백엔드 등록.
 *  - 거부됐거나 시뮬레이터면 조용히 null 반환.
 *  - 새 토큰이면 AsyncStorage 에 저장.
 *  - 이미 동일 토큰 등록돼 있으면 백엔드 호출 생략 (네트워크 절약).
 */
export async function ensurePushRegistered(): Promise<string | null> {
  if (!Device.isDevice) return null; // 시뮬레이터는 토큰 안 줌

  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return null;

    // Android 채널 — heads-up 알림용
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF7A45',
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants.easConfig as { projectId?: string } | undefined)?.projectId;

    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenResponse.data;
    if (!token) return null;

    const cached = await AsyncStorage.getItem(STORAGE_KEY);
    if (cached === token) return token; // 이미 백엔드에 등록돼 있음

    await registerPushToken({
      token,
      platform:
        Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web'
          ? Platform.OS
          : undefined,
    });
    await AsyncStorage.setItem(STORAGE_KEY, token);
    return token;
  } catch (e) {
    // 푸시는 부가 기능 — 실패해도 앱 흐름 막지 않음
    // eslint-disable-next-line no-console
    console.warn('[push] ensurePushRegistered failed', e);
    return null;
  }
}

/**
 * 로그아웃 직전 호출 — 서버에서 토큰 제거 + 로컬 캐시 제거.
 */
export async function clearPushRegistration(): Promise<void> {
  const cached = await AsyncStorage.getItem(STORAGE_KEY);
  if (cached) {
    try {
      await unregisterPushToken(cached);
    } catch {
      // 무시
    }
  }
  await AsyncStorage.removeItem(STORAGE_KEY);
}
