import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Bot } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { AppFonts } from '@/constants/theme';

function Dot({ delay }: { delay: number }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-5, { duration: 280, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 280, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

export function TypingIndicator() {
  const [phase, setPhase] = useState<'idle' | 'cartera' | 'procesando'>('idle');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('cartera'), 3000);
    const t2 = setTimeout(() => setPhase('procesando'), 10000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const label =
    phase === 'procesando'
      ? 'Sigue procesando…'
      : phase === 'cartera'
        ? 'Consultando tu cartera…'
        : '';

  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={label || 'El asistente está escribiendo'}
    >
      <View style={styles.avatar}>
        <Bot size={18} color={COLORS.white} strokeWidth={2.2} />
      </View>
      <View style={styles.bubble}>
        <View style={styles.dots}>
          <Dot delay={0} />
          <Dot delay={140} />
          <Dot delay={280} />
        </View>
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    maxWidth: '88%',
    marginTop: 4,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E4EEE9',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    minWidth: 72,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 16,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  label: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: AppFonts.regular,
  },
});
