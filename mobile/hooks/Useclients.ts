import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { CONFIG } from '@/config/config';

const API_URL = CONFIG.API_URL;


export type EstadoCliente = 'al_dia' | 'mora' | 'proximo' | 'sin_deuda';

export type Cliente = {
  id_cliente: string;
  nombre_completo: string;
  initials: string;
  bgColor: string;
  subtitulo: string;
  subtituloTipo: 'normal' | 'mora' | 'proximo';
  monto: string;
  estado: EstadoCliente;
};

type Filtro = 'todos' | 'mora' | 'al_dia' | 'sin_deuda';

const getInitials = (nombre: string) =>
  nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

const avatarColors = ['#4CAF50', '#FFC107', '#FF5252', '#2196F3', '#9C27B0', '#FF9800'];

const getAvatarColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

export const useClients = (token: string | null) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filtrados, setFiltrados] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroActivo, setFiltroActivo] = useState<Filtro>('todos');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchClientes = useCallback(async (silent = false) => {
    if (!token) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_URL}/clientes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      if (!res.ok) {
        return;
      }

      const dataArray = Array.isArray(json) ? json : (json.data && Array.isArray(json.data) ? json.data : null);

      if (!dataArray) {
        return;
      }

      const mapped: Cliente[] = dataArray.map((c: any) => ({
        id_cliente: c.id_cliente,
        nombre_completo: c.nombre_completo,
        initials: getInitials(c.nombre_completo),
        bgColor: getAvatarColor(c.id_cliente),
        subtitulo: c.total_deuda > 0 ? `Deuda: $${c.total_deuda.toLocaleString('es-CO')}` : 'Al día',
        subtituloTipo: c.total_deuda > 0 ? 'mora' : 'normal',
        monto: `$${Number(c.total_deuda).toLocaleString('es-CO')}`,
        estado: c.total_deuda > 0 ? 'mora' : 'al_dia',
      }));

      setClientes(mapped);
      setTotal(mapped.length);
    } catch (err) {
      // Error de conexión silenciado
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchClientes();
    }
  }, [token, fetchClientes]);

  useEffect(() => {
    aplicarFiltros();
  }, [busqueda, filtroActivo, clientes]);


  const aplicarFiltros = () => {
    let resultado = [...clientes];

    if (busqueda.trim()) {
      resultado = resultado.filter(c =>
        c.nombre_completo.toLowerCase().includes(busqueda.toLowerCase())
      );
    }
    
    if (filtroActivo !== 'todos') {
      resultado = resultado.filter(c => c.estado === filtroActivo);
    }

    setFiltrados(resultado);
  };
  

  const handleFiltro = (filtro: Filtro) => setFiltroActivo(filtro);

  const handleClientePress = (id: string) => {
    router.push({
      pathname: '/(tabs)/perfilCliente',
      params: { id: String(id) },
    });
  };

  return {
    clientes: filtrados,
    busqueda,
    setBusqueda,
    filtroActivo,
    loading,
    total,
    handleFiltro,
    handleClientePress,
    refetch: fetchClientes,
  };
};