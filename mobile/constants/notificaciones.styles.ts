import { StyleSheet } from 'react-native';
import { COLORS } from './colors';
import { AppFonts } from './theme';

export type SchemeName = 'light' | 'dark';

export type SeverityTone = {
  accent: string;
  soft: string;
  ink: string;
};

export type NotificacionesTheme = {
  screenBg: string;
  cardBg: string;
  cardBorder: string;
  text: string;
  textMuted: string;
  skeleton: string;
  skeletonStrong: string;
  spinner: string;
  severity: {
    critica: SeverityTone;
    proxima: SeverityTone;
    informativa: SeverityTone;
  };
};

const THEMES: Record<SchemeName, NotificacionesTheme> = {
  light: {
    screenBg: COLORS.white,
    cardBg: COLORS.white,
    cardBorder: '#EDF1F0',
    text: COLORS.text,
    textMuted: COLORS.textMuted,
    skeleton: COLORS.bg,
    skeletonStrong: COLORS.border,
    spinner: COLORS.primary,
    severity: {
      critica: { accent: COLORS.danger, soft: COLORS.dangerSoft, ink: COLORS.dangerInk },
      proxima: { accent: COLORS.warning, soft: COLORS.warningSoft, ink: COLORS.warningInk },
      informativa: { accent: COLORS.info, soft: COLORS.infoSoft, ink: COLORS.infoInk },
    },
  },
  dark: {
    screenBg: COLORS.bgDark,
    cardBg: COLORS.cardDark,
    cardBorder: COLORS.borderDark,
    text: COLORS.textOnDark,
    textMuted: COLORS.textMutedOnDark,
    skeleton: COLORS.cardDark,
    skeletonStrong: COLORS.cardAltDark,
    spinner: COLORS.primary,
    severity: {
      critica: { accent: COLORS.danger, soft: COLORS.dangerSoftDark, ink: COLORS.dangerOnDark },
      proxima: { accent: COLORS.warning, soft: COLORS.warningSoftDark, ink: COLORS.warningOnDark },
      informativa: { accent: COLORS.info, soft: COLORS.infoSoftDark, ink: COLORS.infoOnDark },
    },
  },
};

export const notificacionesTheme = (scheme: SchemeName): NotificacionesTheme => THEMES[scheme];

export const createNotificacionesStyles = (scheme: SchemeName) => {
  const t = THEMES[scheme];

  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: t.screenBg,
    },

    /* ---------- Encabezado ---------- */
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 22,
      backgroundColor: COLORS.primary,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
    },
    backBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.22)',
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    headerTitle: {
      color: COLORS.white,
      fontSize: 19,
      fontFamily: AppFonts.bold,
      textAlign: 'center',
    },
    headerSubtitle: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 12,
      fontFamily: AppFonts.regular,
      textAlign: 'center',
      marginTop: 2,
    },
    headerSpacer: {
      width: 48,
    },

    /* ---------- Lista ---------- */
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 18,
      paddingBottom: 40,
      flexGrow: 1,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
      marginTop: 6,
    },
    sectionTitle: {
      fontSize: 13,
      fontFamily: AppFonts.semiBold,
      color: t.textMuted,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    sectionCount: {
      minWidth: 22,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionCountText: {
      fontSize: 11,
      fontFamily: AppFonts.bold,
    },
    sectionSpacer: {
      height: 10,
    },

    /* ---------- Tarjeta ---------- */
    card: {
      flexDirection: 'row',
      backgroundColor: t.cardBg,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: t.cardBorder,
      marginBottom: 12,
      overflow: 'hidden',
      minHeight: 88,
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: scheme === 'dark' ? 0.35 : 0.07,
      shadowRadius: 10,
      elevation: 3,
    },
    cardStripe: {
      width: 5,
      alignSelf: 'stretch',
    },
    cardInner: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingLeft: 12,
      paddingRight: 10,
      gap: 12,
    },
    iconChip: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardBody: {
      flex: 1,
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cardCliente: {
      flex: 1,
      fontSize: 15,
      fontFamily: AppFonts.bold,
      color: t.text,
    },
    cardBadge: {
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: 9,
    },
    cardBadgeText: {
      fontSize: 10,
      fontFamily: AppFonts.bold,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    cardDetalle: {
      fontSize: 13,
      fontFamily: AppFonts.semiBold,
      marginTop: 4,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
    },
    cardMonto: {
      fontSize: 12.5,
      fontFamily: AppFonts.semiBold,
      color: t.text,
    },
    cardMetaDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: t.textMuted,
      opacity: 0.6,
    },
    cardTiempo: {
      fontSize: 11.5,
      fontFamily: AppFonts.regular,
      color: t.textMuted,
    },
    cardUnreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginLeft: 'auto',
    },
    cardChevron: {
      alignItems: 'center',
      justifyContent: 'center',
    },

    /* ---------- Estado vacío / informativo ---------- */
    stateWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingVertical: 40,
    },
    stateIconWrap: {
      width: 92,
      height: 92,
      borderRadius: 46,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    stateIconInner: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stateTitle: {
      fontSize: 18,
      fontFamily: AppFonts.bold,
      color: t.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    stateMessage: {
      fontSize: 14,
      fontFamily: AppFonts.regular,
      color: t.textMuted,
      textAlign: 'center',
      lineHeight: 21,
    },
    stateAction: {
      marginTop: 22,
      minHeight: 44,
      paddingHorizontal: 26,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.primary,
    },
    stateActionText: {
      fontSize: 14,
      fontFamily: AppFonts.bold,
      color: COLORS.white,
    },

    /* ---------- Skeleton de carga ---------- */
    skeletonCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: t.cardBg,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: t.cardBorder,
      padding: 14,
      marginBottom: 12,
      minHeight: 88,
    },
    skeletonChip: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: t.skeletonStrong,
    },
    skeletonLines: {
      flex: 1,
      gap: 8,
    },
    skeletonLine: {
      height: 11,
      borderRadius: 6,
      backgroundColor: t.skeletonStrong,
    },
    skeletonLineShort: {
      width: '45%',
      backgroundColor: t.skeleton,
    },
    skeletonLineMedium: {
      width: '70%',
      backgroundColor: t.skeleton,
    },
  });
};

export type NotificacionesStyles = ReturnType<typeof createNotificacionesStyles>;
