import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addCreditStyles as styles } from '@/constants/Addcredit.styles';
import { COLORS } from '@/constants/colors';
import { useAddCredit } from '@/hooks/Useaddcredit';
import { formatNivelRiesgo } from '@/utils/scoring';
import { Bell, CalendarDays, ChevronLeft, Sparkles, AlertCircle, Wallet, Receipt } from 'lucide-react-native';
import { HeaderIconButton } from '@/components/HeaderIconButton';

export default function AddCreditScreen() {
  const { clienteId } = useLocalSearchParams<{ clienteId?: string }>();
  const [token, setToken]     = useState<string | null>(null);
  const [tendero, setTendero] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('token').then(t => setToken(t));
      AsyncStorage.getItem('tendero').then(t => {
        if (t) setTendero(JSON.parse(t));
      });
    }, [])
  );

  const {
    usuario, setUsuario,
    monto, setMonto,
    fechaLimite, setFechaLimite,
    handleFechaChange,
    observaciones, setObservaciones,
    scoring, loadingScoring,
    loading,
    buscarScoring,
    handleGuardar,
    handleCancelar,
    getRiesgoColor,
    showDatePicker, setShowDatePicker,
  } = useAddCredit(token ?? '', tendero?.id_tendero, clienteId);

  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  const inicioHoy = () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return hoy;
  };

  const esFechaPasada = (dia: number, month = currentCalendarDate.getMonth(), year = currentCalendarDate.getFullYear()) => {
    const candidata = new Date(year, month, dia);
    candidata.setHours(0, 0, 0, 0);
    return candidata.getTime() < inicioHoy().getTime();
  };

  const esMesAnteriorAlActual = (fecha: Date) => {
    const inicioMesVista = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
    const inicioMesActual = new Date(inicioHoy().getFullYear(), inicioHoy().getMonth(), 1);
    return inicioMesVista < inicioMesActual;
  };

  const changeMonth = (direction: number) => {
    setCurrentCalendarDate(prev => {
      const nextDate = new Date(prev.getFullYear(), prev.getMonth() + direction, 1);
      if (direction < 0 && esMesAnteriorAlActual(nextDate)) {
        return prev;
      }
      return nextDate;
    });
  };

  const obtenerNombreMes = (monthIndex: number) => {
    const meses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    return meses[monthIndex];
  };

  const obtenerDiasCalendario = () => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    const cantDias = new Date(year, month + 1, 0).getDate();
    const primerDiaSemana = new Date(year, month, 1).getDay();
    const primerDiaAjustado = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;

    const celdas = [];
    for (let i = 0; i < primerDiaAjustado; i++) {
      celdas.push(null);
    }
    for (let i = 1; i <= cantDias; i++) {
      celdas.push(i);
    }
    return celdas;
  };

  const seleccionarDia = (dia: number) => {
    if (esFechaPasada(dia)) {
      Alert.alert('Fecha inválida', 'La fecha límite no puede ser anterior a hoy.');
      return;
    }
    const d = String(dia).padStart(2, '0');
    const m = String(currentCalendarDate.getMonth() + 1).padStart(2, '0');
    const y = currentCalendarDate.getFullYear();
    setFechaLimite(`${d}/${m}/${y}`);
    setShowDatePicker(false);
  };

  const verificarDiaSeleccionado = (dia: number) => {
    if (!fechaLimite) return false;
    const partes = fechaLimite.split('/');
    if (partes.length !== 3) return false;
    const d = parseInt(partes[0], 10);
    const m = parseInt(partes[1], 10);
    const y = parseInt(partes[2], 10);
    return d === dia && m === (currentCalendarDate.getMonth() + 1) && y === currentCalendarDate.getFullYear();
  };

  const verificarEsHoy = (dia: number) => {
    const hoy = new Date();
    return hoy.getDate() === dia && 
           hoy.getMonth() === currentCalendarDate.getMonth() && 
           hoy.getFullYear() === currentCalendarDate.getFullYear();
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

        {/* Header */}
        <View style={styles.header}>
          <HeaderIconButton
            icon={ChevronLeft}
            label="Volver"
            onPress={handleCancelar}
            style={styles.backBtn}
          />
          <Text style={styles.headerTitle}>Agregar Credito</Text>
          <HeaderIconButton
            icon={Bell}
            label="Avisos"
            onPress={() => router.push('/notificaciones' as any)}
            color={COLORS.primary}
            iconSize={18}
            style={styles.bellBtn}
          />
        </View>

        {/* Card */}
        <View style={styles.card}>
          <ScrollView showsVerticalScrollIndicator={false}>

            {/* Usuario */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Usuario</Text>
              <TextInput
                style={styles.input}
                placeholder="Cédula del cliente"
                placeholderTextColor={COLORS.textMuted}
                value={usuario}
                onChangeText={setUsuario}
                keyboardType="numeric"
                onEndEditing={() => buscarScoring()}
                returnKeyType="search"
                onSubmitEditing={() => buscarScoring()}
              />
            </View>

            {/* Monto */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Monto</Text>
              <TextInput
                style={styles.input}
                placeholder="$0"
                placeholderTextColor={COLORS.textMuted}
                value={monto}
                onChangeText={setMonto}
                keyboardType="numeric"
              />
            </View>

            {/* Fecha De Pago Limite */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Fecha De Pago Limite</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.inputFlex}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={COLORS.textMuted}
                  value={fechaLimite}
                  onChangeText={handleFechaChange}
                  keyboardType="numeric"
                  maxLength={10}
                />
                <TouchableOpacity
                  style={styles.calendarBtn}
                  onPress={() => {
                    setCurrentCalendarDate(new Date());
                    setShowDatePicker(true);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Elegir fecha"
                >
                  <CalendarDays size={22} color={COLORS.white}
                    style={{ backgroundColor: COLORS.primary, borderRadius: 8, padding: 4 }}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Observaciones */}
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.textArea}
                placeholder="Descripción"
                placeholderTextColor={COLORS.primary}
                value={observaciones}
                onChangeText={setObservaciones}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Recomendación IA */}
            <View style={[
              styles.scoringCard,
              styles.scoringCardBorder,
              scoring?.nivel_riesgo && { borderLeftColor: getRiesgoColor(scoring.nivel_riesgo) },
            ]}>
              {loadingScoring ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : scoring ? (
                <>
                  <View style={styles.scoringHeaderRow}>
                    <Sparkles size={18} color={COLORS.primary} />
                    <Text style={styles.scoringTitle}>Recomendación IA</Text>
                  </View>

                  {scoring.estado === 'cliente_no_existe' ? (
                    <View style={styles.iaEmptyState}>
                      <AlertCircle size={32} color="#FF5252" />
                      <Text style={[styles.iaEmptyTitle, { color: '#FF5252' }]}>Cliente no registrado</Text>
                      <Text style={styles.iaEmptyText}>{scoring.mensaje}</Text>
                    </View>
                  ) : scoring.estado === 'cliente_sin_vinculo' ? (
                    <View style={styles.iaEmptyState}>
                      <AlertCircle size={32} color="#FFA000" />
                      <Text style={[styles.iaEmptyTitle, { color: '#FFA000' }]}>Cliente sin vincular</Text>
                      {scoring.nombre ? (
                        <Text style={[styles.iaEmptyText, { fontWeight: '700', marginBottom: 4 }]}>
                          {scoring.nombre}
                        </Text>
                      ) : null}
                      <Text style={styles.iaEmptyText}>{scoring.mensaje}</Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.scoreVisualRow}>
                        <View style={styles.scoreCircleWrap}>
                          <View style={[styles.scoreCircle, { borderColor: getRiesgoColor(scoring.nivel_riesgo) }]}>
                            <Text style={[styles.scoreCircleText, { color: getRiesgoColor(scoring.nivel_riesgo) }]}>
                              {scoring.confianza != null ? `${scoring.confianza}%` : 'N/D'}
                            </Text>
                          </View>
                          <Text style={styles.scoreCircleHint}>
                            {scoring.confianza != null
                              ? 'Nivel de confianza'
                              : 'Sin historial suficiente'}
                          </Text>
                        </View>
                        <View style={styles.scoreInfoColumn}>
                          <View style={[styles.badgeRiesgo, { backgroundColor: getRiesgoColor(scoring.nivel_riesgo) + '20' }]}>
                            <Text style={[styles.badgeRiesgoText, { color: getRiesgoColor(scoring.nivel_riesgo) }]}>
                              Riesgo {formatNivelRiesgo(scoring.nivel_riesgo)}
                            </Text>
                          </View>
                          <View style={styles.limiteRow}>
                            <Text style={styles.limiteLabel}>Límite sugerido:</Text>
                            <Text style={styles.limiteValue}>
                              ${(scoring.limite_sugerido ?? 0).toLocaleString('es-CO')}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {scoring.total_creditos > 0 ? (
                        <>
                          {scoring.mensaje ? (
                            <Text style={styles.scoringText}>{scoring.mensaje}</Text>
                          ) : null}
                          <View style={styles.miniStatsRow}>
                            <View style={styles.miniStatCard}>
                              <Receipt size={16} color={COLORS.primary} />
                              <Text style={styles.miniStatValue}>{scoring.total_creditos}</Text>
                              <Text style={styles.miniStatLabel}>Créditos</Text>
                            </View>
                            <View style={styles.miniStatCard}>
                              <Wallet size={16} color={COLORS.primary} />
                              <Text style={styles.miniStatValue}>
                                ${scoring.total_deuda.toLocaleString('es-CO')}
                              </Text>
                              <Text style={styles.miniStatLabel}>Deuda</Text>
                            </View>
                            {scoring.creditos_vencidos > 0 && (
                              <View style={[styles.miniStatCard, { backgroundColor: '#FFF0F0' }]}>
                                <AlertCircle size={16} color="#FF5252" />
                                <Text style={[styles.miniStatValue, { color: '#FF5252' }]}>
                                  {scoring.creditos_vencidos}
                                </Text>
                                <Text style={[styles.miniStatLabel, { color: '#FF5252' }]}>Vencidos</Text>
                              </View>
                            )}
                          </View>
                        </>
                      ) : (
                        <View style={styles.iaEmptyState}>
                          <AlertCircle size={32} color={COLORS.textMuted} />
                          <Text style={styles.iaEmptyTitle}>No tienes créditos asociados con este cliente</Text>
                          <Text style={styles.iaEmptyText}>
                            Este cliente no tiene ningún crédito registrado a tu nombre como tendero.{'\n'}
                            Puedes crear el primero con un monto inicial de hasta ${(scoring.limite_sugerido ?? 0).toLocaleString('es-CO')}.
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </>
              ) : (
                <View style={styles.iaEmptyState}>
                  <Sparkles size={28} color={COLORS.textMuted} />
                  <Text style={[styles.iaEmptyTitle, { marginTop: 8 }]}>Recomendación IA</Text>
                  <Text style={styles.iaEmptyText}>
                    Ingresa la cédula del cliente para ver su scoring
                  </Text>
                </View>
              )}
            </View>

            {/* Botones */}
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.btnCancelar}
                onPress={handleCancelar}
                activeOpacity={0.75}
              >
                <Text style={styles.btnCancelarText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnGuardar, loading && styles.btnDisabled]}
                onPress={handleGuardar}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color={COLORS.white} />
                  : <Text style={styles.btnGuardarText}>Guardar</Text>
                }
              </TouchableOpacity>
            </View>

          </ScrollView>
        </View>
      </SafeAreaView>

      {/* Modal del Calendario */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity 
          style={calendarStyles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <TouchableOpacity 
            style={calendarStyles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header del Calendario */}
            <View style={calendarStyles.header}>
              <TouchableOpacity
                style={[
                  calendarStyles.navBtn,
                  esMesAnteriorAlActual(
                    new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1)
                  ) && calendarStyles.navBtnDisabled,
                ]}
                onPress={() => changeMonth(-1)}
                disabled={esMesAnteriorAlActual(
                  new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1)
                )}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityLabel="Mes anterior"
              >
                <ChevronLeft size={20} color={COLORS.text} />
              </TouchableOpacity>

              <Text style={calendarStyles.monthTitle}>
                {obtenerNombreMes(currentCalendarDate.getMonth())} {currentCalendarDate.getFullYear()}
              </Text>

              <TouchableOpacity
                style={calendarStyles.navBtn}
                onPress={() => changeMonth(1)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                accessibilityLabel="Mes siguiente"
              >
                <ChevronLeft size={20} color={COLORS.text} style={{ transform: [{ rotate: '180deg' }] }} />
              </TouchableOpacity>
            </View>

            {/* Días de la semana */}
            <View style={calendarStyles.weekDaysRow}>
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d, i) => (
                <Text key={i} style={calendarStyles.weekDayText}>{d}</Text>
              ))}
            </View>

            {/* Cuadrícula de días */}
            <View style={calendarStyles.daysGrid}>
              {obtenerDiasCalendario().map((dia, idx) => {
                if (dia === null) {
                  return <View key={idx} style={calendarStyles.emptyCell} />;
                }

                const esSeleccionado = verificarDiaSeleccionado(dia);
                const esHoy = verificarEsHoy(dia);
                const esPasado = esFechaPasada(dia);

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      calendarStyles.dayCell,
                      esSeleccionado && calendarStyles.selectedDayCell,
                      esHoy && !esSeleccionado && calendarStyles.todayCell,
                      esPasado && calendarStyles.disabledDayCell,
                    ]}
                    onPress={() => seleccionarDia(dia)}
                    disabled={esPasado}
                    activeOpacity={esPasado ? 1 : 0.7}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  >
                    <Text
                      style={[
                        calendarStyles.dayText,
                        esSeleccionado && calendarStyles.selectedDayText,
                        esPasado && calendarStyles.disabledDayText,
                      ]}
                    >
                      {dia}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Botón cerrar */}
            <TouchableOpacity 
              style={calendarStyles.closeBtn}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={calendarStyles.closeBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const calendarStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 22,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  navBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.inputBg,
  },
  navBtnDisabled: {
    opacity: 0.35,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
  },
  weekDayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayCell: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
    borderRadius: 18,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  emptyCell: {
    width: 36,
    height: 36,
    marginVertical: 4,
  },
  selectedDayCell: {
    backgroundColor: COLORS.primary,
  },
  selectedDayText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  disabledDayCell: {
    opacity: 0.35,
  },
  disabledDayText: {
    color: COLORS.textMuted,
  },
  closeBtn: {
    marginTop: 20,
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 50,
    backgroundColor: COLORS.inputBg,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
