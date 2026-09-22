import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Send } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { AppFonts } from '@/constants/theme';
import { hapticLight } from './haptic';

type Props = {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  loading: boolean;
  placeholder: string;
  /** Padding bajo el pill. Con teclado abierto debe ser chico (8–12), no el inset de home. */
  bottomInset: number;
};

export function ChatComposer({
  value,
  onChange,
  onSend,
  loading,
  placeholder,
  bottomInset,
}: Props) {
  const disabled = !value.trim() || loading;

  const handleSend = () => {
    if (disabled) return;
    hapticLight();
    onSend();
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: bottomInset }]}>
      <View style={styles.pill}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          value={value}
          onChangeText={onChange}
          multiline
          textAlignVertical="top"
          maxLength={2000}
          editable={!loading}
          accessibilityLabel="Escribe tu pregunta al asistente"
        />
        <TouchableOpacity
          style={[styles.sendBtn, disabled && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={disabled}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensaje"
        >
          <Send size={18} color={COLORS.white} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.bg,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.white,
    borderRadius: 28,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E4EEE9',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    fontFamily: AppFonts.regular,
    maxHeight: 110,
    paddingVertical: 8,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.38,
  },
});
