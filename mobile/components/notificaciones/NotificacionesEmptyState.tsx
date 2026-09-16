import { ComponentType } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '@/constants/colors';
import type { NotificacionesStyles } from '@/constants/notificaciones.styles';

type IconComponent = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

type Props = {
  icon: IconComponent;
  title: string;
  message: string;
  styles: NotificacionesStyles;
  /** Color de acento del icono. Por defecto el verde de marca. */
  accent?: string;
  /** Fondo suave del círculo del icono. */
  accentSoft?: string;
  action?: { label: string; onPress: () => void };
};

export function NotificacionesEmptyState({
  icon: Icon,
  title,
  message,
  styles,
  accent = COLORS.primary,
  accentSoft = COLORS.bg,
  action,
}: Props) {
  return (
    <View style={styles.stateWrap}>
      <View style={[styles.stateIconWrap, { backgroundColor: accentSoft }]}>
        <View style={[styles.stateIconInner, { backgroundColor: accent }]}>
          <Icon size={30} color={COLORS.white} strokeWidth={2.2} />
        </View>
      </View>

      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateMessage}>{message}</Text>

      {action && (
        <TouchableOpacity
          style={styles.stateAction}
          onPress={action.onPress}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <Text style={styles.stateActionText}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
