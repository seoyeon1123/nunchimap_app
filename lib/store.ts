/**
 * 앱 클라이언트 상태 — 웹의 zustand store 와 동일 컨셉.
 * 웹과 달리 sessionStorage 가 없어서 AsyncStorage 로 영속화.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PlaceMarker } from './types';

export type Signal = 'green' | 'yellow' | 'red' | 'gray';

interface FilterState {
  visibleSignals: Signal[];
  requiredTags: string[];
  toggleSignal: (s: Signal) => void;
  toggleTag: (code: string) => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  visibleSignals: ['green', 'yellow', 'red', 'gray'],
  requiredTags: [],
  toggleSignal: (s) =>
    set((state) => ({
      visibleSignals: state.visibleSignals.includes(s)
        ? state.visibleSignals.filter((x) => x !== s)
        : [...state.visibleSignals, s],
    })),
  toggleTag: (code) =>
    set((state) => ({
      requiredTags: state.requiredTags.includes(code)
        ? state.requiredTags.filter((x) => x !== code)
        : [...state.requiredTags, code],
    })),
}));

interface MapView {
  lat: number;
  lng: number;
  level: number;
}

interface UserLocation {
  lat: number;
  lng: number;
  updatedAt: number;
}

interface LocationState {
  userLocation: UserLocation | null;
  setUserLocation: (loc: UserLocation | null) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  userLocation: null,
  setUserLocation: (userLocation) => set({ userLocation }),
}));

interface UiState {
  selectedPlaceId: number | null;
  // 검색 → 지도 이동을 위해 임시 보관. 지도 화면이 consume 하면 즉시 null 로 초기화.
  pendingPlaceFromSearch: PlaceMarker | null;
  lastView: MapView | null;
  setSelectedPlaceId: (id: number | null) => void;
  setPendingPlaceFromSearch: (p: PlaceMarker | null) => void;
  setLastView: (v: MapView) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      selectedPlaceId: null,
      pendingPlaceFromSearch: null,
      lastView: null,
      setSelectedPlaceId: (selectedPlaceId) => set({ selectedPlaceId }),
      setPendingPlaceFromSearch: (pendingPlaceFromSearch) =>
        set({ pendingPlaceFromSearch }),
      setLastView: (lastView) => set({ lastView }),
    }),
    {
      name: 'nm-ui',
      storage: createJSONStorage(() => AsyncStorage),
      // pendingPlaceFromSearch 는 영속화 X — 한 번 쓰고 버리는 값
      partialize: (state) => ({ lastView: state.lastView }),
    },
  ),
);
