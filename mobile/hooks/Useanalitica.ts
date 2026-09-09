import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { CONFIG } from '@/config/config';
import { friendlyErrorMessage } from '@/utils/errorMessages';

const API_URL = CONFIG.API_URL;

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export type Cliente = {
  id: string;
  nombre: string;
};

export type PagoSemanal = {
  semana: number;
  pagos: number;
  esperado: number;
};

export type DistribucionItem = {
  label: string;
  pct: number;
  monto: number;
  color: string;
};

export const CHART_WEEKS = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'] as const;

const DIST_COLORS = {
  alDia: '#3EBF7A',
  mora17: '#FFA000',
  moraMas7: '#E53935',
};

const ANIOS_DISPONIBLES = [
  String(new Date().getFullYear() - 1),
  String(new Date().getFullYear()),
];

const EMPTY_SEMANAS: PagoSemanal[] = [
  { semana: 1, pagos: 0, esperado: 0 },
  { semana: 2, pagos: 0, esperado: 0 },
  { semana: 3, pagos: 0, esperado: 0 },
  { semana: 4, pagos: 0, esperado: 0 },
];

type AnaliticaResponse = {
  cliente: Cliente;
  anio: number;
  mes_chart: number;
  recuperado: number;
  mora_porcentaje: number;
  pagos_semanales: PagoSemanal[];
  distribucion: {
    al_dia: { pct: number; monto: number };
    mora_1_7: { pct: number; monto: number };
    mora_mas_7: { pct: number; monto: number };
  };
  error?: string;
};

