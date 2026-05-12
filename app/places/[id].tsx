import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import SignalBadge from '@/components/SignalBadge';
import PopularTimes from '@/components/PopularTimes';
import LiveBoard from '@/components/LiveBoard';
import LivePostComposer from '@/components/LivePostComposer';
import {
  addFavorite,
  fetchPlaceDetail,
  removeFavorite,
  voteTag,
} from '@/lib/api/places';
import { fetchActiveCheckIn, reportCheckIn, startGpsCheckIn } from '@/lib/api/checkins';
import { getCurrentLocationOrPrompt } from '@/lib/location';
import { scheduleCheckInReminder } from '@/lib/checkInReminder';
import { useMe } from '@/lib/hooks/useAuth';
import { useLocationStore } from '@/lib/store';
import { formatDistanceWithWalk, haversineMeters } from '@/lib/geo';
import { ApiError } from '@/lib/api';
import { METHOD_LABEL, SIGNAL_DOT, TAG_LABEL } from '@/lib/labels';
import {
  fontSize,
  fontWeight,
  palette,
  radius,
  shadow,
  spacing,
} from '@/constants/Theme';
import type { Signal } from '@/lib/types';

export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const placeId = Number(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const userLocation = useLocationStore((s) => s.userLocation);
  const [composerOpen, setComposerOpen] = useState(false);
  const [startingCheckIn, setStartingCheckIn] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['place', placeId],
    queryFn: () => fetchPlaceDetail(placeId),
    enabled: Number.isFinite(placeId),
  });

  // 리뷰 작성 후 router.replace 로 돌아오면 캐시된 stale 데이터가 잠깐 보이는 문제.
  // 화면이 포커스될 때마다 invalidate 해서 항상 최신 데이터를 받게 한다.
  useFocusEffect(
    useCallback(() => {
      qc.invalidateQueries({ queryKey: ['place', placeId] });
    }, [qc, placeId]),
  );

  // 라이브 공유 버튼 노출 조건은 백엔드 PlaceDetailResponse.can_post_live 그대로 사용
  // (진행 중 체크인 + 종료 후 30분 grace 모두 커버)
  const canShareLive = !!data?.can_post_live;
  const hasActiveCheckin = !!data?.has_active_checkin;

  // 활성 체크인의 check_in_id 가 필요할 때만 따로 조회
  const activeCheckIn = useQuery({
    queryKey: ['active-checkin'],
    queryFn: fetchActiveCheckIn,
    enabled: !!me && hasActiveCheckin,
    staleTime: 30_000,
  });

  const tagVoteMutation = useMutation({
    mutationFn: ({ code, vote }: { code: string; vote: boolean }) =>
      voteTag(placeId, code, vote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['place', placeId] });
    },
    onError: (e) => {
      const msg =
        e instanceof ApiError && (e.body as { error?: string })?.error
          ? (e.body as { error: string }).error
          : e instanceof Error
            ? e.message
            : '투표 실패';
      Alert.alert('실패', msg);
    },
  });

  const reportMutation = useMutation({
    mutationFn: (checkInId: number) => reportCheckIn(checkInId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['place', placeId] });
      Alert.alert('신고 접수', '검토 후 처리할게요.');
    },
    onError: (e) => {
      const msg =
        e instanceof ApiError && (e.body as { error?: string })?.error
          ? (e.body as { error: string }).error
          : e instanceof Error
            ? e.message
            : '신고 실패';
      Alert.alert('실패', msg);
    },
  });

  function confirmReport(checkInId: number) {
    if (!me) {
      Alert.alert('로그인 필요', '신고는 로그인 후 사용할 수 있어요.');
      return;
    }
    Alert.alert('리뷰 신고', '부적절한 내용인가요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '신고',
        style: 'destructive',
        onPress: () => reportMutation.mutate(checkInId),
      },
    ]);
  }

  const favMutation = useMutation({
    mutationFn: (next: boolean) =>
      next ? addFavorite(placeId) : removeFavorite(placeId),
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: ['place', placeId] });
      const prev = qc.getQueryData(['place', placeId]);
      qc.setQueryData(['place', placeId], (old: typeof data) =>
        old ? { ...old, is_favorited: next } : old,
      );
      return { prev };
    },
    onError: (_e, _next, ctx) => {
      if (ctx?.prev) qc.setQueryData(['place', placeId], ctx.prev);
      Alert.alert('실패', '즐겨찾기 변경 실패');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['place', placeId] });
      qc.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  function toggleFav() {
    if (!me) {
      Alert.alert('로그인 필요', '즐겨찾기는 로그인 후 사용할 수 있어요.');
      return;
    }
    favMutation.mutate(!data?.is_favorited);
  }

  /**
   * 카공 시작 — 확인 Alert → GPS 인증 → check-in 시작 → 1시간 알림 예약.
   * 별도 화면으로 안 보내고 카페 상세 그대로 둔 채 active 상태로 전환.
   */
  function handleStartStudy() {
    if (!me) {
      Alert.alert('로그인 필요', '카공 시작은 로그인 후 사용할 수 있어요.');
      return;
    }
    if (!data) return;
    const placeName = data.place.name;
    Alert.alert(
      '카공 시작',
      `"${placeName}"에서 카공을 시작할까요?\n현재 위치를 인증해 라이브로 공유돼요.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '시작',
          onPress: async () => {
            setStartingCheckIn(true);
            try {
              const loc = await getCurrentLocationOrPrompt(Location.Accuracy.High);
              if (!loc) {
                setStartingCheckIn(false);
                return;
              }
              const res = await startGpsCheckIn({
                place_id: placeId,
                gps_lat: loc.latitude,
                gps_lng: loc.longitude,
                accuracy_m: loc.accuracy ?? undefined,
              });
              void scheduleCheckInReminder(res.check_in_id, res.place_name);
              qc.invalidateQueries({ queryKey: ['active-checkin'] });
              qc.invalidateQueries({ queryKey: ['place', placeId] });
            } catch (e) {
              const msg =
                e instanceof ApiError && (e.body as { error?: string })?.error
                  ? (e.body as { error: string }).error
                  : e instanceof Error
                    ? e.message
                    : '카공 시작 실패';
              Alert.alert('실패', msg);
            } finally {
              setStartingCheckIn(false);
            }
          },
        },
      ],
    );
  }

  function handleTagPress(code: string) {
    if (!me) {
      Alert.alert('로그인 필요', '태그 투표하려면 로그인하세요.');
      return;
    }
    Alert.alert(`"${TAG_LABEL[code] ?? code}" 태그`, '이 카페에 해당하나요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '아니오',
        onPress: () => tagVoteMutation.mutate({ code, vote: false }),
      },
      {
        text: '네',
        onPress: () => tagVoteMutation.mutate({ code, vote: true }),
      },
    ]);
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={palette.text} />
      </View>
    );
  }
  if (isError || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          장소를 불러오지 못했습니다.{'\n'}
          {error instanceof Error ? error.message : ''}
        </Text>
      </View>
    );
  }

  const { place, recent_reviews, tags, verified_count } = data;
  const sig: Signal = place.cached_signal ?? 'gray';
  const distanceText = userLocation
    ? formatDistanceWithWalk(
        haversineMeters(
          { lat: userLocation.lat, lng: userLocation.lng },
          { lat: place.lat, lng: place.lng },
        ),
      )
    : null;

  return (
    <View style={styles.scroll}>
      <Stack.Screen options={{ title: place.name }} />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: insets.bottom + 96 },
        ]}
      >
      {/* 헤더 카드 */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <SignalBadge signal={sig} />
          <Pressable
            onPress={toggleFav}
            disabled={favMutation.isPending}
            hitSlop={10}
            style={styles.starBtn}
          >
            <FontAwesome
              name={data.is_favorited ? 'star' : 'star-o'}
              size={22}
              color={data.is_favorited ? palette.accent : palette.textDim}
            />
          </Pressable>
        </View>
        <Text style={styles.name}>{place.name}</Text>
        {place.road_address || place.address ? (
          <View style={styles.addressRow}>
            <FontAwesome
              name="map-marker"
              size={12}
              color={palette.textDim}
              style={{ marginRight: 4 }}
            />
            <Text style={styles.address}>
              {place.road_address ?? place.address}
            </Text>
          </View>
        ) : null}
        {distanceText ? (
          <View style={styles.addressRow}>
            <FontAwesome
              name="location-arrow"
              size={11}
              color={palette.textDim}
              style={{ marginRight: 4 }}
            />
            <Text style={styles.address}>{distanceText}</Text>
          </View>
        ) : null}
      </View>

      <LiveBoard
        placeId={placeId}
        hasAny={
          (data.live_summary?.count ?? 0) > 0 ||
          (data.live_summary?.active_count ?? 0) > 0
        }
      />

      <PopularTimes
        placeId={placeId}
        activeCount={data.live_summary?.active_count ?? 0}
      />

      {/* 통계 */}
      <View style={styles.statRow}>
        <Stat
          label="평균 체류"
          value={
            place.cached_median_duration != null
              ? `${(place.cached_median_duration / 60).toFixed(1)}h`
              : '—'
          }
        />
        <View style={styles.statDivider} />
        <Stat label="검증 리뷰" value={`${verified_count}`} />
        <View style={styles.statDivider} />
        <Stat
          label="총 체크인"
          value={`${place.cached_checkin_count ?? 0}`}
        />
      </View>

      {/* 태그 — 탭하면 투표 */}
      {tags.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>태그 (탭해서 투표)</Text>
          <View style={styles.tagWrap}>
            {tags.map((t) => {
              const pct =
                t.total > 0 ? Math.round((t.yes / t.total) * 100) : 0;
              const label = TAG_LABEL[t.code] ?? t.label;
              const strong = pct >= 60;
              return (
                <Pressable
                  key={t.code}
                  onPress={() => handleTagPress(t.code)}
                  disabled={tagVoteMutation.isPending}
                  style={[styles.tagPill, strong && styles.tagPillStrong]}
                >
                  <Text
                    style={[
                      styles.tagText,
                      strong && styles.tagTextStrong,
                    ]}
                  >
                    {label}
                  </Text>
                  <Text
                    style={[
                      styles.tagPct,
                      strong && styles.tagPctStrong,
                    ]}
                  >
                    {pct}%
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* 최근 리뷰 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>최근 리뷰 (길게 누르면 신고)</Text>
        {recent_reviews.length === 0 ? (
          <Text style={styles.muted}>아직 리뷰가 없어요.</Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {recent_reviews.map((r) => (
              <Pressable
                key={r.id}
                onLongPress={() => confirmReport(r.id)}
                delayLongPress={500}
                style={styles.reviewItem}
              >
                <View style={styles.reviewHead}>
                  <Text style={styles.reviewSignal}>
                    {SIGNAL_DOT[r.signal]}
                  </Text>
                  <Text style={styles.reviewMeta}>
                    {METHOD_LABEL[r.method]}
                    {r.duration_min != null
                      ? ` · ${(r.duration_min / 60).toFixed(1)}h`
                      : ''}
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Text style={styles.reviewDate}>
                    {new Date(r.created_at).toLocaleDateString('ko-KR')}
                  </Text>
                </View>
                {r.text_review ? (
                  <Text style={styles.reviewText}>{r.text_review}</Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        )}
      </View>

      </ScrollView>

      <View
        style={[
          styles.actions,
          { paddingBottom: Math.max(insets.bottom, spacing.sm) },
        ]}
      >
        {hasActiveCheckin && activeCheckIn.data ? (
          // 카공 진행 중 — [라이브 공유] + [카공 종료]
          <>
            {canShareLive ? (
              <Pressable
                style={[styles.btn, styles.ghost]}
                onPress={() => setComposerOpen(true)}
              >
                <FontAwesome name="bullhorn" size={14} color={palette.text} />
                <Text style={styles.ghostText}>라이브 공유</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.btn, styles.primary]}
              onPress={() =>
                router.push(
                  `/check-out/${activeCheckIn.data!.check_in_id}?place=${encodeURIComponent(place.name)}`,
                )
              }
            >
              <FontAwesome name="check" size={15} color="white" />
              <Text style={styles.primaryText}>카공 종료</Text>
            </Pressable>
          </>
        ) : (
          // 시작 전 — [리뷰 작성] + [카공 시작]
          <>
            <Pressable
              style={[styles.btn, styles.ghost]}
              onPress={() => router.push(`/check-in/${placeId}`)}
              disabled={startingCheckIn}
            >
              <FontAwesome name="pencil" size={14} color={palette.text} />
              <Text style={styles.ghostText}>리뷰 작성</Text>
            </Pressable>
            <Pressable
              style={[
                styles.btn,
                styles.primary,
                startingCheckIn && { opacity: 0.6 },
              ]}
              onPress={handleStartStudy}
              disabled={startingCheckIn}
            >
              {startingCheckIn ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <FontAwesome name="location-arrow" size={15} color="white" />
                  <Text style={styles.primaryText}>카공 시작</Text>
                </>
              )}
            </Pressable>
          </>
        )}
      </View>

      <LivePostComposer
        visible={composerOpen}
        placeId={placeId}
        placeName={place.name}
        onClose={() => setComposerOpen(false)}
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: palette.bg },
  container: { padding: spacing.md, gap: spacing.md },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: palette.bg,
  },
  errorText: { color: palette.red, textAlign: 'center' },
  heroCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadow.sm,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  starBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold as '700',
    color: palette.text,
  },
  addressRow: { flexDirection: 'row', alignItems: 'center' },
  address: {
    fontSize: fontSize.small,
    color: palette.textMuted,
    flex: 1,
  },
  statRow: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    ...shadow.sm,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold as '700',
    color: palette.text,
  },
  statLabel: {
    fontSize: fontSize.micro,
    color: palette.textMuted,
    fontWeight: fontWeight.medium as '500',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: palette.border,
    alignSelf: 'stretch',
    marginVertical: spacing.xs,
  },
  section: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.sm,
  },
  sectionTitle: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold as '700',
    color: palette.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: palette.subtle,
    borderWidth: 1,
    borderColor: palette.border,
  },
  tagPillStrong: {
    backgroundColor: palette.accentSoft,
    borderColor: palette.accent,
  },
  tagText: {
    fontSize: fontSize.caption,
    color: palette.textMuted,
    fontWeight: fontWeight.medium as '500',
  },
  tagTextStrong: { color: palette.accent, fontWeight: '700' },
  tagPct: { fontSize: fontSize.micro, color: palette.textDim },
  tagPctStrong: { color: palette.accent, fontWeight: '700' },
  reviewItem: { gap: spacing.xs + 2, paddingVertical: 4 },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reviewSignal: { fontSize: 14 },
  reviewMeta: {
    fontSize: fontSize.caption,
    color: palette.textMuted,
    fontWeight: fontWeight.medium as '500',
  },
  reviewDate: { fontSize: fontSize.micro, color: palette.textDim },
  reviewText: {
    fontSize: fontSize.small,
    color: palette.text,
    lineHeight: 20,
  },
  muted: { color: palette.textMuted, fontSize: fontSize.small },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: palette.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    paddingVertical: 14,
    borderRadius: radius.md,
    ...shadow.md,
  },
  primary: { flex: 1, backgroundColor: palette.primary },
  primaryText: {
    color: 'white',
    fontWeight: fontWeight.semibold as '600',
    fontSize: fontSize.body,
  },
  ghost: {
    flex: 1,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  ghostText: {
    color: palette.text,
    fontWeight: fontWeight.semibold as '600',
    fontSize: fontSize.body,
  },
});
