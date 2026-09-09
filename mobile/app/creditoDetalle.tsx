import { View, Text, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft } from 'lucide-react-native';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { creditoDetalleStyles as styles } from '@/constants/creditoDetalle.styles';
import { COLORS } from '@/constants/colors';
import { useCreditoDetalle } from '@/hooks/useCreditoDetalle';
import { ErrorState } from '@/components/ErrorState';
import { friendlyErrorMessage, clasificarError } from '@/utils/errorMessages';
import { cerrarSesionYRedirigir } from '@/utils/session';

const ESTADO_COLORS: Record<string, string> = {
  vencido: '#E53935',
  vigente: COLORS.primary,
  pagado: '#9E9E9E',
};

const ESTADO_LABELS: Record<string, string> = {
  vencido: 'Vencido',
  vigente: 'Al día',
  pagado: 'Pagado',
};

export default function CreditoDetalleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [token, setToken] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('token').then(setToken);
    }, [])
  );

  const { loading, credito, error, refetch } = useCreditoDetalle(token, id ?? null);

  if (token === null || loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.header}>
        <HeaderIconButton
          icon={ChevronLeft}
          label="Volver"
          onPress={() => router.back()}
          style={styles.backBtn}
        />
        <Text style={styles.headerTitle}>Detalle del Pago</Text>
        <View style={styles.headerSpacer} />
      </View>

      {!credito ? (
        <View style={styles.center}>
          <ErrorState
            tone="dark"
            message={error ? friendlyErrorMessage(error) : 'No se encontró el pago solicitado.'}
            primaryAction={
              error
                ? clasificarError(error) === 'sesion'
                  ? { label: 'Iniciar sesión', onPress: cerrarSesionYRedirigir }
                  : { label: 'Reintentar', onPress: refetch }
                : undefined
            }
          />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>Saldo Pendiente</Text>
            <Text style={styles.amountValue}>${credito.saldo_pendiente.toLocaleString()}</Text>
            <View style={[styles.badge, { backgroundColor: ESTADO_COLORS[credito.estado] || COLORS.textMuted }]}>
              <Text style={styles.badgeText}>
                {ESTADO_LABELS[credito.estado] || credito.estado}
                {credito.estado === 'vencido' && credito.dias_atraso > 0 ? ` · ${credito.dias_atraso} días` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información del Crédito</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Tienda</Text>
              <Text style={styles.rowValue}>{credito.nombre_tienda}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Descripción</Text>
              <Text style={styles.rowValue}>{credito.descripcion || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Monto Total</Text>
              <Text style={styles.rowValue}>${credito.monto_total.toLocaleString()}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Total Abonado</Text>
              <Text style={styles.rowValue}>${credito.total_abonado.toLocaleString()}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Fecha del Crédito</Text>
              <Text style={styles.rowValue}>{credito.fecha_credito?.split('T')[0]}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Fecha Límite de Pago</Text>
              <Text style={styles.rowValue}>{credito.fecha_limite_pago?.split('T')[0]}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Abonos Realizados</Text>
            {credito.abonos.length === 0 ? (
              <Text style={styles.emptyText}>Aún no se han registrado abonos para este crédito.</Text>
            ) : (
              credito.abonos.map((abono) => (
                <View key={abono.id_abono} style={styles.abonoItem}>
                  <Text style={styles.abonoFecha}>{abono.fecha_abono?.split('T')[0]}</Text>
                  <Text style={styles.abonoMonto}>${abono.monto.toLocaleString()}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
