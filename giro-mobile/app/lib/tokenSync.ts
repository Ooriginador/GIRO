import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './constants';
import { useConnectionStore } from '@/stores/connectionStore';

export function installTokenSync(): () => void {
  try {
    const unsubscribe = useConnectionStore.subscribe(
      (s) => s.token,
      async (token) => {
        try {
          if (token) {
            await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
          } else {
            await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
          }
        } catch (e) {
          console.warn('tokenSync error:', e);
        }
      }
    );

    return unsubscribe;
  } catch (e) {
    return () => {};
  }
}
