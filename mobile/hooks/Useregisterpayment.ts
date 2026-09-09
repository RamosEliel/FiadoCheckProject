import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { CONFIG } from '@/config/config';
import { friendlyErrorMessage } from '@/utils/errorMessages';

const API_URL = CONFIG.API_URL;

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type EstadoCredito = 'vigente' | 'pagado' | 'vencido';

export type CreditoCliente = {
  id: string;
  clienteId: string;
  nombreCliente: string;
  montoTotal: number;
  saldoPendiente: number;
  diasEnMora: number;
  estado: EstadoCredito;
  descripcion: string | null;
  fechaLimitePago: string;
};

export type CreditoOpcion = Omit<CreditoCliente, 'clienteId' | 'nombreCliente'>;

type ClienteResumen = {
  id_cliente: string;
  nombre_completo: string;
};

type CreditoBackend = {
  id_credito: string;
  monto_total: number;
  saldo_pendiente: number;
  fecha_limite_pago: string;
  fecha_credito: string;
  descripcion?: string | null;
  estado: EstadoCredito;
};

type CreditosClienteResponse = {
  creditos?: CreditoBackend[];
  error?: string;
};

type RegistrarAbonoResponse = {
  message?: string;
  error?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  `$${value.toLocaleString('es-CO')}`;

const calcDiasAtraso = (fechaLimitePago: string, estado: EstadoCredito): number => {
  if (estado !== 'vencido') return 0;
  const limite = new Date(fechaLimitePago);
  return Math.max(0, Math.floor((Date.now() - limite.getTime()) / (1000 * 60 * 60 * 24)));
};

const fechaHoyISO = (): string => {
  const hoy = new Date();
  const y = hoy.getFullYear();
  const m = String(hoy.getMonth() + 1).padStart(2, '0');
  const d = String(hoy.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const mapCreditoBackend = (c: CreditoBackend): CreditoOpcion => ({
  id: c.id_credito,
  montoTotal: c.monto_total,
  saldoPendiente: c.saldo_pendiente,
  diasEnMora: calcDiasAtraso(c.fecha_limite_pago, c.estado),
  estado: c.estado,
  descripcion: c.descripcion ?? null,
  fechaLimitePago: c.fecha_limite_pago,
});

const formatFecha = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const resolverCliente = async (
  term: string,
  token: string,
): Promise<{ id: string; nombre: string }> => {
  // GET /clientes?q= solo devuelve clientes con relación activa en tendero_cliente
  // para el id_tendero del token (aislamiento en backend).
  const resClientes = await fetch(
    `${API_URL}/clientes?q=${encodeURIComponent(term)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  const json = await resClientes.json().catch(() => null);

  if (!resClientes.ok) {
    const errorMsg = json?.error || 'No se pudo buscar el cliente.';
    throw new Error(errorMsg);
  }

  if (!Array.isArray(json) || json.length === 0) {
    throw new Error('No se encontró el cliente en tu cartera.');
  }

  if (json.length === 1) {
    return { id: json[0].id_cliente, nombre: json[0].nombre_completo };
  }

  const exacto = (json as ClienteResumen[]).find(
    (c) =>
      c.id_cliente === term ||
      c.nombre_completo.toLowerCase() === term.toLowerCase(),
  );

  if (exacto) {
    return { id: exacto.id_cliente, nombre: exacto.nombre_completo };
  }

  throw new Error(
    `Se encontraron ${json.length} clientes. Refina la búsqueda por nombre o ID.`,
  );
};

const normalizeClienteId = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && !Number.isNaN(value)) return String(value).trim();
  return fallback.trim();
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useRegisterPayment = (
  token: string,
  initialClienteId?: string | string[],
) => {
  const initialId = normalizeClienteId(
    Array.isArray(initialClienteId) ? initialClienteId[0] : initialClienteId,
  );
  const [busqueda, setBusqueda]           = useState(initialId);
  const [nombreCliente, setNombreCliente]   = useState<string | null>(null);
  const [clienteId, setClienteId]           = useState<string | null>(null);
  const [creditosDisponibles, setCreditosDisponibles] = useState<CreditoOpcion[]>([]);
  const [credito, setCredito]             = useState<CreditoCliente | null>(null);
  const [loadingBusqueda, setLoadingBusqueda] = useState(false);

  const [monto, setMonto]                 = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading]             = useState(false);

  const seleccionarCredito = (opcion: CreditoOpcion) => {
    if (!clienteId || !nombreCliente) return;

    const mapped: CreditoCliente = {
      ...opcion,
      clienteId,
      nombreCliente,
    };

    setCredito(mapped);
    setMonto(mapped.saldoPendiente.toString());
  };

  const buscarClientePorTerm = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    if (!token) {
      Alert.alert('Sesión', 'No hay sesión activa. Inicia sesión nuevamente.');
      return;
    }

    setLoadingBusqueda(true);
    setCredito(null);
    setNombreCliente(null);
    setClienteId(null);
    setCreditosDisponibles([]);

    try {
      const { id: resolvedClienteId, nombre } = await resolverCliente(trimmed, token);

      const resCreditos = await fetch(`${API_URL}/creditos/cliente/${resolvedClienteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const jsonCreditos: CreditosClienteResponse = await resCreditos.json().catch(() => ({}));

      if (!resCreditos.ok) {
        throw new Error(
          jsonCreditos.error ||
            (resCreditos.status === 404
              ? 'Este cliente no está vinculado a tu tienda o no tiene créditos activos.'
              : 'No se pudo obtener el crédito del cliente.'),
        );
      }

      const creditos = (jsonCreditos.creditos ?? []).map(mapCreditoBackend);
      if (creditos.length === 0) {
        throw new Error('No se encontró un crédito activo para este cliente.');
      }

      setClienteId(resolvedClienteId);
      setNombreCliente(nombre);
      setCreditosDisponibles(creditos);

      if (creditos.length === 1) {
        const unico = creditos[0];
        setCredito({
          ...unico,
          clienteId: resolvedClienteId,
          nombreCliente: nombre,
        });
        setMonto(unico.saldoPendiente.toString());
      }
    } catch (err: any) {
      Alert.alert('Error', friendlyErrorMessage(err.message || 'No se pudo cargar la información del cliente.'));
      setCredito(null);
      setNombreCliente(null);
      setClienteId(null);
      setCreditosDisponibles([]);
    } finally {
      setLoadingBusqueda(false);
    }
  }, [token]);

  const buscarCliente = useCallback(async () => {
    await buscarClientePorTerm(busqueda);
  }, [busqueda, buscarClientePorTerm]);

  useEffect(() => {
    if (!initialId || !token) return;
    setBusqueda(initialId);
    buscarClientePorTerm(initialId);
  }, [initialId, token, buscarClientePorTerm]);

  const getQuickAmounts = (): { label: string; value: number }[] => {
    if (!credito) return [];
    const total = credito.saldoPendiente;
    return [
      { label: formatCurrency(Math.round(total * 0.25)), value: Math.round(total * 0.25) },
      { label: formatCurrency(Math.round(total * 0.50)), value: Math.round(total * 0.50) },
      { label: formatCurrency(Math.round(total * 0.75)), value: Math.round(total * 0.75) },
      { label: 'Total', value: total },
    ];
  };

  const aplicarMontoRapido = (value: number) => {
    setMonto(value.toString());
  };

  const parseMonto = (raw: string): number =>
    parseFloat(raw.replace(/[^0-9.]/g, '')) || 0;

  const validarPago = (): boolean => {
    if (!credito) {
      Alert.alert(
        'Sin crédito',
        creditosDisponibles.length > 1
          ? 'Selecciona el crédito al que deseas aplicar el pago.'
          : 'Primero busca y selecciona un cliente.',
      );
      return false;
    }

    const montoNum = parseMonto(monto);

    if (!monto || montoNum <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un monto mayor a $0.');
      return false;
    }

    if (montoNum > credito.saldoPendiente) {
      Alert.alert(
        'Monto excede la deuda',
        `El monto ingresado ($${montoNum.toLocaleString('es-CO')}) supera la deuda pendiente (${formatCurrency(credito.saldoPendiente)}).`,
      );
      return false;
    }

    return true;
  };

  const handleConfirmarPago = async () => {
    if (!validarPago() || !credito) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/creditos/${credito.id}/abonos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          monto: parseMonto(monto),
          fechaAbono: fechaHoyISO(),
        }),
      });

      const json: RegistrarAbonoResponse = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(json.error || 'Error al registrar el pago.');

      Alert.alert('¡Pago registrado!', json.message || 'El pago fue registrado correctamente.', [
        { text: 'OK', onPress: () => setTimeout(() => router.back(), 300) },
      ]);
    } catch (err: any) {
      Alert.alert('Error', friendlyErrorMessage(err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = () => router.back();

  const getEstadoColor = (estado: EstadoCredito | undefined) => {
    switch (estado) {
      case 'vigente': return '#3EBF7A';
      case 'vencido': return '#FFA000';
      case 'pagado':  return '#7A9A85';
      default:        return '#7A9A85';
    }
  };

  const getEstadoLabel = (estado: EstadoCredito | undefined) => {
    switch (estado) {
      case 'vigente': return 'Al día';
      case 'vencido': return 'En mora';
      case 'pagado':  return 'Pagado';
      default:        return '—';
    }
  };

  return {
    busqueda,
    setBusqueda,
    buscarCliente,
    loadingBusqueda,
    nombreCliente,
    creditosDisponibles,
    seleccionarCredito,
    credito,
    formatCurrency,
    formatFecha,
    monto,
    setMonto,
    getQuickAmounts,
    aplicarMontoRapido,
    observaciones,
    setObservaciones,
    loading,
    handleConfirmarPago,
    handleCancelar,
    getEstadoColor,
    getEstadoLabel,
  };
};
