import { StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';

export const perfilClienteStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
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

  card: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  content: {
    paddingBottom: 40,
  },

  nameBanner: {
    backgroundColor: '#E8F5EE',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  nameBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  nameText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  clienteDesde: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeAlDia: {
    backgroundColor: COLORS.white,
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
  badgeSinDeuda: {
    backgroundColor: COLORS.white,
  },
  badgeSinDeudaText: {
    color: COLORS.primary,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#C8E6D2',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statValueSmall: {
    fontSize: 18,
  },
  riesgoBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
    marginBottom: 8,
  },
  riesgoBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  confianzaValue: {
    fontWeight: '800',
    color: COLORS.primary,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },

  historialCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 20,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  historialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  historialDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  historialRowHighlight: {
    backgroundColor: '#E8F5EE',
    borderRadius: 10,
  },
  historialTitulo: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 3,
  },
  historialSub: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  historialSubVencido: {
    color: '#FF5252',
  },
  historialSubVigente: {
    color: '#FFA000',
  },
  historialMontoBadge: {
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50,
    marginLeft: 8,
  },
  historialMontoVencido: {
    backgroundColor: '#FFF3E0',
  },
  historialMontoText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  historialMontoTextVencido: {
    color: '#FFA000',
  },
  historialEmpty: {
    textAlign: 'center',
    color: COLORS.textMuted,
    padding: 20,
    fontSize: 13,
  },

  contactoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  contactoLinea: {
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 6,
    lineHeight: 20,
  },

  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btnOutline: {
    flex: 1,
    borderRadius: 50,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  btnOutlineText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  btnFill: {
    flex: 1,
    borderRadius: 50,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  btnFillText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  btnAnalitica: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  btnAnaliticaText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    color: COLORS.white,
    textAlign: 'center',
    fontSize: 14,
  },
  pagosCard: {
      backgroundColor: COLORS.white,
      borderRadius: 16,
      marginBottom: 20,
      paddingVertical: 4,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    pagoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    pagoDivider: {
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    pagoIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#E8F5EE',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    pagoIconText: {
      fontSize: 16,
      fontWeight: '800',
      color: COLORS.primary,
    },
    pagoInfo: {
      flex: 1,
      marginRight: 8,
    },
    pagoTitulo: {
      fontSize: 13,
      fontWeight: '600',
      color: COLORS.text,
      marginBottom: 3,
    },
    pagoSub: {
      fontSize: 12,
      color: COLORS.textMuted,
    },
    pagoMontoBadge: {
      backgroundColor: '#E8F5EE',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 50,
    },
    pagoMontoText: {
      fontSize: 12,
      fontWeight: '700',
      color: COLORS.primary,
    },
    pagosEmpty: {
      textAlign: 'center',
      color: COLORS.textMuted,
      padding: 20,
      fontSize: 13,
    },
});
