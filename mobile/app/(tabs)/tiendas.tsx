import { View, Text, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tiendasAsociadasStyles as styles } from '@/constants/Tiendas_asociadas.styles';
import { COLORS } from '@/constants/colors';
import { useTiendasAsociadas } from '@/hooks/Usetiendasasociadas';
import { TiendasDeudaPicker } from '@/components/TiendasDeudaPicker';

export default function TiendasTabScreen() {
  const {
    tiendas,
    loading,
    tiendaSeleccionada,
    seleccionarTienda,
    handleContinuar,
    formatCOP,
  } = useTiendasAsociadas();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tus tiendas</Text>
        <Text style={styles.headerSubtitle}>
          Cambia de cuenta cuando quieras. Solo aparecen las que tienen saldo pendiente.
        </Text>
      </View>

      <TiendasDeudaPicker
        tiendas={tiendas}
        loading={loading}
        tiendaSeleccionada={tiendaSeleccionada}
        onSelect={seleccionarTienda}
        onContinue={handleContinuar}
        continueLabel="Ver cuenta"
        formatCOP={formatCOP}
      />
    </SafeAreaView>
  );
}
