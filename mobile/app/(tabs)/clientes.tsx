import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { Stack, useFocusEffect, router } from 'expo-router';
import { clientStyles as styles } from '@/constants/Clients.styles';
import { COLORS } from '@/constants/colors';
import { useClients, Cliente } from '@/hooks/Useclients';
import { useClienteAcciones } from '@/hooks/Useclienteacciones';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Search, Bell, BadgeCheck, UserPlus, Link2, X } from 'lucide-react-native';
import { HeaderIconButton } from '@/components/HeaderIconButton';

const FILTROS = [
  { key: 'todos',     label: 'Todos'     },
  { key: 'mora',      label: 'En Mora'   },
  { key: 'al_dia',    label: 'Al Día'    },
  { key: 'sin_deuda', label: 'Sin Deuda' },
];

const getBadgeStyle = (estado: string, styles: any) => {
  switch (estado) {
    case 'al_dia':  return { badge: styles.badgeAlDia,   text: styles.badgeAlDiaText,   label: 'Al Día'    };
    case 'mora':    return { badge: styles.badgeMora,    text: styles.badgeMoraText,    label: 'Mora'      };
    case 'proximo': return { badge: styles.badgeProximo, text: styles.badgeProximoText, label: 'Próximo'   };
    default:        return { badge: styles.badgeAlDia,   text: styles.badgeAlDiaText,   label: 'Sin Deuda' };
  }
};

const getSubtituloStyle = (tipo: string) => {
  switch (tipo) {
    case 'mora':    return styles.clientSubMora;
    case 'proximo': return styles.clientSubProximo;
    default:        return {};
  }
};

