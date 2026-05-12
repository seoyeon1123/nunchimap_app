/**
 * GPS 체크인 1시간 후 "아직 카공 중이세요?" 로컬 알림.
 *
 *  - 서버 푸시 대신 OS 가 직접 스케줄링 → Vercel cron 불필요.
 *  - 체크인 시작 시 schedule, 체크아웃/취소 시 cancel.
 *  - check_in_id → notification_id 매핑을 AsyncStorage 에 저장해 재시작 후에도 취소 가능.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const STORAGE_PREFIX = 'nm_checkin_reminder_';
const REMINDER_DELAY_SEC = 60 * 60; // 1시간

async function ensurePermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.status === 'granted';
}

export async function scheduleCheckInReminder(
  checkInId: number,
  placeName: string,
): Promise<void> {
  try {
    const ok = await ensurePermission();
    if (!ok) return;

    // 잔재가 있으면 먼저 정리
    await cancelCheckInReminder(checkInId);

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${placeName} · 1시간째 카공 중`,
        body: '아직 머무는 중이세요? 마무리하려면 탭하세요.',
        data: { type: 'checkin_reminder', check_in_id: checkInId },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: REMINDER_DELAY_SEC,
      },
    });

    await AsyncStorage.setItem(`${STORAGE_PREFIX}${checkInId}`, id);
  } catch (e) {
    // 알림은 부가 기능 — 실패해도 체크인 흐름 막지 않음
    // eslint-disable-next-line no-console
    console.warn('[reminder] schedule failed', e);
  }
}

export async function cancelCheckInReminder(checkInId: number): Promise<void> {
  const key = `${STORAGE_PREFIX}${checkInId}`;
  const id = await AsyncStorage.getItem(key);
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // 이미 발송됐거나 OS 가 자체 정리한 경우 — 무시
  }
  await AsyncStorage.removeItem(key);
}
