import { View, Text, ScrollView, StatusBar, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { CheckCheck, ChevronLeft, CloudOff } from 'lucide-react-native';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import {
  createNotificacionesStyles,
  notificacionesTheme,
} from '@/constants/notificaciones.styles';
import { COLORS } from '@/constants/colors';
import { useNotificaciones } from '@/hooks/useNotificaciones';
import {
  NotificacionCard,
  NotificacionesEmptyState,
  NotificacionesSkeleton,
} from '@/components/notificaciones';
import { friendlyErrorMessage, clasificarError } from '@/utils/errorMessages';
import { cerrarSesionYRedirigir } from '@/utils/session';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function NotificacionesScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const esPestaña = pathname.includes('avisos');
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const styles = useMemo(() => createNotificacionesStyles(scheme), [scheme]);
  const theme = useMemo(() => notificacionesTheme(scheme), [scheme]);

  const {
    loading, refreshing, secciones, total, resumen,
    error, refetch, onRefresh, abrirAlerta,
  } = useNotificaciones();

  const subtitulo = loading
    ? 'Cargando avisos...'
    : error
      ? 'No se pudo actualizar'
      : total > 0
        ? resumen
        : 'Todo al día';

  const renderContenido = () => {
    if (loading) {
      return (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <NotificacionesSkeleton styles={styles} />
        </ScrollView>
      );
    }

    if (error) {
      return (
        <NotificacionesEmptyState
          icon={CloudOff}
          title="No pudimos cargar tus avisos"
          message={friendlyErrorMessage(error)}
          styles={styles}
          accent={theme.severity.critica.accent}
          accentSoft={theme.severity.critica.soft}
          action={
            clasificarError(error) === 'sesion'
              ? { label: 'Iniciar sesión', onPress: cerrarSesionYRedirigir }
              : { label: 'Reintentar', onPress: refetch }
          }
        />
      );
    }

    if (total === 0) {
      return (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.spinner} colors={[COLORS.primary]} />
          }
        >
          <NotificacionesEmptyState
            icon={CheckCheck}
            title="Todo al día"
            message="No tienes avisos pendientes. Te escribiremos aquí cuando un crédito esté por vencer o entre en mora."
            styles={styles}
          />
        </ScrollView>
      );
    }

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.spinner} colors={[COLORS.primary]} />
        }
      >
        {secciones.map((seccion, index) => {
          const tone = theme.severity[seccion.tipo];
          return (
            <View key={seccion.tipo}>
              {index > 0 && <View style={styles.sectionSpacer} />}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{seccion.titulo}</Text>
                <View style={[styles.sectionCount, { backgroundColor: tone.soft }]}>
                  <Text style={[styles.sectionCountText, { color: tone.ink }]}>
                    {seccion.alertas.length}
                  </Text>
                </View>
              </View>

              {seccion.alertas.map((alerta) => (
                <NotificacionCard
                  key={alerta.id_alerta}
                  alerta={alerta}
                  styles={styles}
                  theme={theme}
                  onPress={abrirAlerta}
                />
              ))}
            </View>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.header}>
        {esPestaña ? (
          <View style={styles.headerSpacer} />
        ) : (
          <HeaderIconButton
            icon={ChevronLeft}
            label="Volver"
            onPress={() => router.back()}
            style={styles.backBtn}
          />
        )}
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notificaciones</Text>
          <Text style={styles.headerSubtitle}>{subtitulo}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {renderContenido()}
    </SafeAreaView>
  );
}
