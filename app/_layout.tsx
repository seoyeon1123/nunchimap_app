import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import 'react-native-reanimated';

import { isDark, palette } from '@/constants/Theme';
import { setOnUnauthorized } from '@/lib/api';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

const baseNav = isDark ? DarkTheme : DefaultTheme;
const navTheme = {
  ...baseNav,
  colors: {
    ...baseNav.colors,
    background: palette.bg,
    card: palette.surface,
    text: palette.text,
    border: palette.border,
    primary: palette.text,
  },
};

function RootLayoutNav() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: 1 },
        },
      }),
  );

  // 401 발생 시 me 캐시 무효화 + 사용자에게 안내
  useEffect(() => {
    setOnUnauthorized(() => {
      queryClient.setQueryData(['me'], null);
      queryClient.invalidateQueries({ queryKey: ['my-checkins'] });
      Alert.alert(
        '로그인이 만료되었어요',
        '다시 로그인해주세요.',
        [{ text: '확인' }],
      );
    });
    return () => setOnUnauthorized(null);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navTheme}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: palette.surface },
            headerTitleStyle: { fontWeight: '700', color: palette.text },
            headerShadowVisible: false,
            headerTintColor: palette.text,
            // iOS: 뒤로가기 옆에 이전 라우트명 표시 안 함 (chevron 만)
            headerBackButtonDisplayMode: 'minimal',
            headerBackTitle: ' ',
            contentStyle: { backgroundColor: palette.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="welcome"
            options={{
              headerShown: false,
              presentation: 'fullScreenModal',
              gestureEnabled: false,
            }}
          />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          <Stack.Screen name="places/[id]" options={{ title: '' }} />
          <Stack.Screen
            name="search"
            options={{ title: '검색', presentation: 'modal' }}
          />
          <Stack.Screen
            name="check-in/[placeId]"
            options={{ title: '체크인' }}
          />
          <Stack.Screen
            name="check-out/[checkInId]"
            options={{ title: '리뷰 남기기' }}
          />
          <Stack.Screen
            name="review/manual/[placeId]"
            options={{ title: '리뷰 작성' }}
          />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
