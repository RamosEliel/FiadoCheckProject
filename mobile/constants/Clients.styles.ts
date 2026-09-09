import { StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';

export const clientStyles = StyleSheet.create({
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
    paddingBottom: 4,
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
  bellIcon: {
    fontSize: 20,
    color: COLORS.white,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 16,
    gap: 6,
  },
  subHeaderText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '500',
  },

  // Card principal
  card: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },

  // Buscador
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 50,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 13,
    fontSize: 14,
    color: COLORS.text,
  },
  searchBtn: {
    backgroundColor: COLORS.text,
    paddingHorizontal: 18,
    paddingVertical: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIcon: {
    color: COLORS.white,
    fontSize: 16,
  },

  // Filtros
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  filterTextActive: {
    color: COLORS.white,
  },

  // Lista
  listContent: {
    paddingBottom: 80,
  },
  clientCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 15,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  clientSub: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  clientSubMora: {
    color: '#FF5252',
  },
  clientSubProximo: {
    color: '#FFA000',
  },
  activityDividerVertical: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
    marginHorizontal: 10,
  },
  amountCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  clientAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },

  // Badges
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 50,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeAlDia: {
    backgroundColor: '#E8F5EE',
  },
  badgeAlDiaText: {
    color: COLORS.primary,
  },
  badgeMora: {
    backgroundColor: '#FFE8E8',
  },
  badgeMoraText: {
    color: '#FF5252',
  },
  badgeProximo: {
    backgroundColor: '#FFF3E0',
  },
  badgeProximoText: {
    color: '#FFA000',
  },

  // Botón registrar
  btnRegistrar: {
    backgroundColor: COLORS.primary,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnRegistrarText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '88%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 20,
    lineHeight: 18,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.bg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  modalOptionDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    flexShrink: 1,
  },
  modalBackBtn: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingVertical: 4,
  },
  modalBackText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  modalInputGroup: {
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  modalSearchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  modalSearchInput: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  modalSearchBtn: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: COLORS.text,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSearchBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  modalPreview: {
    backgroundColor: '#E8F5EE',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 4,
  },
  modalPreviewName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalPreviewMeta: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  modalBtnPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: 50,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  modalBtnPrimaryText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  modalBtnGhost: {
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  modalBtnGhostText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});