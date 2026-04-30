import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFilterStore } from '@/lib/store';
import { SIGNAL_LABEL, TAG_CODES, TAG_LABEL } from '@/lib/labels';
import {
  SIGNAL_COLOR,
  fontSize,
  fontWeight,
  palette,
  radius,
  shadow,
  spacing,
} from '@/constants/Theme';
import type { Signal } from '@/lib/types';

const SIGNALS: Signal[] = ['green', 'yellow', 'red', 'gray'];

export default function FilterChips() {
  const visibleSignals = useFilterStore((s) => s.visibleSignals);
  const requiredTags = useFilterStore((s) => s.requiredTags);
  const toggleSignal = useFilterStore((s) => s.toggleSignal);
  const toggleTag = useFilterStore((s) => s.toggleTag);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {SIGNALS.map((s) => {
        const on = visibleSignals.includes(s);
        const c = SIGNAL_COLOR[s];
        return (
          <Pressable
            key={s}
            onPress={() => toggleSignal(s)}
            style={[
              styles.chip,
              on && { backgroundColor: c.bg, borderColor: c.fg },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: c.fg }]} />
            <Text
              style={[
                styles.chipText,
                on && { color: c.fg, fontWeight: '700' },
              ]}
            >
              {SIGNAL_LABEL[s]}
            </Text>
          </Pressable>
        );
      })}

      <View style={styles.divider} />

      {TAG_CODES.map((code) => {
        const on = requiredTags.includes(code);
        return (
          <Pressable
            key={code}
            onPress={() => toggleTag(code)}
            style={[styles.chip, on && styles.chipActiveDark]}
          >
            <Text style={[styles.chipText, on && styles.chipTextActive]}>
              {TAG_LABEL[code] ?? code}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 18,
    backgroundColor: palette.borderStrong,
    marginHorizontal: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    ...shadow.sm,
  },
  chipActiveDark: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  chipText: {
    fontSize: fontSize.caption,
    color: palette.textMuted,
    fontWeight: fontWeight.medium as '500',
  },
  chipTextActive: {
    color: palette.textOnPrimary,
    fontWeight: fontWeight.semibold as '600',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
