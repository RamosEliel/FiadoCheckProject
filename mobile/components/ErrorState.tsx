import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';

type ErrorAction = {
  label: string;
  onPress: () => void;
};

type ErrorStateProps = {
  message: string;
  /** 'light' = sobre fondo verde primario, 'dark' = sobre fondo blanco */
  tone?: 'light' | 'dark';
  primaryAction?: ErrorAction;
  secondaryAction?: ErrorAction;
};

export function ErrorState({ message, tone = 'light', primaryAction, secondaryAction }: ErrorStateProps) {
  const textColor = tone === 'light' ? COLORS.white : COLORS.text;
  const iconCircleBg = tone === 'light' ? 'rgba(255,255,255,0.18)' : COLORS.bg;
  const iconColor = tone === 'light' ? COLORS.white : COLORS.primary;
  const primaryBg = tone === 'light' ? COLORS.white : COLORS.primary;
  const primaryTextColor = tone === 'light' ? COLORS.primary : COLORS.white;

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: iconCircleBg }]}>
        <AlertCircle size={32} color={iconColor} />
      </View>
      <Text style={[styles.message, { color: textColor }]}>{message}</Text>
      {primaryAction && (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: primaryBg }]}
          onPress={primaryAction.onPress}
          activeOpacity={0.85}
        >
          <Text style={[styles.btnText, { color: primaryTextColor }]}>{primaryAction.label}</Text>
        </TouchableOpacity>
      )}
      {secondaryAction && (
        <TouchableOpacity style={styles.secondaryBtn} onPress={secondaryAction.onPress} activeOpacity={0.7}>
          <Text style={[styles.secondaryText, { color: textColor }]}>{secondaryAction.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  btn: {
    width: '100%',
    borderRadius: 50,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    marginTop: 14,
    paddingVertical: 12,
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
