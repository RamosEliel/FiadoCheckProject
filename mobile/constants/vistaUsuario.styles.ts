import { StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';

const p = COLORS;

export const vistaUsuarioStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: p.primary,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  welcomeKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: '800',
    color: p.white,
    lineHeight: 32,
  },
  storeChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 50,
    maxWidth: '100%',
  },
  storeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: p.white,
    flexShrink: 1,
  },

  card: {
    flex: 1,
    backgroundColor: '#F4F7F6',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 36,
  },

  hero: {
    backgroundColor: p.primary,
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 12,
    shadowColor: p.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.85)',
  },
  moraBadge: {
    backgroundColor: 'rgba(255,82,82,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
  },
  moraBadgeText: {
    color: p.white,
    fontSize: 11,
    fontWeight: '800',
  },
  okBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
  },
  okBadgeText: {
    color: p.white,
    fontSize: 11,
    fontWeight: '800',
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: p.white,
    letterSpacing: -0.8,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  heroMetaText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
  },
  heroAddress: {
    marginTop: 6,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: p.white,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: p.border,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '800',
    color: p.text,
  },
  statDanger: {
    color: p.danger,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: p.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  perfilCard: {
    backgroundColor: p.white,
    borderRadius: 20,
    marginBottom: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: p.border,
  },
  perfilAccent: {
    width: 6,
  },
  perfilCardInner: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  perfilEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: p.textMuted,
    marginBottom: 10,
  },
  perfilHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  perfilIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perfilHeroText: {
    flex: 1,
    minWidth: 0,
  },
  perfilHeadline: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  perfilSub: {
    fontSize: 12,
    fontWeight: '600',
    color: p.textMuted,
    marginTop: 2,
  },
  scoreBubble: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F3FBF7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBubbleValue: {
    fontSize: 16,
    fontWeight: '800',
    color: p.text,
    lineHeight: 18,
  },
  scoreBubbleHint: {
    fontSize: 9,
    fontWeight: '700',
    color: p.textMuted,
    textTransform: 'uppercase',
  },
  scoreTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: p.bg,
    marginTop: 12,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    borderRadius: 4,
  },
  perfilHint: {
    fontSize: 12,
    lineHeight: 17,
    color: p.text,
    marginTop: 10,
    opacity: 0.75,
  },

  movementsSection: {
    marginBottom: 8,
  },
  movementsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: p.text,
    marginBottom: 10,
  },
  movementCard: {
    backgroundColor: p.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: p.border,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  iconText: {
    fontSize: 18,
    fontWeight: '800',
  },
  movementTextColumn: {
    flex: 1,
    minWidth: 0,
  },
  movementTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  typeChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 50,
  },
  typeChipCargo: {
    backgroundColor: '#FFEBEE',
  },
  typeChipAbono: {
    backgroundColor: '#E8F5EE',
  },
  typeChipText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  typeChipCargoText: {
    color: p.danger,
  },
  typeChipAbonoText: {
    color: p.primary,
  },
  movementDesc: {
    fontSize: 14,
    fontWeight: '700',
    color: p.text,
  },
  movementDate: {
    fontSize: 11,
    fontWeight: '600',
    color: p.textMuted,
  },
  movementSaldo: {
    fontSize: 11,
    fontWeight: '600',
    color: p.textMuted,
    marginTop: 2,
  },
  amountCol: {
    alignItems: 'flex-end',
    marginLeft: 8,
    gap: 2,
  },
  movementAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  emptyMovements: {
    fontSize: 13,
    color: p.textMuted,
    paddingVertical: 16,
  },

  ctaButton: {
    marginTop: 10,
    backgroundColor: p.primary,
    borderRadius: 50,
    paddingVertical: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  ctaButtonText: {
    color: p.white,
    fontSize: 15,
    fontWeight: '800',
  },
});
