import { StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';
 
export const dashboardStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
  },
 
  // Header sobre fondo verde
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
  },
  storeName: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  bellBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
 
  // Card blanca que sube desde abajo igual que login
  card: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
 
  // Total por Cobrar
  totalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: 6,
  },
  totalAmount: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 6,
  },
  totalSub: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  totalIcon: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
 
  // Stats row
  statsRow: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  statAmount: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  statBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
  },
  statBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
 
  // Actividad reciente
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  activityCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginBottom: 20,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  activityDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  activitySub: {
    fontSize: 12,
    color: COLORS.primary,
  },
  activitySubMora: {
    color: '#FF5252',
  },
  activityDividerVertical: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
    marginHorizontal: 12,
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
 
  // Botones
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

   // Búsqueda y filtros
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  searchIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchIconLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  searchBar: {
    backgroundColor: '#fff',
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#C8E6D2',
    marginBottom: 10,
    justifyContent: 'center',
  },
  searchInput: {
    paddingHorizontal: 20,
    fontSize: 14,
    color: '#1A2E22',
    height: 48,
  },
  filtersRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: '#C8E6D2',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  filterBtnActive: {
    backgroundColor: '#00D09E',
    borderColor: '#00D09E',
  },
  filterText: {
    fontSize: 12,
    color: '#1A2E22',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
});
 
 
