import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { fetchPopularTimes } from '@/lib/api/places';
import {
  fontSize,
  fontWeight,
  palette,
  radius,
  shadow,
  spacing,
} from '@/constants/Theme';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const MIN_SAMPLE = 5;
const HOUR_LABELS = [0, 6, 12, 18];

function kstDayOfWeek(d: Date): number {
  const kstMs = d.getTime() + 9 * 3_600_000;
  return new Date(kstMs).getUTCDay();
}

interface Props {
  placeId: number;
  activeCount: number;
}

export default function PopularTimes({ placeId, activeCount }: Props) {
  const todayDow = kstDayOfWeek(new Date());
  const [selectedDow, setSelectedDow] = useState(todayDow);

  const { data, isLoading } = useQuery({
    queryKey: ['popular-times', placeId, selectedDow],
    queryFn: () => fetchPopularTimes(placeId, selectedDow),
    staleTime: 10 * 60_000,
    placeholderData: (prev) => prev,
  });

  const nowKstHour = kstHour(new Date());
  const isToday = selectedDow === todayDow;

  if (isLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={palette.text} />
      </View>
    );
  }
  if (!data) return null;

  const dayName = DAY_NAMES[data.day_of_week] ?? '';
  const headerSub =
    activeCount > 0 ? `지금 ${activeCount}명 카공 중` : '실시간 체크인 없음';

  if (data.total < MIN_SAMPLE) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>인기 시간대 ({dayName})</Text>
          <Text style={styles.headerSub}>{headerSub}</Text>
        </View>
        <DayTabs value={selectedDow} onChange={setSelectedDow} />
        <Text style={styles.emptyHint}>
          데이터가 쌓이면 시간대별 혼잡도를 보여드릴게요. (현재 {data.total}건)
        </Text>
      </View>
    );
  }

  const max = Math.max(...data.buckets.map((b) => b.count));

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>인기 시간대 ({dayName})</Text>
        <Text style={styles.headerSub}>{headerSub}</Text>
      </View>

      <DayTabs value={selectedDow} onChange={setSelectedDow} />

      <View style={styles.chartWrap}>
        <View style={styles.bars}>
          {data.buckets.map((b) => {
            const isNow = isToday && b.hour === nowKstHour;
            const ratio = max > 0 ? b.count / max : 0;
            const heightPct =
              b.count > 0 ? Math.max(8, ratio * 100) : 0;
            return (
              <View key={b.hour} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${heightPct}%`,
                        backgroundColor: isNow
                          ? palette.primary
                          : palette.textDim,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
        <View style={styles.axisRow}>
          {HOUR_LABELS.map((h) => (
            <Text key={h} style={styles.axisLabel}>
              {h}
            </Text>
          ))}
          <Text style={styles.axisLabel}>24</Text>
        </View>
      </View>

      <Text style={styles.legend}>
        지난 90일 데이터 · 총 {data.total}건
      </Text>
    </View>
  );
}

function kstHour(d: Date): number {
  const kstMs = d.getTime() + 9 * 3_600_000;
  return new Date(kstMs).getUTCHours();
}

function DayTabs({
  value,
  onChange,
}: {
  value: number;
  onChange: (dow: number) => void;
}) {
  return (
    <View style={styles.dayRow}>
      {DAY_NAMES.map((name, i) => {
        const active = i === value;
        return (
          <Pressable
            key={i}
            onPress={() => onChange(i)}
            style={[styles.dayTab, active && styles.dayTabActive]}
            hitSlop={4}
          >
            <Text style={[styles.dayText, active && styles.dayTextActive]}>
              {name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const BAR_AREA_HEIGHT = 64;

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
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold as '700',
    color: palette.text,
  },
  headerSub: {
    fontSize: fontSize.caption,
    color: palette.textMuted,
    fontWeight: fontWeight.medium as '500',
  },
  chartWrap: { gap: 4 },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: BAR_AREA_HEIGHT,
    gap: 2,
  },
  barCol: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    flex: 1,
    backgroundColor: palette.subtle,
    borderRadius: 2,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 2,
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  axisLabel: {
    fontSize: fontSize.micro,
    color: palette.textDim,
  },
  legend: {
    fontSize: fontSize.micro,
    color: palette.textDim,
    fontStyle: 'italic',
  },
  emptyHint: {
    fontSize: fontSize.caption,
    color: palette.textMuted,
    fontStyle: 'italic',
  },
  dayRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dayTab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: palette.subtle,
    alignItems: 'center',
  },
  dayTabActive: {
    backgroundColor: palette.primary,
  },
  dayText: {
    fontSize: fontSize.caption,
    color: palette.textMuted,
    fontWeight: fontWeight.medium as '500',
  },
  dayTextActive: {
    color: palette.textOnPrimary,
    fontWeight: fontWeight.bold as '700',
  },
});
