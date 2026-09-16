import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { vistaUsuarioStyles as styles } from '@/constants/vistaUsuario.styles';
import { COLORS } from '@/constants/colors';
import { useVistaUsuario } from '@/hooks/useVistaUsuario';
import { formatNivelRiesgo, getRiesgoColor } from '@/utils/scoring';
import { ErrorState } from '@/components/ErrorState';
import { friendlyErrorMessage, clasificarError } from '@/utils/errorMessages';
import { cerrarSesionYRedirigir } from '@/utils/session';

const VistaUsuario = () => {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('token').then(t => setToken(t));
    }, [])
  );

  const { loading, userData, movements, error, handleContactStore, refetch } = useVistaUsuario(token);

  useFocusEffect(
    useCallback(() => {
      if (token) refetch(true);
    }, [token, refetch]),
  );

  if (token === null || loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
        <View style={[styles.center, { backgroundColor: COLORS.white }]}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !userData) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
        <ErrorState
          tone="dark"
          message={error ? friendlyErrorMessage(error) : 'No se pudo cargar tu cuenta.'}
          primaryAction={
            error && clasificarError(error) === 'sesion'
              ? { label: 'Iniciar sesión', onPress: cerrarSesionYRedirigir }
              : { label: 'Reintentar', onPress: refetch }
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header sobre fondo verde */}
      <View style={{ backgroundColor: COLORS.primary }}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>
            Hola, {userData?.nombreUsuario || 'Usuario'}
          </Text>
          <Text style={styles.welcomeSub}>
            {userData?.nombreTienda || 'Sin tienda asociada'}
          </Text>
        </View>
      </View>

      {/* Card blanca que sube desde abajo */}
      <View style={styles.card}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          {/* Card Principal — Deuda Total */}
          <View style={styles.debtCard}>
            <Text style={styles.cardSubtitle}>
              Tu Cuenta En La Tienda {userData?.nombreTienda}
            </Text>
            <View style={styles.totalRow}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.totalLabel}>Total A Pagar</Text>
            </View>
            <Text style={styles.debtAmount}>
              ${userData?.totalDeuda.toLocaleString()}
            </Text>
            <Text style={styles.debtDate}>Pagar Antes Del {userData?.fechaLimite}</Text>
          </View>

          {/* Card — Perfil IA */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Perfil Crediticio IA</Text>
            <Text style={styles.riesgoResumen}>
              Riesgo {formatNivelRiesgo(userData?.nivelRiesgo)}
              {userData?.nivelConfianza != null
                ? ` · Confianza ${userData.nivelConfianza}%`
                : ' · Sin historial suficiente'}
            </Text>
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${userData?.nivelConfianza ?? 0}%`,
                      backgroundColor: getRiesgoColor(userData?.nivelRiesgo),
                    },
                  ]}
                />
              </View>
            </View>
            <Text style={[styles.confidenceBadge, { color: userData?.nivelConfianzaColor }]}>
              {userData?.nivelConfianzaLabel}
            </Text>
            <Text style={styles.motivationalText}>
              Paga A Tiempo Para Mantener Tu Crédito
            </Text>
          </View>

          {/* Sección — Últimos Movimientos */}
          <View style={styles.movementsSection}>
            <Text style={styles.movementsTitle}>Ultimos Movimientos</Text>
            <View style={styles.movements}>
              {movements.map(item => {
                const content = (
                  <>
                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: item.bgColor },
                      ]}
                    >
                      <Text style={[styles.iconText, { color: item.signColor }]}>
                        {item.tipo === 'ABONO' ? '+' : '−'}
                      </Text>
                    </View>
                    <View style={styles.movementTextColumn}>
                      <Text style={styles.movementDesc}>{item.descripcion}</Text>
                      <Text style={styles.movementDate}>{item.fecha}</Text>
                    </View>
                    <Text style={styles.movementAmount}>
                      ${item.monto.toLocaleString()}
                    </Text>
                  </>
                );

                if (item.tipo === 'CARGO' && item.id_credito) {
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.movementRow}
                      onPress={() => router.push({ pathname: '/creditoDetalle', params: { id: String(item.id_credito) } } as any)}
                    >
                      {content}
                    </TouchableOpacity>
                  );
                }

                return (
                  <View key={item.id} style={styles.movementRow}>
                    {content}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Botón CTA */}
          <TouchableOpacity style={styles.ctaButton} onPress={handleContactStore}>
            <Text style={styles.ctaButtonText}>Contactar A La Tienda</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default VistaUsuario;
