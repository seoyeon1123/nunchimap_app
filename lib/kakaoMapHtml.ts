import { KAKAO_JS_KEY } from './config';

export type KakaoMapOptions = {
  latitude: number;
  longitude: number;
  level: number;
};

const SIGNAL_COLOR: Record<string, string> = {
  green: '#10B981',
  yellow: '#F59E0B',
  red: '#EF4444',
  gray: '#9CA3AF',
};

// 웹 KakaoMap 과 동일한 정책
const MAX_LEVEL_FOR_MARKERS = 8; // 줌아웃 너무 되면 마커 안 그림
const CLUSTER_MIN_LEVEL = 6;

export function buildKakaoMapHtml({ latitude, longitude, level }: KakaoMapOptions) {
  const colorJson = JSON.stringify(SIGNAL_COLOR);
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; }
    #fallback {
      position: absolute; inset: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      font-family: -apple-system, sans-serif; color: #c00; text-align: center; padding: 16px;
      gap: 8px;
    }
    #fallback .hint { color: #666; font-size: 12px; max-width: 360px; }
    .nm-cluster {
      width: 36px; height: 36px; border-radius: 18px;
      background: rgba(17,24,39,0.92); color: white;
      display: flex; align-items: center; justify-content: center;
      font-family: -apple-system, sans-serif; font-weight: 700; font-size: 13px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="fallback" style="display:none">
    <div id="fallback-msg">카카오맵 SDK 로드 실패</div>
    <div class="hint" id="fallback-hint"></div>
  </div>
  <script>
    var SIGNAL_COLOR = ${colorJson};
    var MAX_LEVEL_FOR_MARKERS = ${MAX_LEVEL_FOR_MARKERS};
    var CLUSTER_MIN_LEVEL = ${CLUSTER_MIN_LEVEL};
    var mapInstance = null;
    var clusterer = null;
    var markerObjs = [];
    var sdkLoaded = false;
    var sdkLoadError = null;

    function showFallback(msg, hint) {
      var el = document.getElementById('fallback');
      var msgEl = document.getElementById('fallback-msg');
      var hintEl = document.getElementById('fallback-hint');
      el.style.display = 'flex';
      if (msg) msgEl.innerHTML = msg;
      if (hint) hintEl.innerHTML = hint;
    }

    function postToHost(payload) {
      try {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        } else if (window.parent && window.parent !== window) {
          window.parent.postMessage(payload, '*');
        }
      } catch (e) {}
    }

    function logToHost(level, msg) {
      postToHost({ type: 'log', level: level, msg: String(msg) });
    }

    window.addEventListener('error', function (ev) {
      logToHost('error', 'window.onerror: ' + (ev.message || ev.error));
    });

    function emitBounds() {
      if (!mapInstance) return;
      var b = mapInstance.getBounds();
      var sw = b.getSouthWest();
      var ne = b.getNorthEast();
      var c = mapInstance.getCenter();
      postToHost({
        type: 'bounds',
        sw: { lat: sw.getLat(), lng: sw.getLng() },
        ne: { lat: ne.getLat(), lng: ne.getLng() },
        center: { lat: c.getLat(), lng: c.getLng() },
        level: mapInstance.getLevel(),
      });
    }

    function clearMarkers() {
      if (clusterer) clusterer.clear();
      for (var i = 0; i < markerObjs.length; i++) {
        markerObjs[i].setMap(null);
      }
      markerObjs = [];
    }

    function makeMarkerImage(signal) {
      var color = SIGNAL_COLOR[signal] || SIGNAL_COLOR.gray;
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">' +
        '<circle cx="11" cy="11" r="8" fill="' + color + '" stroke="white" stroke-width="2"/>' +
        '</svg>';
      var src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
      return new kakao.maps.MarkerImage(src, new kakao.maps.Size(22, 22), {
        offset: new kakao.maps.Point(11, 11),
      });
    }

    function renderMarkers(places) {
      if (!mapInstance) return;
      clearMarkers();

      // 줌아웃 너무 되면 그리지 않음 — 1600+ 마커 한꺼번에 그리면 프리징
      var currentLevel = mapInstance.getLevel();
      if (currentLevel > MAX_LEVEL_FOR_MARKERS) {
        logToHost('info', 'skip render: level=' + currentLevel + ' > ' + MAX_LEVEL_FOR_MARKERS);
        return;
      }

      var newMarkers = [];
      for (var i = 0; i < places.length; i++) {
        var p = places[i];
        var pos = new kakao.maps.LatLng(p.lat, p.lng);
        var marker = new kakao.maps.Marker({
          position: pos,
          image: makeMarkerImage(p.cached_signal || 'gray'),
          title: p.name,
        });
        (function (placeId) {
          kakao.maps.event.addListener(marker, 'click', function () {
            postToHost({ type: 'markerClick', placeId: placeId });
          });
        })(p.id);
        newMarkers.push(marker);
      }
      markerObjs = newMarkers;
      if (clusterer) {
        clusterer.addMarkers(newMarkers);
      } else {
        for (var j = 0; j < newMarkers.length; j++) newMarkers[j].setMap(mapInstance);
      }
    }

    function setCenter(lat, lng, level) {
      if (!mapInstance) return;
      mapInstance.setCenter(new kakao.maps.LatLng(lat, lng));
      if (typeof level === 'number') mapInstance.setLevel(level);
    }

    function handleHostMessage(msg) {
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'renderMarkers' && Array.isArray(msg.places)) {
        renderMarkers(msg.places);
      } else if (msg.type === 'setCenter') {
        setCenter(msg.lat, msg.lng, msg.level);
      } else if (msg.type === 'requestBounds') {
        emitBounds();
      }
    }

    function onHostEvent(e) {
      var data = e.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (_) { return; }
      }
      handleHostMessage(data);
    }
    window.addEventListener('message', onHostEvent);
    document.addEventListener('message', onHostEvent);

    function initMap() {
      if (!window.kakao || !window.kakao.maps) {
        var hint = sdkLoadError
          ? '스크립트 자체가 로드되지 않았어요 (' + sdkLoadError + ').'
          : '도메인 등록을 확인하세요. origin: <b>' + window.location.origin + '</b>';
        showFallback('카카오 SDK 스크립트를 불러오지 못했습니다', hint);
        logToHost('error', 'kakao SDK undefined. origin=' + window.location.origin);
        return;
      }
      kakao.maps.load(function () {
        try {
          mapInstance = new kakao.maps.Map(document.getElementById('map'), {
            center: new kakao.maps.LatLng(${latitude}, ${longitude}),
            level: ${level}
          });

          // 클러스터러 (clusterer 라이브러리 로드된 경우만)
          if (kakao.maps.MarkerClusterer) {
            clusterer = new kakao.maps.MarkerClusterer({
              map: mapInstance,
              averageCenter: true,
              minLevel: CLUSTER_MIN_LEVEL,
              gridSize: 60,
              disableClickZoom: false,
              calculator: [10, 30, 100],
              styles: [
                { width: '36px', height: '36px', background: 'rgba(17,24,39,0.92)', color: 'white', borderRadius: '18px', textAlign: 'center', lineHeight: '36px', fontWeight: '700', fontSize: '13px' },
                { width: '40px', height: '40px', background: 'rgba(17,24,39,0.94)', color: 'white', borderRadius: '20px', textAlign: 'center', lineHeight: '40px', fontWeight: '700', fontSize: '14px' },
                { width: '46px', height: '46px', background: 'rgba(220,38,38,0.94)', color: 'white', borderRadius: '23px', textAlign: 'center', lineHeight: '46px', fontWeight: '700', fontSize: '14px' },
                { width: '52px', height: '52px', background: 'rgba(220,38,38,0.96)', color: 'white', borderRadius: '26px', textAlign: 'center', lineHeight: '52px', fontWeight: '700', fontSize: '15px' },
              ],
            });
          } else {
            logToHost('warn', 'MarkerClusterer not loaded — showing raw markers');
          }

          var debounceId = null;
          kakao.maps.event.addListener(mapInstance, 'idle', function () {
            if (debounceId) clearTimeout(debounceId);
            debounceId = setTimeout(emitBounds, 200);
          });
          setTimeout(emitBounds, 50);
          postToHost({ type: 'ready' });
        } catch (e) {
          showFallback('지도 초기화 실패', e && e.message ? e.message : '');
          logToHost('error', 'map init: ' + (e && e.message));
        }
      });
    }

    // SDK 로드 — clusterer 라이브러리 포함
    var s = document.createElement('script');
    s.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&libraries=clusterer&autoload=false';
    s.onload = function () {
      sdkLoaded = true;
      logToHost('info', 'SDK loaded; kakao=' + (typeof window.kakao));
      initMap();
    };
    s.onerror = function () {
      sdkLoadError = 'network';
      logToHost('error', 'SDK script onerror');
      initMap();
    };
    document.head.appendChild(s);

    setTimeout(function () {
      if (!mapInstance && !document.getElementById('fallback').style.display.includes('flex')) {
        if (!sdkLoaded) sdkLoadError = sdkLoadError || 'timeout';
        initMap();
      }
    }, 8000);
  </script>
</body>
</html>`;
}
