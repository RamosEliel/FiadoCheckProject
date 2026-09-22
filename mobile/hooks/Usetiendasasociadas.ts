import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { CONFIG } from '@/config/config';
import { friendlyErrorMessage } from '@/utils/errorMessages';

const API_URL = CONFIG.API_URL;
export const TENDERO_SELECCIONADO_KEY = 'tenderoSeleccionado';

export type TiendaConDeuda = {
  id: string;
  nombre: string;
  tendero: string;
  direccion: string;
  totalDeuda: number;
  creditosActivos: number;
};

type TiendaDeudaAPI = {
  id_tendero: number | string;
  nombre_tienda?: string;
  nombre_tendero?: string;
  direccion?: string;
  total_deuda?: number;
  creditos_activos?: number;
};

const mapTienda = (row: TiendaDeudaAPI): TiendaConDeuda => ({
  id: String(row.id_tendero),
  nombre: row.nombre_tienda ?? 'Tienda sin nombre',
  tendero: row.nombre_tendero ?? '',
  direccion: row.direccion ?? '',
  totalDeuda: parseFloat(String(row.total_deuda ?? 0)) || 0,
  creditosActivos: parseInt(String(row.creditos_activos ?? 0), 10) || 0,
});

export const getTenderoSeleccionado = async (): Promise<TiendaConDeuda | null> => {
  const raw = await AsyncStorage.getItem(TENDERO_SELECCIONADO_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TiendaConDeuda;
  } catch {
    return null;
  }
};

export const setTenderoSeleccionado = async (tienda: TiendaConDeuda) => {
  await AsyncStorage.setItem(TENDERO_SELECCIONADO_KEY, JSON.stringify(tienda));
};

export const clearTenderoSeleccionado = async () => {
  await AsyncStorage.removeItem(TENDERO_SELECCIONADO_KEY);
};

export const fetchTiendasConDeuda = async (token: string): Promise<TiendaConDeuda[]> => {
  const res = await fetch(`${API_URL}/clientes/me/tiendas-deuda`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || 'No se pudieron cargar tus tiendas.');
  }
  const lista = Array.isArray(json.tiendas) ? json.tiendas : [];
  return lista.map(mapTienda);
};

export const resolveClienteHomeRoute = async (token: string): Promise<string> => {
  const tiendas = await fetchTiendasConDeuda(token);

  if (tiendas.length === 0) {
    await clearTenderoSeleccionado();
    return '/(tabs)/vistaUsuario';
  }

  if (tiendas.length === 1) {
    await setTenderoSeleccionado(tiendas[0]);
    return '/(tabs)/vistaUsuario';
  }

  return '/(auth)/TiendasAsociadas';
};

const formatCOP = (valor: number) =>
  `$${Math.round(valor).toLocaleString('es-CO')}`;

export const useTiendasAsociadas = () => {
  const [token, setToken] = useState<string | null>(null);
  const [tiendas, setTiendas] = useState<TiendaConDeuda[]>([]);
  const [loading, setLoading] = useState(true);
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState<TiendaConDeuda | null>(null);
  const [dropdownAbierto, setDropdownAbierto] = useState(false);

  const cargarTiendas = useCallback(async (authToken: string) => {
    setLoading(true);
    try {
      const lista = await fetchTiendasConDeuda(authToken);
      setTiendas(lista);
      const actual = await getTenderoSeleccionado();
      const match = actual ? lista.find((t) => t.id === actual.id) : null;
      if (match) setTiendaSeleccionada(match);
      else if (lista.length === 1) setTiendaSeleccionada(lista[0]);
    } catch (err: any) {
      Alert.alert('Error', friendlyErrorMessage(err.message));
      setTiendas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const storedToken = await AsyncStorage.getItem('token');
      setToken(storedToken);
      if (storedToken) {
        await cargarTiendas(storedToken);
      } else {
        setLoading(false);
        router.replace('/(auth)/login');
      }
    };
    init();
  }, [cargarTiendas]);

  const toggleDropdown = () => setDropdownAbierto((v) => !v);

  const seleccionarTienda = (tienda: TiendaConDeuda) => {
    setTiendaSeleccionada(tienda);
    setDropdownAbierto(false);
  };

  const handleContinuar = async () => {
    if (!tiendaSeleccionada) return;
    await setTenderoSeleccionado(tiendaSeleccionada);
    router.replace('/(tabs)/vistaUsuario' as any);
  };

  return {
    token,
    tiendas,
    loading,
    tiendaSeleccionada,
    dropdownAbierto,
    toggleDropdown,
    seleccionarTienda,
    handleContinuar,
    formatCOP,
  };
};
