import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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
import { CreditCalendar } from '@/components/CreditCalendar';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';

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

  const keyboardHeight = useKeyboardHeight();

  return (
    <>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
        <View style={[
          { flex: 1 },
          Platform.OS === 'android' ? { paddingBottom: keyboardHeight } : null,
        ]}>

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
                  onPress={() => setShowDatePicker(true)}
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

          </ScrollView>

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
        </View>
        </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <CreditCalendar
        visible={showDatePicker}
        selected={fechaLimite}
        onSelect={setFechaLimite}
        onClose={() => setShowDatePicker(false)}
      />
    </>
  );
}
