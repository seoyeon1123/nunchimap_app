import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import {
  fontSize,
  fontWeight,
  palette,
  spacing,
} from '@/constants/Theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <View style={styles.container}>
        <Text style={styles.title}>화면을 찾을 수 없어요</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>지도로 돌아가기</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: palette.bg,
  },
  title: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold as '700',
    color: palette.text,
  },
  link: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
  },
  linkText: {
    fontSize: fontSize.body,
    color: palette.accent,
    fontWeight: fontWeight.semibold as '600',
  },
});
