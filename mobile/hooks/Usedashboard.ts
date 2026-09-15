import { useState, useEffect, useMemo, useRef } from 'react';
import { CONFIG } from '@/config/config';
import { router } from 'expo-router';

const API_URL = CONFIG.API_URL;

type Movimiento = {
  id_abono: number;
  monto: number;
  fecha: string;
  cliente: string;
  saldo_pendiente: number;
  tipo: 'pago'| 'vencido';
};
 
type HomeData = {
  cartera_total: number;
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
 
const isHoy = (fecha: string) => {
  const hoy = new Date();
  const f = new Date(fecha);
  return f.toDateString() === hoy.toDateString();
};
 
const isSemana = (fecha: string) => {
  const hoy = new Date();
  const f = new Date(fecha);
  const diff = (hoy.getTime() - f.getTime()) / (1000 * 60 * 60 * 24);
  return diff <= 7;
};
 
const isMes = (fecha: string) => {
  const hoy = new Date();
  const f = new Date(fecha);
  return f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear();
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
 
  useEffect(() => {
    if (!token) return;
    fetchDashboard();
  }, [token]);
 
  const fetchDashboard = async (overrideToken?: string, silent = false) => {
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
      setData(json);
    } catch (err: any) {
      if (silent && dataRef.current) {
        console.error('Error actualizando dashboard:', err);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };
 
  // Movimientos filtrados y buscados
  const actividadFiltrada = useMemo(() => {
    let movs = data?.ultimos_movimientos ?? [];
 
 
    // Filtro por fecha
    if (filtroFecha === 'hoy')   movs = movs.filter(m => isHoy(m.fecha));
    if (filtroFecha === 'semana') movs = movs.filter(m => isSemana(m.fecha));
    if (filtroFecha === 'mes')   movs = movs.filter(m => isMes(m.fecha));
 
    // Búsqueda por nombre
    if (busqueda.trim()) {
      movs = movs.filter(m =>
        m.cliente.toLowerCase().includes(busqueda.toLowerCase())
      );
    }
 
    return movs.map((m, idx) => ({
      initials: getInitials(m.cliente),
      name: m.cliente,
      bgColor: getAvatarColor(idx),
      subtitle: m.tipo === 'vencido' ? 'Vencido Hace 3 Días' : 'Pago Recibido Hoy',

      subtitleMora: m.tipo === 'vencido',
      amount:       m.tipo === 'pago' ? `+${formatCOP(m.monto)}` : formatCOP(m.monto),
      amountColor: m.tipo === 'vencido' ? '#FF5252' : '#3EBF7A',  
    }));
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
