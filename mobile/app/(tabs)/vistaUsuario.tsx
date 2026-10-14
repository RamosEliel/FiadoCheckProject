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
import {
  Bell,
  CalendarDays,
  ChevronRight,
  MapPin,
  MessageCircle,
  Receipt,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Wallet,
} from 'lucide-react-native';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { vistaUsuarioStyles as styles } from '@/constants/vistaUsuario.styles';
import { COLORS } from '@/constants/colors';
import { useVistaUsuario } from '@/hooks/useVistaUsuario';
import { formatNivelRiesgo, getRiesgoColor } from '@/utils/scoring';
import { formatFechaUI } from '@/utils/businessDate';
import { ErrorState } from '@/components/ErrorState';
import { friendlyErrorMessage, clasificarError } from '@/utils/errorMessages';
import { cerrarSesionYRedirigir } from '@/utils/session';

const formatCOP = (valor: number) => `$${Math.round(valor).toLocaleString('es-CO')}`;

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
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={[styles.center, { backgroundColor: COLORS.white }]}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !userData) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
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

  const riesgoColor = userData.nivelConfianzaColor ?? getRiesgoColor(userData.nivelRiesgo);
  const riesgoKey = (userData.enMora ? 'alto' : userData.nivelRiesgo ?? 'medio').toLowerCase();
  const PerfilIcon = riesgoKey === 'alto' ? ShieldAlert : riesgoKey === 'bajo' ? ShieldCheck : Shield;
  const riesgoSoft =
    riesgoKey === 'alto' ? COLORS.dangerSoft : riesgoKey === 'bajo' ? '#E8F8F0' : COLORS.warningSoft;
  const primerNombre = (userData.nombreUsuario || 'Usuario').split(' ')[0];
  const puntaje = userData.puntaje != null ? Math.round(userData.puntaje) : null;
  const barraPct = puntaje == null ? 0 : Math.max(8, Math.min(100, puntaje));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.welcomeKicker}>Tu cuenta</Text>
          <Text style={styles.welcomeText}>Hola, {primerNombre}</Text>
          <View style={styles.storeChip}>
            <MapPin size={13} color={COLORS.white} />
            <Text style={styles.storeChipText} numberOfLines={1}>
              {userData.nombreTienda}
            </Text>
          </View>
        </View>
        <HeaderIconButton
          icon={Bell}
          label="Avisos"
          onPress={() => router.push('/notificaciones' as any)}
          color={COLORS.primary}
          iconSize={18}
        />
      </View>

      <View style={styles.card}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <Text style={styles.heroLabel}>Por pagar</Text>
              {userData.enMora ? (
                <View style={styles.moraBadge}>
                  <Text style={styles.moraBadgeText}>En mora</Text>
                </View>
              ) : (
                <View style={styles.okBadge}>
                  <Text style={styles.okBadgeText}>Al día</Text>
                </View>
              )}
            </View>
            <Text style={styles.heroAmount}>{formatCOP(userData.totalDeuda)}</Text>
            <View style={styles.heroMeta}>
              <CalendarDays size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.heroMetaText}>
                {userData.enMora
                  ? 'Tienes saldo vencido en esta tienda'
                  : userData.fechaLimite
                    ? `Próximo pago: ${formatFechaUI(userData.fechaLimite)}`
                    : 'Sin fecha límite próxima'}
              </Text>
            </View>
            {userData.direccionTienda ? (
              <Text style={styles.heroAddress} numberOfLines={1}>
                {userData.direccionTienda}
              </Text>
            ) : null}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Receipt size={16} color={COLORS.primary} />
              <Text style={styles.statValue}>{userData.creditosActivos}</Text>
              <Text style={styles.statLabel}>
                {userData.creditosActivos === 1 ? 'Crédito' : 'Créditos'}
              </Text>
            </View>
            <View style={styles.statCard}>
              <ShieldAlert size={16} color={userData.creditosVencidos ? COLORS.danger : COLORS.primary} />
              <Text style={[styles.statValue, userData.creditosVencidos ? styles.statDanger : null]}>
                {userData.creditosVencidos}
              </Text>
              <Text style={styles.statLabel}>Vencidos</Text>
            </View>
            <View style={styles.statCard}>
              <Wallet size={16} color={COLORS.primary} />
              <Text style={styles.statValue} numberOfLines={1}>
                {formatCOP(userData.totalAbonado)}
              </Text>
              <Text style={styles.statLabel}>Abonado</Text>
            </View>
          </View>

          <View style={styles.perfilCard}>
            <View style={[styles.perfilAccent, { backgroundColor: riesgoColor }]} />
            <View style={styles.perfilCardInner}>
              <Text style={styles.perfilEyebrow}>Perfil crediticio</Text>
              <View style={styles.perfilHero}>
                <View style={[styles.perfilIconWrap, { backgroundColor: riesgoSoft }]}>
                  <PerfilIcon size={26} color={riesgoColor} strokeWidth={2.2} />
                </View>
                <View style={styles.perfilHeroText}>
                  <Text style={[styles.perfilHeadline, { color: riesgoColor }]}>
                    {userData.nivelConfianzaLabel}
                  </Text>
                  <Text style={styles.perfilSub}>
                    Riesgo {formatNivelRiesgo(userData.nivelRiesgo)}
                    {userData.nivelConfianza != null ? ` · confianza ${userData.nivelConfianza}%` : ''}
                  </Text>
                </View>
                {puntaje != null ? (
                  <View style={styles.scoreBubble}>
                    <Text style={styles.scoreBubbleValue}>{puntaje}</Text>
                    <Text style={styles.scoreBubbleHint}>pts</Text>
                  </View>
                ) : null}
              </View>
              {puntaje != null ? (
                <View style={styles.scoreTrack}>
                  <View style={[styles.scoreFill, { width: `${barraPct}%`, backgroundColor: riesgoColor }]} />
                </View>
              ) : null}
              <Text style={styles.perfilHint}>
                {userData.enMora
                  ? 'Paga el saldo vencido para recuperar tu perfil en esta tienda.'
                  : 'Sigue pagando a tiempo para mantener o mejorar tu crédito.'}
              </Text>
            </View>
          </View>

          <View style={styles.movementsSection}>
            <Text style={styles.movementsTitle}>Últimos movimientos</Text>
            {movements.length === 0 ? (
              <Text style={styles.emptyMovements}>Aún no hay movimientos en esta tienda.</Text>
            ) : (
              movements.map((item) => {
                const esCargo = item.tipo === 'CARGO';
                const vencido = item.estado === 'vencido';
                const inner = (
                  <>
                    <View style={[styles.iconCircle, { backgroundColor: item.bgColor }]}>
                      <Text style={[styles.iconText, { color: item.signColor }]}>
                        {esCargo ? '−' : '+'}
                      </Text>
                    </View>
                    <View style={styles.movementTextColumn}>
                      <View style={styles.movementTitleRow}>
                        <View style={[styles.typeChip, esCargo ? styles.typeChipCargo : styles.typeChipAbono]}>
                          <Text style={[styles.typeChipText, esCargo ? styles.typeChipCargoText : styles.typeChipAbonoText]}>
                            {esCargo ? (vencido ? 'Vencido' : 'Fiado') : 'Abono'}
                          </Text>
                        </View>
                        <Text style={styles.movementDate}>{formatFechaUI(item.fecha)}</Text>
                      </View>
                      <Text style={styles.movementDesc} numberOfLines={1}>{item.descripcion}</Text>
                      {esCargo && item.saldoPendiente != null ? (
                        <Text style={styles.movementSaldo}>
                          Saldo {formatCOP(item.saldoPendiente)}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.amountCol}>
                      <Text style={[styles.movementAmount, { color: item.signColor }]}>
                        {esCargo ? '−' : '+'}{formatCOP(item.monto)}
                      </Text>
                      {esCargo ? <ChevronRight size={16} color={COLORS.textMuted} /> : null}
                    </View>
                  </>
                );

                if (item.id_credito) {
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.movementCard}
                      onPress={() => router.push({ pathname: '/creditoDetalle', params: { id: String(item.id_credito) } } as any)}
                      activeOpacity={0.8}
                    >
                      {inner}
                    </TouchableOpacity>
                  );
                }

                return (
                  <View key={item.id} style={styles.movementCard}>
                    {inner}
                  </View>
                );
              })
            )}
          </View>

          <TouchableOpacity style={styles.ctaButton} onPress={handleContactStore} activeOpacity={0.85}>
            <MessageCircle size={18} color={COLORS.white} />
            <Text style={styles.ctaButtonText}>Escribir a la tienda</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default VistaUsuario;
