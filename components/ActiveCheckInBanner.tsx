import { useEffect, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { fetchActiveCheckIn } from '@/lib/api/checkins';
import { useMe } from '@/lib/hooks/useAuth';
import {
  fontSize,
  fontWeight,
  palette,
  radius,
  shadow,
  spacing,
} from '@/constants/Theme';

interface Props {
  style?: StyleProp<ViewStyle>;
}

export default function ActiveCheckInBanner({ style }: Props = {}) {
  const router = useRouter();
  const { data: me } = useMe();

  const { data } = useQuery({
    queryKey: ['active-checkin'],
    queryFn: fetchActiveCheckIn,
    enabled: !!me,
    refetchInterval: 60_000,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const [elapsedMin, setElapsedMin] = useState(0);

  useEffect(() => {
    if (!data) return;
    const tick = () => {
      const min = Math.max(
        0,
        Math.floor((Date.now() - new Date(data.started_at).getTime()) / 60_000),
      );
      setElapsedMin(min);
    };
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, [data]);

  if (!data) return null;

  const placeName = data.place_name ?? `카페 #${data.place_id}`;
  const elapsedText =
    elapsedMin < 60
      ? `${elapsedMin}분째`
      : `${Math.floor(elapsedMin / 60)}시간 ${elapsedMin % 60}분째`;

  return (
    <Pressable
      style={[styles.wrap, style]}
      onPress={() =>
        router.push(
          `/check-out/${data.check_in_id}?place=${encodeURIComponent(placeName)}`,
        )
      }
    >
      <View style={styles.dot}>
        <View style={styles.dotInner} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          {placeName}
        </Text>
        <Text style={styles.subtitle}>{elapsedText} 체크인 중 · 마무리하기</Text>
      </View>
      <FontAwesome name="angle-right" size={18} color="white" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.accent,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    ...shadow.md,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
  },
  title: {
    color: 'white',
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold as '700',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: fontSize.caption,
    marginTop: 2,
    fontWeight: fontWeight.medium as '500',
  },
});
