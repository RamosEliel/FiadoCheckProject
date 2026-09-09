import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { G, Line, Rect } from 'react-native-svg';
import { ChevronLeft, Bell, Calendar, Search } from 'lucide-react-native';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { analiticaStyles as styles } from '@/constants/Analitica.styles';
import { COLORS } from '@/constants/colors';
import {
  useAnalitica,
  CHART_WEEKS,
  type PagoSemanal,
} from '@/hooks/Useanalitica';

const CHART_HEIGHT = 150;
const CHART_PADDING_BOTTOM = 18;
const BAR_GREEN = '#7EDDAF';
const BAR_BLUE = '#5B9BD5';

type BarChartProps = {
  data: PagoSemanal[];
  width: number;
  yMax: number;
  yTicks: number[];
};

function BarChart({ data, width, yMax, yTicks }: BarChartProps) {
  const plotHeight = CHART_HEIGHT - CHART_PADDING_BOTTOM;
  const plotWidth = Math.max(width - 34, 200);
  const groupWidth = plotWidth / 4;
  const barWidth = 10;
  const gap = 4;

  const scaleY = (value: number) =>
    plotHeight - (Math.min(value, yMax) / yMax) * plotHeight;

  const formatTick = (value: number) =>
    value >= 1000 ? `${value / 1000}k` : String(value);

  return (
    <View style={styles.chartBody}>
      <View style={styles.chartYAxis}>
        {[...yTicks].reverse().map((tick) => (
          <Text key={tick} style={styles.chartYLabel}>
            {formatTick(tick)}
          </Text>
        ))}
      </View>

      <View style={styles.chartPlot}>
        <Svg width={plotWidth} height={CHART_HEIGHT}>
          {yTicks.map((tick) => {
            const y = scaleY(tick);
            return (
              <Line
                key={`grid-${tick}`}
                x1={0}
                y1={y}
                x2={plotWidth}
                y2={y}
                stroke="#B8D4E8"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            );
          })}

          {data.map((item, index) => {
            const groupX = index * groupWidth + groupWidth / 2;
            const greenH = plotHeight - scaleY(item.pagos);
            const blueH = plotHeight - scaleY(item.esperado);
            const greenX = groupX - barWidth - gap / 2;
            const blueX = groupX + gap / 2;

            return (
              <G key={item.semana}>
                <Rect
                  x={greenX}
                  y={scaleY(item.pagos)}
                  width={barWidth}
                  height={Math.max(greenH, item.pagos > 0 ? 2 : 0)}
                  rx={3}
                  fill={BAR_GREEN}
                />
                <Rect
                  x={blueX}
                  y={scaleY(item.esperado)}
                  width={barWidth}
                  height={Math.max(blueH, item.esperado > 0 ? 2 : 0)}
                  rx={3}
                  fill={BAR_BLUE}
                />
              </G>
            );
          })}
        </Svg>
      </View>
    </View>
  );
}

export default function AnaliticaScreen() {
  const router = useRouter();
  const { clienteId, nombre } = useLocalSearchParams<{ clienteId?: string; nombre?: string }>();
  const [token, setToken] = useState<string | null>(null);
  const [isTendero, setIsTendero] = useState<boolean | null>(null);
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
    cliente,
    recuperado,
    moraPorcentaje,
    pagosSemanales,
    distribucion,
    chartTitle,
    chartScale,
    formatMoneda,
    loading,
    refetch,
    handleCancelar,
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

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

        <View style={styles.header}>
          <HeaderIconButton
            icon={ChevronLeft}
            label="Volver"
            onPress={handleCancelar}
            style={styles.backBtn}
          />
          <Text style={styles.headerTitle}>Analitica</Text>
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
                  <Text style={styles.kpiValueGreen}>{formatMoneda(recuperado)}</Text>
                </View>

                <View style={styles.kpiDivider} />

                <View style={styles.kpiItem}>
                  <View style={styles.kpiIconSquareRed}>
                    <Text style={styles.kpiIconSymbol}>↘</Text>
                  </View>
                  <Text style={styles.kpiLabel}>Mora %</Text>
                  <Text style={styles.kpiValueRed}>{moraPorcentaje} %</Text>
                </View>
              </View>

              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>{chartTitle}</Text>
                  <View style={styles.chartActions}>
                    <TouchableOpacity
                      style={styles.chartActionBtn}
                      onPress={avanzarMes}
                      activeOpacity={0.7}
                    >
                      <Calendar size={14} color={COLORS.white} />
                      <Text style={styles.chartActionBtnText}>Avanzar Mes</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <BarChart
                  key={`${cliente.id}-${anio}-${chartTitle}-${chartScale.yMax}`}
                  data={pagosSemanales}
                  width={width - 80}
                  yMax={chartScale.yMax}
                  yTicks={chartScale.yTicks}
                />

                <View style={styles.chartXAxis}>
                  {CHART_WEEKS.map((week) => (
                    <Text key={week} style={styles.chartXLabel}>
                      {week}
                    </Text>
                  ))}
                </View>
              </View>

              <View style={styles.distSection}>
                <Text style={styles.distTitle}>Distribucion De Cartera</Text>

                {distribucion.map((item) => (
                  <View key={item.label} style={styles.distRow}>
                    <View style={[styles.distBadge, { backgroundColor: item.color }]}>
                      <Text style={styles.distBadgeText}>{item.pct}%</Text>
                    </View>
                    <View style={styles.distTrack}>
                      <Text style={styles.distLabel}>
                        {item.label} - {formatMoneda(item.monto)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
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
