import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { registerTenderoStyles as styles } from '@/constants/registerTendero.styles';
import { COLORS } from '@/constants/colors';
import { useRegisterTendero } from '@/hooks/useRegisterTendero';
import { Eye } from 'lucide-react-native';
import { EyeOff } from 'lucide-react-native';

export default function RegisterTenderoScreen() {
  const {
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
  } = useRegisterTendero();

  const hasError = (field: keyof typeof errors) => !!errors[field];
  const borderError = (field: keyof typeof errors) =>
    hasError(field) ? { borderWidth: 1, borderColor: '#E53935' } : null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          {/* Título sobre fondo verde */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Crea Tu Cuenta</Text>
            <Text style={styles.subtitle}>Como Tendero</Text>
          </View>

          {/* Card blanca con scroll */}
          <View style={styles.card}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >

              {/* Nombre Completo */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre Completo</Text>
                <TextInput
                  style={[styles.input, borderError('nombreCompleto')]}
                  placeholder="Juan Pérez"
                  placeholderTextColor={COLORS.textMuted}
                  value={nombreCompleto}
                  onChangeText={(text) => {
                    setNombreCompleto(text);
                    if (errors.nombreCompleto) clearError('nombreCompleto');
                  }}
                  autoCapitalize="words"
                />
                {errors.nombreCompleto ? <Text style={styles.errorText}>{errors.nombreCompleto}</Text> : null}
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Correo Electrónico</Text>
                <TextInput
                  style={[styles.input, borderError('email')]}
                  placeholder="nombre@correo.com"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) clearError('email');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
              </View>

              {/* Teléfono */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Teléfono</Text>
                <TextInput
                  style={[styles.input, borderError('telefono')]}
                  placeholder="3001234567"
                  placeholderTextColor={COLORS.textMuted}
                  value={telefono}
                  onChangeText={(text) => {
                    setTelefono(text);
                    if (errors.telefono) clearError('telefono');
                  }}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                />
                {errors.telefono ? <Text style={styles.errorText}>{errors.telefono}</Text> : null}
              </View>

              {/* Cédula */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Cédula</Text>
                <TextInput
                  style={[styles.input, borderError('cedula')]}
                  placeholder="X.XXX.XXX.XXX"
                  placeholderTextColor={COLORS.textMuted}
                  value={cedula}
                  onChangeText={(text) => {
                    setCedula(text);
                    if (errors.cedula) clearError('cedula');
                  }}
                  keyboardType="numeric"
                  autoCapitalize="none"
                />
                {errors.cedula ? <Text style={styles.errorText}>{errors.cedula}</Text> : null}
              </View>

              {/* Dirección */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Dirección</Text>
                <TextInput
                  style={[styles.input, borderError('direccion')]}
                  placeholder="Calle X # X-XX"
                  placeholderTextColor={COLORS.textMuted}
                  value={direccion}
                  onChangeText={(text) => {
                    setDireccion(text);
                    if (errors.direccion) clearError('direccion');
                  }}
                  autoCapitalize="words"
                />
                {errors.direccion ? <Text style={styles.errorText}>{errors.direccion}</Text> : null}
              </View>

              {/* Num. Cámara De Comercio */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Num. Cámara De Comercio</Text>
                <TextInput
                  style={[styles.input, borderError('numCamaraComercio')]}
                  placeholder="XX-XXXXXXX-X"
                  placeholderTextColor={COLORS.textMuted}
                  value={numCamaraComercio}
                  onChangeText={(text) => {
                    setNumCamaraComercio(text);
                    if (errors.numCamaraComercio) clearError('numCamaraComercio');
                  }}
                  autoCapitalize="none"
                />
                {errors.numCamaraComercio ? <Text style={styles.errorText}>{errors.numCamaraComercio}</Text> : null}
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contraseña</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.passwordInput, borderError('password')]}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textMuted}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (errors.password) clearError('password');
                    }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={togglePassword}>
                    {showPassword ? <Eye size={18} color="green" /> : <EyeOff size={18} color="green" />}
                    <Text style={styles.eyeLabel}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
                  </TouchableOpacity>
                </View>
                {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirmar Contraseña</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.passwordInput, borderError('confirmPassword')]}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.textMuted}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (errors.confirmPassword) clearError('confirmPassword');
                    }}
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={toggleConfirm}>
                    {showConfirm ? <Eye size={18} color="green" /> : <EyeOff size={18} color="green" />}
                    <Text style={styles.eyeLabel}>{showConfirm ? 'Ocultar' : 'Mostrar'}</Text>
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
              </View>

              {/* Botón */}
              <TouchableOpacity
                style={[styles.btnPrimary, loading && styles.btnPrimaryDisabled]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.btnPrimaryText}>Registrarse</Text>
                )}
              </TouchableOpacity>

              {/* Footer */}
              <TouchableOpacity style={styles.footer} onPress={handleLogin}>
                <Text style={styles.footerText}>Ya tienes una cuenta?</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
