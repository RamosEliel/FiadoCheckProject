import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loginStyles as styles } from '@/constants/login.styles';
import { COLORS } from '@/constants/colors';
import { useLogin } from '@/hooks/useLogin';
import { AppDialog } from '@/components/ui/AppDialog';
import { Eye } from "lucide-react-native";
import { EyeOff } from "lucide-react-native";

export default function LoginScreen() {
  const {
    email, password, showPassword, loading,
    setEmail, setPassword,
    togglePassword,
    handleLogin,
    handleForgotPassword,
    handleRegister,
    handleRegisterTendero,
    handleGoogleLogin,
    dialog,
    hideDialog,
  } = useLogin();

  return (
      <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Título sobre fondo verde */}
        <View style={styles.topSection}>
          <Text style={styles.title}>Bienvenido A</Text>
          <Text style={styles.titleBrand}>FiadoCheck</Text>
        </View>

        {/* Card blanca con esquinas redondeadas arriba */}
        <View style={styles.card}>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo Electrónico</Text>
            <TextInput
              style={styles.input}
              placeholder="nombre@correo.com"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Contraseña */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={togglePassword}>
                {showPassword ? <Eye size={18} color="green" /> : <EyeOff size={18} color="#00D09E" />}
                <Text style={styles.eyeLabel}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Botón Entrar */}
          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnPrimaryDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={COLORS.white} />
              : <Text style={styles.btnPrimaryText}>Entrar</Text>
            }
          </TouchableOpacity>

          {/* Olvidaste contraseña */}
          <TouchableOpacity style={styles.forgotBtn} onPress={handleForgotPassword}>
            <Text style={styles.forgotText}>¿Olvidaste la{'\n'}contraseña?</Text>
          </TouchableOpacity>

          {/* Botón Registrarse */}
          <TouchableOpacity
            style={styles.btnOutline}
            onPress={handleRegisterTendero}
            activeOpacity={0.75}
          >
            <Text style={styles.btnOutlineText}>Registrarse</Text>
          </TouchableOpacity>

          {/* Google */}
          <Text style={styles.orText}>o regístrate con</Text>
          <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin}>
            <Text style={styles.googleIcon}>G</Text>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>No tienes una cuenta? </Text>
            <TouchableOpacity onPress={handleRegister}>
              <Text style={styles.footerLink}>Regístrate</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.footer} onPress={handleRegisterTendero}>
            <Text style={styles.footerText}>¿Eres tendero? </Text>
            <Text style={styles.footerLink}>Regístrate como tendero</Text>
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
      <AppDialog
        visible={dialog.visible}
        variant={dialog.variant}
        title={dialog.title}
        message={dialog.message}
        onClose={hideDialog}
      />
    </SafeAreaView>
  );
}