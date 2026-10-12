import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Check, MapPin, Receipt, Store } from 'lucide-react-native';
import { tiendasAsociadasStyles as styles } from '@/constants/Tiendas_asociadas.styles';
import { COLORS } from '@/constants/colors';
import type { TiendaConDeuda } from '@/hooks/Usetiendasasociadas';

type Props = {
  tiendas: TiendaConDeuda[];
  loading: boolean;
  tiendaSeleccionada: TiendaConDeuda | null;
  onSelect: (tienda: TiendaConDeuda) => void;
  onContinue: () => void;
  continueLabel: string;
  formatCOP: (valor: number) => string;
};

const AVATAR_COLORS = ['#00C48C', '#2F80ED', '#FF9800', '#7E57C2', '#00897B', '#E53935'];

const avatarColor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export function TiendasDeudaPicker({
  tiendas,
  loading,
  tiendaSeleccionada,
  onSelect,
  onContinue,
  continueLabel,
  formatCOP,
}: Props) {
  const hint =
    tiendas.length > 1
      ? `${tiendas.length} cuentas abiertas`
      : tiendas.length === 1
        ? '1 cuenta abierta'
        : 'Sin deuda activa';

  const cta =
    tiendaSeleccionada
      ? `${continueLabel} · ${tiendaSeleccionada.nombre}`
      : continueLabel;

  return (
    <View style={styles.sheet}>
      <View style={styles.sheetTop}>
        <Text style={styles.eyebrow}>Elige tu tienda</Text>
        <View style={styles.countPill}>
          <Store size={13} color={COLORS.primary} strokeWidth={2.4} />
          <Text style={styles.countPillText}>{hint}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 40 }} />
      ) : tiendas.length === 0 ? (
        <Text style={styles.emptyText}>
          No tienes deuda activa en ninguna tienda asociada.
        </Text>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {tiendas.map((tienda) => {
            const selected = tiendaSeleccionada?.id === tienda.id;
            const accent = avatarColor(tienda.id);
            const creditos = tienda.creditosActivos;
            return (
              <TouchableOpacity
                key={tienda.id}
                style={[styles.storeCard, selected && styles.storeCardSelected]}
                onPress={() => onSelect(tienda)}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${tienda.nombre}, deuda ${formatCOP(tienda.totalDeuda)}`}
              >
                <View style={[styles.accent, { backgroundColor: selected ? COLORS.primary : accent }]} />
                <View style={styles.storeCardInner}>
                  <View style={styles.storeTop}>
                    <View style={[styles.iconWrap, { backgroundColor: `${accent}22` }]}>
                      <Store size={26} color={accent} strokeWidth={2.2} />
                      {selected ? (
                        <View style={styles.checkBadge}>
                          <Check size={12} color={COLORS.white} strokeWidth={3} />
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.storeInfo}>
                      <Text style={styles.storeName} numberOfLines={2}>
                        {tienda.nombre}
                      </Text>
                      {tienda.tendero ? (
                        <Text style={styles.storeTendero} numberOfLines={1}>
                          {tienda.tendero}
                        </Text>
                      ) : null}
                    </View>
                    <View style={[styles.radio, selected && styles.radioOn]}>
                      {selected ? <Check size={14} color={COLORS.white} strokeWidth={3} /> : null}
                    </View>
                  </View>

                  {(tienda.direccion || tienda.tendero) ? (
                    <View style={styles.metaRow}>
                      <MapPin size={14} color={COLORS.textMuted} />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {tienda.direccion || 'Sin dirección'}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.footerRow}>
                    <View>
                      <Text style={styles.amountLabel}>Por pagar</Text>
                      <Text style={[styles.storeAmount, selected && styles.storeAmountOn]}>
                        {formatCOP(tienda.totalDeuda)}
                      </Text>
                    </View>
                    {creditos > 0 ? (
                      <View style={styles.creditsChip}>
                        <Receipt size={13} color={COLORS.primary} />
                        <Text style={styles.creditsChipText}>
                          {creditos} {creditos === 1 ? 'crédito' : 'créditos'}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <TouchableOpacity
        style={[styles.btnPrimary, !tiendaSeleccionada && styles.btnDisabled]}
        onPress={onContinue}
        disabled={!tiendaSeleccionada}
        activeOpacity={0.85}
      >
        <Text style={styles.btnPrimaryText} numberOfLines={1}>
          {cta}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
