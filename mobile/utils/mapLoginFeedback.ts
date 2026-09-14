import type { AppDialogVariant } from '@/hooks/useAppDialog';

export const PENDING_LOGIN_WELCOME_KEY = 'pendingLoginWelcome';

export type WelcomeSurface = 'tabs' | 'tiendas';

export type PendingLoginWelcome = {
  nombre: string;
  rol: string;
  surface?: WelcomeSurface;
};

export type LoginFeedback = {
  variant: AppDialogVariant;
  title: string;
  message: string;
};

export type MapLoginFeedbackInput = {
  status?: number;
  message?: string;
  name?: string;
  reason?: 'empty' | 'email' | 'invalid_json' | 'generic';
};

const GENERIC_LOGIN = 'No se pudo iniciar sesión';
const NETWORK_COPY = 'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.';

const looksLikeCredentials = (message?: string) =>
  /credenciales/i.test(message ?? '');

const looksLikeNetwork = (input: MapLoginFeedbackInput) =>
  input.name === 'AbortError' ||
  /network request failed|failed to fetch|network error|aborted/i.test(input.message ?? '');

const sanitizePublicCopy = (raw?: string) => {
  if (!raw) return '';
  return raw
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?\b/g, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

export function mapLoginFeedback(input: MapLoginFeedbackInput): LoginFeedback {
  if (input.reason === 'empty') {
    return {
      variant: 'info',
      title: 'Campos vacíos',
      message: 'Por favor completa todos los campos.',
    };
  }

  if (input.reason === 'email') {
    return {
      variant: 'info',
      title: 'Email inválido',
      message: 'Ingresa un email válido.',
    };
  }

  if (input.reason === 'invalid_json') {
    return {
      variant: 'error',
      title: 'Error',
      message: 'No pudimos leer la respuesta del servidor. Inténtalo de nuevo.',
    };
  }

  if (looksLikeNetwork(input)) {
    return {
      variant: 'error',
      title: 'Sin conexión',
      message: NETWORK_COPY,
    };
  }

  const backend = sanitizePublicCopy(input.message);

  if (input.status === 401 || looksLikeCredentials(input.message)) {
    return {
      variant: 'error',
      title: 'No pudimos iniciar sesión',
      message: 'Revisa tu correo y contraseña e inténtalo de nuevo.',
    };
  }

  if (input.status === 403) {
    return {
      variant: 'error',
      title: 'Cuenta desactivada',
      message: backend || 'Tu cuenta está desactivada.',
    };
  }

  return {
    variant: 'error',
    title: 'Error',
    message: backend || GENERIC_LOGIN,
  };
}

export function mapLoginWelcome(payload: PendingLoginWelcome): LoginFeedback {
  const nombre = payload.nombre?.trim() || 'ahí';

  if (payload.rol === 'tendero') {
    return {
      variant: 'success',
      title: '¡Bienvenido!',
      message: `Hola, ${nombre}. Tu panel de gestión está listo.`,
    };
  }

  if (payload.rol === 'cliente') {
    return {
      variant: 'success',
      title: '¡Bienvenido!',
      message: `Hola, ${nombre}. Revisa tus créditos y pagos.`,
    };
  }

  return {
    variant: 'success',
    title: '¡Bienvenido!',
    message: `Hola, ${nombre}. Ya puedes usar FiadoCheck.`,
  };
}
