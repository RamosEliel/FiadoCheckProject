import { Text, TouchableOpacity, View } from 'react-native';
import { CalendarClock, ChevronRight, Info, OctagonAlert } from 'lucide-react-native';
import type { AlertaVista } from '@/hooks/useNotificaciones';
import type { NotificacionesStyles, NotificacionesTheme } from '@/constants/notificaciones.styles';

const TIPO_ICON = {
  critica: OctagonAlert,
  proxima: CalendarClock,
  informativa: Info,
} as const;

const TIPO_LABEL = {
  critica: 'Crítica',
  proxima: 'Próxima',
  informativa: 'Informativa',
} as const;

type Props = {
  alerta: AlertaVista;
  styles: NotificacionesStyles;
  theme: NotificacionesTheme;
  onPress: (alerta: AlertaVista) => void;
};

export function NotificacionCard({ alerta, styles, theme, onPress }: Props) {
  const tone = theme.severity[alerta.tipo];
  const Icon = TIPO_ICON[alerta.tipo];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(alerta)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Alerta ${TIPO_LABEL[alerta.tipo]} de ${alerta.nombre_cliente}`}
      accessibilityHint={`${alerta.detalle}. Saldo pendiente ${alerta.saldoFormateado}. Abre el perfil del cliente.`}
    >
      <View style={[styles.cardStripe, { backgroundColor: tone.accent }]} />

      <View style={styles.cardInner}>
        <View style={[styles.iconChip, { backgroundColor: tone.soft }]}>
          <Icon size={21} color={tone.ink} strokeWidth={2.2} />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardCliente} numberOfLines={1}>
              {alerta.nombre_cliente}
            </Text>
            <View style={[styles.cardBadge, { backgroundColor: tone.soft }]}>
              <Text style={[styles.cardBadgeText, { color: tone.ink }]}>
                {TIPO_LABEL[alerta.tipo]}
              </Text>
            </View>
          </View>

          <Text style={[styles.cardDetalle, { color: alerta.enMora ? tone.ink : theme.textMuted }]}>
            {alerta.detalle}
          </Text>

          <View style={styles.cardFooter}>
            <Text style={styles.cardMonto}>Saldo {alerta.saldoFormateado}</Text>
            {!!alerta.tiempo && (
              <>
                <View style={styles.cardMetaDot} />
                <Text style={styles.cardTiempo}>{alerta.tiempo}</Text>
              </>
            )}
            {!alerta.leida && (
              <View style={[styles.cardUnreadDot, { backgroundColor: tone.accent }]} />
            )}
          </View>
        </View>

        <View style={styles.cardChevron}>
          <ChevronRight size={18} color={theme.textMuted} />
        </View>
      </View>
    </TouchableOpacity>
  );
}
