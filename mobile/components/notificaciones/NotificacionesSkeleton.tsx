import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import type { NotificacionesStyles } from '@/constants/notificaciones.styles';

type Props = {
  styles: NotificacionesStyles;
  /** Cantidad de tarjetas fantasma a mostrar mientras carga. */
  count?: number;
};

export function NotificacionesSkeleton({ styles, count = 4 }: Props) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <View accessibilityLabel="Cargando notificaciones" accessibilityRole="progressbar">
      {Array.from({ length: count }).map((_, index) => (
        <Animated.View key={index} style={[styles.skeletonCard, { opacity: pulse }]}>
          <View style={styles.skeletonChip} />
          <View style={styles.skeletonLines}>
            <View style={[styles.skeletonLine, styles.skeletonLineMedium]} />
            <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
            <View style={styles.skeletonLine} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}