export const formatMoneda = (valor: number) =>
  `$${valor.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const mapDistribucion = (d: AnaliticaResponse['distribucion']): DistribucionItem[] => [
  { label: 'Al Día', pct: d.al_dia.pct, monto: d.al_dia.monto, color: DIST_COLORS.alDia },
  { label: 'Mora 1 - 7 Días', pct: d.mora_1_7.pct, monto: d.mora_1_7.monto, color: DIST_COLORS.mora17 },
  { label: 'Mora +7 Días', pct: d.mora_mas_7.pct, monto: d.mora_mas_7.monto, color: DIST_COLORS.moraMas7 },
];

export const buildChartScale = (data: PagoSemanal[]) => {
  const maxVal = Math.max(0, ...data.flatMap((d) => [d.pagos, d.esperado]));
  if (maxVal === 0) {
    return { yMax: 15000, yTicks: [1000, 5000, 10000, 15000] as number[] };
  }

  const yMax = Math.ceil(maxVal / 1000) * 1000 || 1000;
  const step = yMax / 4;
  const yTicks = [step, step * 2, step * 3, yMax].map((v) => Math.round(v));
  return { yMax, yTicks };
};

const mesDefaultParaAnio = (anio: string) => {
  const anioNum = parseInt(anio, 10);
  const anioActual = new Date().getFullYear();
  return anioNum === anioActual ? new Date().getMonth() + 1 : 3;
};

export const useAnalitica = (token: string | null) => {
  const [busqueda, setBusqueda] = useState('');
  const [anio, setAnio] = useState(String(new Date().getFullYear()));
  const [mesChart, setMesChart] = useState(mesDefaultParaAnio(String(new Date().getFullYear())));
  const [loading, setLoading] = useState(false);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [recuperado, setRecuperado] = useState(0);
  const [moraPorcentaje, setMoraPorcentaje] = useState(0);
  const [pagosSemanales, setPagosSemanales] = useState<PagoSemanal[]>(EMPTY_SEMANAS);
  const [distribucion, setDistribucion] = useState<DistribucionItem[]>([]);
  const fetchSeq = useRef(0);

  const resetAnaliticaData = useCallback(() => {
    setRecuperado(0);
    setMoraPorcentaje(0);
    setPagosSemanales(EMPTY_SEMANAS);
    setDistribucion([]);
  }, []);

  const fetchAnalitica = useCallback(async (clienteId: string, silent = false) => {
    if (!token) return;

    const seq = ++fetchSeq.current;
    if (!silent) setLoading(true);

    try {
      const res = await fetch(
        `${API_URL}/analitica/cliente/${clienteId}?anio=${anio}&mes=${mesChart}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json: AnaliticaResponse = await res.json().catch(() => ({} as AnaliticaResponse));

      if (seq !== fetchSeq.current) return;

      if (!res.ok) throw new Error(json.error || 'No se pudo cargar la analítica.');

      if (json.cliente?.nombre) {
        setCliente((prev) =>
          prev && prev.id === clienteId
            ? { ...prev, nombre: json.cliente.nombre }
            : prev,
        );
      }

      setMesChart(json.mes_chart ?? mesChart);
      setRecuperado(json.recuperado ?? 0);
      setMoraPorcentaje(json.mora_porcentaje ?? 0);
      setPagosSemanales(
        json.pagos_semanales?.length ? json.pagos_semanales : EMPTY_SEMANAS,
      );
      setDistribucion(json.distribucion ? mapDistribucion(json.distribucion) : []);
    } catch (err: unknown) {
      if (seq !== fetchSeq.current) return;
      const message = err instanceof Error ? err.message : 'No se pudo cargar la analítica.';
      Alert.alert('Error', friendlyErrorMessage(message));
    } finally {
      if (seq === fetchSeq.current && !silent) {
        setLoading(false);
      }
    }
  }, [anio, mesChart, token]);

  useEffect(() => {
    if (cliente?.id) fetchAnalitica(cliente.id);
  }, [anio, mesChart, cliente?.id, fetchAnalitica]);

  const refetch = useCallback(() => {
    if (cliente?.id && token) fetchAnalitica(cliente.id, true);
  }, [cliente?.id, token, fetchAnalitica]);

  const buscarCliente = async () => {
    const q = busqueda.trim();
    if (!q || !token) return;

    setLoading(true);
    resetAnaliticaData();
    setCliente(null);

    try {
      const res = await fetch(
        `${API_URL}/clientes?q=${encodeURIComponent(q)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json().catch(() => []);

      if (!res.ok) {
        const err = json as { error?: string };
        throw new Error(err.error || 'No se encontró el cliente.');
      }

      const raw = Array.isArray(json) ? json[0] : json;
      if (!raw?.id_cliente) throw new Error('Cliente no encontrado.');

      setCliente({
        id: String(raw.id_cliente),
        nombre: raw.nombre_completo ?? 'Sin nombre',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al buscar cliente.';
      Alert.alert('Error', friendlyErrorMessage(message));
      setLoading(false);
    }
  };

  const seleccionarCliente = useCallback((id: string, nombre: string) => {
    resetAnaliticaData();
    setCliente({ id, nombre });
  }, [resetAnaliticaData]);

  const toggleAnio = () => {
    const idx = ANIOS_DISPONIBLES.indexOf(anio);
    const next = ANIOS_DISPONIBLES[(idx + 1) % ANIOS_DISPONIBLES.length];
    resetAnaliticaData();
    setMesChart(mesDefaultParaAnio(next));
    setAnio(next);
  };

  const avanzarMes = () => {
    resetAnaliticaData();
    setMesChart((prev) => (prev >= 12 ? 1 : prev + 1));
  };

  const handleCancelar = () => router.back();

  const chartTitle = `Pagos Diarios — ${MESES[mesChart - 1] ?? ''}`;
  const chartScale = buildChartScale(pagosSemanales);

  return {
    busqueda,
    setBusqueda,
    buscarCliente,
    seleccionarCliente,
    anio,
    toggleAnio,
    avanzarMes,
    mesChart,
    anios: ANIOS_DISPONIBLES,
    cliente,
    recuperado,
    moraPorcentaje,
    pagosSemanales,
    distribucion,
    chartTitle,
    chartScale,
    formatMoneda,
    loading,
    refetch,
    handleCancelar,
  };
};
