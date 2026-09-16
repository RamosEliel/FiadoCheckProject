import { useState, useEffect, useCallback, useRef } from 'react';
import { router } from 'expo-router';
import { CONFIG } from '@/config/config';
import { mapScoringML, ScoringML } from '@/utils/scoring';
const API_URL = CONFIG.API_URL;
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
export type EstadoBadge = 'al_dia' | 'mora' | 'sin_deuda';
export type CreditoHistorial = {
  id_credito: number;
  titulo: string;
  subtitulo: string;
  monto: string;
  estado: 'pagado' | 'vigente' | 'vencido';
};
// NUEVO — tipo para historial de pagos
export type PagoHistorial = {
  id_abono: number;
  titulo: string;
  subtitulo: string;
  monto: string;
  fecha: string;
};
export type ClientePerfil = {
  id_cliente: number;
  nombre: string;
  clienteDesde: string;
  estadoBadge: string;
  estadoBadgeTipo: EstadoBadge;
  deudaActual: string;
  nivelRiesgo: string | null;
  nivelConfianza: number | null;
  puntaje: number | null;
  telefono: string;
  direccion: string;
  historial: CreditoHistorial[];
  historialPagos: PagoHistorial[]; // NUEVO
};
const formatCOP = (valor: number) =>
  `$${valor.toLocaleString('es-CO')}`;
const formatFechaLarga = (fecha: string) => {
  const d = new Date(fecha);
  return `${d.getDate()} ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
};
const formatFechaCorta = (fecha: string) => {
  const d = new Date(fecha);
  const mes = MESES[d.getMonth()];
  return `${d.getDate()} ${mes.charAt(0).toUpperCase()}${mes.slice(1)}`;
};
const formatClienteDesde = (fecha: string) => {
  const d = new Date(fecha);
  return `Cliente desde ${MESES[d.getMonth()]} ${d.getFullYear()}`;
};
const fetchScoringML = async (clienteId: string, token: string):
Promise<ScoringML> => {
  const headers = { Authorization: `Bearer ${token}` };
  const empty: ScoringML = { confianza: 0, nivel_riesgo: null, puntaje: null };
  try {
    const res = await fetch(`${API_URL}/scoring/${clienteId}/recomendacion`, {
headers });
    if (res.ok) {
      const json = await res.json();
      return mapScoringML(json);
    }
  } catch (err) {
    console.error('Error obteniendo scoring ML:', err);
  }
  return empty;
};
const mapHistorial = (items: any[]): CreditoHistorial[] =>
  items.map((item) => {
    const credito = item.credito;
    const estado = credito.estado as 'pagado' | 'vigente' | 'vencido';
    let subtitulo = '';
    if (estado === 'pagado') {
      subtitulo = 'Pagado completo';
    } else if (estado === 'vigente') {
      subtitulo = `Vence ${formatFechaCorta(credito.fecha_limite_pago)}`;
    } else {
      subtitulo = 'Vencido';
    }
    const titulo = credito.descripcion?.trim()
      ? credito.descripcion
      : `Crédito ${formatFechaLarga(credito.fecha_credito)}`;
    return {
      id_credito: credito.id_credito,
      titulo,
      subtitulo,
      monto: formatCOP(credito.monto_total),
      estado,
    };
  });
// NUEVO — mapea respuesta de GET /clientes/:id/pagos
const mapPagos = (pagos: any[]): PagoHistorial[] =>
  pagos.map((pago) => {
    const credito = pago.credito;
    const titulo = credito?.descripcion?.trim()
      ? credito.descripcion
      : `Crédito #${credito?.id_credito ?? pago.id_abono}`;
    return {
      id_abono: pago.id_abono,
      titulo,
      subtitulo: `Abono registrado`,
      monto: formatCOP(pago.monto),
      fecha: formatFechaCorta(pago.fecha_abono),
    };
  });
export const useClientePerfil = (token: string | null, clienteId: string |
undefined) => {
  const [perfil, setPerfil] = useState<ClientePerfil | null>(null);
  const perfilRef = useRef(perfil);
  perfilRef.current = perfil;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchPerfil = useCallback(async (silent = false) => {
    if (!token || !clienteId) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [clienteRes, historialRes, pagosRes, scoringML] = await
Promise.all([
        fetch(`${API_URL}/clientes/${clienteId}`, { headers }),
        fetch(`${API_URL}/clientes/${clienteId}/historial`, { headers }),
        fetch(`${API_URL}/clientes/${clienteId}/pagos`, { headers }), // NUEVO
        fetchScoringML(clienteId, token),
      ]);
      if (!clienteRes.ok) {
        const err = await clienteRes.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo cargar el cliente');
      }
      const cliente = await clienteRes.json();
      const historialJson = historialRes.ok
        ? await historialRes.json()
        : { historial: [] };
      const pagosJson = pagosRes.ok
        ? await pagosRes.json()
        : { pagos: [] };
      const totalDeuda = cliente.totales?.total_deuda ?? 0;
      const creditosVencidos = cliente.totales?.creditos_vencidos ?? 0;
      let estadoBadgeTipo: EstadoBadge = 'al_dia';
      let estadoBadge = 'Al día';
      if (totalDeuda === 0) {
        estadoBadgeTipo = 'sin_deuda';
        estadoBadge = 'Sin deuda';
      } else if (creditosVencidos > 0) {
        estadoBadgeTipo = 'mora';
        estadoBadge = 'Mora';
      }
      setPerfil({
        id_cliente: cliente.id_cliente,
        nombre: cliente.nombre_completo,
        clienteDesde: formatClienteDesde(cliente.created_at),
        estadoBadge,
        estadoBadgeTipo,
        deudaActual: formatCOP(totalDeuda),
        nivelRiesgo: scoringML.nivel_riesgo,
        nivelConfianza: scoringML.confianza,
        puntaje: scoringML.puntaje,
        telefono: cliente.telefono || 'No registrado',
        direccion: cliente.direccion || 'No registrada',
        historial: mapHistorial(historialJson.historial ?? []),
        historialPagos: mapPagos(pagosJson.pagos ?? []), // NUEVO
      });
    } catch (err: any) {
      if (silent && perfilRef.current) {
        console.error('Error actualizando perfil:', err);
      } else {
        setError(err.message || 'Error de conexión');
      }
    } finally {
      setLoading(false);
    }
  }, [token, clienteId]);
  useEffect(() => {
    fetchPerfil();
  }, [fetchPerfil]);
  const handleNuevoCredito = () => {
    if (!clienteId) return;
    router.push({
      pathname: '/addcredit',
      params: { clienteId: String(clienteId) },
    });
  };
  return {
    perfil,
    loading,
    error,
    refetch: fetchPerfil,
    handleNuevoCredito,
  };
};
