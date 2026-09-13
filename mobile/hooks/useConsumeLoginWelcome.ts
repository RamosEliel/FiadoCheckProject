import { useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import {
  mapLoginWelcome,
  PENDING_LOGIN_WELCOME_KEY,
  type PendingLoginWelcome,
  type WelcomeSurface,
} from '@/utils/mapLoginFeedback';

type WelcomeListener = () => void;

const welcomeListeners = new Set<WelcomeListener>();

export function publishPendingLoginWelcome() {
  welcomeListeners.forEach((listener) => listener());
}

async function takePendingLoginWelcome(
  expectedSurface: WelcomeSurface,
): Promise<PendingLoginWelcome | null> {
  const raw = await AsyncStorage.getItem(PENDING_LOGIN_WELCOME_KEY);
  if (!raw) return null;

  try {
    const pending = JSON.parse(raw) as PendingLoginWelcome;
    const surface = pending.surface ?? 'tabs';
    if (surface !== expectedSurface) return null;
    await AsyncStorage.removeItem(PENDING_LOGIN_WELCOME_KEY);
    return pending;
  } catch {
    await AsyncStorage.removeItem(PENDING_LOGIN_WELCOME_KEY);
    return null;
  }
}

/**
 * Consume pendingLoginWelcome on mount, focus, and publish.
 * Tabs stay mounted (anchor: '(tabs)'), so useFocusEffect alone can miss the key
 * or drop the dialog after a blur cleanup. Publish + take-then-show covers that.
 */
export function useConsumeLoginWelcome(
  surface: WelcomeSurface,
  showSuccess: (title: string, message: string) => void,
) {
  const consume = useCallback(async () => {
    const pending = await takePendingLoginWelcome(surface);
    if (!pending) return;
    const { title, message } = mapLoginWelcome(pending);
    showSuccess(title, message);
  }, [surface, showSuccess]);

  useEffect(() => {
    consume();
    welcomeListeners.add(consume);
    return () => {
      welcomeListeners.delete(consume);
    };
  }, [consume]);

  useFocusEffect(
    useCallback(() => {
      consume();
    }, [consume]),
  );
}
