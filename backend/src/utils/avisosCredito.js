const { toDateKey, todayBusinessKey, calendarDaysBetween } = require('./dateUtils');

// Regla única de avisos por crédito, compartida por las alertas del tendero y los
// recordatorios del cliente: vencido o con atraso => crítica; vence en 3 días o
// menos => próxima; vence entre 4 y 7 días => informativa; más allá no avisa.
function clasificarCredito(estado, fechaLimite) {
  const limite = toDateKey(fechaLimite);
  const hoy = todayBusinessKey();
  const dias = limite ? calendarDaysBetween(limite, hoy) : 0;

  if (estado === 'vencido' || dias > 0) {
    const atraso = Math.max(dias, 1);
    const detalle = atraso === 1 ? '1 día de atraso' : `${atraso} días de atraso`;
    return { tipo: 'critica', dias_atraso: atraso, detalle };
  }

  const faltan = Math.abs(dias);
  if (faltan <= 3) {
    const detalle = faltan === 0 ? 'Vence hoy' : faltan === 1 ? 'Vence mañana' : `Vence en ${faltan} días`;
    return { tipo: 'proxima', dias_atraso: 0, detalle };
  }
  if (faltan <= 7) {
    return { tipo: 'informativa', dias_atraso: 0, detalle: `Vence en ${faltan} días` };
  }
  return null;
}

module.exports = { clasificarCredito };
