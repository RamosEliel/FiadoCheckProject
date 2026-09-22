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

  // ── Card — Nivel De Confianza ──
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
  riesgoResumen: {
    fontSize: 13,
    fontWeight: '600',
    color: p.textMuted,
    marginBottom: 12,
  },
  progressWrap: {
    marginBottom: 12,
  },
  progressTrack: {
    height: 14,
    borderRadius: 7,
    backgroundColor: p.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 7,
    backgroundColor: p.primary,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: p.textMuted,
  },
  confidenceBadge: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  motivationalText: {
    fontSize: 13,
    color: p.textMuted,
    marginTop: 4,
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
