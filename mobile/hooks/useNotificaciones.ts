import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const formatCOP = (valor: number) => `$${valor.toLocaleString('es-CO')}`;

/** Marca de tiempo discreta a partir de created_at. */
const tiempoRelativo = (iso: string) => {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';

  const minutos = Math.floor((Date.now() - fecha.getTime()) / 60000);
  if (minutos < 1) return 'hace un momento';
  if (minutos < 60) return `hace ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;

  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ayer';
  if (dias < 7) return `hace ${dias} días`;

  return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
};

const detalleAlerta = (diasAtraso: number) => {
  if (diasAtraso > 1) return `${diasAtraso} días de atraso`;
  if (diasAtraso === 1) return '1 día de atraso';
  return 'Próximo a vencer';
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

/** Alerta enriquecida con los textos ya formateados para la vista. */
export type AlertaVista = Alerta & {
  detalle: string;
  saldoFormateado: string;
  tiempo: string;
  enMora: boolean;
};

export type SeccionAlertas = {
  tipo: Alerta['tipo'];
  titulo: string;
  alertas: AlertaVista[];
};

const TITULO_SECCION: Record<Alerta['tipo'], string> = {
  critica: 'Requieren acción',
  proxima: 'Por vencer',
  informativa: 'Informativas',
};

const ORDEN_SECCIONES: Alerta['tipo'][] = ['critica', 'proxima', 'informativa'];

export const useNotificaciones = () => {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [sesionLista, setSesionLista] = useState(false);
  const [esTendero, setEsTendero] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const alertasRef = useRef(alertas);
  alertasRef.current = alertas;
  const [error, setError] = useState<string | null>(null);

  // Sesión y rol: la pantalla no necesita hablar con AsyncStorage.
  useFocusEffect(
    useCallback(() => {
      let cancelado = false;

      const cargarSesion = async () => {
        const [rawToken, rawUsuario] = await Promise.all([
          AsyncStorage.getItem('token'),
          AsyncStorage.getItem('usuario'),
        ]);
        if (cancelado) return;

        setToken(rawToken);
        try {
          const usuario = rawUsuario ? JSON.parse(rawUsuario) : null;
          setEsTendero(Number(usuario?.id_rol) === 1);
        } catch {
          setEsTendero(false);
        }
        setSesionLista(true);
      };

      cargarSesion();

      return () => {
        cancelado = true;
      };
    }, [])
  );

  const fetchAlertas = useCallback(async (silent = false) => {
    if (!token || !esTendero) {
      setLoading(false);
      return;
    }

    try {
      if (!silent) setLoading(true);
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
      if (silent && alertasRef.current.length > 0) {
        console.error('Error actualizando notificaciones:', err);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [token, esTendero]);

  useEffect(() => {
    fetchAlertas();
  }, [fetchAlertas]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAlertas();
    setRefreshing(false);
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

  const abrirAlerta = useCallback((alerta: Alerta) => {
    marcarLeida(alerta.id_alerta);
    router.push({
      pathname: '/perfilCliente',
      params: { id: String(alerta.id_cliente), creditoId: String(alerta.id_credito) },
    } as any);
  }, [marcarLeida, router]);

  // El backend ya devuelve las alertas ordenadas por prioridad; aquí solo se
  // agrupan por tipo para darles jerarquía visual en la lista.
  const secciones = useMemo<SeccionAlertas[]>(() => {
    const vistas: AlertaVista[] = alertas.map(a => ({
      ...a,
      detalle: detalleAlerta(a.dias_atraso),
      saldoFormateado: formatCOP(a.saldo_pendiente),
      tiempo: tiempoRelativo(a.created_at),
      enMora: a.dias_atraso > 0,
    }));

    return ORDEN_SECCIONES
      .map(tipo => ({
        tipo,
        titulo: TITULO_SECCION[tipo],
        alertas: vistas.filter(a => a.tipo === tipo),
      }))
      .filter(seccion => seccion.alertas.length > 0);
  }, [alertas]);

  const total = alertas.length;

  const resumen = total === 1
    ? '1 aviso sin leer'
    : `${total} avisos sin leer`;

  return {
    loading: !sesionLista || loading,
    refreshing,
    alertas,
    secciones,
    total,
    resumen,
    esTendero,
    error,
    refetch: fetchAlertas,
    onRefresh,
    marcarLeida,
    abrirAlerta,
  };
};
