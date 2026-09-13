import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { COLORS } from '@/constants/colors';
import { AppFonts } from '@/constants/theme';
import { hapticLight } from './haptic';

type Props = {
  opciones: string[];
  onSelect: (opcion: string) => void;
  disabled?: boolean;
};

export function SuggestionChips({ opciones, onSelect, disabled }: Props) {
  if (!opciones.length) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        {opciones.map((opcion) => (
          <TouchableOpacity
            key={opcion}
            style={[styles.chip, disabled && styles.chipDisabled]}
            onPress={() => {
              if (disabled) return;
              hapticLight();
              onSelect(opcion);
            }}
            activeOpacity={0.7}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Sugerencia: ${opcion}`}
          >
            <Text style={styles.chipText}>{opcion}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingLeft: 44,
    marginVertical: 2,
  },
  row: {
    gap: 8,
    paddingRight: 16,
    paddingVertical: 2,
  },
  chip: {
    backgroundColor: COLORS.white,
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  chipDisabled: {
    opacity: 0.45,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.primary,
    fontFamily: AppFonts.semiBold,
  },
});
