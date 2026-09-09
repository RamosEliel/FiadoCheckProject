import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bell, ChevronLeft } from 'lucide-react-native';
import { HeaderIconButton } from '@/components/HeaderIconButton';

import { reportesStyles as styles } from '@/constants/reportes.styles';
import { COLORS } from '@/constants/colors';
import { useReportes, PeriodoReporte } from '@/hooks/useReportes';
import { CONFIG } from '@/config/config';
import { ErrorState } from '@/components/ErrorState';
import { friendlyErrorMessage, clasificarError } from '@/utils/errorMessages';
import { cerrarSesionYRedirigir } from '@/utils/session';

// ── Períodos disponibles ─────────────────────────────────────────────────────
const PERIODOS: { key: PeriodoReporte; label: string }[] = [
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
  { key: 'aldia', label: 'Al día' },
];

// ── Color de pill según posición en ranking ──────────────────────────────────
const getPillStyle = (index: number) => {
  // Rojo para posiciones 1, 4 (0, 3) — amarillo para 2, 3 (1, 2)
  const esRojo = index % 3 === 0 || index === 3;
  return {
    bg: esRojo ? COLORS.cargoBg : COLORS.abonoBg,
    text: esRojo ? COLORS.cargoIcon : COLORS.abonoIcon,
  };
};

// ── Título del resumen según período ────────────────────────────────────────
const tituloResumen: Record<PeriodoReporte, string> = {
  semana: 'Resumen semanal',
  mes: 'Resumen mensual',
  aldia: 'Resumen al día',
};

