import { StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';

export const registerPaymentStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },

  // ── Header ──────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.primary,
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  bellBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 50,
  },

  // ── Body ────────────────────────────────────────────────
  body: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  bodyContent: {
    padding: 20,
    gap: 14,
    paddingBottom: 8,
  },

  // ── Cards ───────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },

  // ── Search ──────────────────────────────────────────────
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  searchBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  searchBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Client row ──────────────────────────────────────────
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 16,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  clientCredit: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Stats ───────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: COLORS.border ?? '#E8EDF0',
    marginVertical: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  statItem: {
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  dangerText: {
    color: '#E53935',
  },

  // ── Credit picker ───────────────────────────────────────
  creditList: {
    gap: 8,
  },
  creditOption: {
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 6,
  },
  creditOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0,196,140,0.08)',
  },
  creditOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  creditOptionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  creditOptionMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  creditOptionSaldo: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  pickerHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
  },

  // ── Amount ──────────────────────────────────────────────
  amountInput: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  quickChip: {
    backgroundColor: COLORS.bg,
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  quickChipActive: {
    backgroundColor: COLORS.primary,
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  quickChipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  obsInput: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },

  // ── Footer ──────────────────────────────────────────────
  footer: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 10,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: 50,
    paddingVertical: 17,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnPrimaryText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  btnGhost: {
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border ?? '#E8EDF0',
  },
  btnGhostText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
});