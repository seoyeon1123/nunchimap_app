import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { KAKAO_JS_KEY } from '@/lib/config';
import { buildKakaoMapHtml } from '@/lib/kakaoMapHtml';
import type {
  KakaoMapHandle,
  KakaoMapProps,
  MapBounds,
} from './KakaoMapView.types';

export type { KakaoMapHandle, KakaoMapProps, MapBounds };

function injectMessage(payload: object) {
  const json = JSON.stringify(payload);
  return `(function(){try{var m=${json};if(typeof handleHostMessage==='function')handleHostMessage(m);}catch(e){}true;})();`;
}

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
    const ref = useRef<WebView>(null);
    const html = useMemo(
      () => buildKakaoMapHtml({ latitude, longitude, level }),
      // 초기 1회만
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    );

    useImperativeHandle(
      forwardedRef,
      (): KakaoMapHandle => ({
        setCenter: (lat, lng, lvl) => {
          ref.current?.injectJavaScript(
            injectMessage({ type: 'setCenter', lat, lng, level: lvl }),
          );
        },
      }),
      [],
    );

    // 동일한 마커 셋이면 inject 생략 — WebView 통신 비용 감소
    const lastMarkersKey = useRef<string>('');
    useEffect(() => {
      if (!markers) return;
      const key = markers
        .map((m) => `${m.id}:${m.cached_signal ?? 'gray'}`)
        .sort()
        .join('|');
      if (key === lastMarkersKey.current) return;
      lastMarkersKey.current = key;
      ref.current?.injectJavaScript(
        injectMessage({ type: 'renderMarkers', places: markers }),
      );
    }, [markers]);

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

    function onMessage(e: WebViewMessageEvent) {
      let msg: unknown;
      try {
        msg = JSON.parse(e.nativeEvent.data);
      } catch {
        return;
      }
      handleHostEvent(msg);
    }

    function handleHostEvent(msg: unknown) {
      if (!msg || typeof msg !== 'object') return;
      const m = msg as Record<string, unknown>;
      if (m.type === 'bounds' && onBoundsChange) {
        onBoundsChange(m as unknown as MapBounds);
      } else if (m.type === 'markerClick' && typeof m.placeId === 'number') {
        onMarkerPress?.(m.placeId);
      } else if (m.type === 'ready') {
        onReady?.();
      } else if (m.type === 'log') {
        // WebView 내부 진단 — 카카오 SDK 로드 실패 등 디버그용
        // eslint-disable-next-line no-console
        console.log('[KakaoMap]', m.level, m.msg);
      }
    }

    return (
      <WebView
        ref={ref}
        style={styles.webview}
        originWhitelist={['*']}
        // iOS WKWebView 가 가짜 도메인(localhost)에서 출발한 페이지의 외부 네트워크 요청을 막는 경우가 있음.
        // 실제 존재하고 Kakao 에 등록된 도메인을 baseUrl 로 줘야 SDK 가 로드됨.
        source={{ html, baseUrl: 'https://nunchimap.vercel.app' }}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        onMessage={onMessage}
        // 카카오는 WebView UA 를 종종 차단 — 일반 모바일 사파리/크롬 UA 흉내
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        onError={(e) => {
          // eslint-disable-next-line no-console
          console.log('[KakaoMap] WebView onError', e.nativeEvent);
        }}
      />
    );
  },
);

export default KakaoMapView;

const styles = StyleSheet.create({
  webview: { flex: 1, backgroundColor: 'transparent' },
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
