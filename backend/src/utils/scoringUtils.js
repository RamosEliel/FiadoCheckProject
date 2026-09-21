function calcularPuntaje(row, options = {}) {
  if (options.sinHistorialCrediticio) return 50;
  if (row.puntaje != null && row.puntaje !== '') {
    return parseInt(row.puntaje, 10);
  }

  const sum =
    (row.pts_puntualidad || 0) +
    (row.pts_cumplimiento || 0) +
    (row.pts_historial || 0) +
    (row.pts_antiguedad || 0);

  if (sum === 0 && row.nivel_riesgo === 'medio') return 50;

  return sum;
}

function mapScoringRow(row, options = {}) {
  return {
    puntaje: calcularPuntaje(row, options),
    nivel_riesgo: row.nivel_riesgo,
    limite_sugerido: parseFloat(row.limite_sugerido),
    confianza: row.confianza != null ? parseFloat(row.confianza) : null,
    fecha_calculo: row.fecha_calculo,
    desglose: {
      puntualidad: row.pts_puntualidad,
      cumplimiento: row.pts_cumplimiento,
      historial: row.pts_historial,
      antiguedad: row.pts_antiguedad,
    },
  };
}

async function queryTotalesCreditos(pool, clienteId, idTendero) {
  const result = await pool.query(`
    SELECT COALESCE(SUM(saldo_pendiente), 0) AS total_deuda,
           COUNT(*) AS total_creditos,
           COUNT(CASE WHEN estado = 'vencido' THEN 1 END) AS creditos_vencidos
    FROM creditos
    WHERE id_cliente = $1 AND id_tendero = $2 AND estado != 'pagado'
  `, [clienteId, idTendero]);

  const row = result.rows[0];
  return {
    total_deuda: parseFloat(row.total_deuda) || 0,
    total_creditos: parseInt(row.total_creditos, 10) || 0,
    creditos_vencidos: parseInt(row.creditos_vencidos, 10) || 0,
  };
}

async function queryCreditosHistorico(pool, clienteId, idTendero) {
  const result = await pool.query(`
    SELECT COUNT(*) AS total_historico
    FROM creditos
    WHERE id_cliente = $1 AND id_tendero = $2
  `, [clienteId, idTendero]);

  return parseInt(result.rows[0].total_historico, 10) || 0;
}

/**
 * Único punto de cálculo del límite sugerido. Debe llamarse con el nivel_riesgo
 * final (el corregido por el RF cuando esté disponible) para que nunca quede
 * desincronizado del nivel_riesgo persistido en `scoring`.
 * base = promedio de los últimos 3 créditos cerrados (pagado + vencido).
 */
async function calcularLimiteSugerido(pool, clienteId, idTendero, nivelRiesgo) {
  const cerrados = await pool.query(`
    SELECT monto_total FROM creditos
    WHERE id_cliente = $1 AND id_tendero = $2 AND estado IN ('pagado', 'vencido')
    ORDER BY fecha_credito DESC
    LIMIT 3
  `, [clienteId, idTendero]);

  const saldoResult = await pool.query(`
    SELECT COALESCE(SUM(saldo_pendiente), 0) AS saldo
    FROM creditos
    WHERE id_cliente = $1 AND id_tendero = $2 AND estado != 'pagado'
  `, [clienteId, idTendero]);

  const base = cerrados.rows.length > 0
    ? cerrados.rows.reduce((sum, c) => sum + parseFloat(c.monto_total), 0) / cerrados.rows.length
    : 0;
  const saldoPendiente = parseFloat(saldoResult.rows[0].saldo);

  let factor;
  if (nivelRiesgo === 'bajo') factor = 1.5;
  else if (nivelRiesgo === 'medio') factor = 1.0;
  else factor = 0.5;

  let limite = Math.max(0, Math.round(base * factor - saldoPendiente));
  limite = Math.min(limite, 300000);

  if (limite === 0 && cerrados.rows.length === 0) {
    limite = 50000;
  }

  return limite;
}

module.exports = {
  calcularPuntaje,
  mapScoringRow,
  queryTotalesCreditos,
  queryCreditosHistorico,
  calcularLimiteSugerido,
};
