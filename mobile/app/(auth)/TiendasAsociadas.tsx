import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { tiendasAsociadasStyles as styles } from '@/constants/Tiendas_asociadas.styles';
import { COLORS } from '@/constants/colors';
import { useTiendasAsociadas } from '@/hooks/Usetiendasasociadas';
import { AppDialog } from '@/components/ui/AppDialog';
import { useAppDialog } from '@/hooks/useAppDialog';
import { useConsumeLoginWelcome } from '@/hooks/useConsumeLoginWelcome';

export default function TiendasAsociadasScreen() {
  const {
    tiendas,
    loading,
    tiendaSeleccionada,
    dropdownAbierto,
    toggleDropdown,
    seleccionarTienda,
    handleContinuar,
    formatCOP,
  } = useTiendasAsociadas();
  const { dialog, showSuccess, hide } = useAppDialog();
  useConsumeLoginWelcome('tiendas', showSuccess);

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tus tiendas con deuda</Text>
          <Text style={styles.headerSubtitle}>
            Selecciona la tienda que deseas consultar. Solo aparecen tiendas donde tienes saldo pendiente.
          </Text>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Elige tu tienda</Text>
            <Text style={styles.sectionHint}>
              {tiendas.length > 1
                ? `${tiendas.length} tiendas con deuda activa`
                : 'Tienda con deuda activa'}
            </Text>

            {loading ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />
            ) : (
              <>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={toggleDropdown}
                  activeOpacity={0.8}
                  disabled={tiendas.length === 0}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      !tiendaSeleccionada && styles.dropdownPlaceholder,
                    ]}
                  >
                    {tiendaSeleccionada?.nombre ?? 'Selecciona una tienda'}
                  </Text>
                  {tiendas.length > 0 && (
                    <Text style={[styles.dropdownArrow, dropdownAbierto && styles.dropdownArrowUp]}>
                      ▾
                    </Text>
                  )}
                </TouchableOpacity>

                {dropdownAbierto && (
                  <View style={styles.dropdownList}>
                    {tiendas.length === 0 ? (
                      <Text style={styles.emptyText}>
                        No tienes deuda activa en ninguna tienda asociada.
                      </Text>
                    ) : (
                      tiendas.map((tienda) => (
                        <TouchableOpacity
                          key={tienda.id}
                          style={[
                            styles.dropdownItem,
                            tiendaSeleccionada?.id === tienda.id && styles.dropdownItemActive,
                          ]}
                          onPress={() => seleccionarTienda(tienda)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              tiendaSeleccionada?.id === tienda.id && styles.dropdownItemTextActive,
                            ]}
                          >
                            {tienda.nombre}
                          </Text>
                          <Text style={styles.dropdownItemSub}>{tienda.direccion || tienda.tendero}</Text>
                          <Text style={styles.dropdownItemDeuda}>
                            Deuda: {formatCOP(tienda.totalDeuda)}
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.btnPrimary, !tiendaSeleccionada && styles.btnDisabled]}
                  onPress={handleContinuar}
                  disabled={!tiendaSeleccionada}
                  activeOpacity={0.85}
                >
                  <Text style={styles.btnPrimaryText}>Continuar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
      <AppDialog
        visible={dialog.visible}
        variant={dialog.variant}
        title={dialog.title}
        message={dialog.message}
        onClose={hide}
      />
    </>
  );
}
