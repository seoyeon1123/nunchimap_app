import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SIGNAL_DOT, SIGNAL_LABEL } from '@/lib/labels';
import {
  SIGNAL_COLOR,
  fontSize,
  fontWeight,
  palette,
  radius,
  spacing,
} from '@/constants/Theme';

type ActiveSignal = 'green' | 'yellow' | 'red';
const OPTIONS: ActiveSignal[] = ['green', 'yellow', 'red'];

type Props = {
  value: ActiveSignal | null;
  onChange: (s: ActiveSignal) => void;
};

export default function SignalPicker({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((s) => {
        const active = value === s;
        const c = SIGNAL_COLOR[s];
        return (
          <Pressable
            key={s}
            onPress={() => onChange(s)}
            style={[
              styles.opt,
              active && {
                backgroundColor: c.bg,
                borderColor: c.fg,
              },
            ]}
          >
            <Text style={styles.dot}>{SIGNAL_DOT[s]}</Text>
            <Text
              style={[
                styles.label,
                active && { color: c.fg, fontWeight: '700' },
              ]}
            >
              {SIGNAL_LABEL[s]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  opt: {
    flex: 1,
    paddingVertical: spacing.md + 4,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: palette.border,
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: palette.surface,
  },
  dot: { fontSize: 22 },
  label: {
    fontSize: fontSize.small,
    color: palette.textMuted,
    fontWeight: fontWeight.semibold as '600',
  },
});