// ── Pantalla ─────────────────────────────────────────────────────────────────
export default function ReportesScreen() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('token').then((t) => setToken(t));
    }, [])
  );

  const {
    reporte,
    loading,
    error,
    periodo,
    cambiarPeriodo,
    formatCOP,
    refetch,
  } = useReportes(token);

  // Datos derivados
  const creditosOtorgados = reporte?.creditos.reduce((s, c) => s + c.cantidad, 0) ?? 0;
  const montoOtorgado = reporte?.creditos.reduce((s, c) => s + c.monto_total, 0) ?? 0;

  const buildResumenTexto = () => {
    if (!reporte) return '';
    const totalCartera = reporte.creditos.reduce((s, c) => s + c.monto_total, 0);
    return (
      `*Reporte FiadoCheck — ${reporte.fecha_inicio} / ${reporte.fecha_fin}*\n\n` +
      `Total cartera: ${formatCOP(totalCartera)}\n` +
      `Pagos recibidos: ${formatCOP(reporte.pagos.total)}\n` +
      `En mora: ${formatCOP(reporte.mora.monto)}\n` +
      `Nuevos en mora: ${reporte.mora.clientes_nuevos_en_mora} clientes\n` +
      `Clientes activos: ${reporte.clientes_activos}\n` +
      `Tasa de recuperación: ${reporte.tasa_recuperacion}%`
    );
  };

  // ── Exportar informe (HTML en backend, compartir resumen en mobile) ───────
  const handleExportar = async () => {
    if (!token || !reporte) return;
    try {
      const res = await fetch(`${CONFIG.API_URL}/reportes/export/pdf?periodo=${periodo}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'No se pudo generar el informe');
      }
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        throw new Error('Formato de informe no soportado');
      }
      await Share.share({ message: buildResumenTexto(), title: 'Reporte FiadoCheck' });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo exportar el informe');
    }
  };

  // ── Compartir por WhatsApp ────────────────────────────────────────────────
  const handleWhatsapp = async () => {
    if (!reporte) return;
    try {
      await Share.share({ message: buildResumenTexto() });
    } catch {
      Alert.alert('Error', 'No se pudo compartir el reporte');
    }
  };

  // ── Carga / error ─────────────────────────────────────────────────────────
  if (token === null || loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={COLORS.white} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState
          message={friendlyErrorMessage(error)}
          primaryAction={
            clasificarError(error) === 'sesion'
              ? { label: 'Iniciar sesión', onPress: cerrarSesionYRedirigir }
              : { label: 'Reintentar', onPress: refetch }
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <HeaderIconButton
            icon={ChevronLeft}
            label="Volver"
            onPress={() => router.back()}
            style={styles.backBtn}
          />
          <Text style={styles.headerTitle}>Reportes</Text>
          <HeaderIconButton
            icon={Bell}
            label="Avisos"
            onPress={() => router.push('/notificaciones' as any)}
            color={COLORS.primary}
            iconSize={18}
            style={styles.bellBtn}
          />
        </View>

        {/* ── Pills de período ─────────────────────────────────────────────── */}
        <View style={styles.periodRow}>
          {PERIODOS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodBtn, periodo === p.key && styles.periodBtnActive]}
              onPress={() => cambiarPeriodo(p.key)}>
              <Text style={[styles.periodText, periodo === p.key && styles.periodTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Card blanca ──────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

            {/* ── Resumen ──────────────────────────────────────────────────── */}
            <View style={styles.resumenCard}>
              <Text style={styles.resumenTitulo}>{tituloResumen[periodo]}</Text>

              {/* Créditos Otorgados */}
              <View style={styles.resumenFila}>
                <Text style={styles.resumenLabel}>Créditos Otorgados</Text>
                <Text style={styles.resumenValorVerde}>
                  {creditosOtorgados} - {formatCOP(montoOtorgado)}
                </Text>
              </View>

              {/* Pagos recibidos */}
              <View style={styles.resumenFila}>
                <Text style={styles.resumenLabel}>Pagos recibidos</Text>
                <Text style={styles.resumenValorVerde}>
                  {formatCOP(reporte?.pagos.total ?? 0)}
                </Text>
              </View>

              {/* Nuevos en mora */}
              <View style={styles.resumenFila}>
                <Text style={styles.resumenLabel}>Nuevos en mora</Text>
                <Text style={styles.resumenValorRojo}>
                  {reporte?.mora.clientes_nuevos_en_mora ?? 0} clientes
                </Text>
              </View>

              {/* Tasa de recuperación */}
              <View style={styles.resumenFila}>
                <Text style={styles.resumenLabel}>Tasa de recuperación</Text>
                <Text style={styles.resumenValorVerde}>
                  {reporte?.tasa_recuperacion ?? 0}%
                </Text>
              </View>

              {/* Clientes activos */}
              <View style={[styles.resumenFila, styles.resumenFilaUltima]}>
                <Text style={styles.resumenLabel}>Clientes activos</Text>
                <Text style={styles.resumenValorNegro}>{reporte?.clientes_activos ?? 0}</Text>
              </View>
            </View>

            {/* ── Top deudores ─────────────────────────────────────────────── */}
            {(reporte?.top_deudores.length ?? 0) > 0 && (
              <View style={styles.deudoresCard}>
                <Text style={styles.deudoresTitulo}>Top deudores</Text>
                {reporte!.top_deudores.map((d, idx) => {
                  const pill = getPillStyle(idx);
                  return (
                    <View key={d.id_cliente} style={styles.deudorFila}>
                      <Text style={styles.deudorNombre}>{d.nombre}</Text>
                      <View style={[styles.deudorPill, { backgroundColor: pill.bg }]}>
                        <Text style={[styles.deudorPillText, { color: pill.text }]}>
                          {formatCOP(d.total_deuda)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── Botón Exportar informe ──────────────────────────────────────── */}
            <TouchableOpacity style={styles.btnExport} onPress={handleExportar} activeOpacity={0.85}>
              <Text style={styles.btnExportText}>Exportar informe</Text>
            </TouchableOpacity>

            {/* ── Botón Compartir WhatsApp ─────────────────────────────────── */}
            <TouchableOpacity style={styles.btnWhatsapp} onPress={handleWhatsapp} activeOpacity={0.85}>
              <Text style={styles.btnWhatsappText}>Compartir Por Whatsapp</Text>
            </TouchableOpacity>

          </ScrollView>
        </View>
      </SafeAreaView>
    </>
  );
}
