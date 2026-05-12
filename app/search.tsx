import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import SignalBadge from '@/components/SignalBadge';
import { createPlace, searchPlaces } from '@/lib/api/places';
import { searchKakaoCafes, type KakaoLocalPlace } from '@/lib/api/kakaoLocal';
import { useMe } from '@/lib/hooks/useAuth';
import { useLocationStore, useUiStore } from '@/lib/store';
import { ApiError } from '@/lib/api';
import { DEV_USER_LOCATION } from '@/lib/config';
import { formatDistanceWithWalk, haversineMeters } from '@/lib/geo';
import {
  fontSize,
  fontWeight,
  palette,
  radius,
  shadow,
  spacing,
} from '@/constants/Theme';
import type { PlaceMarker, Signal } from '@/lib/types';

export default function SearchScreen() {
  const router = useRouter();
  const setPending = useUiStore((s) => s.setPendingPlaceFromSearch);
  const userLocation = useLocationStore((s) => s.userLocation);
  const setUserLocation = useLocationStore((s) => s.setUserLocation);
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState('');
  const nearRef = useRef<{ lat: number; lng: number } | null>(
    userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null,
  );

  // 검색창 진입 시 한 번만 위치 받아서 저장 — 거부돼도 검색은 진행
  useEffect(() => {
    if (nearRef.current) return; // 이미 store 에 있으면 skip
    if (DEV_USER_LOCATION) {
      const coords = { lat: DEV_USER_LOCATION.lat, lng: DEV_USER_LOCATION.lng };
      nearRef.current = coords;
      setUserLocation({ ...coords, updatedAt: Date.now() });
      return;
    }
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getLastKnownPositionAsync();
          if (pos) {
            const coords = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            };
            nearRef.current = coords;
            setUserLocation({ ...coords, updatedAt: Date.now() });
          }
        }
      } catch {
        // 위치 못 받아도 검색은 가능 — 무시
      }
    })();
  }, [setUserLocation]);

  // 타이핑 멈추고 250ms 지나면 자동 검색
  useEffect(() => {
    const trimmed = input.trim();
    const t = setTimeout(() => setSubmitted(trimmed), 250);
    return () => clearTimeout(t);
  }, [input]);

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ['search', submitted, nearRef.current],
    queryFn: () =>
      searchPlaces(submitted, nearRef.current ?? undefined),
    enabled: submitted.length > 0,
  });

  // DB 검색 결과가 비었을 때만 카카오 키워드 검색을 보조로 시도
  const dbEmpty = !isFetching && submitted.length > 0 && (data?.length ?? 0) === 0;
  const kakaoQuery = useQuery({
    queryKey: ['kakao-search', submitted, nearRef.current],
    queryFn: () =>
      searchKakaoCafes(submitted, nearRef.current ?? undefined),
    enabled: dbEmpty,
    staleTime: 5 * 60_000,
  });

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <FontAwesome name="search" size={14} color={palette.textDim} />
          <TextInput
            style={styles.input}
            placeholder="카페 이름이나 주소"
            placeholderTextColor={palette.textDim}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => setSubmitted(input.trim())}
            returnKeyType="search"
            autoFocus
          />
          {input.length > 0 ? (
            <Pressable
              hitSlop={8}
              onPress={() => {
                setInput('');
                setSubmitted('');
              }}
            >
              <FontAwesome
                name="times-circle"
                size={16}
                color={palette.textDim}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      {isFetching ? (
        <View style={styles.center}>
          <ActivityIndicator color={palette.text} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>
            {error instanceof Error ? error.message : '검색 실패'}
          </Text>
        </View>
      ) : submitted.length === 0 ? (
        <View style={styles.center}>
          <FontAwesome name="search" size={28} color={palette.textDim} />
          <Text style={styles.muted}>카페 이름이나 주소로 검색</Text>
        </View>
      ) : !data || data.length === 0 ? (
        <KakaoFallback
          query={submitted}
          loading={kakaoQuery.isFetching}
          places={kakaoQuery.data ?? []}
          error={kakaoQuery.error}
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ResultItem
              place={item}
              onPress={() => {
                // 지도가 consume 해서 setCenter + 바텀시트 띄움
                setPending(item);
                router.back();
              }}
            />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}
    </View>
  );
}

function KakaoFallback({
  query,
  loading,
  places,
  error,
}: {
  query: string;
  loading: boolean;
  places: KakaoLocalPlace[];
  error: unknown;
}) {
  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>"{query}" 결과가 없어요.</Text>
        <ActivityIndicator color={palette.text} />
        <Text style={styles.mutedHint}>카카오 지도에서 찾는 중…</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>"{query}" 결과가 없어요.</Text>
        <Text style={styles.errorText}>
          {error instanceof Error ? error.message : '카카오 검색 실패'}
        </Text>
      </View>
    );
  }
  if (places.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>"{query}" 결과가 없어요.</Text>
        <Text style={styles.mutedHint}>
          오타가 없는지 확인하거나 다른 이름으로 검색해 보세요.
        </Text>
      </View>
    );
  }
  return (
    <FlatList
      data={places}
      keyExtractor={(item) => `kakao-${item.id}`}
      ListHeaderComponent={
        <View style={styles.listHeader}>
          <Text style={styles.listHeaderTitle}>찾고 있는 카페가 없나요?</Text>
          <Text style={styles.listHeaderSub}>
            카카오 지도에서 가져왔어요. 탭하면 눈치맵에 추가돼요.
          </Text>
        </View>
      }
      renderItem={({ item }) => <KakaoResultItem place={item} />}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.sep} />}
    />
  );
}

