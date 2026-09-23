import { StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';

const p = COLORS;

export const vistaUsuarioStyles = StyleSheet.create({
  // ── Contenedor ──
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Header ──
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: '700',
    color: p.white,
  },
  welcomeSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },

  // ── Card blanca que sube con curva ──
  card: {
    flex: 1,
    backgroundColor: p.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    paddingTop: 20,
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // ── Card — Tu Cuenta ──
  debtCard: {
    backgroundColor: p.white,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 4,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    alignItems: 'center',
  },
  cardSubtitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    color: p.text,
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  totalLabel: {
    fontSize: 14,
    color: p.textMuted,
  },
  debtAmount: {
    fontSize: 38,
    fontWeight: '800',
    color: p.text,
    marginTop: 6,
  },
  debtDate: {
    fontSize: 13,
    color: p.textMuted,
    marginTop: 4,
  },

  // ── Card — Perfil crediticio ──
  perfilCard: {
    backgroundColor: p.white,
    borderRadius: 20,
    marginHorizontal: 4,
    marginBottom: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  perfilAccent: {
    width: 5,
  },
  perfilCardInner: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  perfilEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: p.textMuted,
    marginBottom: 14,
  },
  perfilHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  perfilIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perfilHeroText: {
    flex: 1,
  },
  perfilHeadline: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  perfilSub: {
    fontSize: 13,
    fontWeight: '600',
    color: p.textMuted,
    marginTop: 4,
  },
  perfilHint: {
    fontSize: 13,
    lineHeight: 18,
    color: p.text,
    marginTop: 14,
    opacity: 0.75,
  },
  section: {
    backgroundColor: p.white,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 4,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: p.text,
    marginBottom: 8,
  },

  // ── Últimos Movimientos ──
  movementsSection: {
    marginHorizontal: 4,
    marginBottom: 8,
  },
  movementsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: p.text,
    marginBottom: 16,
  },
  movements: {
    gap: 12,
  },
  movementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconText: {
    fontSize: 22,
    fontWeight: '700',
  },
  movementTextColumn: {
    flex: 1,
    marginLeft: 14,
  },
  movementDesc: {
    fontSize: 15,
    fontWeight: '600',
    color: p.text,
  },
  movementDate: {
    fontSize: 13,
    fontWeight: '500',
    color: p.dateColor,
    marginTop: 2,
  },
  movementAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: p.text,
  },

  // ── Botón CTA ──
  ctaButton: {
    marginHorizontal: 4,
    marginTop: 20,
    marginBottom: 24,
    backgroundColor: p.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: p.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
