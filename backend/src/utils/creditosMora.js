const { todayBusinessKey } = require('./dateUtils');

/**
 * Pasa a 'vencido' los créditos vigentes cuya fecha límite ya pasó (calendario
 * de negocio). Sin esto el RF y la cartera ignoran mora real: el crédito sigue
 * 'vigente' y no cuenta como historial cerrado.
 *
 * Invalida la caché de scoring de cada par afectado para forzar recálculo.
 */
async function marcarCreditosVencidos(pool, { idCliente, idTendero } = {}) {
  const hoy = todayBusinessKey();
  const conds = ['estado = \'vigente\'', 'fecha_limite_pago < $1::date'];
  const params = [hoy];

  if (idCliente != null) {
    params.push(String(idCliente));
    conds.push(`id_cliente = $${params.length}`);
  }
  if (idTendero != null) {
    params.push(String(idTendero));
    conds.push(`id_tendero = $${params.length}`);
  }

  const result = await pool.query(
    `UPDATE creditos SET estado = 'vencido'
     WHERE ${conds.join(' AND ')}
     RETURNING id_cliente, id_tendero`,
    params
  );

  if (result.rowCount === 0) return 0;

  const { invalidateScoring } = require('./mlScoring');
  const vistos = new Set();
  for (const row of result.rows) {
    const key = `${row.id_cliente}:${row.id_tendero}`;
    if (vistos.has(key)) continue;
    vistos.add(key);
    await invalidateScoring(pool, row.id_cliente, row.id_tendero);
  }

  const { triggerMLRetrain } = require('./mlTrigger');
  triggerMLRetrain('creditos_marcados_vencidos').catch(() => {});

  return result.rowCount;
}

module.exports = { marcarCreditosVencidos };
