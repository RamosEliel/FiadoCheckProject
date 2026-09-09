import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '@/config/config';
import { resolveClienteHomeRoute, clearTenderoSeleccionado } from '@/hooks/Usetiendasasociadas';
import { friendlyErrorMessage } from '@/utils/errorMessages';

const API_URL = CONFIG.API_URL;
const FETCH_TIMEOUT_MS = 15000;

type Usuario = {
  id_usuario: number;
  email: string;
  id_rol: number;
};

type Tendero = {
  id_tendero: string;
  nombre: string;
  nombre_tienda: string;
} | null;

type Cliente = {
  id_cliente: string;
  nombre_completo: string;
} | null;

type LoginResponse = {
  token: string;
  usuario: Usuario;
  tendero: Tendero;
  cliente: Cliente;
};

const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = FETCH_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

export const useLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const togglePassword = () => setShowPassword(prev => !prev);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Campos vacíos', 'Por favor completa todos los campos');
      return;
    }
    if (!email.includes('@')) {
      Alert.alert('Correo inválido', 'Ingresa un correo electrónico válido');
      return;
    }

    setLoading(true);
    try {
      const res = await fetchWithTimeout(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      let json: LoginResponse & { error?: string };
      try {
        json = await res.json();
      } catch {
        throw new Error('Respuesta inválida del servidor');
      }

      if (!res.ok) {
        throw new Error(json.error || 'No se pudo iniciar sesión');
      }

      await AsyncStorage.setItem('token', json.token);
      await AsyncStorage.setItem('usuario', JSON.stringify(json.usuario));
      await AsyncStorage.removeItem('lastActive');

      const isCliente = json.usuario.id_rol == 2;
      let target = '/(tabs)/dashboard';

      if (isCliente) {
        await AsyncStorage.removeItem('tendero');
        if (json.cliente) {
          await AsyncStorage.setItem('usuario', JSON.stringify({ ...json.usuario, ...json.cliente }));
        }
        await clearTenderoSeleccionado();
        target = await resolveClienteHomeRoute(json.token);
      } else if (json.tendero) {
        await AsyncStorage.setItem('tendero', JSON.stringify(json.tendero));
        target = '/(tabs)/dashboard';
      } else {
        await AsyncStorage.removeItem('tendero');
        target = '/(tabs)/vistaUsuario';
      }

      setLoading(false);
      router.replace(target as any);

      const nombre =
        json.tendero?.nombre ??
        json.cliente?.nombre_completo ??
        json.usuario.email;

      Alert.alert('¡Bienvenido!', `Hola ${nombre} 👋`);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        Alert.alert('Sin conexión', 'No se pudo contactar el servidor. Verifica tu conexión a internet.');
      } else {
        Alert.alert('Error', friendlyErrorMessage(err.message || 'No se pudo iniciar sesión'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert('Próximamente', 'Recuperación de contraseña en desarrollo');
  };

  const handleRegister = () => {
    router.push('/(auth)/registerChoice');
  };

  const handleGoogleLogin = () => {
    Alert.alert('Próximamente', 'Login con Google en desarrollo');
  };

  return {
    email, password, showPassword, loading,
    setEmail, setPassword,
    togglePassword,
    handleLogin,
    handleForgotPassword,
    handleRegister,
    handleRegisterTendero: () => router.push('/(auth)/registerTendero'),
    handleGoogleLogin,
  };
};
