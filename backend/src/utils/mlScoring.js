const { mlPost } = require('./mlServiceClient');
const { calcularLimiteSugerido, queryTotalesCreditos, ajustarPrediccionPorMora } = require('./scoringUtils');

const SELECT_SCORING = `
  SELECT * FROM scoring
  WHERE id_cliente = $1 AND id_tendero = $2
  ORDER BY fecha_calculo DESC LIMIT 1
`;

// El microservicio necesita el tendero porque las features salen del historial
// de créditos de ese par: un mismo cliente tiene un historial distinto en cada tienda.
async function callMLService(clienteId, idTendero) {
  const postData = JSON.stringify({
    id_cliente: parseInt(clienteId, 10),
    id_tendero: parseInt(idTendero, 10),
  });
  const json = await mlPost('/predict', postData);
  if (json.error) throw new Error(json.error);
  return json;
}

async function upsertPrediction(pool, clienteId, idTendero, { nivelRiesgo, puntaje, confianza, limiteSugerido }) {
  await pool.query(`
    INSERT INTO scoring (id_cliente, id_tendero, nivel_riesgo, puntaje, confianza, limite_sugerido)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (id_cliente, id_tendero) DO UPDATE SET
      nivel_riesgo = EXCLUDED.nivel_riesgo,
      puntaje = EXCLUDED.puntaje,
      confianza = EXCLUDED.confianza,
      limite_sugerido = EXCLUDED.limite_sugerido,
      fecha_calculo = NOW()
  `, [clienteId, idTendero, nivelRiesgo, puntaje, confianza, limiteSugerido]);
}

/**
 * Fuente única de la predicción para un par (cliente, tendero): ya no depende de
 * que exista una fila previa creada por un paso manual de "calcular". Si no hay
 * fila en `scoring`, o quedó con confianza en null (predicción pendiente o el
 * microservicio falló la última vez), llama al RF y persiste el resultado. Si ya
 * hay una predicción vigente, la devuelve tal cual sin volver a llamar al ML.
 *
 * Los clientes sin historial crediticio con este tendero no tienen features
 * reales que evaluar, así que se respeta la regla fija de negocio (nivel_riesgo
 * = 'medio', puntaje = 50) y nunca se le pide una predicción al RF: se devuelve
 * null y el caller aplica esa regla.
 */
async function getOrComputeScoring(pool, clienteId, idTendero, options = {}) {
  if (options.sinHistorialCrediticio) return null;

  const existing = await pool.query(SELECT_SCORING, [clienteId, idTendero]);
  if (existing.rows.length > 0 && existing.rows[0].confianza != null) {
    return existing.rows[0];
  }

  try {
    const rf = await callMLService(clienteId, idTendero);
    const totales = await queryTotalesCreditos(pool, clienteId, idTendero);
    const ajustado = ajustarPrediccionPorMora(rf, totales);
    const limiteSugerido = await calcularLimiteSugerido(pool, clienteId, idTendero, ajustado.nivel_riesgo);
    await upsertPrediction(pool, clienteId, idTendero, {
      nivelRiesgo: ajustado.nivel_riesgo,
      puntaje: ajustado.puntaje,
      confianza: ajustado.confianza,
      limiteSugerido,
    });
    return {
      nivel_riesgo: ajustado.nivel_riesgo,
      puntaje: ajustado.puntaje,
      confianza: ajustado.confianza,
      limite_sugerido: limiteSugerido,
      fecha_calculo: new Date(),
    };
  } catch (mlErr) {
    console.error('Error obteniendo predicción ML:', mlErr.message);
    return existing.rows[0] || null;
  }
}

/**
 * Marca la predicción cacheada de un par como vencida (sin borrar la fila, para
 * no perder limite_sugerido/fecha_calculo si el ML tarda en responder de nuevo).
 * La siguiente llamada a getOrComputeScoring la recalcula, porque confianza NULL
 * es la señal que ya usa esa función para decidir si debe volver a preguntarle al RF.
 *
 * Se invoca cuando un crédito de ese par se cierra (pagado o vencido): el
 * historial que alimenta las features de ese par cambió, así que la predicción
 * anterior ya no refleja los datos actuales.
 */
async function invalidateScoring(pool, clienteId, idTendero) {
  await pool.query(
    'UPDATE scoring SET confianza = NULL WHERE id_cliente = $1 AND id_tendero = $2',
    [clienteId, idTendero]
  );
}

module.exports = {
  callMLService,
  getOrComputeScoring,
  invalidateScoring,
};
