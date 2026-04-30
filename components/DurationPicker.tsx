import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  fontSize,
  fontWeight,
  palette,
  radius,
  spacing,
} from '@/constants/Theme';

const PRESETS: { label: string; minutes: number }[] = [
  { label: '30분', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '1.5h', minutes: 90 },
  { label: '2h', minutes: 120 },
  { label: '3h', minutes: 180 },
  { label: '3h+', minutes: 240 },
];

type Props = {
  value: number | null;
  onChange: (minutes: number) => void;
};

export default function DurationPicker({ value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      {PRESETS.map((p) => {
        const active = value === p.minutes;
        return (
          <Pressable
            key={p.minutes}
            onPress={() => onChange(p.minutes)}
            style={[styles.opt, active && styles.optActive]}
          >
            <Text style={[styles.text, active && styles.textActive]}>
              {p.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  opt: {
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    minWidth: 64,
    alignItems: 'center',
  },
  optActive: { borderColor: palette.primary, backgroundColor: palette.primary },
  text: {
    fontSize: fontSize.caption,
    color: palette.textMuted,
    fontWeight: fontWeight.semibold as '600',
  },
  textActive: { color: 'white', fontWeight: '700' },
});
