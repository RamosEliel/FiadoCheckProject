import { StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';

export const reportesStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },

  // ── Header ──────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
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

  // ── Pills de período ─────────────────────────────────────────
  periodRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
    gap: 10,
  },
  periodBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  periodBtnActive: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.white,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  periodTextActive: {
    color: COLORS.primary,
  },

  // ── Card blanca principal ────────────────────────────────────
  card: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingTop: 24,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  // ── Sección "Resumen" ────────────────────────────────────────
  resumenCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 6,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  resumenTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  resumenFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  resumenFilaUltima: {
    borderBottomWidth: 0,
  },
  resumenLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '400',
  },
  resumenValorVerde: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  resumenValorRojo: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.cargoIcon,
  },
  resumenValorNegro: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },

  // ── Sección "Top deudores" ───────────────────────────────────
  deudoresCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 6,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  deudoresTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    paddingVertical: 14,
  },
  deudorFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  deudorNombre: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '400',
  },
  deudorPill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 50,
    minWidth: 90,
    alignItems: 'center',
  },
  deudorPillText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Botones ──────────────────────────────────────────────────
  btnExport: {
    backgroundColor: COLORS.primary,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnExportText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  btnWhatsapp: {
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnWhatsappText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
