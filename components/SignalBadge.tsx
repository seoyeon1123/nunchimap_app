import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SIGNAL_LABEL } from '@/lib/labels';
import { SIGNAL_COLOR, fontSize, fontWeight, radius, spacing } from '@/constants/Theme';
import type { Signal } from '@/lib/types';

type Props = {
  signal: Signal;
  size?: 'sm' | 'md';
  style?: ViewStyle;
};

export default function SignalBadge({ signal, size = 'md', style }: Props) {
  const c = SIGNAL_COLOR[signal];
  const padH = size === 'sm' ? 8 : 10;
  const padV = size === 'sm' ? 4 : 6;
  const fs = size === 'sm' ? fontSize.micro : fontSize.caption;
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: c.bg, paddingHorizontal: padH, paddingVertical: padV },
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: c.fg }]} />
      <Text style={[styles.label, { color: c.fg, fontSize: fs }]}>
        {SIGNAL_LABEL[signal]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontWeight: fontWeight.semibold as '600',
  },
});
