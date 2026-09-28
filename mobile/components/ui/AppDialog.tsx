import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CircleAlert, CircleCheck, Info } from 'lucide-react-native';
import { dialogStyles as styles } from '@/constants/dialog.styles';
import { COLORS } from '@/constants/colors';
import type { AppDialogVariant } from '@/hooks/useAppDialog';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';

type Props = {
  visible: boolean;
  variant?: AppDialogVariant;
  title: string;
  message?: string;
  buttonLabel?: string;
  onClose: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  children?: ReactNode;
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
  secondaryLabel,
  onSecondary,
  children,
}: Props) {
  const { Icon, color, iconWrap } = VARIANT_UI[variant];
  const keyboardHeight = useKeyboardHeight();
  const hasInputs = !!children;
  const dismiss = onSecondary ?? onClose;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={[
            styles.overlay,
            hasInputs && Platform.OS === 'android' ? { paddingBottom: keyboardHeight } : null,
          ]}
          onPress={dismiss}
        >
          <Pressable style={styles.card} onPress={() => {}}>
            {!children ? (
              <View style={[styles.iconWrap, iconWrap]}>
                <Icon size={28} color={color} strokeWidth={2.2} />
              </View>
            ) : null}
            <Text style={styles.title}>{title}</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}
            {children ? <View style={styles.childrenWrap}>{children}</View> : null}
            {secondaryLabel && onSecondary ? (
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={onSecondary} activeOpacity={0.85}>
                  <Text style={styles.secondaryBtnText}>{secondaryLabel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, styles.primaryBtnFlex]}
                  onPress={onClose}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryBtnText}>{buttonLabel}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.primaryBtn} onPress={onClose} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>{buttonLabel}</Text>
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
