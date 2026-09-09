import {
View,
Text,
TextInput,
TouchableOpacity,
FlatList,
StatusBar,
ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, router } from 'expo-router';
import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bell, Banknote } from 'lucide-react-native';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { pagosStyles as styles } from '@/constants/pagos.styles';
import { COLORS } from '@/constants/colors';
import { usePagos, FiltroPeriodo, PagoItem } from '@/hooks/usePagos';
const FILTROS: { key: FiltroPeriodo; label: string }[] = [
{ key: 'todos', label: 'Todos' },
{ key: 'hoy', label: 'Hoy' },
{ key: 'semana', label: 'Semana' },
{ key: 'mes', label: 'Mes' },
];
const PagoItemRow = ({ item }: { item: PagoItem }) => (
<View style={styles.pagoCard}>
    <View style={styles.pagoIconWrap}>
    <Text style={styles.pagoIconText}>+</Text>
    </View>
    <View style={styles.pagoInfo}>
    <Text style={styles.pagoNombre}>{item.clienteNombre}</Text>
    <Text style={styles.pagoSub}>{item.creditoTitulo}</Text>
    </View>
    <View style={styles.pagoMontoCol}>
    <Text style={styles.pagoMonto}>{item.monto}</Text>
    <Text style={styles.pagoFecha}>{item.fecha}</Text>
    </View>
</View>
);
export default function PagosScreen() {
const [token, setToken] = useState<string | null>(null);
useFocusEffect(
    useCallback(() => {
    AsyncStorage.getItem('token').then(setToken);
    }, [])
);
const {
    pagos,
    busqueda,
    setBusqueda,
    filtroPeriodo,
    handleFiltro,
    loading,
    total,
    totalRecaudado,
    handleRegistrarPago,
    refetch,
} = usePagos(token);
useFocusEffect(
    useCallback(() => {
    if (token) refetch();
    }, [token])
);
return (
    <>
    <Stack.Screen options={{ headerShown: false }} />
    <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={styles.header}>
        <View style={{ width: 48 }} />
        <Text style={styles.headerTitle}>Pagos</Text>
        <HeaderIconButton
          icon={Bell}
          label="Avisos"
          onPress={() => router.push('/notificaciones' as any)}
          color={COLORS.primary}
          iconSize={18}
          style={styles.bellBtn}
        />
        </View>
        <View style={styles.subHeader}>
        <Banknote size={16} color={COLORS.white} />
        <Text style={styles.subHeaderText}>
            {total} pagos · ${totalRecaudado.toLocaleString('es-CO')} recaudados
        </Text>
        </View>
        <View style={styles.card}>
        <View style={styles.searchRow}>
            <TextInput
            style={styles.searchInput}
            placeholder="Buscar por cliente, crédito o monto..."
            placeholderTextColor={COLORS.textMuted}
            value={busqueda}
            onChangeText={setBusqueda}
            />
        </View>
        <View style={styles.filtersRow}>
            {FILTROS.map((f) => (
            <TouchableOpacity
                key={f.key}
                style={[styles.filterBtn, filtroPeriodo === f.key &&
styles.filterBtnActive]}
                onPress={() => handleFiltro(f.key)}
            >
                <Text
                style={[
                    styles.filterText,
                    filtroPeriodo === f.key && styles.filterTextActive,
                ]}
                >
                {f.label}
                </Text>
            </TouchableOpacity>
            ))}
        </View>
        {token === null || loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40
}} />
        ) : (
            <FlatList
            data={pagos}
            keyExtractor={(item) => String(item.id_abono)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => <PagoItemRow item={item} />}
            ListEmptyComponent={
                <Text style={styles.emptyText}>No se encontraron pagos</Text>
            }
            />
        )}
        <TouchableOpacity style={styles.btnRegistrar} onPress={handleRegistrarPago}>
            <Text style={styles.btnRegistrarText}>+ Registrar Pago</Text>
        </TouchableOpacity>
        </View>
    </SafeAreaView>
    </>
);
}
