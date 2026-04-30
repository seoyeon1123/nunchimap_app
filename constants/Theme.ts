import { Appearance, Platform, ViewStyle } from 'react-native';

/**
 * 눈치맵 디자인 시스템 — 팔레트, 간격, 라운딩, 그림자, 타이포.
 * 모든 화면/컴포넌트는 이 토큰을 참조해 일관성 유지.
 *
 * 다크모드: 앱 시작 시 한 번 결정 (Appearance.getColorScheme).
 * 사용자가 런타임에 테마 변경 시 앱 재시작 필요 — 흔한 패턴.
 */

const lightPalette = {
  bg: '#F7F7F8',
  surface: '#FFFFFF',
  subtle: '#F1F1F3',
  overlay: 'rgba(0,0,0,0.5)',

  border: '#E5E7EB',
  borderStrong: '#D1D5DB',

  text: '#111827',
  textMuted: '#6B7280',
  textDim: '#9CA3AF',
  textOnPrimary: '#FFFFFF',

  primary: '#111827',
  accent: '#FF7A45',
  accentSoft: '#FFE9DF',

  green: '#10B981',
  greenSoft: '#D1FAE5',
  yellow: '#F59E0B',
  yellowSoft: '#FEF3C7',
  red: '#EF4444',
  redSoft: '#FEE2E2',
  gray: '#9CA3AF',
  graySoft: '#F3F4F6',
} as const;

const darkPalette: typeof lightPalette = {
  bg: '#0B0B0E',
  surface: '#16161B',
  subtle: '#1F1F25',
  overlay: 'rgba(0,0,0,0.7)',

  border: '#2A2A33',
  borderStrong: '#3A3A45',

  text: '#F3F4F6',
  textMuted: '#9CA3AF',
  textDim: '#6B7280',
  textOnPrimary: '#0B0B0E',

  primary: '#F3F4F6',
  accent: '#FF7A45',
  accentSoft: '#3D2418',

  green: '#10B981',
  greenSoft: '#0F2D24',
  yellow: '#F59E0B',
  yellowSoft: '#3A2C0F',
  red: '#EF4444',
  redSoft: '#3A1818',
  gray: '#6B7280',
  graySoft: '#1F1F25',
};

export const isDark = Appearance.getColorScheme() === 'dark';
export const palette = isDark ? darkPalette : lightPalette;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;

export const fontSize = {
  micro: 11,
  caption: 12,
  small: 13,
  body: 15,
  title: 17,
  heading: 20,
  display: 24,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const shadow: { sm: ViewStyle; md: ViewStyle; lg: ViewStyle } = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
    },
    android: { elevation: 1 },
    default: {},
  }) as ViewStyle,
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 4 },
    default: {},
  }) as ViewStyle,
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.16,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 10 },
    default: {},
  }) as ViewStyle,
};

export const SIGNAL_COLOR = {
  green: { fg: palette.green, bg: palette.greenSoft },
  yellow: { fg: palette.yellow, bg: palette.yellowSoft },
  red: { fg: palette.red, bg: palette.redSoft },
  gray: { fg: palette.gray, bg: palette.graySoft },
} as const;
