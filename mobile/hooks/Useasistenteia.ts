import { useState, useRef, useCallback, useEffect } from 'react';
import { FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '@/config/config';
import type { ActionBanner, Mensaje } from '@/components/chat/types';

export type { ActionBanner, Mensaje } from '@/components/chat/types';

const API_URL = CONFIG.API_URL;
const SESSION_KEY = 'asistenteSessionId';

export const SUGERENCIAS_INICIALES = [
  '¿Quién me debe más?',
  'Mora',
  'Resumen del día',
  'Créditos vencidos',
];

const buildBienvenida = (): Mensaje[] => [
  {
    id: 'welcome-chips',
    tipo: 'sugerencias',
    opciones: SUGERENCIAS_INICIALES,
    createdAt: Date.now(),
  },
];

const uid = () => Math.random().toString(36).slice(2, 9);

const classifyError = (err: unknown, status?: number): { message: string; esError: boolean } => {
  if (status === 403) {
    return {
      message: 'No tienes permiso para esta consulta. Vuelve a iniciar sesión.',
      esError: true,
    };
  }

  const raw = err instanceof Error ? err.message : String(err ?? '');
  const lower = raw.toLowerCase();

  if (
    lower.includes('network request failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('network')
  ) {
    return {
      message: 'Sin conexión. Revisa tu red e inténtalo de nuevo.',
      esError: true,
    };
  }

  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('aborted')) {
    return {
      message: 'La consulta tardó demasiado. Intenta de nuevo.',
      esError: true,
    };
  }

  if (lower.includes('403') || lower.includes('forbidden')) {
    return {
      message: 'No tienes permiso para esta consulta. Vuelve a iniciar sesión.',
      esError: true,
    };
  }

  const generic = !raw || raw === 'No se pudo obtener una respuesta del asistente.';
  if (generic && status === 504) {
    return { message: 'La consulta tardó demasiado. Intenta de nuevo.', esError: true };
  }
  if (generic && status === 503) {
    return {
      message: 'El asistente no está disponible ahora. Inténtalo en unos segundos.',
      esError: true,
    };
  }
  if (generic && status === 502) {
    return {
      message: 'No se pudo conectar con el asistente IA. Inténtalo de nuevo.',
      esError: true,
    };
  }

  return {
    message: raw || 'Ocurrió un error al procesar tu pregunta.',
    esError: true,
  };
};

const getOrCreateSessionId = async (): Promise<string> => {
  const stored = await AsyncStorage.getItem(SESSION_KEY);
  if (stored) return stored;

  const nuevo = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  await AsyncStorage.setItem(SESSION_KEY, nuevo);
  return nuevo;
};

type ChatResponse = {
  respuesta?: string;
  mensaje?: string;
  sugerencias?: string[];
  action_executed?: string | null;
  refresh?: boolean;
  refresh_scope?: string[];
  error?: string;
  success?: boolean;
};

export const useAsistenteIA = (token: string, id_tendero: string) => {
  const [mensajes, setMensajes] = useState<Mensaje[]>(buildBienvenida);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionBanner, setActionBanner] = useState<ActionBanner>(null);
  const scrollRef = useRef<FlatList<Mensaje>>(null);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const sendingRef = useRef(false);
  const lastPreguntaRef = useRef('');
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      abortRef.current?.abort();
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, []);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  };

  const pushMensaje = useCallback((msg: Mensaje) => {
    setMensajes((prev) => [...prev, { createdAt: Date.now(), ...msg }]);
    scrollToBottom();
  }, []);

  const fetchRespuesta = async (pregunta: string, signal: AbortSignal): Promise<ChatResponse> => {
    if (!token) {
      throw new Error('No hay sesión activa. Inicia sesión nuevamente.');
    }

    const sessionId = await getOrCreateSessionId();

    const res = await fetch(`${API_URL}/asistente/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        sessionId,
        userId: id_tendero || sessionId,
        message: pregunta,
        metadata: {
          id_tendero,
          platform: 'mobile',
        },
      }),
      signal,
    });

    const json: ChatResponse = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = new Error(json.error || 'No se pudo obtener una respuesta del asistente.');
      (err as Error & { status?: number }).status = res.status;
      throw err;
    }

    return json;
  };

  const enviarMensaje = async (texto: string, opts?: { isRetry?: boolean }) => {
    const trimmed = texto.trim();
    if (!trimmed || sendingRef.current) return;

    sendingRef.current = true;
    const requestId = ++requestIdRef.current;
    lastPreguntaRef.current = trimmed;

    if (!opts?.isRetry) {
      pushMensaje({ id: uid(), tipo: 'usuario', texto: trimmed });
      setInput('');
    } else {
      setMensajes((prev) => {
        const next = [...prev];
        while (next.length && next[next.length - 1]?.esError) {
          next.pop();
        }
        return next;
      });
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    try {
      const json = await fetchRespuesta(trimmed, controller.signal);
      if (requestId !== requestIdRef.current) return;

      const respuesta =
        json.respuesta ||
        json.mensaje ||
        'No tengo información sobre eso en este momento.';

      pushMensaje({ id: uid(), tipo: 'bot', texto: respuesta });

      if (json.sugerencias && json.sugerencias.length > 0) {
        pushMensaje({
          id: uid(),
          tipo: 'sugerencias',
          opciones: json.sugerencias,
        });
      }

      if (json.refresh && json.action_executed) {
        const bannerMensajes: Record<string, string> = {
          agregar_cliente: 'Cliente vinculado correctamente a tu cartera',
          agregar_credito: 'Crédito registrado correctamente',
          agregar_pago: 'Pago registrado correctamente',
        };
        setActionBanner({
          visible: true,
          accion: json.action_executed,
          mensaje: bannerMensajes[json.action_executed] ?? 'Acción realizada',
        });
        if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
        bannerTimerRef.current = setTimeout(() => setActionBanner(null), 4000);

        const cacheKeysToInvalidate: string[] = [];
        const scope = json.refresh_scope ?? [];
        if (scope.includes('clientes')) {
          cacheKeysToInvalidate.push('clientes_cache', 'clientesPerfil_cache');
        }
        if (scope.includes('dashboard')) {
          cacheKeysToInvalidate.push('dashboard_cache');
        }
        if (scope.includes('pagos')) {
          cacheKeysToInvalidate.push('pagos_cache');
        }
        if (cacheKeysToInvalidate.length > 0) {
          await AsyncStorage.multiRemove(cacheKeysToInvalidate).catch(() => {});
        }
      }
    } catch (err: unknown) {
      if (requestId !== requestIdRef.current) return;
      if (err instanceof Error && err.name === 'AbortError') return;

      const status = (err as Error & { status?: number })?.status;
      const classified = classifyError(err, status);
      pushMensaje({
        id: uid(),
        tipo: 'bot',
        texto: classified.message,
        esError: classified.esError,
      });
    } finally {
      if (requestId === requestIdRef.current) {
        sendingRef.current = false;
        setLoading(false);
        scrollToBottom();
      }
    }
  };

  const handleEnviar = () => enviarMensaje(input);

  const handleSugerencia = (opcion: string) => enviarMensaje(opcion);

  const retryLast = () => {
    const pregunta = lastPreguntaRef.current;
    if (!pregunta || sendingRef.current) return;
    void enviarMensaje(pregunta, { isRetry: true });
  };

  const clearChat = useCallback(async () => {
    requestIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    sendingRef.current = false;
    lastPreguntaRef.current = '';
    setLoading(false);
    setInput('');
    setActionBanner(null);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setMensajes(buildBienvenida());

    await AsyncStorage.removeItem(SESSION_KEY);
    const nuevo = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    await AsyncStorage.setItem(SESSION_KEY, nuevo);
  }, []);

  return {
    mensajes,
    input,
    setInput,
    loading,
    scrollRef,
    actionBanner,
    handleEnviar,
    handleSugerencia,
    clearChat,
    retryLast,
  };
};
