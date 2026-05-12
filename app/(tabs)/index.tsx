import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Location from 'expo-location';
import { getCurrentLocationOrPrompt } from '@/lib/location';
import KakaoMapView, {
  KakaoMapHandle,
  MapBounds,
} from '@/components/KakaoMapView';
import PlaceBottomSheet from '@/components/PlaceBottomSheet';
import FilterChips from '@/components/FilterChips';
import ActiveCheckInBanner from '@/components/ActiveCheckInBanner';
import { fetchPlacesInBbox } from '@/lib/api/places';
import { useFilterStore, useLocationStore, useUiStore } from '@/lib/store';
import { hasSeenOnboarding } from '@/lib/onboarding';
import { DEV_USER_LOCATION } from '@/lib/config';
import {
  fontSize,
  fontWeight,
  palette,
  radius,
  shadow,
  spacing,
} from '@/constants/Theme';
import type { PlaceMarker } from '@/lib/types';

export default function MapTab() {
  const router = useRouter();
  const mapRef = useRef<KakaoMapHandle>(null);
  const [markers, setMarkers] = useState<PlaceMarker[]>([]);
  const [selected, setSelected] = useState<PlaceMarker | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleSignals = useFilterStore((s) => s.visibleSignals);
  const requiredTags = useFilterStore((s) => s.requiredTags);
  const userLocation = useLocationStore((s) => s.userLocation);

  const pendingFromSearch = useUiStore((s) => s.pendingPlaceFromSearch);
  const setPending = useUiStore((s) => s.setPendingPlaceFromSearch);
  const lastView = useUiStore((s) => s.lastView);
  const setLastView = useUiStore((s) => s.setLastView);

  const lastBboxRef = useRef<string | null>(null);
  const lastBoundsRef = useRef<MapBounds | null>(null);
  const inflightRef = useRef<AbortController | null>(null);

  // 검색에서 선택된 장소가 들어오면 그 좌표로 이동 + 바텀시트 표시
  useEffect(() => {
    if (!pendingFromSearch) return;
    const p = pendingFromSearch;
    mapRef.current?.setCenter(p.lat, p.lng, 3);
    setSelected(p);
    setPending(null);
  }, [pendingFromSearch, setPending]);

  // 첫 설치 후 한 번만 welcome 표시 (이후엔 사용자가 명시적으로 다시 볼 수 없음)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const seen = await hasSeenOnboarding();
      if (!cancelled && !seen) router.push('/welcome');
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const onBoundsChange = useCallback(
    async (b: MapBounds) => {
      lastBoundsRef.current = b;
      // 마지막 지도 위치 저장 — 다음 앱 실행 때 복원
      setLastView({ lat: b.center.lat, lng: b.center.lng, level: b.level });
      const key = `${b.sw.lng.toFixed(4)},${b.sw.lat.toFixed(4)},${b.ne.lng.toFixed(4)},${b.ne.lat.toFixed(4)}|${visibleSignals.join('+')}|${requiredTags.join('+')}`;
      if (lastBboxRef.current === key) return;
      lastBboxRef.current = key;

      inflightRef.current?.abort();
      const ctrl = new AbortController();
      inflightRef.current = ctrl;

      try {
        const places = await fetchPlacesInBbox({
          bbox: { sw: b.sw, ne: b.ne },
          signals: visibleSignals,
          tags: requiredTags,
        });
        if (ctrl.signal.aborted) return;
        setMarkers(places);
        setError(null);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : 'fetch failed');
      }
    },
    [visibleSignals, requiredTags],
  );

  const onMarkerPress = useCallback(
    (placeId: number) => {
      const m = markers.find((p) => p.id === placeId);
      if (m) setSelected(m);
    },
    [markers],
  );

  // 탭에 다시 포커스되면 마커 갱신 (리뷰 작성 후 신호등 변경 등 반영)
  useFocusEffect(
    useCallback(() => {
      const b = lastBoundsRef.current;
      if (!b) return;
      lastBboxRef.current = null; // 디듭 우회 → 재요청 강제
      onBoundsChange(b);
    }, [onBoundsChange]),
  );

  const setUserLocation = useLocationStore((s) => s.setUserLocation);

  // 권한 이미 허용된 경우에만 자동으로 내 위치 가져오기 (prompt 없이)
  // dev 좌표가 설정돼 있으면 GPS 안 부르고 바로 그 좌표 사용
  useEffect(() => {
    if (DEV_USER_LOCATION) {
      setUserLocation({
        lat: DEV_USER_LOCATION.lat,
        lng: DEV_USER_LOCATION.lng,
        updatedAt: Date.now(),
      });
      return;
    }
    let cancelled = false;
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          updatedAt: Date.now(),
        });
      } catch {
        // 조용히 무시
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setUserLocation]);

  const onLocate = useCallback(async () => {
    const loc = await getCurrentLocationOrPrompt();
    if (!loc) return;
    mapRef.current?.setCenter(loc.latitude, loc.longitude, 4);
    setUserLocation({
      lat: loc.latitude,
      lng: loc.longitude,
      updatedAt: Date.now(),
    });
  }, [setUserLocation]);

  return (
    <View style={styles.container}>
      <KakaoMapView
        ref={mapRef}
        latitude={lastView?.lat}
        longitude={lastView?.lng}
        level={lastView?.level}
        markers={markers}
        userLocation={
          userLocation
            ? { lat: userLocation.lat, lng: userLocation.lng }
            : null
        }
        onBoundsChange={onBoundsChange}
        onMarkerPress={onMarkerPress}
      />

      <SafeAreaView edges={['top']} style={styles.topOverlay} pointerEvents="box-none">
        <Pressable
          style={styles.searchBar}
          onPress={() => router.push('/search')}
        >
          <FontAwesome name="search" size={14} color={palette.textDim} />
          <Text style={styles.searchPlaceholder}>
            카페 이름이나 주소로 검색
          </Text>
        </Pressable>
        <FilterChips />
        <ActiveCheckInBanner />
        {error ? (
          <View style={styles.errorBanner}>
            <FontAwesome name="exclamation-circle" size={12} color="white" />
            <Text style={styles.errorText} numberOfLines={2}>
              {error}
            </Text>
          </View>
        ) : null}
      </SafeAreaView>

      <View style={styles.rightOverlay} pointerEvents="box-none">
        <Pressable style={styles.fab} onPress={onLocate}>
          <FontAwesome name="location-arrow" size={18} color={palette.text} />
        </Pressable>
      </View>

      <PlaceBottomSheet place={selected} onClose={() => setSelected(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    ...shadow.md,
  },
  searchPlaceholder: {
    color: palette.textMuted,
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium as '500',
  },
  rightOverlay: {
    position: 'absolute',
    right: spacing.md,
    bottom: 180,
    gap: spacing.sm,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: palette.red,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  errorText: {
    color: 'white',
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium as '500',
    flex: 1,
  },
});
