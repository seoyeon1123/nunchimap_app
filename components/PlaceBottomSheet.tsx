import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import SignalBadge from './SignalBadge';
import {
  fontSize,
  fontWeight,
  palette,
  radius,
  shadow,
  spacing,
} from '@/constants/Theme';
import { useLocationStore } from '@/lib/store';
import { formatDistance, haversineMeters, walkMinutes } from '@/lib/geo';
import type { PlaceMarker, Signal } from '@/lib/types';

type Props = {
  place: PlaceMarker | null;
  onClose: () => void;
};

export default function PlaceBottomSheet({ place, onClose }: Props) {
  const router = useRouter();
  const userLocation = useLocationStore((s) => s.userLocation);
  if (!place) return null;
  const sig: Signal = place.cached_signal ?? 'gray';
  const distMeters = userLocation
    ? haversineMeters(
        { lat: userLocation.lat, lng: userLocation.lng },
        { lat: place.lat, lng: place.lng },
      )
    : null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={styles.handle} />

        <View style={styles.headerRow}>
          <View style={{ flex: 1, gap: spacing.xs + 2 }}>
            <Text style={styles.name} numberOfLines={1}>
              {place.name}
            </Text>
            {place.address ? (
              <Text style={styles.address} numberOfLines={1}>
                {place.address}
              </Text>
            ) : null}
          </View>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <FontAwesome name="close" size={16} color={palette.textDim} />
          </Pressable>
        </View>

        <View style={styles.metaRow}>
          <SignalBadge signal={sig} />
          {distMeters != null ? (
            <View style={styles.metaItem}>
              <FontAwesome
                name="location-arrow"
                size={11}
                color={palette.textMuted}
              />
              <Text style={styles.metaText}>
                {formatDistance(distMeters)} · 도보 {walkMinutes(distMeters)}분
              </Text>
            </View>
          ) : null}
          {place.cached_median_duration != null ? (
            <View style={styles.metaItem}>
              <FontAwesome name="clock-o" size={11} color={palette.textMuted} />
              <Text style={styles.metaText}>
                평균 {(place.cached_median_duration / 60).toFixed(1)}h
              </Text>
            </View>
          ) : null}
          {place.cached_checkin_count != null ? (
            <View style={styles.metaItem}>
              <FontAwesome name="check" size={11} color={palette.textMuted} />
              <Text style={styles.metaText}>
                {place.cached_checkin_count}건
              </Text>
            </View>
          ) : null}
        </View>

        <Pressable
          style={styles.primaryBtn}
          onPress={() => router.push(`/places/${place.id}`)}
        >
          <Text style={styles.primaryBtnText}>상세 보기</Text>
          <FontAwesome name="angle-right" size={18} color={palette.textOnPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    ...shadow.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.border,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  name: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold as '700',
    color: palette.text,
  },
  address: { fontSize: fontSize.small, color: palette.textMuted },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: {
    fontSize: fontSize.caption,
    color: palette.textMuted,
    fontWeight: fontWeight.medium as '500',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: palette.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  primaryBtnText: {
    color: palette.textOnPrimary,
    fontWeight: fontWeight.semibold as '600',
    fontSize: fontSize.body,
  },
});
