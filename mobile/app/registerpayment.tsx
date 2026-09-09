import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, Bell } from 'lucide-react-native';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { registerPaymentStyles as styles } from '@/constants/Registerpayment.styles';
import { COLORS } from '@/constants/colors';
import { useRegisterPayment } from '@/hooks/Useregisterpayment';

export default function RegisterPaymentScreen() {
  const { clienteId } = useLocalSearchParams<{ clienteId?: string }>();
  const [token, setToken] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('token').then((t) => setToken(t));
    }, []),
  );

  const {
    busqueda, setBusqueda,
    buscarCliente, loadingBusqueda,
    nombreCliente, creditosDisponibles, seleccionarCredito,
    credito, formatCurrency, formatFecha,
    monto, setMonto,
    getQuickAmounts, aplicarMontoRapido,
    observaciones, setObservaciones,
    loading,
    handleConfirmarPago,
    handleCancelar,
    getEstadoColor, getEstadoLabel,
  } = useRegisterPayment(token ?? '', clienteId);

  const quickAmounts = getQuickAmounts();
  const multiplesCreditos = creditosDisponibles.length > 1;

  if (token === null) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={COLORS.white} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

        <View style={styles.header}>
          <HeaderIconButton
            icon={ChevronLeft}
            label="Volver"
            onPress={handleCancelar}
            style={styles.backBtn}
          />
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Registrar Pago</Text>
            <Text style={styles.headerSubtitle}>Asocia el pago a un crédito activo</Text>
          </View>
          <HeaderIconButton
            icon={Bell}
            label="Avisos"
            onPress={() => router.push('/notificaciones' as any)}
            color={COLORS.primary}
            iconSize={18}
            style={styles.bellBtn}
          />
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Buscar Cliente</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nombre o ID"
                placeholderTextColor={COLORS.textMuted}
                value={busqueda}
                onChangeText={setBusqueda}
                onSubmitEditing={buscarCliente}
                returnKeyType="search"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.searchBtn}
                onPress={buscarCliente}
                disabled={loadingBusqueda}
                activeOpacity={0.8}
              >
                {loadingBusqueda
                  ? <ActivityIndicator size="small" color={COLORS.white} />
                  : <Text style={styles.searchBtnText}>Buscar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>

          {nombreCliente && multiplesCreditos && (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Seleccionar Crédito</Text>
              <Text style={styles.pickerHint}>
                {nombreCliente} tiene {creditosDisponibles.length} créditos activos. Elige a cuál aplicar el pago.
              </Text>

              <View style={styles.creditList}>
                {creditosDisponibles.map((opcion, index) => {
                  const activo = credito?.id === opcion.id;
                  const titulo = opcion.descripcion?.trim() || `Crédito ${creditosDisponibles.length - index}`;

                  return (
                    <TouchableOpacity
                      key={opcion.id}
                      style={[styles.creditOption, activo && styles.creditOptionActive]}
                      onPress={() => seleccionarCredito(opcion)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.creditOptionHeader}>
                        <Text style={styles.creditOptionTitle} numberOfLines={1}>
                          {titulo}
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: getEstadoColor(opcion.estado) + '33' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: getEstadoColor(opcion.estado) },
                            ]}
                          >
                            {getEstadoLabel(opcion.estado)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.creditOptionMeta}>
                        Total {formatCurrency(opcion.montoTotal)} · Vence {formatFecha(opcion.fechaLimitePago)}
                      </Text>
                      <Text style={styles.creditOptionSaldo}>
                        Saldo: {formatCurrency(opcion.saldoPendiente)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {credito && (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Crédito Seleccionado</Text>

              <View style={styles.clientRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarInitials}>
                    {credito.nombreCliente
                      .split(' ')
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join('')
                      .toUpperCase()}
                  </Text>
                </View>

                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{credito.nombreCliente}</Text>
                  <Text style={styles.clientCredit}>
                    {credito.descripcion?.trim() || 'Crédito'} · {formatCurrency(credito.montoTotal)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getEstadoColor(credito.estado) + '33' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: getEstadoColor(credito.estado) },
                    ]}
                  >
                    {getEstadoLabel(credito.estado)}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Deuda total</Text>
                  <Text style={[styles.statValue, styles.dangerText]}>
                    {formatCurrency(credito.saldoPendiente)}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Días en mora</Text>
                  <Text style={[styles.statValue, credito.diasEnMora > 0 && styles.dangerText]}>
                    {credito.diasEnMora} días
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View style={[styles.card, !credito && styles.cardDisabled]}>
            <Text style={styles.sectionLabel}>Monto A Pagar</Text>

            <TextInput
              style={styles.amountInput}
              placeholder="$0"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={monto}
              onChangeText={setMonto}
              editable={!!credito}
            />

            {quickAmounts.length > 0 && (
              <View style={styles.quickAmounts}>
                {quickAmounts.map((chip) => (
                  <TouchableOpacity
                    key={chip.label}
                    style={[
                      styles.quickChip,
                      monto === chip.value.toString() && styles.quickChipActive,
                    ]}
                    onPress={() => aplicarMontoRapido(chip.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.quickChipText,
                        monto === chip.value.toString() && styles.quickChipTextActive,
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[styles.sectionLabel, { marginTop: 4 }]}>Observaciones</Text>
            <TextInput
              style={styles.obsInput}
              placeholder="Opcional"
              placeholderTextColor={COLORS.textMuted}
              multiline
              value={observaciones}
              onChangeText={setObservaciones}
              editable={!!credito}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.btnPrimary, (!credito || loading) && styles.btnDisabled]}
            onPress={handleConfirmarPago}
            disabled={!credito || loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={COLORS.white} />
              : <Text style={styles.btnPrimaryText}>Confirmar Pago</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnGhost}
            onPress={handleCancelar}
            activeOpacity={0.7}
          >
            <Text style={styles.btnGhostText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}
