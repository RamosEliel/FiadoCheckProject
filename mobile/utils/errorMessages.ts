const SESSION_PATTERNS = ['token inválido', 'sesión expirada', 'sesión inválida', 'no hay sesión activa'];
const NETWORK_PATTERNS = [
  'no se pudo contactar el servidor',
  'failed to fetch',
  'network request failed',
  'tardó demasiado',
  'la conexión tardó',
  'ip en config.ts',
  'backend esté activo',
];
const ERROR_CODE_PATTERN = /^error\s*\d{3}$/i;

export type ErrorKind = 'sesion' | 'red' | 'generico';

export const clasificarError = (mensaje?: string | null): ErrorKind => {
  const texto = (mensaje ?? '').toLowerCase();
  if (SESSION_PATTERNS.some(p => texto.includes(p))) return 'sesion';
  if (NETWORK_PATTERNS.some(p => texto.includes(p))) return 'red';
  if (ERROR_CODE_PATTERN.test(texto.trim())) return 'red';
  return 'generico';
};

export const friendlyErrorMessage = (mensaje?: string | null): string => {
  switch (clasificarError(mensaje)) {
    case 'sesion':
      return 'Tu sesión terminó. Vuelve a iniciar sesión para continuar.';
    case 'red':
      return 'No se pudo conectar. Revisa tu conexión a internet e intenta de nuevo.';
    default:
      return mensaje?.trim() || 'Algo salió mal. Intenta de nuevo.';
  }
};
