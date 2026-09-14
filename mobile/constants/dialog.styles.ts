import { StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';
import { AppFonts } from '@/constants/theme';

export const dialogStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconSuccess: {
    backgroundColor: '#E8F8F0',
  },
  iconError: {
    backgroundColor: '#FFEBEE',
  },
  iconInfo: {
    backgroundColor: '#E8F4FC',
  },
  title: {
    fontSize: 20,
    fontFamily: AppFonts.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontFamily: AppFonts.regular,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: 'center',
    minWidth: 140,
  },
  primaryBtnText: {
    color: COLORS.white,
    fontFamily: AppFonts.bold,
    fontSize: 16,
  },
});
