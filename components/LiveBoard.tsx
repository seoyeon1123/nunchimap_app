import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPlaceLive, reportLive } from '@/lib/api/live';
import { ApiError } from '@/lib/api';
import {
  fontSize,
  fontWeight,
  palette,
  radius,
  shadow,
  spacing,
} from '@/constants/Theme';
import type { LivePost } from '@/lib/types';

const OCCUPANCY_LABEL: Record<1 | 2 | 3, string> = {
  1: '널널',
  2: '보통',
  3: '만석',
};

const OCCUPANCY_COLOR: Record<1 | 2 | 3, string> = {
  1: palette.green,
  2: palette.yellow,
  3: palette.red,
};

interface Props {
  placeId: number;
  /** PlaceDetail 응답의 live_summary — 라이브 글 0개라도 active_count>0 이면 카드 노출 */
  hasAny: boolean;
}

export default function LiveBoard({ placeId, hasAny }: Props) {
  const [expanded, setExpanded] = useState(false);

  const live = useQuery({
    queryKey: ['live', placeId],
    queryFn: () => fetchPlaceLive(placeId),
    enabled: hasAny,
    refetchInterval: 60_000, // 1분마다 자동 새로고침
    staleTime: 30_000,
  });

  if (!hasAny) return null;

  if (live.isLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={palette.text} />
      </View>
    );
  }

  if (!live.data) return null;

  const { posts, summary } = live.data;
  const hasPosts = posts.length > 0;
  const hasActive = summary.active_count > 0;

  // fetch 후 둘 다 0이면 카드 자체 숨김 (방금 만료된 경우)
  if (!hasPosts && !hasActive) return null;

  const visible = expanded ? posts : posts.slice(0, 3);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <Text style={styles.headerSubtle}>
          {hasActive
            ? `지금 ${summary.active_count}명 카공 중`
            : minutesAgoLabel(summary.last_at)}
        </Text>
      </View>

      {hasPosts ? (
        <>
          <OccupancyBar mean={summary.occupancy_mean} count={summary.count} />
          <View style={styles.divider} />
          <View style={{ gap: spacing.sm }}>
            {visible.map((p) => (
              <LiveRow key={p.id} post={p} placeId={placeId} />
            ))}
          </View>
          {posts.length > 3 ? (
            <Pressable
              onPress={() => setExpanded((v) => !v)}
              style={styles.moreBtn}
              hitSlop={8}
            >
              <Text style={styles.moreBtnText}>
                {expanded ? '접기' : `+${posts.length - 3}개 더보기`}
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <Text style={styles.emptyHint}>
          체크인은 있지만 한 줄 후기는 아직이에요.
        </Text>
      )}
    </View>
  );
}

function LiveRow({ post, placeId }: { post: LivePost; placeId: number }) {
  const qc = useQueryClient();
  const reportMut = useMutation({
    mutationFn: () => reportLive(post.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['live', placeId] });
      qc.invalidateQueries({ queryKey: ['place', placeId] });
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

  function onLongPress() {
    Alert.alert('이 라이브 글 신고', '부적절한 내용인가요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '신고',
        style: 'destructive',
        onPress: () => reportMut.mutate(),
      },
    ]);
  }

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={500}
      style={styles.row}
    >
      <View
        style={[
          styles.occDot,
          { backgroundColor: OCCUPANCY_COLOR[post.occupancy] },
        ]}
      />
      <View style={{ flex: 1 }}>
        {post.text ? (
          <Text style={styles.rowText}>{post.text}</Text>
        ) : (
          <Text style={styles.rowTextEmpty}>
            좌석 {OCCUPANCY_LABEL[post.occupancy]}
          </Text>
        )}
        <Text style={styles.rowMeta}>
          {OCCUPANCY_LABEL[post.occupancy]} · {minutesAgoText(post.minutes_ago)}
        </Text>
      </View>
    </Pressable>
  );
}

function OccupancyBar({
  mean,
  count,
}: {
  mean: number | null;
  count: number;
}) {
  if (mean == null) return null;
  // 1=널널, 2=보통, 3=만석 → 0~1 비율
  const ratio = Math.min(1, Math.max(0, (mean - 1) / 2));
  const color =
    mean < 1.7 ? palette.green : mean < 2.4 ? palette.yellow : palette.red;
  const label = mean < 1.7 ? '널널' : mean < 2.4 ? '보통' : '만석';
  return (
    <View style={styles.occBar}>
      <View style={styles.occTrack}>
        <View
          style={[
            styles.occFill,
            { width: `${ratio * 100}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={[styles.occLabel, { color }]}>
        {label} ({count}명 응답)
      </Text>
    </View>
  );
}

function minutesAgoText(min: number): string {
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  return `${Math.floor(min / 60)}시간 전`;
}

function minutesAgoLabel(iso: string | null): string {
  if (!iso) return '—';
  const min = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 60_000),
  );
  return `최근 ${minutesAgoText(min)}`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: palette.redSoft,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.red,
  },
  liveText: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.bold as '700',
    color: palette.red,
    letterSpacing: 0.5,
  },
  headerSubtle: {
    fontSize: fontSize.micro,
    color: palette.textMuted,
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.border,
  },
  occBar: { gap: 4 },
  occTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.subtle,
    overflow: 'hidden',
  },
  occFill: {
    height: '100%',
    borderRadius: 3,
  },
  occLabel: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.semibold as '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  occDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  rowText: {
    fontSize: fontSize.small,
    color: palette.text,
    lineHeight: 19,
  },
  rowTextEmpty: {
    fontSize: fontSize.small,
    color: palette.textMuted,
    fontStyle: 'italic',
  },
  rowMeta: {
    fontSize: fontSize.micro,
    color: palette.textDim,
    marginTop: 2,
  },
  moreBtn: {
    alignSelf: 'flex-start',
    paddingTop: spacing.xs,
  },
  moreBtnText: {
    fontSize: fontSize.caption,
    color: palette.textMuted,
    fontWeight: fontWeight.medium as '500',
  },
  emptyHint: {
    fontSize: fontSize.caption,
    color: palette.textMuted,
    fontStyle: 'italic',
  },
});
