import { StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';

export const asistenteIAStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  body: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
  },
  bodyInner: {
    flex: 1,
    overflow: 'hidden',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
  },
  chat: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    flexGrow: 1,
    gap: 12,
  },
});
