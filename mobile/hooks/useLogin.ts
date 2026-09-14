import { router } from 'expo-router';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '@/config/config';
import { resolveClienteHomeRoute, clearTenderoSeleccionado } from '@/hooks/Usetiendasasociadas';
import { useAppDialog } from '@/hooks/useAppDialog';
import { publishPendingLoginWelcome } from '@/hooks/useConsumeLoginWelcome';
import {
  mapLoginFeedback,
  PENDING_LOGIN_WELCOME_KEY,
  type LoginFeedback,
  type WelcomeSurface,
} from '@/utils/mapLoginFeedback';
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
  const { dialog, showSuccess, showError, showInfo, hide } = useAppDialog();

  const presentFeedback = (fb: LoginFeedback) => {
    if (fb.variant === 'success') showSuccess(fb.title, fb.message);
    else if (fb.variant === 'info') showInfo(fb.title, fb.message);
    else showError(fb.title, fb.message);
  };

  const togglePassword = () => setShowPassword(prev => !prev);

  const handleLogin = async () => {
    if (!email || !password) {
      presentFeedback(mapLoginFeedback({ reason: 'empty' }));
      return;
    }
    if (!email.includes('@')) {
      presentFeedback(mapLoginFeedback({ reason: 'email' }));
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
        presentFeedback(mapLoginFeedback({ reason: 'invalid_json' }));
        return;
      }

      if (!res.ok) {
        presentFeedback(mapLoginFeedback({ status: res.status, message: json.error }));
        return;
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

      const nombre =
        json.tendero?.nombre ??
        json.cliente?.nombre_completo ??
        json.usuario.email;
      const rol = isCliente ? 'cliente' : json.tendero ? 'tendero' : 'otro';
      const surface: WelcomeSurface = target.includes('TiendasAsociadas')
        ? 'tiendas'
        : 'tabs';

      await AsyncStorage.setItem(
        PENDING_LOGIN_WELCOME_KEY,
        JSON.stringify({ nombre, rol, surface }),
      );
      publishPendingLoginWelcome();

      setLoading(false);
      router.replace(target as any);
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : undefined;
      const raw = err instanceof Error ? err.message : undefined;
      const message = raw ? friendlyErrorMessage(raw) : undefined;
      presentFeedback(mapLoginFeedback({ name, message }));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    showInfo('Próximamente', 'Recuperación de contraseña en desarrollo');
  };

  const handleRegister = () => {
    router.push('/(auth)/registerChoice');
  };

  const handleGoogleLogin = () => {
    showInfo('Próximamente', 'Login con Google en desarrollo');
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
    dialog,
    hideDialog: hide,
  };
};
