import { useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { CONFIG } from '@/config/config';
import { friendlyErrorMessage } from '@/utils/errorMessages';

const API_URL = CONFIG.API_URL;

interface RegisterFormErrors {
  nombreCompleto?: string;
  email?: string;
  telefono?: string;
  cedula?: string;
  direccion?: string;
  numCamaraComercio?: string;
  password?: string;
  confirmPassword?: string;
}

export const useRegisterTendero = () => {
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [cedula, setCedula] = useState('');
  const [direccion, setDireccion] = useState('');
  const [numCamaraComercio, setNumCamaraComercio] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<RegisterFormErrors>({});

  const togglePassword = () => setShowPassword(prev => !prev);
  const toggleConfirm = () => setShowConfirm(prev => !prev);

  const clearError = (field: keyof RegisterFormErrors) => {
    setErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateForm = (): boolean => {
    const newErrors: RegisterFormErrors = {};

    // Nombre completo
    if (!nombreCompleto.trim()) {
      newErrors.nombreCompleto = 'El nombre es requerido';
    } else if (nombreCompleto.trim().length < 3) {
      newErrors.nombreCompleto = 'Mínimo 3 caracteres';
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombreCompleto.trim())) {
      newErrors.nombreCompleto = 'Solo letras y espacios';
    }

    // Email
    if (!email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Ingresa un email válido';
    }

    // Teléfono
    if (!telefono.trim()) {
      newErrors.telefono = 'El teléfono es requerido';
    } else if (!/^[+]?[\d\s]{10,}$/.test(telefono.trim())) {
      newErrors.telefono = 'Mínimo 10 dígitos numéricos';
    }

    // Cédula (id_tendero)
    if (!cedula.trim()) {
      newErrors.cedula = 'La cédula es requerida';
    } else if (cedula.trim().length < 7) {
      newErrors.cedula = 'Mínimo 7 caracteres';
    }

    // Dirección
    if (!direccion.trim()) {
      newErrors.direccion = 'La dirección es requerida';
    } else if (direccion.trim().length < 5) {
      newErrors.direccion = 'Mínimo 5 caracteres';
    }

    // Número de cámara de comercio
    if (!numCamaraComercio.trim()) {
      newErrors.numCamaraComercio = 'El número de cámara de comercio es requerido';
    } else if (numCamaraComercio.trim().length < 3) {
      newErrors.numCamaraComercio = 'Mínimo 3 caracteres';
    }

    // Password
    if (!password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (password.length < 8) {
      newErrors.password = 'Mínimo 8 caracteres';
    } else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
      newErrors.password = 'Debe contener letras y números';
    }

    // Confirm password
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contraseña';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(`${API_URL}/auth/registerTendero`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_completo: nombreCompleto.trim(),
          email: email.trim(),
          telefono: telefono.trim(),
          cedula: cedula.trim(),
          direccion: direccion.trim(),
          num_camara_comercio: numCamaraComercio.trim(),
          password,
          id_rol: 1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al registrar');

      Alert.alert('¡Cuenta creada!', 'Ya puedes iniciar sesión', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') }
      ]);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        Alert.alert('Error', 'La conexión tardó demasiado. Verifica tu red e intenta de nuevo.');
      } else {
        Alert.alert('Error', friendlyErrorMessage(err.message || 'No se pudo crear la cuenta'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => router.replace('/(auth)/login');

  return {
    nombreCompleto, setNombreCompleto,
    email, setEmail,
    telefono, setTelefono,
    cedula, setCedula,
    direccion, setDireccion,
    numCamaraComercio, setNumCamaraComercio,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    showPassword, showConfirm,
    loading,
    errors,
    clearError,
    togglePassword, toggleConfirm,
    handleRegister, handleLogin,
  };
};
