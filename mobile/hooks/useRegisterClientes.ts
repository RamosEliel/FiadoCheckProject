import { useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { CONFIG } from '@/config/config';
import { friendlyErrorMessage } from '@/utils/errorMessages';

const API_URL = CONFIG.API_URL;

export const useRegister = () => {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [cedula, setCedula] = useState('');
  const [direccion, setDireccion] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]  = useState(false);

  const togglePassword = () => setShowPassword(prev => !prev);
  const toggleConfirm  = () => setShowConfirm(prev => !prev);

  const handleRegister = async () => {
    // Validaciones
    if (!nombre || !email || !telefono || !cedula || !direccion || !password || !confirmPassword) {
      Alert.alert('Campos vacíos', 'Por favor completa todos los campos');
      return;
    }
    if (!email.includes('@')) {
      Alert.alert('Correo inválido', 'Ingresa un correo electrónico válido');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Contraseñas no coinciden', 'Las contraseñas deben ser iguales');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Contraseña muy corta', 'Mínimo 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/registerClientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        
        body: JSON.stringify({
          nombre_completo: nombre,
          email,
          telefono,
          cedula,
          direccion,
          password,
          id_rol: 2, // cliente
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al registrar');

      Alert.alert('¡Cuenta creada!', 'Ya puedes iniciar sesión', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') }
      ]);
    } catch (err: any) {
      Alert.alert('Error', friendlyErrorMessage(err.message || 'No se pudo crear la cuenta'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => router.replace('/(auth)/login');

  return {
    nombre, setNombre,
    email, setEmail,
    telefono, setTelefono,
    cedula, setCedula,
    direccion, setDireccion,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    showPassword, showConfirm,
    loading,
    togglePassword, toggleConfirm,
    handleRegister, handleLogin,
  };
};