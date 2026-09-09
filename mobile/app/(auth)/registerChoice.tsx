import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { registerChoiceStyles as styles } from '@/constants/registerChoice.styles';
import { COLORS } from '@/constants/colors';
import { ChevronLeft, Store, User, Check } from 'lucide-react-native';
import { HeaderIconButton } from '@/components/HeaderIconButton';

type Opcion = 'tendero' | 'cliente' | null;

export default function RegisterChoiceScreen() {
  const [seleccion, setSeleccion] = useState<Opcion>(null);

  const handleContinuar = () => {
    if (!seleccion) return;
    if (seleccion === 'tendero') {
      router.push('/(auth)/registerTendero');
    } else {
      router.push('/(auth)/registerClientes');
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

        {/* Header */}
        <View style={styles.header}>
          <HeaderIconButton
            icon={ChevronLeft}
            label="Volver"
            onPress={() => router.back()}
            style={styles.backBtn}
          />
        </View>

        {/* Título */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>¿Cómo quieres{'\n'}registrarte?</Text>
          <Text style={styles.subtitle}>Selecciona el tipo de cuenta que necesitas</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>

          {/* Opción Tendero */}
          <TouchableOpacity
            style={[styles.optionCard, seleccion === 'tendero' && styles.optionCardActive]}
            onPress={() => setSeleccion('tendero')}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIcon, seleccion === 'tendero' && styles.optionIconActive]}>
              <Store size={26} color={seleccion === 'tendero' ? COLORS.white : COLORS.primary} />
            </View>
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Como Tendero</Text>
              <Text style={styles.optionDesc}>
                Gestiona créditos, clientes y cobros de tu negocio
              </Text>
            </View>
            <View style={[styles.optionCheck, seleccion === 'tendero' && styles.optionCheckActive]}>
              {seleccion === 'tendero' && <Check size={14} color={COLORS.white} />}
            </View>
          </TouchableOpacity>

          {/* Opción Cliente */}
          <TouchableOpacity
            style={[styles.optionCard, seleccion === 'cliente' && styles.optionCardActive]}
            onPress={() => setSeleccion('cliente')}
            activeOpacity={0.8}
          >
            <View style={[styles.optionIcon, seleccion === 'cliente' && styles.optionIconActive]}>
              <User size={26} color={seleccion === 'cliente' ? COLORS.white : COLORS.primary} />
            </View>
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Como Cliente</Text>
              <Text style={styles.optionDesc}>
                Consulta tus deudas, pagos y créditos activos
              </Text>
            </View>
            <View style={[styles.optionCheck, seleccion === 'cliente' && styles.optionCheckActive]}>
              {seleccion === 'cliente' && <Check size={14} color={COLORS.white} />}
            </View>
          </TouchableOpacity>

          {/* Botón Continuar */}
          <TouchableOpacity
            style={[styles.btnPrimary, !seleccion && styles.btnPrimaryDisabled]}
            onPress={handleContinuar}
            disabled={!seleccion}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>Continuar</Text>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.footerLink}>Inicia sesión</Text>
            </TouchableOpacity>
          </View>

        </View>
      </SafeAreaView>
    </>
  );
}