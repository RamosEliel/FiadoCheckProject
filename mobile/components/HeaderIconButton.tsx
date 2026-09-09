import { ComponentType } from 'react';
import { TouchableOpacity, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';

type IconComponent = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

type HeaderIconButtonProps = {
  icon: IconComponent;
  label: string;
  onPress: () => void;
  color?: string;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
};

export function HeaderIconButton({
  icon: Icon,
  label,
  onPress,
  color = '#FFFFFF',
  iconSize = 20,
  style,
}: HeaderIconButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon size={iconSize} color={color} />
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
});
