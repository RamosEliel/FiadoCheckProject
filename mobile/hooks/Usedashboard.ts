import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { CONFIG } from '@/config/config';
import { router } from 'expo-router';
import { subscribeCarteraChanged, type CarteraChange } from '@/utils/carteraEvents';
import {
  calendarDaysBetween,
  startOfMonthKey,
  startOfWeekKey,
  toDateKey,
  todayBusinessKey,
} from '@/utils/businessDate';

const API_URL = CONFIG.API_URL;

type Movimiento = {
  id_abono: number;
  monto: number;
  fecha: string;
  cliente: string;
  saldo_pendiente: number;
  tipo: 'pago' | 'credito' | 'vencido';
};
 
type HomeData = {
  cartera_total: number;
  monto_total_pendiente?: number;
  monto_en_mora: number;
  monto_al_dia: number;
  total_clientes: number;
  clientes_en_mora: number;
  clientes_sin_deuda: number;
  ultimos_movimientos: Movimiento[];
};

export type FiltroFecha = 'todos' | 'hoy' | 'semana' | 'mes';
 
const formatCOP = (valor: number) =>
  `$${valor.toLocaleString('es-CO')},00`;
 
const getInitials = (nombre: string) =>
  nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
 
const avatarColors = ['#4CAF50', '#FFC107', '#FF5252', '#2196F3', '#9C27B0'];
const getAvatarColor = (idx: number) => avatarColors[idx % avatarColors.length];
 
const isHoy = (fecha: string) => toDateKey(fecha) === todayBusinessKey();

const isSemana = (fecha: string) => {
  const key = toDateKey(fecha);
  const hoy = todayBusinessKey();
  if (!key) return false;
  return key >= startOfWeekKey(hoy) && key <= hoy;
};

const isMes = (fecha: string) => {
  const key = toDateKey(fecha);
  const hoy = todayBusinessKey();
  if (!key) return false;
  return key >= startOfMonthKey(hoy) && key <= hoy;
};

const subtitleFromFecha = (fecha: string, tipo: Movimiento['tipo']) => {
  const key = toDateKey(fecha);
  if (!key) return tipo === 'credito' ? 'Crédito' : tipo === 'vencido' ? 'Vencido' : 'Pago recibido';
  const dias = calendarDaysBetween(key, todayBusinessKey());
  const cuando = dias <= 0 ? 'Hoy' : dias === 1 ? 'Hace 1 día' : `Hace ${dias} días`;
  if (tipo === 'credito') return `Crédito · ${cuando}`;
  if (tipo === 'vencido') return `Vencido · ${cuando}`;
  return `Pago recibido · ${cuando}`;
};

const normalizeMovimientos = (raw: unknown): Movimiento[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const tipoRaw = item?.tipo;
    const tipo: Movimiento['tipo'] =
      tipoRaw === 'credito' || tipoRaw === 'vencido' || tipoRaw === 'pago'
        ? tipoRaw
        : 'pago';
    return {
      id_abono: Number(item?.id_abono) || 0,
      monto: Number(item?.monto) || 0,
      fecha: String(item?.fecha ?? ''),
      cliente: String(item?.cliente ?? ''),
      saldo_pendiente: Number(item?.saldo_pendiente) || 0,
      tipo,
    };
  });
};

const esMovimientoLocal = (m: Movimiento) => m.id_abono > 1e12;

const mismoMovimiento = (a: Movimiento, b: Movimiento) =>
  a.tipo === b.tipo &&
  a.monto === b.monto &&
  a.cliente === b.cliente &&
  toDateKey(a.fecha) === toDateKey(b.fecha);

const mergeMovimientos = (incoming: Movimiento[], previous: Movimiento[]): Movimiento[] => {
  const local = previous.find(esMovimientoLocal);
  if (!local) return incoming;
  const yaEsta = incoming.some((item) => mismoMovimiento(item, local));
  if (yaEsta) return incoming;
  return [local, ...incoming];
};

const applyCarteraChange = (current: HomeData, change: CarteraChange): HomeData => {
  const monto = Number(change.monto) || 0;
  let cartera_total = Number(current.cartera_total) || 0;
  let monto_total_pendiente = Number(current.monto_total_pendiente ?? current.cartera_total) || 0;
  let monto_en_mora = Number(current.monto_en_mora) || 0;
  let monto_al_dia = Number(current.monto_al_dia) || 0;

  if (change.tipo === 'pago') {
    cartera_total = Math.max(0, cartera_total - monto);
    monto_total_pendiente = Math.max(0, monto_total_pendiente - monto);
    if (change.estadoCredito === 'vencido') {
      monto_en_mora = Math.max(0, monto_en_mora - monto);
    } else {
      monto_al_dia = Math.max(0, monto_al_dia - monto);
    }
  } else {
    cartera_total += monto;
    monto_total_pendiente += monto;
    monto_al_dia += monto;
  }

  const movimiento: Movimiento = {
    id_abono: Date.now(),
    monto,
    fecha: todayBusinessKey(),
    cliente: change.cliente ?? '',
    saldo_pendiente: 0,
    tipo: change.tipo === 'credito' ? 'credito' : 'pago',
  };
  const prev = Array.isArray(current.ultimos_movimientos) ? current.ultimos_movimientos : [];

  return {
    ...current,
    cartera_total,
    monto_total_pendiente,
    monto_en_mora,
    monto_al_dia,
    ultimos_movimientos: [movimiento, ...prev],
  };
};
 
