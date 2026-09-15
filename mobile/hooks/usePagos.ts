import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { router } from 'expo-router';
import { CONFIG } from '@/config/config';
const API_URL = CONFIG.API_URL;
export type FiltroPeriodo = 'todos' | 'hoy' | 'semana' | 'mes';
export type PagoItem = {
id_abono: number;
clienteNombre: string;
creditoTitulo: string;
monto: string;
montoRaw: number;
fecha: string;
fechaRaw: string;
};
const MESES = [
'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const formatCOP = (valor: number) =>
`$${valor.toLocaleString('es-CO')}`;
const formatFecha = (fecha: string) => {
const d = new Date(fecha);
const mes = MESES[d.getMonth()];
return `${d.getDate()} ${mes.charAt(0).toUpperCase()}${mes.slice(1)}
${d.getFullYear()}`;
};
const mapPago = (p: any): PagoItem => ({
id_abono: p.id_abono,
clienteNombre: p.cliente?.nombre_completo ?? 'Cliente',
creditoTitulo: p.credito?.descripcion?.trim()
    ? p.credito.descripcion
    : `Crédito #${p.credito?.id_credito ?? p.id_abono}`,
monto: formatCOP(p.monto),
montoRaw: p.monto,
fecha: formatFecha(p.fecha_abono),
fechaRaw: p.fecha_abono,
});
export const usePagos = (token: string | null) => {
const [pagos, setPagos] = useState<PagoItem[]>([]);
const pagosRef = useRef(pagos);
pagosRef.current = pagos;
const [busqueda, setBusqueda] = useState('');
const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodo>('todos');
const [loading, setLoading] = useState(true);
const [totalRecaudado, setTotalRecaudado] = useState(0);
const fetchPagos = useCallback(async (silent = false) => {
    if (!token) {
    setLoading(false);
    return;
    }
    if (!silent) setLoading(true);
    try {
    const params = new URLSearchParams();
    if (busqueda.trim()) params.set('q', busqueda.trim());
    if (filtroPeriodo !== 'todos') params.set('periodo', filtroPeriodo);
    const res = await fetch(`${API_URL}/pagos?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error al cargar pagos');
    setPagos((json.pagos ?? []).map(mapPago));
    setTotalRecaudado(json.total_recaudado ?? 0);
    } catch (err) {
    if (silent && pagosRef.current.length > 0) {
        console.error('Error actualizando pagos:', err);
    } else {
        setPagos([]);
        setTotalRecaudado(0);
    }
    } finally {
    setLoading(false);
    }
}, [token, filtroPeriodo]);
useEffect(() => {
    fetchPagos();
}, [fetchPagos]);
const pagosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return pagos;
    const q = busqueda.toLowerCase();
    return pagos.filter(
    (p) =>
        p.clienteNombre.toLowerCase().includes(q) ||
        p.creditoTitulo.toLowerCase().includes(q) ||
        p.monto.includes(q)
    );
}, [pagos, busqueda]);
const handleFiltro = (filtro: FiltroPeriodo) => setFiltroPeriodo(filtro);
const handleRegistrarPago = () => {
  router.push('/registerpayment' as any);
};
return {
    pagos: pagosFiltrados,
    busqueda,
    setBusqueda,
    filtroPeriodo,
    handleFiltro,
    loading,
    total: pagosFiltrados.length,
    totalRecaudado,
    handleRegistrarPago,
    refetch: fetchPagos,
};
};
