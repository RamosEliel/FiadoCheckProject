import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  AlertTriangle,
  Bot,
  CalendarDays,
  Clock,
  Sparkles,
  Users,
} from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { AppFonts } from '@/constants/theme';
import { hapticLight } from './haptic';

type Props = {
  opciones: string[];
  onSelect: (opcion: string) => void;
  disabled?: boolean;
};

const iconForPrompt = (opcion: string) => {
  const value = opcion.toLowerCase();
  if (value.includes('debe')) return Users;
  if (value.includes('mora')) return AlertTriangle;
  if (value.includes('resumen')) return CalendarDays;
  if (value.includes('vencid')) return Clock;
  return Sparkles;
};

export function WelcomeState({ opciones, onSelect, disabled }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.heroIcon}>
        <Bot size={36} color={COLORS.white} strokeWidth={2} />
      </View>
      <Text style={styles.title}>¿Qué quieres saber de tu cartera?</Text>
      <Text style={styles.subtitle}>
        Pregunta por mora, vencidos, quién te debe más o el resumen del día.
      </Text>

      <View style={styles.grid}>
        {opciones.map((opcion) => {
          const Icon = iconForPrompt(opcion);
          return (
            <TouchableOpacity
              key={opcion}
              style={[styles.card, disabled && styles.cardDisabled]}
              onPress={() => {
                if (disabled) return;
                hapticLight();
                onSelect(opcion);
              }}
              activeOpacity={0.8}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={`Sugerencia: ${opcion}`}
            >
              <View style={styles.cardIcon}>
                <Icon size={18} color={COLORS.primary} strokeWidth={2.2} />
              </View>
              <Text style={styles.cardText}>{opcion}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    color: COLORS.text,
    fontFamily: AppFonts.bold,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textMuted,
    fontFamily: AppFonts.regular,
    textAlign: 'center',
    paddingHorizontal: 12,
    marginBottom: 22,
  },
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  card: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E4EEE9',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    minHeight: 96,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F8F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.text,
    fontFamily: AppFonts.semiBold,
  },
});
