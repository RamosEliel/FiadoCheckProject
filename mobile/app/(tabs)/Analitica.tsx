import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StatusBar,
  TextInput,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bell, ChevronLeft, ChevronRight, Search } from 'lucide-react-native';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { WeeklyPaymentsChart } from '@/components/analitica/WeeklyPaymentsChart';
import { CarteraDistribution } from '@/components/analitica/CarteraDistribution';
import { hapticLight } from '@/components/chat/haptic';
import { analiticaStyles as styles } from '@/constants/Analitica.styles';
import { COLORS } from '@/constants/colors';
import {
  useAnalitica,
  totalPagosMes,
  totalEsperadoMes,
  cumplimientoMesPct,
  etiquetaResumenMes,
  carteraTotal,
} from '@/hooks/Useanalitica';

export default function AnaliticaScreen() {
  const router = useRouter();
  const { clienteId, nombre } = useLocalSearchParams<{ clienteId?: string; nombre?: string }>();
  const [token, setToken] = useState<string | null>(null);
  const [isTendero, setIsTendero] = useState<boolean | null>(null);
  const [moraExpanded, setMoraExpanded] = useState(false);
  const { width } = useWindowDimensions();

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadSession = async () => {
        const [tokenRaw, usuarioRaw, tenderoRaw] = await Promise.all([
          AsyncStorage.getItem('token'),
          AsyncStorage.getItem('usuario'),
          AsyncStorage.getItem('tendero'),
        ]);

        if (!active) return;

        setToken(tokenRaw);

        let tendero = false;
        if (usuarioRaw) {
          try {
            const user = JSON.parse(usuarioRaw);
            if (user.id_rol == 2) {
              tendero = false;
            } else if (user.id_rol == 1) {
              tendero = true;
            } else if (tenderoRaw && tenderoRaw !== 'null') {
              tendero = true;
            }
          } catch {
            tendero = false;
          }
        } else if (tenderoRaw && tenderoRaw !== 'null') {
          tendero = true;
        }

        setIsTendero(tendero);

        if (!tendero) {
          router.replace('/(tabs)/vistaUsuario' as any);
        }
      };

      loadSession();
      return () => { active = false; };
    }, [router]),
  );

  const {
    busqueda,
    setBusqueda,
    buscarCliente,
    seleccionarCliente,
    anio,
    toggleAnio,
    avanzarMes,
    retrocederMes,
    puedeAvanzarMes,
    puedeRetrocederMes,
    cliente,
    recuperado,
    moraPorcentaje,
    pagosSemanales,
    distribucion,
    chartTitle,
    chartScale,
    mesNombre,
    sinPagosMes,
    formatMoneda,
    loading,
    refetch,
  } = useAnalitica(isTendero ? token : null);

  useEffect(() => {
    if (clienteId && nombre) {
      seleccionarCliente(String(clienteId), String(nombre));
    }
    // Solo debe sembrar el cliente una vez, al llegar desde el perfil — no en cada re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId, nombre]);

  useFocusEffect(
    useCallback(() => {
      if (token && isTendero) refetch();
    }, [token, isTendero, refetch]),
  );

  useEffect(() => {
    setMoraExpanded(false);
  }, [cliente?.id]);

  if (isTendero === null) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={COLORS.white} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!isTendero) return null;

  const initials = cliente?.nombre
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const pagosMes = totalPagosMes(pagosSemanales);
  const esperadoMes = totalEsperadoMes(pagosSemanales);
  const cumplimiento = cumplimientoMesPct(pagosSemanales);
  const totalCartera = carteraTotal(distribucion);
  const mora17 = distribucion.find((d) => d.label === 'Mora 1 - 7 Días');
  const moraMas7 = distribucion.find((d) => d.label === 'Mora +7 Días');

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

        <View style={styles.header}>
          <View style={{ width: 48 }} />
          <Text style={styles.headerTitle}>Analítica</Text>
          <HeaderIconButton
            icon={Bell}
            label="Avisos"
            onPress={() => router.push('/notificaciones' as any)}
            style={styles.bellBtn}
          />
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar Cliente.."
              placeholderTextColor={COLORS.textMuted}
              value={busqueda}
              onChangeText={setBusqueda}
              onSubmitEditing={buscarCliente}
              returnKeyType="search"
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.searchBtn} onPress={buscarCliente} activeOpacity={0.8}>
              <Search size={16} color={COLORS.white} />
              <Text style={styles.searchBtnText}>Buscar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.anioBadgeWrap}>
            <TouchableOpacity style={styles.anioBadge} onPress={toggleAnio} activeOpacity={0.7}>
              <Text style={styles.anioBadgeText}>Año {anio}</Text>
            </TouchableOpacity>
            <View style={styles.mesNav}>
              <TouchableOpacity
                style={[styles.mesNavBtn, !puedeRetrocederMes && styles.mesNavBtnDisabled]}
                onPress={retrocederMes}
                disabled={!puedeRetrocederMes}
                activeOpacity={0.7}
              >
                <ChevronLeft
                  size={16}
                  color={puedeRetrocederMes ? COLORS.text : COLORS.textMuted}
                />
              </TouchableOpacity>
              <View style={styles.anioBadge}>
                <Text style={styles.anioBadgeText}>{mesNombre}</Text>
              </View>
              <TouchableOpacity
                style={[styles.mesNavBtn, !puedeAvanzarMes && styles.mesNavBtnDisabled]}
                onPress={avanzarMes}
                disabled={!puedeAvanzarMes}
                activeOpacity={0.7}
              >
                <ChevronRight
                  size={16}
                  color={puedeAvanzarMes ? COLORS.text : COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {loading && !cliente ? (
            <ActivityIndicator color={COLORS.primary} style={styles.loader} />
          ) : cliente ? (
            <View style={styles.card}>
              {loading && (
                <ActivityIndicator color={COLORS.primary} style={{ marginBottom: 8 }} />
              )}
              <View style={styles.clienteRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <Text style={styles.clienteNombre}>{cliente.nombre}</Text>
              </View>

              <View style={styles.kpiRow}>
                <View style={styles.kpiItem}>
                  <View style={styles.kpiIconSquareGreen}>
                    <Text style={styles.kpiIconSymbol}>↗</Text>
                  </View>
                  <Text style={styles.kpiLabel}>Recuperado</Text>
                  <Text style={styles.kpiSubtitle}>Abonos del año {anio}</Text>
                  <Text style={styles.kpiValueGreen}>{formatMoneda(recuperado)}</Text>
                </View>

                <View style={styles.kpiDivider} />

                <Pressable
                  style={styles.kpiItem}
                  onPress={() => {
                    hapticLight();
                    setMoraExpanded((v) => !v);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Mora porcentual, tocar para detalle"
                  accessibilityState={{ expanded: moraExpanded }}
                >
                  <View style={styles.kpiIconSquareRed}>
                    <Text style={styles.kpiIconSymbol}>↘</Text>
                  </View>
                  <Text style={styles.kpiLabel}>Mora %</Text>
                  <Text style={styles.kpiSubtitle}>Cartera actual</Text>
                  <Text style={styles.kpiValueRed}>{moraPorcentaje} %</Text>
                </Pressable>
              </View>

              {moraExpanded && (
                <View style={styles.kpiExpand}>
                  <View style={styles.kpiExpandRow}>
                    <Text style={styles.kpiExpandLabel}>Mora 1-7 días</Text>
                    <Text style={styles.kpiExpandValue}>
                      {mora17?.pct ?? 0}% · {formatMoneda(mora17?.monto ?? 0)}
                    </Text>
                  </View>
                  <View style={styles.kpiExpandRow}>
                    <Text style={styles.kpiExpandLabel}>Mora +7 días</Text>
                    <Text style={styles.kpiExpandValue}>
                      {moraMas7?.pct ?? 0}% · {formatMoneda(moraMas7?.monto ?? 0)}
                    </Text>
                  </View>
                  <View style={styles.kpiExpandRow}>
                    <Text style={styles.kpiExpandLabel}>Total cartera</Text>
                    <Text style={styles.kpiExpandValue}>{formatMoneda(totalCartera)}</Text>
                  </View>
                </View>
              )}

              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>{chartTitle}</Text>
                </View>

                <WeeklyPaymentsChart
                  key={cliente.id}
                  data={pagosSemanales}
                  width={width - 80}
                  yMax={chartScale.yMax}
                  yTicks={chartScale.yTicks}
                  empty={sinPagosMes}
                  emptyMessage="Sin movimiento este mes"
                  belowLegend={
                    <View style={styles.chipsRow}>
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>Cobrado: {formatMoneda(pagosMes)}</Text>
                      </View>
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>Esperado: {formatMoneda(esperadoMes)}</Text>
                      </View>
                      <View style={styles.chip}>
                        <Text style={styles.chipText}>
                          {etiquetaResumenMes(pagosMes, esperadoMes, cumplimiento)}
                        </Text>
                      </View>
                      {esperadoMes > 0 && pagosMes === 0 ? (
                        <View style={styles.chip}>
                          <Text style={styles.chipText}>Aún no hay pagos registrados</Text>
                        </View>
                      ) : null}
                    </View>
                  }
                />
              </View>

              <CarteraDistribution items={distribucion} formatMoneda={formatMoneda} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                Busca un cliente para ver su analitica
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
