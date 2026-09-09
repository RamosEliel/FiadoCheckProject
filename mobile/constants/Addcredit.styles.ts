import { StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';

export const addCreditStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  backBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 22,
    color: COLORS.white,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  bellBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },

  // Card
  card: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 28,
  },

  // Inputs
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingRight: 12,
  },
  inputFlex: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text,
  },
  calendarBtn: {
    padding: 6,
  },

  // Observaciones
  textArea: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 100,
    textAlignVertical: 'top',
  },
  textAreaPlaceholder: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },

  // Scoring IA
  scoringCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  scoringCardBorder: {
    borderLeftWidth: 5,
    borderLeftColor: COLORS.primary,
  },
  scoringHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  scoringTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  scoreVisualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  scoreCircleWrap: {
    alignItems: 'center',
  },
  scoreCircleHint: {
    marginTop: 6,
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 90,
  },
  scoreCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  scoreCircleText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  scoreCircleLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: -2,
  },
  scoreInfoColumn: {
    flex: 1,
    gap: 6,
  },
  badgeRiesgo: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
  },
  badgeRiesgoText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize' as const,
  },
  limiteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  limiteLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  limiteValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  miniStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  miniStatCard: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  miniStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  miniStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  iaEmptyState: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  iaEmptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 10,
    marginBottom: 4,
  },
  iaEmptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  scoringText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
  },
  scoringBold: {
    fontWeight: '700',
  },

  // Botones
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  btnCancelar: {
    flex: 1,
    borderRadius: 50,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  btnCancelarText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  btnGuardar: {
    flex: 1,
    borderRadius: 50,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  btnGuardarText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.7,
  },
});