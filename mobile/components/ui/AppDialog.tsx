import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { CircleAlert, CircleCheck, Info } from 'lucide-react-native';
import { dialogStyles as styles } from '@/constants/dialog.styles';
import { COLORS } from '@/constants/colors';
import type { AppDialogVariant } from '@/hooks/useAppDialog';

type Props = {
  visible: boolean;
  variant?: AppDialogVariant;
  title: string;
  message: string;
  buttonLabel?: string;
  onClose: () => void;
};

const VARIANT_UI = {
  success: { Icon: CircleCheck, color: COLORS.primary, iconWrap: styles.iconSuccess },
  error: { Icon: CircleAlert, color: COLORS.cargoIcon, iconWrap: styles.iconError },
  info: { Icon: Info, color: COLORS.primary, iconWrap: styles.iconInfo },
} as const;

export function AppDialog({
  visible,
  variant = 'info',
  title,
  message,
  buttonLabel = 'Entendido',
  onClose,
}: Props) {
  const { Icon, color, iconWrap } = VARIANT_UI[variant];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={[styles.iconWrap, iconWrap]}>
            <Icon size={28} color={color} strokeWidth={2.2} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>{buttonLabel}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
