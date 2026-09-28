import { StyleSheet } from 'react-native';
import { COLORS } from './colors';
import { AppFonts } from './theme';

export const profileStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAF9E8', // palette.surface
  },
  header: {
    backgroundColor: COLORS.primary,
    height: 180,
    borderBottomLeftRadius: 80,
    borderBottomRightRadius: 80,
    paddingTop: 50,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: AppFonts.bold,
    color: COLORS.white,
    textAlign: 'center',
    flex: 1,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileContent: {
    alignItems: 'center',
    marginTop: -80, // Subido para que la foto esté en la zona verde
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 5,
    borderColor: COLORS.white, // Borde blanco para resaltar sobre el verde
  },
  userName: {
    fontSize: 22,
    fontFamily: AppFonts.bold,
    color: COLORS.text,
    marginTop: 12,
  },
  userId: {
    fontSize: 14,
    fontFamily: AppFonts.regular,
    color: COLORS.textMuted,
    marginBottom: 30,
  },
  menuContainer: {
    width: '100%',
    paddingHorizontal: 30,
    gap: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  menuText: {
    fontSize: 16,
    fontFamily: AppFonts.semiBold,
    color: COLORS.text,
  },
  // --- Modal Styles ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: AppFonts.bold,
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: AppFonts.semiBold,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 24,
    width: '100%',
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
  },
  modalBtnConfirm: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  modalBtnTextCancel: {
    color: COLORS.primary,
    fontFamily: AppFonts.bold,
    fontSize: 16,
  },
  modalBtnTextConfirm: {
    color: COLORS.white,
    fontFamily: AppFonts.bold,
    fontSize: 16,
  },
  confirmText: {
    fontSize: 16,
    fontFamily: AppFonts.regular,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: COLORS.white,
    fontFamily: AppFonts.bold,
    fontSize: 16,
  }
});
