import { useEffect, useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  fontSize,
  fontWeight,
  palette,
  radius,
  shadow,
  spacing,
} from '@/constants/Theme';

const AUTO_DISMISS_MS = 2500;

export default function WelcomeScreen() {
  const router = useRouter();
  const dismissedRef = useRef(false);

  function dismiss() {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    router.back();
  }

  // 자동 dismiss
  useEffect(() => {
    const t = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStart() {
    dismiss();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.heroWrap}>
        <Image
          source={require('@/assets/images/mainImage.png')}
          style={styles.heroImage}
          resizeMode="contain"
        />
      </View>

      <View style={styles.copyWrap}>
        <Text style={styles.eyebrow}>NUNCHIMAP</Text>
        <Text style={styles.title}>
          카공하기 좋은{'\n'}카페, 한눈에
        </Text>
        <Text style={styles.subtitle}>
          실시간 신호로 카페 분위기를 미리 확인하고{'\n'}
          내 취향에 맞는 자리를 찾아보세요.
        </Text>

        <View style={styles.bullets}>
          <Bullet icon="🟢" label="카공 OK · 애매 · 비추 시그널" />
          <Bullet icon="📍" label="GPS 체크인으로 검증된 후기" />
          <Bullet icon="🔌" label="콘센트 / Wi-Fi / 조용함 태그" />
        </View>

        <Pressable style={styles.cta} onPress={handleStart}>
          <Text style={styles.ctaText}>시작하기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Bullet({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.bullet}>
      <Text style={styles.bulletIcon}>{icon}</Text>
      <Text style={styles.bulletText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
    paddingHorizontal: spacing.lg,
  },
  heroWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: 250,
    height: 250,
  },
  copyWrap: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  eyebrow: {
    fontSize: fontSize.micro,
    color: palette.accent,
    fontWeight: fontWeight.bold as '700',
    letterSpacing: 2,
  },
  title: {
    fontSize: 30,
    fontWeight: fontWeight.bold as '700',
    color: palette.text,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: fontSize.body,
    color: palette.textMuted,
    lineHeight: 22,
  },
  bullets: {
    marginTop: spacing.sm,
    gap: spacing.sm,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.sm,
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bulletIcon: { fontSize: 18 },
  bulletText: {
    fontSize: fontSize.small,
    color: palette.text,
    fontWeight: fontWeight.medium as '500',
    flex: 1,
  },
  cta: {
    backgroundColor: palette.primary,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    ...shadow.md,
  },
  ctaText: {
    color: palette.textOnPrimary,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold as '700',
  },
});