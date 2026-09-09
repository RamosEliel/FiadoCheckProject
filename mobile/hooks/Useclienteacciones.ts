import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { CONFIG } from '@/config/config';
import { friendlyErrorMessage } from '@/utils/errorMessages';

const API_URL = CONFIG.API_URL;

export type ModalPaso = 'cerrado' | 'eleccion' | 'registrar' | 'asociar';

export type ClienteEncontrado = {
  id_cliente: string;
  nombre_completo: string;
  telefono: string | null;
  direccion: string | null;
};

type RegisterForm = {
  nombre: string;
  identificacion: string;
  telefono: string;
  direccion: string;
};

const INITIAL_REGISTER: RegisterForm = {
  nombre: '',
  identificacion: '',
  telefono: '',
  direccion: '',
};

export const useClienteAcciones = (token: string | null, onSuccess: () => void) => {
  const [modalPaso, setModalPaso] = useState<ModalPaso>('cerrado');
  const [registerForm, setRegisterForm] = useState<RegisterForm>(INITIAL_REGISTER);
  const [cedulaBusqueda, setCedulaBusqueda] = useState('');
  const [clienteEncontrado, setClienteEncontrado] = useState<ClienteEncontrado | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cerrarModal = useCallback(() => {
    setModalPaso('cerrado');
    setRegisterForm(INITIAL_REGISTER);
    setCedulaBusqueda('');
    setClienteEncontrado(null);
    setBuscando(false);
    setGuardando(false);
  }, []);

  const abrirModal = useCallback(() => {
    setModalPaso('eleccion');
  }, []);

  const irARegistrar = useCallback(() => setModalPaso('registrar'), []);
  const irAAsociar = useCallback(() => {
    setClienteEncontrado(null);
    setCedulaBusqueda('');
    setModalPaso('asociar');
  }, []);
  const volverEleccion = useCallback(() => {
    setClienteEncontrado(null);
    setModalPaso('eleccion');
  }, []);

  const buscarParaAsociar = async () => {
    const cedula = cedulaBusqueda.trim();
    if (!cedula || !token) return;

    setBuscando(true);
    setClienteEncontrado(null);
    try {
      const res = await fetch(
        `${API_URL}/clientes/buscar-asociar?cedula=${encodeURIComponent(cedula)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json.error || 'No se pudo buscar el cliente');
      }

      setClienteEncontrado({
        id_cliente: json.id_cliente,
        nombre_completo: json.nombre_completo,
        telefono: json.telefono ?? null,
        direccion: json.direccion ?? null,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al buscar cliente';
      Alert.alert('Sin resultados', friendlyErrorMessage(message));
    } finally {
      setBuscando(false);
    }
  };

  const asociarCliente = async () => {
    if (!clienteEncontrado || !token) return;

    setGuardando(true);
    try {
      const res = await fetch(`${API_URL}/clientes/asociar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_cliente: clienteEncontrado.id_cliente }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json.error || 'No se pudo asociar el cliente');
      }

      Alert.alert('Listo', json.message || 'Cliente asociado a tu tienda');
      cerrarModal();
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al asociar cliente';
      Alert.alert('Error', friendlyErrorMessage(message));
    } finally {
      setGuardando(false);
    }
  };

  const registrarCliente = async () => {
    const { nombre, identificacion, telefono, direccion } = registerForm;
    const nombreTrim = nombre.trim();
    const cedulaTrim = identificacion.trim();
    const telefonoTrim = telefono.trim();

    if (!nombreTrim || !cedulaTrim || !telefonoTrim) {
      Alert.alert('Campos requeridos', 'Nombre, cédula y teléfono son obligatorios.');
      return;
    }
    if (!/^[0-9]{6,12}$/.test(cedulaTrim)) {
      Alert.alert('Cédula inválida', 'Ingresa una cédula numérica de 6 a 12 dígitos.');
      return;
    }
    if (!/^[0-9]{7,10}$/.test(telefonoTrim)) {
      Alert.alert('Teléfono inválido', 'El teléfono debe tener entre 7 y 10 dígitos.');
      return;
    }
    if (!token) return;

    setGuardando(true);
    try {
      const res = await fetch(`${API_URL}/clientes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: nombreTrim,
          identificacion: cedulaTrim,
          telefono: telefonoTrim,
          direccion: direccion.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json.error || 'No se pudo registrar el cliente');
      }

      Alert.alert('Listo', json.message || 'Cliente agregado a tu cartera');
      cerrarModal();
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al registrar cliente';
      Alert.alert('Error', friendlyErrorMessage(message));
    } finally {
      setGuardando(false);
    }
  };

  const setCedula = useCallback((value: string) => {
    setCedulaBusqueda(value.replace(/[^0-9]/g, ''));
    setClienteEncontrado(null);
  }, []);

  return {
    modalPaso,
    abrirModal,
    cerrarModal,
    irARegistrar,
    irAAsociar,
    volverEleccion,
    registerForm,
    setRegisterForm,
    cedulaBusqueda,
    setCedulaBusqueda: setCedula,
    clienteEncontrado,
    buscando,
    guardando,
    buscarParaAsociar,
    asociarCliente,
    registrarCliente,
  };
};
