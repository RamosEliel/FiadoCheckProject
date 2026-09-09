import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, TextInput, Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { dashboardStyles as styles } from '@/constants/dashboard.styles';
import { COLORS } from '@/constants/colors';
import { useDashboard, FiltroFecha } from '@/hooks/Usedashboard';
import { BanknoteArrowUp } from "lucide-react-native";
import { Bell } from "lucide-react-native";
import { X } from "lucide-react-native";
import { Search } from "lucide-react-native";
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { ErrorState } from '@/components/ErrorState';
import { friendlyErrorMessage, clasificarError } from '@/utils/errorMessages';
import { cerrarSesionYRedirigir } from '@/utils/session';


const FILTROS_FECHA: { key: FiltroFecha; label: string }[] = [
  { key: 'todos',  label: 'Siempre'      },
  { key: 'hoy',   label: 'Hoy'          },
  { key: 'semana', label: 'Esta semana'  },
  { key: 'mes',   label: 'Este mes'     },
];

export default function HomeScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [tendero, setTendero] = useState<any>(null);
  const searchAnim = useRef(new Animated.Value(0)).current;
  const isFirstFocus = useRef(true);

useFocusEffect(
  useCallback(() => {
    AsyncStorage.getItem('token').then(t => {
      setToken(t);
      if (t && !isFirstFocus.current) {
        refetch(t);
      }
      isFirstFocus.current = false;
    });
    AsyncStorage.getItem('tendero').then(t => {
      if (t) setTendero(JSON.parse(t));
    });
  }, [])
);

  const {
    data, loading, error, actividad, formatCOP,
    busqueda, setBusqueda, mostrarBusqueda, toggleBusqueda,
    filtroFecha, setFiltroFecha,
    handleNuevoCredito, handleRegistrarPago, handleBell,
    refetch,
  } = useDashboard(token ?? '');

  // Animación de la barra de búsqueda
  useEffect(() => {
    Animated.timing(searchAnim, {
      toValue: mostrarBusqueda ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [mostrarBusqueda]);

  const searchHeight = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 48],
  });

  if (token === null || loading) return (
    <SafeAreaView style={styles.safe}>
      <ActivityIndicator size="large" color={COLORS.white} style={{ marginTop: 60 }} />
    </SafeAreaView>
  );

  if (error) return (
    <SafeAreaView style={styles.safe}>
      <ErrorState
        message={friendlyErrorMessage(error)}
        primaryAction={
          clasificarError(error) === 'sesion'
            ? { label: 'Iniciar sesión', onPress: cerrarSesionYRedirigir }
            : { label: 'Reintentar', onPress: () => refetch() }
        }
      />
    </SafeAreaView>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

        {/* Header fijo */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola, {tendero?.nombre ?? 'Carlos'}</Text>
            <Text style={styles.storeName}>{tendero?.nombre_tienda ?? 'Tienda El Vecino'}</Text>
          </View>
          <HeaderIconButton
            icon={Bell}
            label="Avisos"
            onPress={handleBell}
            iconSize={22}
            style={styles.bellBtn}
          />
        </View>

        {/* Card blanca fija */}
        <View style={styles.card}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

            {/* Total por Cobrar */}
            <View style={styles.totalCard}>
              <View>
                <Text style={styles.totalLabel}>Total Por Cobrar</Text>
                <Text style={styles.totalAmount}>{formatCOP(data?.cartera_total ?? 0)}</Text>
                <Text style={styles.totalSub}>Actualizado Hoy</Text>
              </View>
              <View style={styles.totalIcon}>
                <Text style={{ fontSize: 42 }}><BanknoteArrowUp size={40} color="#00D09E" /></Text>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>En mora</Text>
                <Text style={[styles.statAmount, { color: '#FF5252' }]}>
                  {formatCOP(data?.monto_en_mora ?? 0)}
                </Text>
                <View style={[styles.statBadge, { backgroundColor: '#FFE8E8' }]}>
                  <Text style={[styles.statBadgeText, { color: '#FF5252' }]}>
                    {data?.clientes_en_mora ?? 0} clientes
                  </Text>
                </View>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Al día</Text>
                <Text style={[styles.statAmount, { color: COLORS.primary }]}>
                  {formatCOP(data?.monto_al_dia ?? 0)}
                </Text>
                <View style={[styles.statBadge, { backgroundColor: '#E8F5EE' }]}>
                  <Text style={[styles.statBadgeText, { color: COLORS.primary }]}>
                    {(data?.total_clientes ?? 0) - (data?.clientes_en_mora ?? 0)} clientes
                  </Text>
                </View>
              </View>
            </View>

            {/* Actividad Reciente — título con ícono de búsqueda */}
            <View style={styles.activityHeader}>
              <Text style={styles.sectionTitle}>Actividad Reciente</Text>
              <TouchableOpacity onPress={toggleBusqueda} style={styles.searchIconBtn}>
                {mostrarBusqueda ? <X size={18} color="black" /> : <Search size={18} color="black" />}
                <Text style={styles.searchIconLabel}>{mostrarBusqueda ? 'Cerrar' : 'Buscar'}</Text>
              </TouchableOpacity>
            </View>

            {/* Barra de búsqueda animada */}
            <Animated.View style={[styles.searchBar, { height: searchHeight, overflow: 'hidden' }]}>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar cliente..."
                placeholderTextColor={COLORS.textMuted}
                value={busqueda}
                onChangeText={setBusqueda}
                autoFocus={mostrarBusqueda}
              />
            </Animated.View>

            {/* Filtros fecha */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filtersRow, { marginBottom: 12 }]}>
              {FILTROS_FECHA.map(f => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterBtn, filtroFecha === f.key && styles.filterBtnActive]}
                  onPress={() => setFiltroFecha(f.key)}
                >
                  <Text style={[styles.filterText, filtroFecha === f.key && styles.filterTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Lista actividad */}
            <View style={styles.activityCard}>
              {actividad.length === 0 ? (
                <Text style={{ textAlign: 'center', color: COLORS.textMuted, padding: 20 }}>
                  Sin resultados
                </Text>
              ) : (
                actividad.map((item, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.activityRow,
                      idx < actividad.length - 1 && styles.activityDivider,
                    ]}
                  >
                    <View style={[styles.avatar, { backgroundColor: item.bgColor }]}>
                      <Text style={styles.avatarText}>{item.initials}</Text>
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityName}>{item.name}</Text>
                      <Text style={[styles.activitySub, item.subtitleMora && styles.activitySubMora]}>
                        {item.subtitle}
                      </Text>
                    </View>
                    <View style={styles.activityDividerVertical} />
                    <Text style={[styles.activityAmount, { color: item.amountColor }]}>
                      {item.amount}
                    </Text>
                  </View>
                ))
              )}
            </View>

            {/* Botones */}
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.btnOutline} onPress={handleNuevoCredito}>
                <Text style={styles.btnOutlineText}>+ Nuevo Crédito</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnFill} onPress={handleRegistrarPago}>
                <Text style={styles.btnFillText}>Registrar Pago</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </View>
      </SafeAreaView>
    </>
  );
}
