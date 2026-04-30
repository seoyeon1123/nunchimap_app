import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TAG_CODES, TAG_LABEL } from '@/lib/labels';
import {
  fontSize,
  fontWeight,
  palette,
  radius,
  spacing,
} from '@/constants/Theme';

type Props = {
  value: string[];
  onChange: (codes: string[]) => void;
};

export default function TagPicker({ value, onChange }: Props) {
  function toggle(code: string) {
    onChange(
      value.includes(code) ? value.filter((c) => c !== code) : [...value, code],
    );
  }
  return (
    <View style={styles.wrap}>
      {TAG_CODES.map((code) => {
        const active = value.includes(code);
        return (
          <Pressable
            key={code}
            onPress={() => toggle(code)}
            style={[styles.tag, active && styles.tagActive]}
          >
            <Text style={[styles.text, active && styles.textActive]}>
              {TAG_LABEL[code] ?? code}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  tagActive: {
    borderColor: palette.primary,
    backgroundColor: palette.primary,
  },
  text: {
    fontSize: fontSize.caption,
    color: palette.textMuted,
    fontWeight: fontWeight.medium as '500',
  },
  textActive: { color: 'white', fontWeight: '700' },
});