export const useDashboard = (token: string) => {
  const [data, setData] = useState<HomeData | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
 
  const [busqueda, setBusqueda] = useState('');
  const [mostrarBusqueda, setMostrarBusqueda] = useState(false);
  const [filtroFecha, setFiltroFecha] = useState<FiltroFecha>('todos');
 
  const fetchDashboard = useCallback(async (overrideToken?: string, silent = false) => {
    const effectiveToken = overrideToken || token;
    if (!effectiveToken) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/dashboard`, {
        headers: { Authorization: `Bearer ${effectiveToken}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al cargar');
      const mora = Number(json.monto_en_mora) || 0;
      const alDia = Number(json.monto_al_dia) || 0;
      // Por cobrar = saldo, no monto original. Azure viejo no manda monto_total_pendiente
      // y cartera_total seguía siendo SUM(monto_total); mora+al_día ya son saldo.
      const pendiente = json.monto_total_pendiente != null
        ? Number(json.monto_total_pendiente) || 0
        : mora + alDia;
      const incoming = normalizeMovimientos(json.ultimos_movimientos);
      setData({
        ...json,
        monto_total_pendiente: pendiente,
        cartera_total: pendiente,
        ultimos_movimientos: mergeMovimientos(incoming, dataRef.current?.ultimos_movimientos ?? []),
      });
    } catch (err: any) {
      if (silent && dataRef.current) {
        console.error('Error actualizando dashboard:', err);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchDashboard();
  }, [token, fetchDashboard]);

  useEffect(() => {
    let delayed: ReturnType<typeof setTimeout> | undefined;
    const unsub = subscribeCarteraChanged((change) => {
      const current = dataRef.current;
      if (change?.tipo && change.monto > 0 && current) {
        const next = applyCarteraChange(current, change);
        dataRef.current = next;
        setData(next);
      }
      void fetchDashboard(undefined, true);
      if (delayed) clearTimeout(delayed);
      delayed = setTimeout(() => {
        void fetchDashboard(undefined, true);
      }, 400);
    });
    return () => {
      if (delayed) clearTimeout(delayed);
      unsub();
    };
  }, [fetchDashboard]);
 
  // Movimientos filtrados y buscados
  const actividadFiltrada = useMemo(() => {
    let movs = Array.isArray(data?.ultimos_movimientos) ? data.ultimos_movimientos : [];

    if (filtroFecha === 'hoy') movs = movs.filter(m => isHoy(m.fecha));
    else if (filtroFecha === 'semana') movs = movs.filter(m => isSemana(m.fecha));
    else if (filtroFecha === 'mes') movs = movs.filter(m => isMes(m.fecha));

    if (busqueda.trim()) {
      movs = movs.filter(m =>
        m.cliente.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    if (filtroFecha === 'todos') movs = movs.slice(0, 8);

    return movs.map((m, idx) => {
      const tipo = m.tipo ?? 'pago';
      return {
        id: m.id_abono,
        initials: getInitials(m.cliente),
        name: m.cliente,
        bgColor: getAvatarColor(idx),
        subtitle: subtitleFromFecha(m.fecha, tipo),
        subtitleMora: tipo === 'vencido',
        amount: tipo === 'pago' ? `+${formatCOP(m.monto)}` : formatCOP(m.monto),
        amountColor: tipo === 'pago' ? '#3EBF7A' : '#FF5252',
      };
    });
  }, [data, filtroFecha, busqueda]);
 
  const toggleBusqueda = () => {
    setMostrarBusqueda(prev => !prev);
    if (mostrarBusqueda) setBusqueda('');
  };
 
  const handleNuevoCredito  = () => { router.push('/addcredit'); };
  const handleRegistrarPago = () => { router.push('/registerpayment' as any); };
  const handleBell          = () => router.push('/notificaciones' as any);
 
  return {
    data, loading, error,
    actividad: actividadFiltrada,
    formatCOP,
    refetch: fetchDashboard,
    // búsqueda
    busqueda, setBusqueda,
    mostrarBusqueda, toggleBusqueda,
    // filtros
    filtroFecha, setFiltroFecha,
    handleNuevoCredito, handleRegistrarPago, handleBell,
  };
};
