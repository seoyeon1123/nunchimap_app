import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'nm_onboarding_seen';

export async function hasSeenOnboarding(): Promise<boolean> {
  const v = await AsyncStorage.getItem(KEY);
  return v === '1';
}

export async function markOnboardingSeen(): Promise<void> {
  await AsyncStorage.setItem(KEY, '1');
}

export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
