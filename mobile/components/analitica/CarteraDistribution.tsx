import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { analiticaStyles as styles } from '@/constants/Analitica.styles';
import { hapticLight } from '@/components/chat/haptic';
import type { DistribucionItem } from '@/hooks/Useanalitica';

type CarteraDistributionProps = {
  items: DistribucionItem[];
  formatMoneda: (valor: number) => string;
};

export function CarteraDistribution({ items, formatMoneda }: CarteraDistributionProps) {
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const sinSaldo = items.length === 0 || items.every((item) => (Number(item.monto) || 0) === 0);

  useEffect(() => {
    setSelectedLabel(null);
  }, [items]);

  const handleSelect = (label: string) => {
    hapticLight();
    setSelectedLabel((prev) => (prev === label ? null : label));
  };

  return (
    <View style={styles.distSection}>
      <Text style={styles.distTitle}>Distribucion De Cartera</Text>
      <Text style={styles.distSubtitle}>
        Saldo pendiente actual (no depende del mes)
      </Text>

      {sinSaldo ? (
        <Text style={styles.distEmptyText}>Sin saldo pendiente</Text>
      ) : (
        items.map((item) => (
          <Pressable
            key={item.label}
            onPress={() => handleSelect(item.label)}
            style={[
              styles.distRow,
              selectedLabel === item.label && styles.distSelected,
            ]}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: selectedLabel === item.label }}
          >
            <View style={[styles.distBadge, { backgroundColor: item.color }]}>
              <Text style={styles.distBadgeText}>{item.pct}%</Text>
            </View>
            <View style={styles.distTrack}>
              {item.pct > 0 ? (
                <View
                  style={[
                    styles.distFill,
                    { width: `${item.pct}%`, backgroundColor: item.color },
                  ]}
                />
              ) : null}
              <Text style={styles.distLabel}>
                {item.label} - {formatMoneda(item.monto)}
              </Text>
            </View>
          </Pressable>
        ))
      )}
    </View>
  );
}