const ClienteItem = ({ item, onPress }: { item: Cliente; onPress: () => void }) => {
  const badge = getBadgeStyle(item.estado, styles);
  return (
    <TouchableOpacity style={styles.clientCard} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.avatar, { backgroundColor: item.bgColor }]}>
        <Text style={styles.avatarText}>{item.initials}</Text>
      </View>
      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{item.nombre_completo}</Text>
        <Text style={[styles.clientSub, getSubtituloStyle(item.subtituloTipo)]}>
          {item.subtitulo}
        </Text>
      </View>
      <View style={styles.activityDividerVertical} />
      <View style={styles.amountCol}>
        <Text style={styles.clientAmount}>{item.monto}</Text>
        <View style={[styles.badge, badge.badge]}>
          <Text style={[styles.badgeText, badge.text]}>{badge.label}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function ClientsScreen() {
  const [token, setToken] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('token').then(setToken);
    }, []),
  );

  const {
    clientes, busqueda, setBusqueda, filtroActivo,
    loading, total, handleFiltro, handleClientePress, refetch,
  } = useClients(token);

  const {
    modalPaso,
    abrirModal,
    cerrarModal,
    irARegistrar,
    irAAsociar,
    volverEleccion,
    registerForm,
    setRegisterForm,
    cedulaBusqueda,
    setCedulaBusqueda,
    clienteEncontrado,
    buscando,
    guardando,
    buscarParaAsociar,
    asociarCliente,
    registrarCliente,
  } = useClienteAcciones(token, refetch);

  return (
    <>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

        <View style={styles.header}>
          <View style={{ width: 48 }} />
          <Text style={styles.headerTitle}>Clientes</Text>
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
          <BadgeCheck size={16} color={COLORS.white} />
          <Text style={styles.subHeaderText}> {total} Clientes Registrados</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar Cliente..."
              placeholderTextColor={COLORS.textMuted}
              value={busqueda}
              onChangeText={setBusqueda}
            />
          </View>

          <View style={styles.filtersRow}>
            {FILTROS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterBtn, filtroActivo === f.key && styles.filterBtnActive]}
                onPress={() => handleFiltro(f.key as any)}
              >
                <Text style={[styles.filterText, filtroActivo === f.key && styles.filterTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading
            ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
            : (
              <FlatList
                data={clientes}
                keyExtractor={item => item.id_cliente}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <ClienteItem
                    item={item}
                    onPress={() => handleClientePress(item.id_cliente)}
                  />
                )}
                ListEmptyComponent={
                  <Text style={{ textAlign: 'center', color: COLORS.textMuted, marginTop: 40 }}>
                    No se encontraron clientes
                  </Text>
                }
              />
            )
          }

          <TouchableOpacity style={styles.btnRegistrar} onPress={abrirModal} activeOpacity={0.85}>
            <Text style={styles.btnRegistrarText}>+ Registrar Nuevo Cliente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <Modal
        visible={modalPaso !== 'cerrado'}
        transparent
        animationType="slide"
        onRequestClose={cerrarModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={cerrarModal} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            {modalPaso === 'eleccion' && (
              <>
                <Text style={styles.modalTitle}>Agregar cliente</Text>
                <Text style={styles.modalSubtitle}>
                  Elige si quieres registrar uno nuevo o vincular un cliente que ya existe en FiadoCheck.
                </Text>

                <TouchableOpacity style={styles.modalOption} onPress={irARegistrar} activeOpacity={0.8}>
                  <View style={styles.modalOptionIcon}>
                    <UserPlus size={22} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalOptionTitle}>Registrar nuevo</Text>
                    <Text style={styles.modalOptionDesc}>
                      Crea un cliente en tu cartera con cédula, nombre y teléfono.
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalOption} onPress={irAAsociar} activeOpacity={0.8}>
                  <View style={styles.modalOptionIcon}>
                    <Link2 size={22} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalOptionTitle}>Asociar existente</Text>
                    <Text style={styles.modalOptionDesc}>
                      Vincula a tu tienda un cliente ya registrado, sin crear un crédito.
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalBtnGhost} onPress={cerrarModal}>
                  <Text style={styles.modalBtnGhostText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            )}

            {modalPaso === 'registrar' && (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <TouchableOpacity style={styles.modalBackBtn} onPress={volverEleccion}>
                  <Text style={styles.modalBackText}>← Volver</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Registrar nuevo cliente</Text>
                <Text style={styles.modalSubtitle}>
                  Se agregará a tu cartera. Podrás fiarle más adelante.
                </Text>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Nombre completo</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={registerForm.nombre}
                    onChangeText={(t) => setRegisterForm({ ...registerForm, nombre: t })}
                    placeholder="Ej. Juan Pérez"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Cédula</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={registerForm.identificacion}
                    onChangeText={(t) => setRegisterForm({ ...registerForm, identificacion: t.replace(/[^0-9]/g, '') })}
                    placeholder="Número de cédula"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="number-pad"
                    maxLength={12}
                  />
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Teléfono</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={registerForm.telefono}
                    onChangeText={(t) => setRegisterForm({ ...registerForm, telefono: t.replace(/[^0-9]/g, '') })}
                    placeholder="7 a 10 dígitos"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>

                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>Dirección (opcional)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={registerForm.direccion}
                    onChangeText={(t) => setRegisterForm({ ...registerForm, direccion: t })}
                    placeholder="Barrio, calle..."
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.modalBtnPrimary, guardando && { opacity: 0.6 }]}
                  onPress={registrarCliente}
                  disabled={guardando}
                >
                  <Text style={styles.modalBtnPrimaryText}>
                    {guardando ? 'Guardando...' : 'Registrar y agregar'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {modalPaso === 'asociar' && (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <TouchableOpacity style={styles.modalBackBtn} onPress={volverEleccion}>
                  <Text style={styles.modalBackText}>← Volver</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Asociar cliente existente</Text>
                <Text style={styles.modalSubtitle}>
                  Busca por cédula un cliente registrado en la app para vincularlo a tu tienda.
                </Text>

                <View style={styles.modalSearchRow}>
                  <TextInput
                    style={styles.modalSearchInput}
                    value={cedulaBusqueda}
                    onChangeText={setCedulaBusqueda}
                    placeholder="Número de cédula"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="number-pad"
                    maxLength={12}
                    returnKeyType="search"
                    onSubmitEditing={buscarParaAsociar}
                  />
                  <TouchableOpacity
                    style={styles.modalSearchBtn}
                    onPress={buscarParaAsociar}
                    disabled={buscando}
                  >
                    {buscando
                      ? <ActivityIndicator size="small" color={COLORS.white} />
                      : (
                        <>
                          <Search size={16} color={COLORS.white} />
                          <Text style={styles.modalSearchBtnText}>Buscar</Text>
                        </>
                      )}
                  </TouchableOpacity>
                </View>

                {clienteEncontrado && (
                  <View style={styles.modalPreview}>
                    <Text style={styles.modalPreviewName}>{clienteEncontrado.nombre_completo}</Text>
                    <Text style={styles.modalPreviewMeta}>Cédula: {clienteEncontrado.id_cliente}</Text>
                    {clienteEncontrado.telefono
                      ? <Text style={styles.modalPreviewMeta}>Tel: {clienteEncontrado.telefono}</Text>
                      : null}
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.modalBtnPrimary,
                    (!clienteEncontrado || guardando) && { opacity: 0.5 },
                  ]}
                  onPress={asociarCliente}
                  disabled={!clienteEncontrado || guardando}
                >
                  <Text style={styles.modalBtnPrimaryText}>
                    {guardando ? 'Asociando...' : 'Asociar a mi tienda'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            <TouchableOpacity
              style={{ position: 'absolute', top: 16, right: 20, padding: 4 }}
              onPress={cerrarModal}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <X size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
