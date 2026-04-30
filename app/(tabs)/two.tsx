import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { useMe, useLogin, useLogout } from '@/lib/hooks/useAuth';
import { fetchMyCheckIns } from '@/lib/api/me';
import { deleteCheckIn } from '@/lib/api/checkins';
import { fetchFavorites } from '@/lib/api/places';
import { METHOD_LABEL, SIGNAL_DOT } from '@/lib/labels';
import {
  fontSize,
  fontWeight,
  palette,
  radius,
  shadow,
  spacing,
} from '@/constants/Theme';
import type { MyCheckIn, PlaceMarker, Signal } from '@/lib/types';

WebBrowser.maybeCompleteAuthSession();

export default function MeTab() {
  const me = useMe();
  const login = useLogin();
  const logout = useLogout();
  const busy = login.isPending || logout.isPending;

  const checkIns = useQuery({
    queryKey: ['my-checkins'],
    queryFn: () => fetchMyCheckIns(50),
    enabled: !!me.data,
  });

  const favorites = useQuery({
    queryKey: ['favorites'],
    queryFn: fetchFavorites,
    enabled: !!me.data,
  });

  if (me.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={palette.text} />
      </View>
    );
  }

  const user = me.data;

  if (!user) {
    return (
      <SafeAreaView style={styles.loginWrap}>
        <View style={styles.loginCard}>
          <View style={styles.loginIconWrap}>
            <FontAwesome name="user" size={32} color={palette.textDim} />
          </View>
          <Text style={styles.loginTitle}>로그인하고 시작하기</Text>
          <Text style={styles.loginNote}>
            리뷰 작성, 체크인, 내 기록 보기는{'\n'}로그인이 필요해요.
          </Text>
          <Pressable
            onPress={() => {
              login.mutate(undefined, {
                onError: (e) =>
                  Alert.alert(
                    '로그인 실패',
                    e instanceof Error ? e.message : 'unknown',
                  ),
              });
            }}
            disabled={busy}
            style={[styles.btnKakao, busy && { opacity: 0.6 }]}
          >
            <Text style={styles.btnKakaoText}>
              {busy ? '연결 중…' : '카카오로 시작하기'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const initial = user.nickname.slice(0, 1).toUpperCase();
  const total = checkIns.data?.length ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.nick}>{user.nickname}</Text>
          <Text style={styles.subtle}>총 체크인 {total}건</Text>
        </View>
        <Pressable
          onPress={() => logout.mutate()}
          style={styles.logoutBtn}
          disabled={busy}
        >
          <Text style={styles.logoutText}>{busy ? '...' : '로그아웃'}</Text>
        </Pressable>
      </View>

      {favorites.data && favorites.data.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.sectionTitle}>
            ⭐ 즐겨찾기 ({favorites.data.length})
          </Text>
          <FlatList
            horizontal
            data={favorites.data}
            keyExtractor={(p) => String(p.id)}
            renderItem={({ item }) => <FavoriteCard place={item} />}
            ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.xs }}
          />
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>내 체크인 (길게 누르면 삭제)</Text>

      {checkIns.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={palette.text} />
        </View>
      ) : checkIns.isError ? (
        <Text style={styles.errorText}>
          {checkIns.error instanceof Error
            ? checkIns.error.message
            : '불러오기 실패'}
        </Text>
      ) : !checkIns.data || checkIns.data.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.muted}>아직 작성한 리뷰가 없어요.</Text>
        </View>
      ) : (
        <FlatList
          data={checkIns.data}
          keyExtractor={(c) => String(c.id)}
          renderItem={({ item }) => <CheckInRow item={item} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.xs + 2 }} />}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

