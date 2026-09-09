import { useCallback, useEffect, useState } from 'react';
import { CONFIG } from '@/config/config';

const API_URL = CONFIG.API_URL;
const FETCH_TIMEOUT_MS = 15000;

const fetchWithTimeout = async (url: string, options: RequestInit) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

export type Alerta = {
  id_alerta: number;
  id_cliente: string;
  id_credito: number;
  nombre_cliente: string;
  tipo: 'critica' | 'proxima' | 'informativa';
  dias_atraso: number;
  monto_total: number;
  saldo_pendiente: number;
  leida: boolean;
  created_at: string;
};

export const useNotificaciones = (token: string | null, esTendero: boolean) => {
  const [loading, setLoading] = useState(true);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchAlertas = useCallback(async () => {
    if (!token || !esTendero) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetchWithTimeout(`${API_URL}/alertas`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error ${res.status}`);
      }

      const data = await res.json();
      setAlertas(data);
    } catch (err: any) {
      const message = err.name === 'AbortError'
        ? 'No se pudo contactar el servidor. Verifica tu conexión.'
        : (err.message || 'No se pudieron cargar las notificaciones.');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token, esTendero]);

  useEffect(() => {
    fetchAlertas();
  }, [fetchAlertas]);

  const marcarLeida = useCallback(async (idAlerta: number) => {
    if (!token) return;
    setAlertas(prev => prev.filter(a => a.id_alerta !== idAlerta));
    try {
      await fetchWithTimeout(`${API_URL}/alertas/${idAlerta}/leer`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Si falla, se recarga la lista para reflejar el estado real.
      fetchAlertas();
    }
  }, [token, fetchAlertas]);

  return { loading, alertas, error, refetch: fetchAlertas, marcarLeida };
};
