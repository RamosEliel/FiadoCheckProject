import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { dialogStyles } from '@/constants/dialog.styles';
import { COLORS } from '@/constants/colors';
import { dateFromKey, todayBusinessKey } from '@/utils/businessDate';
import { useAppDialog } from '@/hooks/useAppDialog';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

type Props = {
  visible: boolean;
  selected: string;
  onSelect: (formatted: string) => void;
  onClose: () => void;
};

function inicioHoy() {
  const hoy = dateFromKey(todayBusinessKey()) ?? new Date();
  hoy.setHours(0, 0, 0, 0);
  return hoy;
}

export function CreditCalendar({ visible, selected, onSelect, onClose }: Props) {
  const { showError } = useAppDialog();
  const [currentCalendarDate, setCurrentCalendarDate] = useState(() => inicioHoy());

  useEffect(() => {
    if (visible) setCurrentCalendarDate(inicioHoy());
  }, [visible]);

  const esFechaPasada = (dia: number, month = currentCalendarDate.getMonth(), year = currentCalendarDate.getFullYear()) => {
    const candidata = new Date(year, month, dia);
    candidata.setHours(0, 0, 0, 0);
    return candidata.getTime() < inicioHoy().getTime();
  };

  const esMesAnteriorAlActual = (fecha: Date) => {
    const inicioMesVista = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
    const hoy = inicioHoy();
    const inicioMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    return inicioMesVista < inicioMesActual;
  };

  const changeMonth = (direction: number) => {
    setCurrentCalendarDate((prev) => {
      const nextDate = new Date(prev.getFullYear(), prev.getMonth() + direction, 1);
      if (direction < 0 && esMesAnteriorAlActual(nextDate)) return prev;
      return nextDate;
    });
  };

  const changeYear = (direction: number) => {
    setCurrentCalendarDate((prev) => {
      const nextDate = new Date(prev.getFullYear() + direction, prev.getMonth(), 1);
      if (esMesAnteriorAlActual(nextDate)) {
        const hoy = inicioHoy();
        return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      }
      return nextDate;
    });
  };

  const celdas = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const cantDias = new Date(year, month + 1, 0).getDate();
    const primerDiaSemana = new Date(year, month, 1).getDay();
    const primerDiaAjustado = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;
    const result: Array<number | null> = [];
    for (let i = 0; i < primerDiaAjustado; i++) result.push(null);
    for (let i = 1; i <= cantDias; i++) result.push(i);
    return result;
  }, [currentCalendarDate]);

  const seleccionarDia = (dia: number) => {
    if (esFechaPasada(dia)) {
      showError('Fecha inválida', 'La fecha límite no puede ser anterior a hoy.');
      return;
    }
    const d = String(dia).padStart(2, '0');
    const m = String(currentCalendarDate.getMonth() + 1).padStart(2, '0');
    const y = currentCalendarDate.getFullYear();
    onSelect(`${d}/${m}/${y}`);
    onClose();
  };

  const verificarDiaSeleccionado = (dia: number) => {
    if (!selected) return false;
    const partes = selected.split('/');
    if (partes.length !== 3) return false;
    const d = parseInt(partes[0], 10);
    const m = parseInt(partes[1], 10);
    const y = parseInt(partes[2], 10);
    return d === dia && m === (currentCalendarDate.getMonth() + 1) && y === currentCalendarDate.getFullYear();
  };

  const verificarEsHoy = (dia: number) => {
    const hoy = inicioHoy();
    return hoy.getDate() === dia &&
      hoy.getMonth() === currentCalendarDate.getMonth() &&
      hoy.getFullYear() === currentCalendarDate.getFullYear();
  };

  const prevMonthDisabled = esMesAnteriorAlActual(
    new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1),
  );
  const prevYearDisabled = currentCalendarDate.getFullYear() <= inicioHoy().getFullYear();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={dialogStyles.overlay} onPress={onClose}>
        <Pressable style={dialogStyles.card} onPress={() => {}}>
          <View style={calStyles.navRow}>
            <TouchableOpacity
              style={[calStyles.navBtn, prevYearDisabled && calStyles.navBtnDisabled]}
              onPress={() => changeYear(-1)}
              disabled={prevYearDisabled}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityLabel="Año anterior"
            >
              <ChevronLeft size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={calStyles.yearTitle}>{currentCalendarDate.getFullYear()}</Text>
            <TouchableOpacity
              style={calStyles.navBtn}
              onPress={() => changeYear(1)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityLabel="Año siguiente"
            >
              <ChevronRight size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View style={calStyles.navRow}>
            <TouchableOpacity
              style={[calStyles.navBtn, prevMonthDisabled && calStyles.navBtnDisabled]}
              onPress={() => changeMonth(-1)}
              disabled={prevMonthDisabled}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityLabel="Mes anterior"
            >
              <ChevronLeft size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={calStyles.monthTitle}>
              {MESES[currentCalendarDate.getMonth()]}
            </Text>
            <TouchableOpacity
              style={calStyles.navBtn}
              onPress={() => changeMonth(1)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityLabel="Mes siguiente"
            >
              <ChevronRight size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View style={calStyles.weekDaysRow}>
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
              <Text key={d} style={calStyles.weekDayText}>{d}</Text>
            ))}
          </View>

          <View style={calStyles.daysGrid}>
            {celdas.map((dia, idx) => {
              if (dia === null) {
                return <View key={idx} style={calStyles.emptyCell} />;
              }

              const esSeleccionado = verificarDiaSeleccionado(dia);
              const esHoy = verificarEsHoy(dia);
              const esPasado = esFechaPasada(dia);

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    calStyles.dayCell,
                    esSeleccionado && calStyles.selectedDayCell,
                    esHoy && !esSeleccionado && calStyles.todayCell,
                    esPasado && calStyles.disabledDayCell,
                  ]}
                  onPress={() => seleccionarDia(dia)}
                  disabled={esPasado}
                  activeOpacity={esPasado ? 1 : 0.7}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Text
                    style={[
                      calStyles.dayText,
                      esSeleccionado && calStyles.selectedDayText,
                      esPasado && calStyles.disabledDayText,
                    ]}
                  >
                    {dia}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={calStyles.closeBtn} onPress={onClose}>
            <Text style={calStyles.closeBtnText}>Cerrar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const calStyles = StyleSheet.create({
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  yearTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  navBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.inputBg,
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: {
    opacity: 0.35,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
    width: '100%',
  },
  weekDayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  dayCell: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
    borderRadius: 18,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  emptyCell: {
    width: 36,
    height: 36,
    marginVertical: 4,
  },
  selectedDayCell: {
    backgroundColor: COLORS.primary,
  },
  selectedDayText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  disabledDayCell: {
    opacity: 0.35,
  },
  disabledDayText: {
    color: COLORS.textMuted,
  },
  closeBtn: {
    marginTop: 20,
    paddingVertical: 13,
    alignItems: 'center',
    borderRadius: 50,
    backgroundColor: COLORS.inputBg,
    width: '100%',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
