/**
 * "리뷰 작성" 진입 화면 — 작성 방식 선택.
 *
 *  - 영수증 리뷰: OCR 미구현 (Phase 5), "준비 중" Alert 만 띄움.
 *  - 직접 입력 리뷰: /review/manual/[placeId] 로 이동.
 *
 * GPS 인증("카공 시작")은 별도 흐름이라 여기서 다루지 않음.
 * 카페 상세 화면의 "카공 시작" 버튼이 직접 처리.
 */
import { Pressable, ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMe } from '@/lib/hooks/useAuth';
import {
  fontSize,
  fontWeight,
  palette,
  radius,
  shadow,
  spacing,
} from '@/constants/Theme';

export default function ReviewMethodScreen() {
  const { placeId } = useLocalSearchParams<{ placeId: string }>();
  const id = Number(placeId);
  const router = useRouter();
  const { data: me, isLoading: meLoading } = useMe();

  if (meLoading) return <View style={styles.center} />;
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

  function handleReceipt() {
    Alert.alert(
      '준비 중',
      '영수증 리뷰는 곧 열릴 예정이에요.\n조금만 기다려주세요!',
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>어떤 리뷰를 작성할까요?</Text>

      <Pressable style={styles.method} onPress={handleReceipt}>
        <View style={styles.methodIconWrap}>
          <FontAwesome name="file-text-o" size={18} color={palette.text} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.methodTitle}>영수증 리뷰</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>준비 중</Text>
            </View>
          </View>
          <Text style={styles.methodHint}>
            영수증 사진으로 방문을 인증하고 작성
          </Text>
        </View>
      </Pressable>

      <Pressable
        style={[styles.method, styles.methodPrimary]}
        onPress={() => router.push(`/review/manual/${id}`)}
      >
        <View style={styles.methodIconWrapWhite}>
          <FontAwesome name="pencil" size={18} color="white" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.methodTitle, styles.methodTitleWhite]}>
            직접 입력 리뷰
          </Text>
          <Text style={styles.methodHintWhite}>
            방문했던 카페를 떠올리며 바로 작성
          </Text>
        </View>
        <FontAwesome name="angle-right" size={16} color="white" />
      </Pressable>
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
  methodIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconWrapWhite: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  methodTitle: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold as '700',
    color: palette.text,
  },
  methodTitleWhite: { color: 'white' },
  methodHint: {
    fontSize: fontSize.caption,
    color: palette.textDim,
    marginTop: 2,
  },
  methodHintWhite: {
    fontSize: fontSize.caption,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: palette.border,
  },
  badgeText: {
    fontSize: fontSize.micro,
    color: palette.textMuted,
    fontWeight: fontWeight.semibold as '600',
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
