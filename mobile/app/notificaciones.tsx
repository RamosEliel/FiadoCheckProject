import { View, Text, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft } from 'lucide-react-native';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { notificacionesStyles as styles } from '@/constants/notificaciones.styles';
import { COLORS } from '@/constants/colors';
import { useNotificaciones, Alerta } from '@/hooks/useNotificaciones';
import { ErrorState } from '@/components/ErrorState';
import { friendlyErrorMessage, clasificarError } from '@/utils/errorMessages';
import { cerrarSesionYRedirigir } from '@/utils/session';

const TIPO_COLOR: Record<Alerta['tipo'], string> = {
  critica: '#E53935',
  proxima: '#FFA000',
  informativa: '#2196F3',
};

const TIPO_LABEL: Record<Alerta['tipo'], string> = {
  critica: 'Crítica',
  proxima: 'Próxima',
  informativa: 'Informativa',
};

export default function NotificacionesScreen() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [esTendero, setEsTendero] = useState(false);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('token').then(setToken);
      AsyncStorage.getItem('usuario').then((raw) => {
        if (!raw) return;
        try {
          const usuario = JSON.parse(raw);
          setEsTendero(Number(usuario.id_rol) === 1);
        } catch {
          setEsTendero(false);
        }
      });
    }, [])
  );

  const { loading, alertas, error, refetch, marcarLeida } = useNotificaciones(token, esTendero);

  const handleAlertaPress = (alerta: Alerta) => {
    marcarLeida(alerta.id_alerta);
    router.push({
      pathname: '/perfilCliente',
      params: { id: String(alerta.id_cliente), creditoId: String(alerta.id_credito) },
    } as any);
  };

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
        <Text style={styles.headerTitle}>Notificaciones</Text>
        <View style={styles.headerSpacer} />
      </View>

      {token === null || loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : !esTendero ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            Las notificaciones de cartera están disponibles para tenderos. Pronto agregaremos
            notificaciones para clientes.
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <ErrorState
            tone="dark"
            message={friendlyErrorMessage(error)}
            primaryAction={
              clasificarError(error) === 'sesion'
                ? { label: 'Iniciar sesión', onPress: cerrarSesionYRedirigir }
                : { label: 'Reintentar', onPress: refetch }
            }
          />
        </View>
      ) : alertas.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No tienes notificaciones nuevas.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {alertas.map((alerta) => (
            <TouchableOpacity
              key={alerta.id_alerta}
              style={styles.card}
              onPress={() => handleAlertaPress(alerta)}
            >
              <View style={[styles.cardStripe, { backgroundColor: TIPO_COLOR[alerta.tipo] }]} />
              <View style={styles.cardBody}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardCliente}>{alerta.nombre_cliente}</Text>
                  <View style={[styles.cardBadge, { backgroundColor: TIPO_COLOR[alerta.tipo] }]}>
                    <Text style={styles.cardBadgeText}>{TIPO_LABEL[alerta.tipo]}</Text>
                  </View>
                </View>
                <Text style={styles.cardDetalle}>
                  {alerta.dias_atraso > 0
                    ? `${alerta.dias_atraso} días de atraso`
                    : 'Próximo a vencer'}
                </Text>
                <Text style={styles.cardMonto}>
                  Saldo pendiente: ${alerta.saldo_pendiente.toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
