import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import {
  ActivityIndicator,
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
import { searchPlaces } from '@/lib/api/places';
import { useLocationStore, useUiStore } from '@/lib/store';
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
        <View style={styles.center}>
          <Text style={styles.muted}>검색 결과가 없습니다.</Text>
        </View>
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
  errorText: { color: palette.red },
});
