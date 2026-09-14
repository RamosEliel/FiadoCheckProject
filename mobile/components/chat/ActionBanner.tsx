import { Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { CircleCheck } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { AppFonts } from '@/constants/theme';

type Props = {
  mensaje: string;
};

export function ActionBanner({ mensaje }: Props) {
  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutUp.duration(180)}
      style={styles.banner}
      accessibilityRole="alert"
      accessibilityLabel={mensaje}
    >
      <CircleCheck size={18} color={COLORS.primary} strokeWidth={2.4} />
      <Text style={styles.text}>{mensaje}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#CDEFE4',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  text: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontFamily: AppFonts.semiBold,
    lineHeight: 18,
  },
});
