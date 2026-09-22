import { useEffect, useState, type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, { G, Line, Rect } from 'react-native-svg';
import { analiticaStyles as styles } from '@/constants/Analitica.styles';
import { hapticLight } from '@/components/chat/haptic';
import {
  CHART_WEEKS,
  formatMoneda,
  type PagoSemanal,
} from '@/hooks/Useanalitica';

const CHART_HEIGHT = 150;
const CHART_PADDING_TOP = 14;
const CHART_PADDING_BOTTOM = 18;
const BAR_GREEN = '#7EDDAF';
const BAR_BLUE = '#5B9BD5';
const Y_LABEL_OFFSET = 6;
const TOOLTIP_WIDTH = 152;
const HIDDEN_OPACITY = 0.25;

type WeeklyPaymentsChartProps = {
  data: PagoSemanal[];
  width: number;
  yMax: number;
  yTicks: number[];
  empty?: boolean;
  emptyMessage?: string;
  belowLegend?: ReactNode;
};

export function WeeklyPaymentsChart({
  data,
  width,
  yMax,
  yTicks,
  empty = false,
  emptyMessage = 'Sin movimiento este mes',
  belowLegend,
}: WeeklyPaymentsChartProps) {
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [visible, setVisible] = useState({ pagos: true, esperado: true });

  const plotHeight = CHART_HEIGHT - CHART_PADDING_BOTTOM;
  const plotWidth = Math.max(width - 38, 200);
  const groupWidth = plotWidth / 4;
  const barWidth = 10;
  const gap = 4;
  const usableHeight = Math.max(plotHeight - CHART_PADDING_TOP, 1);

  useEffect(() => {
    setSelectedWeek(null);
  }, [data]);

  const scaleY = (value: number) =>
    yMax <= 0
      ? plotHeight
      : CHART_PADDING_TOP + usableHeight - (Math.min(value, yMax) / yMax) * usableHeight;

  const formatTick = (value: number) =>
    value >= 1000 ? `${value / 1000}k` : String(value);

  const togglePagos = () => {
    setVisible((prev) => {
      if (prev.pagos && !prev.esperado) return prev;
      return { ...prev, pagos: !prev.pagos };
    });
  };

  const toggleEsperado = () => {
    setVisible((prev) => {
      if (prev.esperado && !prev.pagos) return prev;
      return { ...prev, esperado: !prev.esperado };
    });
  };

  const clearSelection = () => setSelectedWeek(null);

  const handleSelectWeek = (week: number) => {
    if (empty) return;
    if (selectedWeek === week) {
      setSelectedWeek(null);
      return;
    }
    hapticLight();
    setSelectedWeek(week);
  };

  const selected = selectedWeek
    ? data.find((item) => item.semana === selectedWeek) ?? null
    : null;
  const selectedIndex = selectedWeek ? selectedWeek - 1 : -1;

  const tooltipLeft =
    selectedIndex >= 0
      ? Math.min(
          Math.max(0, selectedIndex * groupWidth + groupWidth / 2 - TOOLTIP_WIDTH / 2),
          Math.max(0, plotWidth - TOOLTIP_WIDTH),
        )
      : 0;

  const delta = selected ? selected.pagos - selected.esperado : 0;
  const deltaSign = delta > 0 ? '+' : delta < 0 ? '-' : '';
  const deltaPct =
    selected && selected.esperado > 0
      ? Math.round((delta / selected.esperado) * 100)
      : null;

  return (
    <View style={styles.chartStack}>
      <View style={styles.chartLegend}>
        <Pressable
          onPress={togglePagos}
          style={styles.legendItem}
          accessibilityRole="button"
          accessibilityState={{ selected: visible.pagos }}
          accessibilityLabel="Serie pagos"
        >
          <View
            style={[
              styles.legendDot,
              { backgroundColor: BAR_GREEN, opacity: visible.pagos ? 1 : HIDDEN_OPACITY },
            ]}
          />
          <Text style={[styles.legendText, !visible.pagos && styles.legendTextFaded]}>
            Pagos
          </Text>
        </Pressable>
        <Pressable
          onPress={toggleEsperado}
          style={styles.legendItem}
          accessibilityRole="button"
          accessibilityState={{ selected: visible.esperado }}
          accessibilityLabel="Serie esperado"
        >
          <View
            style={[
              styles.legendDot,
              { backgroundColor: BAR_BLUE, opacity: visible.esperado ? 1 : HIDDEN_OPACITY },
            ]}
          />
          <Text style={[styles.legendText, !visible.esperado && styles.legendTextFaded]}>
            Esperado
          </Text>
        </Pressable>
      </View>

      {belowLegend}

      <View style={styles.chartBody}>
        <Pressable onPress={clearSelection}>
          <View style={[styles.chartYAxis, { height: CHART_HEIGHT }]} pointerEvents="none">
            {yTicks.map((tick) => (
              <Text
                key={tick}
                style={[styles.chartYLabel, { top: scaleY(tick) - Y_LABEL_OFFSET }]}
              >
                {formatTick(tick)}
              </Text>
            ))}
          </View>
        </Pressable>

        <View style={styles.chartPlot}>
          {selectedWeek !== null && !empty && (
            <View
              pointerEvents="none"
              style={[
                styles.chartWeekHighlight,
                {
                  left: selectedIndex * groupWidth,
                  width: groupWidth,
                  height: plotHeight,
                },
              ]}
            />
          )}

          <Svg width={plotWidth} height={CHART_HEIGHT} pointerEvents="none">
            {yTicks.map((tick) => {
              const y = scaleY(tick);
              return (
                <Line
                  key={`grid-${tick}`}
                  x1={0}
                  y1={y}
                  x2={plotWidth}
                  y2={y}
                  stroke="#B8D4E8"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              );
            })}

            {data.map((item, index) => {
              const groupX = index * groupWidth + groupWidth / 2;
              const greenH = plotHeight - scaleY(item.pagos);
              const blueH = plotHeight - scaleY(item.esperado);
              const greenX = groupX - barWidth - gap / 2;
              const blueX = groupX + gap / 2;

              return (
                <G key={item.semana}>
                  <Rect
                    x={greenX}
                    y={scaleY(item.pagos)}
                    width={barWidth}
                    height={Math.max(greenH, item.pagos > 0 ? 2 : 0)}
                    rx={3}
                    fill={BAR_GREEN}
                    opacity={visible.pagos ? 1 : HIDDEN_OPACITY}
                  />
                  <Rect
                    x={blueX}
                    y={scaleY(item.esperado)}
                    width={barWidth}
                    height={Math.max(blueH, item.esperado > 0 ? 2 : 0)}
                    rx={3}
                    fill={BAR_BLUE}
                    opacity={visible.esperado ? 1 : HIDDEN_OPACITY}
                  />
                </G>
              );
            })}
          </Svg>

          {data.map((item, index) => (
            <Pressable
              key={item.semana}
              accessibilityRole="button"
              accessibilityLabel={`Semana ${item.semana}`}
              pointerEvents={empty ? 'none' : 'auto'}
              onPress={(event) => {
                event.stopPropagation();
                handleSelectWeek(item.semana);
              }}
              style={[
                styles.chartWeekHit,
                {
                  left: index * groupWidth,
                  width: groupWidth,
                  height: CHART_HEIGHT,
                },
              ]}
            />
          ))}

          {selected && !empty && (
            <View
              pointerEvents="none"
              style={[styles.chartTooltip, { left: tooltipLeft, width: TOOLTIP_WIDTH }]}
            >
              <Text style={styles.chartTooltipText}>
                Pagos: {formatMoneda(selected.pagos)}
              </Text>
              <Text style={styles.chartTooltipText}>
                Esperado: {formatMoneda(selected.esperado)}
              </Text>
              <Text
                style={[
                  styles.chartTooltipDelta,
                  delta >= 0 ? styles.chartTooltipDeltaPos : styles.chartTooltipDeltaNeg,
                ]}
              >
                {`${deltaSign}${formatMoneda(Math.abs(delta))}`}
                {deltaPct !== null ? ` (${deltaSign}${Math.abs(deltaPct)}%)` : ''}
              </Text>
            </View>
          )}

          {empty && (
            <View style={styles.chartEmptyOverlay} pointerEvents="none">
              <Text style={styles.chartEmptyText}>{emptyMessage}</Text>
            </View>
          )}
        </View>
      </View>

      <Pressable onPress={clearSelection} style={styles.chartXAxis}>
        {CHART_WEEKS.map((week) => (
          <Text key={week} style={styles.chartXLabel}>
            {week}
          </Text>
        ))}
      </Pressable>
    </View>
  );
}
