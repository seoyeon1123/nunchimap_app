/**
 * JWT 세션 토큰 보관소 — AsyncStorage 래퍼.
 * 메모리에도 캐시해서 매 요청마다 디스크 IO 안 가게.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'nm_session_token';
let memoryToken: string | null | undefined; // undefined = 아직 안 읽음

export async function getToken(): Promise<string | null> {
  if (memoryToken !== undefined) return memoryToken;
  memoryToken = (await AsyncStorage.getItem(KEY)) ?? null;
  return memoryToken;
}

export async function setToken(token: string): Promise<void> {
  memoryToken = token;
  await AsyncStorage.setItem(KEY, token);
}

export async function clearToken(): Promise<void> {
  memoryToken = null;
  await AsyncStorage.removeItem(KEY);
}
