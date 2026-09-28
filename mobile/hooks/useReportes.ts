import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { CONFIG } from '@/config/config';
import { subscribeCarteraChanged } from '@/utils/carteraEvents';

const API_URL = CONFIG.API_URL;

export type PeriodoReporte = 'semana' | 'mes' | 'aldia';

export type CreditoEstado = {
  estado: string;
  cantidad: number;
  monto_total: number;
  saldo_pendiente: number;
};

export type TopDeudor = {
  id_cliente: number;
  nombre: string;
  telefono: string;
  total_deuda: number;
};

export type Reporte = {
  periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  creditos: CreditoEstado[];
  pagos: { total: number; cantidad: number };
  mora: { monto: number; creditos_vencidos: number; clientes_nuevos_en_mora: number };
  clientes_activos: number;
  tasa_recuperacion: number;
  top_deudores: TopDeudor[];
};

export const formatCOP = (valor: number) =>
  `$${valor.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`;

export const useReportes = (token: string | null) => {
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<PeriodoReporte>('mes');

  const fetchReporte = useCallback(
    async (p: PeriodoReporte = 'mes', silent = false) => {
      if (!token) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/reportes?periodo=${p}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Error al cargar el reporte');
        setReporte(json);
      } catch (e: any) {
        setError(e.message ?? 'Error desconocido');
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useFocusEffect(
    useCallback(() => {
      fetchReporte(periodo);
    }, [token, periodo, fetchReporte])
  );

  useEffect(() => {
    return subscribeCarteraChanged(() => {
      void fetchReporte(periodo, true);
    });
  }, [fetchReporte, periodo]);

  const cambiarPeriodo = (nuevoPeriodo: PeriodoReporte) => {
    setPeriodo(nuevoPeriodo);
    fetchReporte(nuevoPeriodo);
  };

  const totalCartera =
    reporte?.creditos.reduce((s, c) => s + c.monto_total, 0) ?? 0;

  return {
    reporte,
    loading,
    error,
    periodo,
    cambiarPeriodo,
    totalCartera,
    formatCOP,
    refetch: () => fetchReporte(periodo),
  };
};
