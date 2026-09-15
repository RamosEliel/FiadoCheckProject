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

export const CHART_WEEKS = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'] as const;

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

type DistribucionResponse = {
  al_dia: { pct: number; monto: number };
  mora_1_7: { pct: number; monto: number };
  mora_mas_7: { pct: number; monto: number };
};

type AnaliticaResponse = {
  cliente: Cliente;
  anio: number;
  mes_chart: number;
  recuperado: number;
  mora_porcentaje?: number;
  pagos_semanales: PagoSemanal[];
  distribucion?: DistribucionResponse;
  error?: string;
};

export const formatMoneda = (valor: number) =>
  `$${valor.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const round1 = (n: number) => Math.round(n * 10) / 10;

const mapDistribucion = (d: DistribucionResponse): DistribucionItem[] => [
  { label: 'Al Día', pct: d.al_dia.pct, monto: d.al_dia.monto, color: DIST_COLORS.alDia },
  { label: 'Mora 1 - 7 Días', pct: d.mora_1_7.pct, monto: d.mora_1_7.monto, color: DIST_COLORS.mora17 },
  { label: 'Mora +7 Días', pct: d.mora_mas_7.pct, monto: d.mora_mas_7.monto, color: DIST_COLORS.moraMas7 },
];

/** Mora % desde montos de buckets; si no hay distribución, usa mora_porcentaje. */
export const moraPorcentajeFromResponse = (
  json: Pick<AnaliticaResponse, 'distribucion' | 'mora_porcentaje'>,
): number => {
  const d = json.distribucion;
  if (!d) return json.mora_porcentaje ?? 0;

  const alDia = Number(d.al_dia?.monto) || 0;
  const mora17 = Number(d.mora_1_7?.monto) || 0;
  const moraMas7 = Number(d.mora_mas_7?.monto) || 0;
  const total = alDia + mora17 + moraMas7;
  return total > 0 ? round1(((mora17 + moraMas7) / total) * 100) : 0;
};

const coercePagoSemanal = (s: PagoSemanal): PagoSemanal => ({
  semana: Number(s.semana) || 0,
  pagos: Number(s.pagos) || 0,
  esperado: Number(s.esperado) || 0,
});

export const buildChartScale = (data: PagoSemanal[]) => {
  const maxVal = Math.max(0, ...data.flatMap((d) => [d.pagos, d.esperado]));
  if (maxVal === 0) {
    return { yMax: 750, yTicks: [0, 250, 500, 750] as number[] };
  }

  const yMax = Math.ceil(maxVal / 1000) * 1000 || 1000;
  const step = yMax / 4;
  const yTicks = [0, step, step * 2, step * 3, yMax].map((v) => Math.round(v));
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
      setMoraPorcentaje(moraPorcentajeFromResponse(json));
      setPagosSemanales(
        json.pagos_semanales?.length
          ? json.pagos_semanales.map(coercePagoSemanal)
          : EMPTY_SEMANAS,
      );
      setDistribucion(json.distribucion ? mapDistribucion(json.distribucion) : []);
    } catch (err: unknown) {
      if (seq !== fetchSeq.current) return;
      const message = err instanceof Error ? err.message : 'No se pudo cargar la analítica.';
      Alert.alert('Error', friendlyErrorMessage(message));
    } finally {
      if (seq === fetchSeq.current) {
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
    } finally {
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
    setMesChart(mesDefaultParaAnio(next));
    setAnio(next);
  };

  const previewMes = (delta: 1 | -1) => {
    let nextMes = mesChart + delta;
    let nextAnio = parseInt(anio, 10);

    if (nextMes > 12) {
      nextMes = 1;
      nextAnio += 1;
    } else if (nextMes < 1) {
      nextMes = 12;
      nextAnio -= 1;
    }

    return { nextMes, nextAnio: String(nextAnio) };
  };

  const cambiarMes = (delta: 1 | -1) => {
    const { nextMes, nextAnio } = previewMes(delta);
    if (!ANIOS_DISPONIBLES.includes(nextAnio)) return;
    if (nextAnio !== anio) setAnio(nextAnio);
    if (nextMes !== mesChart) setMesChart(nextMes);
  };

  const avanzarMes = () => cambiarMes(1);
  const retrocederMes = () => cambiarMes(-1);
  const puedeAvanzarMes = ANIOS_DISPONIBLES.includes(previewMes(1).nextAnio);
  const puedeRetrocederMes = ANIOS_DISPONIBLES.includes(previewMes(-1).nextAnio);

  const handleCancelar = () => router.back();

  const mesNombre = MESES[mesChart - 1] ?? '';
  const chartTitle = `Pagos semanales — ${mesNombre}`;
  const chartScale = buildChartScale(pagosSemanales);
  const sinPagosMes =
    Math.max(0, ...pagosSemanales.flatMap((d) => [d.pagos, d.esperado])) === 0;

  return {
    busqueda,
    setBusqueda,
    buscarCliente,
    seleccionarCliente,
    anio,
    toggleAnio,
    avanzarMes,
    retrocederMes,
    puedeAvanzarMes,
    puedeRetrocederMes,
    mesChart,
    mesNombre,
    sinPagosMes,
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
