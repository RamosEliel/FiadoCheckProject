import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const SESSION_KEYS = ['token', 'usuario', 'tendero', 'lastActive'];

export const cerrarSesionYRedirigir = async () => {
  await AsyncStorage.multiRemove(SESSION_KEYS);
  router.replace('/(auth)/login' as any);
};
