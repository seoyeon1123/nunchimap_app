import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { KAKAO_JS_KEY } from '@/lib/config';
import { buildKakaoMapHtml } from '@/lib/kakaoMapHtml';
import type {
  KakaoMapHandle,
  KakaoMapProps,
  MapBounds,
} from './KakaoMapView.types';

export type { KakaoMapHandle, KakaoMapProps, MapBounds };

const KakaoMapView = forwardRef<KakaoMapHandle, KakaoMapProps>(
  function KakaoMapView(
    {
      latitude = 37.5665,
      longitude = 126.978,
      level = 5,
      markers,
      onBoundsChange,
      onMarkerPress,
      onReady,
    },
    forwardedRef,
  ) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const html = useMemo(
      () => buildKakaoMapHtml({ latitude, longitude, level }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    );

    useImperativeHandle(
      forwardedRef,
      (): KakaoMapHandle => ({
        setCenter: (lat, lng, lvl) => {
          iframeRef.current?.contentWindow?.postMessage(
            { type: 'setCenter', lat, lng, level: lvl },
            '*',
          );
        },
      }),
      [],
    );

    const lastMarkersKey = useRef<string>('');
    useEffect(() => {
      if (!markers) return;
      const key = markers
        .map((m) => `${m.id}:${m.cached_signal ?? 'gray'}`)
        .sort()
        .join('|');
      if (key === lastMarkersKey.current) return;
      lastMarkersKey.current = key;
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'renderMarkers', places: markers },
        '*',
      );
    }, [markers]);

    useEffect(() => {
      function onMessage(e: MessageEvent) {
        if (e.source !== iframeRef.current?.contentWindow) return;
        const msg = e.data;
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'bounds' && onBoundsChange) {
          onBoundsChange(msg as MapBounds);
        } else if (
          msg.type === 'markerClick' &&
          typeof msg.placeId === 'number'
        ) {
          onMarkerPress?.(msg.placeId);
        } else if (msg.type === 'ready') {
          onReady?.();
        }
      }
      window.addEventListener('message', onMessage);
      return () => window.removeEventListener('message', onMessage);
    }, [onBoundsChange, onMarkerPress, onReady]);

    if (!KAKAO_JS_KEY) {
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>카카오 JS 키가 없습니다</Text>
          <Text style={styles.emptyHint}>
            .env.local 에 EXPO_PUBLIC_KAKAO_JS_KEY 를 추가하고 서버를 재시작하세요.
          </Text>
        </View>
      );
    }

    return (
      <iframe
        ref={iframeRef}
        srcDoc={html}
        style={iframeStyle}
        sandbox="allow-scripts allow-same-origin"
        title="카카오맵"
      />
    );
  },
);

export default KakaoMapView;

const iframeStyle: React.CSSProperties = {
  flex: 1,
  border: 0,
  width: '100%',
  height: '100%',
};

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#c00' },
  emptyHint: { color: '#666', textAlign: 'center', fontSize: 13 },
});