function FavoriteCard({ place }: { place: PlaceMarker }) {
  const router = useRouter();
  const sig: Signal = place.cached_signal ?? 'gray';
  const SIGNAL_BG: Record<Signal, string> = {
    green: palette.greenSoft,
    yellow: palette.yellowSoft,
    red: palette.redSoft,
    gray: palette.graySoft,
  };
  return (
    <Pressable
      onPress={() => router.push(`/places/${place.id}`)}
      style={[
        styles.favCard,
        { backgroundColor: SIGNAL_BG[sig] },
      ]}
    >
      <Text style={styles.favSignal}>{SIGNAL_DOT[sig]}</Text>
      <Text style={styles.favName} numberOfLines={2}>
        {place.name}
      </Text>
      {place.address ? (
        <Text style={styles.favAddress} numberOfLines={1}>
          {place.address}
        </Text>
      ) : null}
    </Pressable>
  );
}

function CheckInRow({ item }: { item: MyCheckIn }) {
  const router = useRouter();
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: () => deleteCheckIn(item.id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['my-checkins'] });
      qc.invalidateQueries({ queryKey: ['place', res.place_id] });
    },
    onError: (e) => {
      Alert.alert('삭제 실패', e instanceof Error ? e.message : 'unknown');
    },
  });

  function confirmDelete() {
    Alert.alert(
      '체크인 삭제',
      `"${item.place_name ?? `카페 #${item.place_id}`}" 체크인을 삭제할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => del.mutate(),
        },
      ],
    );
  }

  return (
    <Pressable
      onPress={() => router.push(`/places/${item.place_id}`)}
      onLongPress={confirmDelete}
      delayLongPress={400}
      style={[styles.row, del.isPending && { opacity: 0.5 }]}
      disabled={del.isPending}
    >
      <Text style={styles.rowSignal}>{SIGNAL_DOT[item.signal]}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName} numberOfLines={1}>
          {item.place_name ?? `카페 #${item.place_id}`}
        </Text>
        <Text style={styles.rowMeta}>
          {METHOD_LABEL[item.method]}
          {item.duration_min != null
            ? ` · ${(item.duration_min / 60).toFixed(1)}h`
            : ''}
          {' · '}
          {new Date(item.created_at).toLocaleDateString('ko-KR')}
        </Text>
      </View>
      <FontAwesome name="angle-right" size={16} color={palette.textDim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg, padding: spacing.md, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loginWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.bg,
    padding: spacing.xl,
  },
  loginCard: {
    width: '100%',
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
    ...shadow.md,
  },
  loginIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  loginTitle: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold as '700',
    color: palette.text,
  },
  loginNote: {
    color: palette.textMuted,
    textAlign: 'center',
    fontSize: fontSize.small,
    lineHeight: 20,
  },
  btnKakao: {
    width: '100%',
    backgroundColor: '#FEE500',
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  btnKakaoText: {
    color: '#3C1E1E',
    fontWeight: fontWeight.bold as '700',
    fontSize: fontSize.body,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.sm,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: 'white',
    fontWeight: fontWeight.bold as '700',
    fontSize: fontSize.heading,
  },
  nick: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold as '700',
    color: palette.text,
  },
  subtle: {
    fontSize: fontSize.caption,
    color: palette.textMuted,
    marginTop: 2,
  },
  logoutBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  logoutText: {
    fontSize: fontSize.caption,
    color: palette.textMuted,
    fontWeight: fontWeight.medium as '500',
  },
  sectionTitle: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold as '700',
    color: palette.textMuted,
    paddingHorizontal: spacing.xs,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  list: { paddingBottom: spacing.xxl, gap: spacing.xs + 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    ...shadow.sm,
  },
  rowSignal: { fontSize: 18 },
  rowName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold as '600',
    color: palette.text,
  },
  rowMeta: {
    fontSize: fontSize.caption,
    color: palette.textMuted,
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  errorText: {
    color: palette.red,
    textAlign: 'center',
    padding: spacing.lg,
  },
  muted: { color: palette.textMuted, textAlign: 'center' },
  favCard: {
    width: 160,
    padding: spacing.md,
    borderRadius: radius.md,
    gap: 4,
  },
  favSignal: { fontSize: 18, marginBottom: 4 },
  favName: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold as '700',
    color: palette.text,
  },
  favAddress: {
    fontSize: fontSize.micro,
    color: palette.textMuted,
  },
});
