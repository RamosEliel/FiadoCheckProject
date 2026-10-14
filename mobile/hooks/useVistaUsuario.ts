import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Linking } from 'react-native';
import { CONFIG } from '@/config/config';
import { getTenderoSeleccionado } from '@/hooks/Usetiendasasociadas';
import { subscribeCarteraChanged } from '@/utils/carteraEvents';
import {
  formatNivelRiesgo,
  getRiesgoColor,
  getRiesgoLabelCliente,
  mapScoringML,
} from '@/utils/scoring';

const API_URL = CONFIG.API_URL;
const FETCH_TIMEOUT_MS = 15000;

const fetchWithTimeout = async (url: string, options: RequestInit) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

export type Movimiento = {
  id: string;
  tipo: 'CARGO' | 'ABONO';
  descripcion: string;
  fecha: string;
  monto: number;
  bgColor: string;
  signColor: string;
  id_credito?: number;
  saldoPendiente?: number;
  estado?: 'vigente' | 'vencido' | 'pagado';
};

export type UserData = {
  id_cliente: number;
  nombreUsuario: string;
  nombreTienda: string;
  direccionTienda: string;
  totalDeuda: number;
  totalAbonado: number;
  creditosActivos: number;
  creditosVencidos: number;
  fechaLimite: string;
  puntaje: number | null;
  nivelRiesgo: string | null;
  nivelConfianza: number | null;
  nivelConfianzaLabel: string;
  nivelConfianzaColor: string;
  enMora: boolean;
  telefonoTienda: string;
};

export const useVistaUsuario = (token: string | null) => {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const userDataRef = useRef(userData);
  userDataRef.current = userData;
  const [movements, setMovements] = useState<Movimiento[]>([]);
  const movementsRef = useRef(movements);
  movementsRef.current = movements;
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = useCallback(async (silent = false) => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      if (!silent) setLoading(true);
      setError(null);

      const tenderoActivo = await getTenderoSeleccionado();
      const tenderoQuery = tenderoActivo?.id ? `?id_tendero=${encodeURIComponent(tenderoActivo.id)}` : '';

      const meRes = await fetchWithTimeout(`${API_URL}/clientes/me${tenderoQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!meRes.ok) {
        const err = await meRes.json().catch(() => ({}));
        throw new Error(err.error || `Error ${meRes.status}`);
      }
      const user = await meRes.json();
      const scoringML = mapScoringML(user.scoring ?? {});
      const enMora = (user.totales?.creditos_vencidos ?? 0) > 0;

      const nivelConfianza = scoringML.confianza;
      const nivelRiesgo = scoringML.nivel_riesgo;
      const nivelConfianzaLabel = getRiesgoLabelCliente(nivelRiesgo, enMora);
      const nivelConfianzaColor = getRiesgoColor(enMora ? 'alto' : nivelRiesgo);

      let telefonoTienda = user.tienda?.telefono || '';
      telefonoTienda = telefonoTienda.replace(/\s/g, '');
      if (telefonoTienda && !telefonoTienda.startsWith('+')) {
        telefonoTienda = '+57' + telefonoTienda;
      }

      setUserData({
        id_cliente: user.id_cliente,
        nombreUsuario: user.nombre_completo,
        nombreTienda: user.tienda?.nombre_tienda || 'Sin tienda asociada',
        direccionTienda: user.tienda?.direccion || '',
        totalDeuda: Number(user.totales?.total_deuda) || 0,
        totalAbonado: 0,
        creditosActivos: Number(user.totales?.total_creditos) || 0,
        creditosVencidos: Number(user.totales?.creditos_vencidos) || 0,
        fechaLimite: '',
        puntaje: scoringML.puntaje,
        nivelRiesgo,
        nivelConfianza,
        nivelConfianzaLabel,
        nivelConfianzaColor,
        enMora,
        telefonoTienda,
      });

      try {
        const historyRes = await fetchWithTimeout(`${API_URL}/clientes/me/historial${tenderoQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!historyRes.ok) {
          const err = await historyRes.json().catch(() => ({}));
          throw new Error(err.error || `Error ${historyRes.status}`);
        }
        const history = await historyRes.json();

        // Fecha límite del crédito más reciente (vigente o vencido)
        const creditoMasReciente = history.historial?.find((item: any) =>
          item.credito.estado === 'vigente' || item.credito.estado === 'vencido'
        );
        const fechaLimite = creditoMasReciente?.credito.fecha_limite_pago?.split('T')[0] ?? '';

        const processedMovements: Movimiento[] = [];
        history.historial?.forEach((item: any) => {
          // Mostrar créditos vigentes y vencidos
          if (item.credito.estado !== 'vigente' && item.credito.estado !== 'vencido') return;

          const fechaCredito = item.credito.fecha_credito?.split('T')[0] ?? '';
          processedMovements.push({
            id: `cred-${item.credito.id_credito}`,
            tipo: 'CARGO',
            descripcion: item.credito.descripcion || 'Compra en tienda',
            fecha: fechaCredito,
            monto: item.credito.monto_total,
            bgColor: '#FFCDD2',
            signColor: '#E53935',
            id_credito: item.credito.id_credito,
            saldoPendiente: Number(item.credito.saldo_pendiente) || 0,
            estado: item.credito.estado,
          });
          item.abonos?.forEach((abono: any) => {
            const fechaAbono = abono.fecha_abono?.split('T')[0] ?? '';
            processedMovements.push({
              id: `abono-${abono.id_abono}`,
              tipo: 'ABONO',
              descripcion: `Abono · ${item.credito.descripcion || 'crédito'}`,
              fecha: fechaAbono,
              monto: abono.monto,
              bgColor: '#D7F5E8',
              signColor: '#00C48C',
              id_credito: item.credito.id_credito,
            });
          });
        });

        const sortedMovements = processedMovements
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        const totalDeudaCalculada = history.historial?.reduce((acc: number, item: any) => {
          if (item.credito.estado === 'vigente' || item.credito.estado === 'vencido') {
            return acc + (item.credito.saldo_pendiente ?? 0);
          }
          return acc;
        }, 0) ?? 0;

        const totalAbonado = history.historial?.reduce((acc: number, item: any) => {
          const abonos = Array.isArray(item.abonos) ? item.abonos : [];
          return acc + abonos.reduce((s: number, a: any) => s + (Number(a.monto) || 0), 0);
        }, 0) ?? 0;

        setUserData(prev => prev ? { ...prev, fechaLimite, totalDeuda: totalDeudaCalculada, totalAbonado } : prev);
        setMovements(sortedMovements);
      } catch (historyError: any) {
        console.error('Error cargando historial:', historyError);
        if (!(silent && movementsRef.current.length > 0)) {
          setMovements([]);
        }
      }
    } catch (err: any) {
      const message = err.name === 'AbortError'
        ? 'No se pudo contactar el servidor. Verifica tu conexión a internet.'
        : (err.message || 'No se pudieron cargar los datos de la cuenta.');
      if (silent && userDataRef.current) {
        console.error('Error actualizando cuenta:', err);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    return subscribeCarteraChanged(() => {
      void fetchUserData(true);
    });
  }, [fetchUserData]);

  const handleContactStore = useCallback(() => {
    const phone = userData?.telefonoTienda || '+573000000000';
    const url = `whatsapp://send?phone=${phone}&text=Hola, quiero consultar mi estado de cuenta.`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'No se pudo abrir WhatsApp');
    });
  }, [userData]);

  return {
    loading,
    userData,
    movements,
    error,
    handleContactStore,
    refetch: fetchUserData,
  };
};
