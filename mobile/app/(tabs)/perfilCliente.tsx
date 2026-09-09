import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, Bell, BarChart2 } from 'lucide-react-native';

import { perfilClienteStyles as styles } from '@/constants/perfilCliente.styles';
import { COLORS } from '@/constants/colors';
import { useClientePerfil, EstadoBadge } from '@/hooks/useClientePerfil';
import { formatNivelRiesgo, getRiesgoColor } from '@/utils/scoring';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { ErrorState } from '@/components/ErrorState';
import { friendlyErrorMessage, clasificarError } from '@/utils/errorMessages';
import { cerrarSesionYRedirigir } from '@/utils/session';

const getBadgeStyles = (tipo: EstadoBadge) => {
  switch (tipo) {
    case 'mora':
      return { badge: styles.badgeMora, text: styles.badgeMoraText };
    case 'sin_deuda':
      return { badge: styles.badgeSinDeuda, text: styles.badgeSinDeudaText };
    default:
      return { badge: styles.badgeAlDia, text: styles.badgeAlDiaText };
  }
};

export default function PerfilClienteScreen() {
  const { id, creditoId } = useLocalSearchParams<{ id: string; creditoId?: string }>();
  const [token, setToken] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('token').then(setToken);
    }, [])
  );

  const {
    perfil,
    loading,
    error,
    refetch,
    handleNuevoCredito,
  } = useClientePerfil(token, id);

  const handleRegistrarPago = () => {
    if (!id) return;
    router.push({
      pathname: '/registerpayment',
      params: { clienteId: String(id) },
    });
  };

  const handleVerAnalitica = () => {
    if (!id || !perfil) return;
    router.push({
      pathname: '/(tabs)/Analitica',
      params: { clienteId: String(id), nombre: perfil.nombre },
    } as any);
  };

  if (token === null || loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={COLORS.white} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (error || !perfil) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState
          message={error ? friendlyErrorMessage(error) : 'Cliente no encontrado'}
          primaryAction={
            error
              ? clasificarError(error) === 'sesion'
                ? { label: 'Iniciar sesión', onPress: cerrarSesionYRedirigir }
                : { label: 'Reintentar', onPress: refetch }
              : undefined
          }
          secondaryAction={{ label: 'Volver', onPress: () => router.back() }}
        />
      </SafeAreaView>
    );
  }

  const badge = getBadgeStyles(perfil.estadoBadgeTipo);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

        <View style={styles.header}>
          <HeaderIconButton
            icon={ChevronLeft}
            label="Volver"
            onPress={() => router.back()}
            style={styles.backBtn}
          />
          <Text style={styles.headerTitle}>Perfil Del Cliente</Text>
          <HeaderIconButton
            icon={Bell}
            label="Avisos"
            onPress={() => router.push('/notificaciones' as any)}
            color={COLORS.primary}
            iconSize={18}
            style={styles.bellBtn}
          />
        </View>

        <View style={styles.card}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <View style={styles.nameBanner}>
              <View style={styles.nameBannerTop}>
                <Text style={styles.nameText}>{perfil.nombre}</Text>
                <View style={[styles.badge, badge.badge]}>
                  <Text style={[styles.badgeText, badge.text]}>{perfil.estadoBadge}</Text>
                </View>
              </View>
              <Text style={styles.clienteDesde}>{perfil.clienteDesde}</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Deuda Actual</Text>
                <Text style={styles.statValue}>{perfil.deudaActual}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Perfil IA</Text>
                <Text style={styles.statValue}>{perfil.puntaje ?? '--'}</Text>
                <View style={[styles.riesgoBadge, { backgroundColor: getRiesgoColor(perfil.nivelRiesgo) + '20' }]}>
                  <Text style={[styles.riesgoBadgeText, { color: getRiesgoColor(perfil.nivelRiesgo) }]}>
                    Riesgo {formatNivelRiesgo(perfil.nivelRiesgo)}
                  </Text>
                </View>
                <Text style={[styles.statValueSmall, styles.confianzaValue]}>
                  Confianza {perfil.nivelConfianza}%
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Historial de Créditos</Text>
            <View style={styles.historialCard}>
              {perfil.historial.length === 0 ? (
                <Text style={styles.historialEmpty}>Sin créditos registrados</Text>
              ) : (
                perfil.historial.map((item, idx) => (
                  <View
                    key={item.id_credito}
                    style={[
                      styles.historialRow,
                      idx < perfil.historial.length - 1 && styles.historialDivider,
                      creditoId && String(item.id_credito) === String(creditoId) && styles.historialRowHighlight,
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historialTitulo}>{item.titulo}</Text>
                      <Text
                        style={[
                          styles.historialSub,
                          item.estado === 'vencido' && styles.historialSubVencido,
                          item.estado === 'vigente' && styles.historialSubVigente,
                        ]}
                      >
                        {item.subtitulo}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.historialMontoBadge,
                        item.estado === 'vigente' && styles.historialMontoVencido,
                      ]}
                    >
                      <Text
                        style={[
                          styles.historialMontoText,
                          item.estado === 'vigente' && styles.historialMontoTextVencido,
                        ]}
                      >
                        {item.monto}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <Text style={styles.sectionTitle}>Historial de Pagos</Text>
            <View style={styles.pagosCard}>
              {perfil.historialPagos.length === 0 ? (
                <Text style={styles.pagosEmpty}>Sin pagos registrados</Text>
              ) : (
                perfil.historialPagos.map((pago, idx) => (
                  <View
                    key={pago.id_abono}
                    style={[
                      styles.pagoRow,
                      idx < perfil.historialPagos.length - 1 && styles.pagoDivider,
                    ]}
                  >
                    <View style={styles.pagoIconWrap}>
                      <Text style={styles.pagoIconText}>+</Text>
                    </View>
                    <View style={styles.pagoInfo}>
                      <Text style={styles.pagoTitulo}>{pago.titulo}</Text>
                      <Text style={styles.pagoSub}>
                        {pago.fecha} · {pago.subtitulo}
                      </Text>
                    </View>
                    <View style={styles.pagoMontoBadge}>
                      <Text style={styles.pagoMontoText}>{pago.monto}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <Text style={styles.sectionTitle}>Información de Contacto</Text>
            <View style={styles.contactoCard}>
              <Text style={styles.contactoLinea}>Teléfono: {perfil.telefono}</Text>
              <Text style={styles.contactoLinea}>Dirección: {perfil.direccion}</Text>
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.btnOutline} onPress={handleNuevoCredito}>
                <Text style={styles.btnOutlineText}>+ Nuevo Crédito</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnFill} onPress={handleRegistrarPago}>
                <Text style={styles.btnFillText}>Registrar Pago</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.btnAnalitica} onPress={handleVerAnalitica} activeOpacity={0.85}>
              <BarChart2 size={16} color={COLORS.primary} />
              <Text style={styles.btnAnaliticaText}>Ver Análisis Completo</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </SafeAreaView>
    </>
  );
}
