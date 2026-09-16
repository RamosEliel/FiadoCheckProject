import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { CONFIG } from '@/config/config';
import { getRiesgoColor, mapScoringML } from '@/utils/scoring';
import { friendlyErrorMessage } from '@/utils/errorMessages';

const API_URL = CONFIG.API_URL;

export type EstadoRecomendacion =
  | 'cliente_no_existe'
  | 'cliente_sin_vinculo'
  | 'sin_credito_tienda'
  | 'con_historial';

export type RecomendacionIA = {
  estado: EstadoRecomendacion;
  mensaje: string;
  nombre: string | null;
  limite_sugerido: number | null;
  nivel_riesgo: string | null;
  confianza: number | null;
  puntaje: number | null;
  total_creditos: number;
  total_deuda: number;
  creditos_vencidos: number;
  relacion_estado: string | null;
} | null;

type RecomendacionResponse = {
  estado: EstadoRecomendacion;
  mensaje: string;
  nombre_completo?: string;
  puntaje?: number | null;
  limite_sugerido?: number;
  nivel_riesgo?: string;
  confianza?: number | null;
  relacion_estado?: string | null;
  totales?: {
    total_creditos: number;
    total_deuda: number;
    creditos_vencidos: number;
  };
  error?: string;
};

const mapRecomendacion = (json: RecomendacionResponse): RecomendacionIA => {
  const ml = mapScoringML(json);
  return {
    estado: json.estado,
    mensaje: json.mensaje,
    nombre: json.nombre_completo ?? null,
    limite_sugerido: json.limite_sugerido ?? null,
    nivel_riesgo: ml.nivel_riesgo,
    confianza: ml.confianza,
    puntaje: ml.puntaje,
    total_creditos: json.totales?.total_creditos ?? 0,
    total_deuda: json.totales?.total_deuda ?? 0,
    creditos_vencidos: json.totales?.creditos_vencidos ?? 0,
    relacion_estado: json.relacion_estado ?? null,
  };
};

const normalizeClienteId = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && !Number.isNaN(value)) return String(value).trim();
  return fallback.trim();
};

export const useAddCredit = (token: string, id_tendero: string, initialClienteId?: string | string[]) => {
  const initialId = normalizeClienteId(
    Array.isArray(initialClienteId) ? initialClienteId[0] : initialClienteId,
  );
  const [usuario, setUsuario]         = useState(initialId);
  const [monto, setMonto]             = useState('');
  const [fechaLimite, setFechaLimite] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [scoring, setScoring]         = useState<RecomendacionIA>(null);
  const [loadingScoring, setLoadingScoring] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading]         = useState(false);

  const fetchRecomendacion = async (clienteId: string): Promise<RecomendacionResponse> => {
    const res = await fetch(`${API_URL}/scoring/${clienteId}/recomendacion`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json.error || 'No se pudo cargar la recomendación');
    }

    return json;
  };

  const buscarScoring = async (clienteId?: unknown) => {
    const id = normalizeClienteId(
      typeof clienteId === 'string' || typeof clienteId === 'number' ? clienteId : undefined,
      usuario,
    );
    if (!id) return;
    setLoadingScoring(true);
    try {
      const data = await fetchRecomendacion(id);
      setScoring(mapRecomendacion(data));
    } catch (err: any) {
      Alert.alert('Error', friendlyErrorMessage(err.message || 'No se pudo cargar la información del cliente.'));
      setScoring(null);
    } finally {
      setLoadingScoring(false);
    }
  };

  useEffect(() => {
    if (!initialId || !token) return;

    let cancelled = false;

    const load = async () => {
      setUsuario(initialId);
      setLoadingScoring(true);
      try {
        const data = await fetchRecomendacion(initialId);
        if (!cancelled) setScoring(mapRecomendacion(data));
      } catch (err: any) {
        if (!cancelled) {
          Alert.alert('Error', friendlyErrorMessage(err.message || 'No se pudo cargar la información del cliente.'));
          setScoring(null);
        }
      } finally {
        if (!cancelled) setLoadingScoring(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [initialId, token]);

  const isValidDate = (str: string) => {
    const parts = str.split('/');
    if (parts.length !== 3) return false;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;

    const dateObj = new Date(year, month - 1, day);
    if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
      return false;
    }

    const currentYear = new Date().getFullYear();
    if (year < currentYear || year > currentYear + 10) {
      return false;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    dateObj.setHours(0, 0, 0, 0);
    if (dateObj.getTime() < hoy.getTime()) {
      return false;
    }

    return true;
  };

  const handleFechaChange = (text: string) => {
    let cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length > 8) {
      cleaned = cleaned.slice(0, 8);
    }

    let formatted = cleaned;
    if (cleaned.length > 2) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`;
    }
    setFechaLimite(formatted);
  };

  const handleGuardar = async () => {
    if (!usuario || !monto || !fechaLimite) {
      Alert.alert('Campos vacíos', 'Completa usuario, monto y fecha límite');
      return;
    }

    if (!isValidDate(fechaLimite)) {
      Alert.alert(
        'Fecha inválida',
        'Ingresa una fecha límite válida (DD/MM/AAAA) igual o posterior a hoy.'
      );
      return;
    }

    setLoading(true);
    try {
      let fechaFormateada = fechaLimite.trim();
      if (fechaFormateada.includes('/')) {
        const partes = fechaFormateada.split('/');
        if (partes.length === 3) {
          const dia = partes[0].padStart(2, '0');
          const mes = partes[1].padStart(2, '0');
          const anio = partes[2];
          fechaFormateada = `${anio}-${mes}-${dia}`;
        }
      }

      const res = await fetch(`${API_URL}/creditos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clienteId: normalizeClienteId(usuario),
          montoTotal: parseFloat(monto.replace(/[^0-9.]/g, '')),
          fechaLimitePago: fechaFormateada,
          descripcion: observaciones,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al guardar');

      Alert.alert('¡Crédito creado!', 'El crédito fue registrado correctamente', [
        { text: 'OK', onPress: () => setTimeout(() => router.back(), 300) }
      ]);
    } catch (err: any) {
      Alert.alert('Error', friendlyErrorMessage(err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = () => router.back();

  return {
    usuario, setUsuario,
    monto, setMonto,
    fechaLimite, setFechaLimite,
    handleFechaChange,
    observaciones, setObservaciones,
    scoring, loadingScoring,
    showDatePicker, setShowDatePicker,
    loading,
    buscarScoring,
    handleGuardar,
    handleCancelar,
    getRiesgoColor,
  };
};
