import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';

/**
 * 위치 권한 받아 현재 좌표 반환.
 * 거부됐으면 사용자에게 안내 + 설정 열기 옵션 제공.
 * 권한 거부 / 위치 조회 실패 시 null 반환.
 */
export async function getCurrentLocationOrPrompt(
  accuracy: Location.Accuracy = Location.Accuracy.Balanced,
): Promise<{ latitude: number; longitude: number; accuracy: number | null } | null> {
  const { status, canAskAgain } =
    await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    if (canAskAgain) {
      Alert.alert(
        '위치 권한 필요',
        '주변 카페를 보여주려면 위치 권한이 필요해요.',
        [{ text: '확인' }],
      );
    } else {
      // 영구 거부 — 시스템 설정으로 보내야만 다시 켤 수 있음
      Alert.alert(
        '위치 권한이 꺼져있어요',
        Platform.OS === 'ios'
          ? '설정 > 눈치맵 > 위치 에서 켜주세요.'
          : '설정 > 앱 > 눈치맵 > 권한 에서 켜주세요.',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '설정 열기',
            onPress: () => Linking.openSettings(),
          },
        ],
      );
    }
    return null;
  }

  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? null,
    };
  } catch (e) {
    Alert.alert(
      '위치 조회 실패',
      e instanceof Error ? e.message : '잠시 후 다시 시도해주세요.',
    );
    return null;
  }
}
