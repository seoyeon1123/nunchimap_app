import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMe } from '@/lib/hooks/useAuth';
import { startGpsCheckIn } from '@/lib/api/checkins';
import { ApiError } from '@/lib/api';
import { getCurrentLocationOrPrompt } from '@/lib/location';
import {
  fontSize,
  fontWeight,
  palette,
  radius,
  shadow,
  spacing,
} from '@/constants/Theme';

export default function CheckInScreen() {
  const { placeId } = useLocalSearchParams<{ placeId: string }>();
  const id = Number(placeId);
  const router = useRouter();
  const { data: me, isLoading: meLoading } = useMe();
  const [busy, setBusy] = useState(false);

  if (meLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={palette.text} />
      </View>
    );
  }
  if (!me) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>로그인이 필요합니다.</Text>
        <Pressable
          style={styles.linkBtn}
          onPress={() => router.replace('/(tabs)/two')}
        >
          <Text style={styles.linkText}>로그인하러 가기</Text>
        </Pressable>
      </View>
    );
  }

  async function handleGps() {
    const loc = await getCurrentLocationOrPrompt(Location.Accuracy.High);
    if (!loc) return;
    setBusy(true);
    try {
      const res = await startGpsCheckIn({
        place_id: id,
        gps_lat: loc.latitude,
        gps_lng: loc.longitude,
        accuracy_m: loc.accuracy ?? undefined,
      });
      router.replace(
        `/check-out/${res.check_in_id}?place=${encodeURIComponent(res.place_name)}`,
      );
    } catch (e) {
      const msg =
        e instanceof ApiError && (e.body as { error?: string })?.error
          ? (e.body as { error: string }).error
          : e instanceof Error
            ? e.message
            : '체크인 시작 실패';
      Alert.alert('체크인 실패', msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.title}>어떻게 체크인할까요?</Text>

      <Pressable
        style={[styles.method, styles.methodPrimary]}
        onPress={handleGps}
        disabled={busy}
      >
        <View style={styles.methodIconWrap}>
          {busy ? (
            <ActivityIndicator color="white" />
          ) : (
            <FontAwesome name="location-arrow" size={20} color="white" />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.methodTitle}>지금 GPS로 체크인</Text>
          <Text style={styles.methodHint}>
            카페 100m 이내에서 시작 → 나갈 때 마무리
          </Text>
        </View>
      </Pressable>

      <Pressable
        style={styles.method}
        onPress={() => router.push(`/review/manual/${id}`)}
        disabled={busy}
      >
        <View style={styles.methodIconWrapDark}>
          <FontAwesome name="pencil" size={18} color={palette.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.methodTitle, styles.methodTitleDark]}>
            지난 방문 직접 입력
          </Text>
          <Text style={styles.methodHint}>
            이미 다녀온 곳을 한 번에 작성
          </Text>
        </View>
        <FontAwesome name="angle-right" size={16} color={palette.textDim} />
      </Pressable>

      <View style={[styles.method, styles.methodDisabled]}>
        <View style={styles.methodIconWrapDark}>
          <FontAwesome name="file-text-o" size={18} color={palette.textDim} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.methodTitle, styles.methodTitleDisabled]}>
            영수증 OCR
          </Text>
          <Text style={styles.methodHint}>준비 중</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: palette.bg },
  container: { padding: spacing.md, gap: spacing.sm },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: palette.bg,
  },
  title: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold as '700',
    color: palette.text,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  method: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    ...shadow.sm,
  },
  methodPrimary: { backgroundColor: palette.primary },
  methodDisabled: { opacity: 0.6 },
  methodIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconWrapDark: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodTitle: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold as '700',
    color: 'white',
  },
  methodTitleDark: { color: palette.text },
  methodTitleDisabled: { color: palette.textDim },
  methodHint: {
    fontSize: fontSize.caption,
    color: palette.textDim,
    marginTop: 2,
  },
  muted: { color: palette.textMuted, fontSize: fontSize.body },
  linkBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: palette.primary,
    borderRadius: radius.pill,
  },
  linkText: {
    color: 'white',
    fontWeight: fontWeight.semibold as '600',
    fontSize: fontSize.body,
  },
});