function KakaoResultItem({ place }: { place: KakaoLocalPlace }) {
  const router = useRouter();
  const { data: me } = useMe();
  const userLocation = useLocationStore((s) => s.userLocation);
  const [busy, setBusy] = useState(false);

  const distanceText = userLocation
    ? formatDistanceWithWalk(
        haversineMeters(
          { lat: userLocation.lat, lng: userLocation.lng },
          { lat: place.lat, lng: place.lng },
        ),
      )
    : null;

  async function onPress() {
    if (!me) {
      Alert.alert('로그인 필요', '카페 추가는 로그인 후 사용할 수 있어요.');
      return;
    }
    setBusy(true);
    try {
      const res = await createPlace({
        kakao_place_id: place.id,
        name: place.place_name,
        address: place.address_name ?? undefined,
        road_address: place.road_address_name ?? undefined,
        lat: place.lat,
        lng: place.lng,
      });
      router.replace(`/places/${res.id}`);
    } catch (e) {
      const msg =
        e instanceof ApiError && (e.body as { error?: string })?.error
          ? (e.body as { error: string }).error
          : e instanceof Error
            ? e.message
            : '추가 실패';
      Alert.alert('실패', msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Pressable onPress={onPress} style={styles.item} disabled={busy}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.itemName} numberOfLines={1}>
          {place.place_name}
        </Text>
        {place.road_address_name || place.address_name ? (
          <Text style={styles.itemAddress} numberOfLines={1}>
            {place.road_address_name ?? place.address_name}
          </Text>
        ) : null}
        <View style={styles.itemMetaRow}>
          <View style={styles.addBadge}>
            <FontAwesome name="plus" size={9} color={palette.textOnPrimary} />
            <Text style={styles.addBadgeText}>추가</Text>
          </View>
          {distanceText ? (
            <Text style={styles.itemDistance}>📍 {distanceText}</Text>
          ) : null}
        </View>
      </View>
      {busy ? (
        <ActivityIndicator color={palette.textDim} />
      ) : (
        <FontAwesome name="angle-right" size={18} color={palette.textDim} />
      )}
    </Pressable>
  );
}


function ResultItem({
  place,
  onPress,
}: {
  place: PlaceMarker;
  onPress: () => void;
}) {
  const sig: Signal = place.cached_signal ?? 'gray';
  const userLocation = useLocationStore((s) => s.userLocation);
  const distanceText = userLocation
    ? formatDistanceWithWalk(
        haversineMeters(
          { lat: userLocation.lat, lng: userLocation.lng },
          { lat: place.lat, lng: place.lng },
        ),
      )
    : null;
  return (
    <Pressable onPress={onPress} style={styles.item}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.itemName} numberOfLines={1}>
          {place.name}
        </Text>
        {place.address ? (
          <Text style={styles.itemAddress} numberOfLines={1}>
            {place.address}
          </Text>
        ) : null}
        <View style={styles.itemMetaRow}>
          <SignalBadge signal={sig} size="sm" />
          {distanceText ? (
            <Text style={styles.itemDistance}>📍 {distanceText}</Text>
          ) : null}
        </View>
      </View>
      <FontAwesome name="angle-right" size={18} color={palette.textDim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  searchWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: palette.bg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    ...shadow.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.body,
    color: palette.text,
    padding: 0,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  itemName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold as '600',
    color: palette.text,
  },
  itemAddress: {
    fontSize: fontSize.caption,
    color: palette.textMuted,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  itemDistance: {
    fontSize: fontSize.micro,
    color: palette.textMuted,
    fontWeight: fontWeight.medium as '500',
  },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: palette.border },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  muted: { color: palette.textMuted, fontSize: fontSize.body },
  mutedHint: {
    color: palette.textDim,
    fontSize: fontSize.caption,
    textAlign: 'center',
  },
  errorText: { color: palette.red },
  listHeader: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  listHeaderTitle: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold as '700',
    color: palette.text,
  },
  listHeaderSub: {
    fontSize: fontSize.micro,
    color: palette.textMuted,
  },
  addBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: palette.primary,
  },
  addBadgeText: {
    fontSize: fontSize.micro,
    color: palette.textOnPrimary,
    fontWeight: fontWeight.bold as '700',
  },
});
