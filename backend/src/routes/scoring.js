const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { triggerMLRetrain } = require('../utils/mlTrigger');
const { callMLService, syncMLPrediction } = require('../utils/mlScoring');
const { mapScoringRow, queryTotalesCreditos, queryCreditosHistorico, calcularLimiteSugerido } = require('../utils/scoringUtils');
const { calcularScoring } = require('../utils/scoringCalculo');

// El scoring es por par (cliente, tendero): se calcula con los créditos que ese
// tendero otorgó, así que también debe leerse y guardarse por ese par. Antes la
// tabla tenía una sola fila por cliente y el último tendero en recalcular
// sobreescribía la del resto, que pasaban a ver un puntaje derivado de créditos
// ajenos.
const SELECT_SCORING = `
  SELECT * FROM scoring
  WHERE id_cliente = $1 AND id_tendero = $2
  ORDER BY fecha_calculo DESC LIMIT 1
`;

const router = express.Router();
router.use(authMiddleware);

// GET /api/scoring/:clienteId
router.get('/:clienteId', async (req, res) => {
  try {
    const { clienteId } = req.params;
    const idTendero = req.user.id_tendero;

    const verifica = await pool.query(`
      SELECT 1 FROM tendero_cliente WHERE id_tendero = $1 AND id_cliente = $2 AND estado = 'activo'
    `, [idTendero, clienteId]);

    if (verifica.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const scoring = await pool.query(SELECT_SCORING, [clienteId, idTendero]);

    if (scoring.rows.length === 0) {
      return res.status(404).json({ error: 'No existe scoring para este cliente. Ejecuta el cálculo primero.' });
    }

    const creditosHistorico = await queryCreditosHistorico(pool, clienteId, idTendero);
    const sinHistorialCrediticio = creditosHistorico === 0;
    const syncedRow = await syncMLPrediction(pool, clienteId, scoring.rows[0], idTendero, { sinHistorialCrediticio });
    const mapped = mapScoringRow(syncedRow, { sinHistorialCrediticio });

    res.json({
      id_cliente: parseInt(clienteId),
      puntaje_total: mapped.puntaje,
      nivel_riesgo: mapped.nivel_riesgo,
      limite_sugerido: mapped.limite_sugerido,
      fecha_calculo: mapped.fecha_calculo,
      desglose: mapped.desglose,
      confianza: mapped.confianza,
    });
  } catch (err) {
    console.error('Error en scoring:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/scoring/:clienteId/calcular
router.post('/:clienteId/calcular', async (req, res) => {
  try {
    const { clienteId } = req.params;
    const idTendero = req.user.id_tendero;

    const verifica = await pool.query(`
      SELECT 1 FROM tendero_cliente WHERE id_tendero = $1 AND id_cliente = $2 AND estado = 'activo'
    `, [idTendero, clienteId]);

    if (verifica.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const calculo = await calcularScoring(pool, clienteId, idTendero);
    if (!calculo) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    await upsertScoring(clienteId, idTendero, calculo);
    triggerMLRetrain('scoring_nuevo').catch(() => {});

    // Cliente sin créditos con este tendero: regla de negocio fija, no se le pide
    // predicción al RF porque no hay features reales que evaluar.
    if (calculo.clienteNuevo) {
      return res.json({
        message: 'Scoring calculado correctamente (cliente nuevo)',
        id_cliente: parseInt(clienteId),
        puntaje_total: calculo.puntajeTotal,
        nivel_riesgo: calculo.nivelRiesgo,
        limite_sugerido: calculo.limiteSugerido,
        desglose: {
          puntualidad: calculo.ptsPuntualidad,
          cumplimiento: calculo.ptsCumplimiento,
          historial: calculo.ptsHistorial,
          antiguedad: calculo.ptsAntiguedad
        },
        confianza: null
      });
    }

    // Predicción ML: sobreescribe nivel_riesgo, confianza y límite. El límite se
    // recalcula con el nivel del RF para que nunca quede desincronizado del
    // nivel_riesgo persistido.
    let rf = null;
    let limiteSugerido = calculo.limiteSugerido;
    try {
      rf = await callMLService(clienteId, idTendero);
      limiteSugerido = await calcularLimiteSugerido(pool, clienteId, idTendero, rf.nivel_riesgo);
      await pool.query(`
        UPDATE scoring
        SET nivel_riesgo = $1, confianza = $2, limite_sugerido = $3, puntaje = $4, fecha_calculo = NOW()
        WHERE id_cliente = $5 AND id_tendero = $6
      `, [rf.nivel_riesgo, rf.confianza, limiteSugerido, rf.puntaje_rf, clienteId, idTendero]);
    } catch (mlErr) {
      console.error('Error guardando predicción ML en scoring:', mlErr.message);
    }

    res.json({
      message: 'Scoring calculado correctamente',
      id_cliente: parseInt(clienteId),
      puntaje_total: rf ? rf.puntaje_rf : calculo.puntajeTotal,
      nivel_riesgo: rf ? rf.nivel_riesgo : calculo.nivelRiesgo,
      limite_sugerido: limiteSugerido,
      desglose: {
        puntualidad: calculo.ptsPuntualidad,
        cumplimiento: calculo.ptsCumplimiento,
        historial: calculo.ptsHistorial,
        antiguedad: calculo.ptsAntiguedad
      },
      confianza: rf ? rf.confianza : null
    });
  } catch (err) {
    console.error('Error al calcular scoring:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// El upsert resuelve por (id_cliente, id_tendero). La restricción única de la
// tabla respalda el ON CONFLICT.
async function upsertScoring(clienteId, idTendero, calculo) {
  await pool.query(`
    INSERT INTO scoring (id_cliente, id_tendero, nivel_riesgo, limite_sugerido, confianza, puntaje)
    VALUES ($1, $2, $3, $4, NULL, $5)
    ON CONFLICT (id_cliente, id_tendero) DO UPDATE SET
      nivel_riesgo = EXCLUDED.nivel_riesgo,
      limite_sugerido = EXCLUDED.limite_sugerido,
      puntaje = EXCLUDED.puntaje,
      fecha_calculo = NOW(),
      confianza = NULL
  `, [clienteId, idTendero, calculo.nivelRiesgo, calculo.limiteSugerido, calculo.puntajeTotal]);
}

// GET /api/scoring/:clienteId/recomendacion
// Fuente única para la UI de Recomendación IA: scoring + creditos + clientes
router.get('/:clienteId/recomendacion', async (req, res) => {
  try {
    const { clienteId } = req.params;
    const idTendero = req.user.id_tendero;

    const clienteRow = await pool.query(`
      SELECT id_cliente, nombre_completo FROM clientes WHERE id_cliente = $1
    `, [clienteId]);

    if (clienteRow.rows.length === 0) {
      return res.json({
        estado: 'cliente_no_existe',
        id_cliente: clienteId,
        mensaje: 'Este cliente no está registrado en el sistema. Debes registrarlo antes de asignarle un crédito.',
      });
    }

    const vinculo = await pool.query(`
      SELECT estado FROM tendero_cliente
      WHERE id_tendero = $1 AND id_cliente = $2
    `, [idTendero, clienteId]);

    if (vinculo.rows.length === 0 || vinculo.rows[0].estado !== 'activo') {
      return res.json({
        estado: 'cliente_sin_vinculo',
        id_cliente: clienteId,
        nombre_completo: clienteRow.rows[0].nombre_completo,
        mensaje: 'Este cliente está registrado en el sistema pero no está vinculado a tu tienda. Vincúlalo desde Clientes antes de otorgar un crédito.',
      });
    }

    const creditosHistorico = await queryCreditosHistorico(pool, clienteId, idTendero);
    const sinCreditoTienda = creditosHistorico === 0;

    const scoring = await pool.query(SELECT_SCORING, [clienteId, idTendero]);

    if (scoring.rows.length === 0) {
      return res.status(404).json({
        error: 'No existe scoring. Calcula primero el scoring.',
        estado: sinCreditoTienda ? 'sin_credito_tienda' : 'con_historial',
      });
    }

    const s = await syncMLPrediction(pool, clienteId, scoring.rows[0], idTendero, { sinHistorialCrediticio: sinCreditoTienda });

    const mapped = mapScoringRow(s, { sinHistorialCrediticio: sinCreditoTienda });
    const totales = await queryTotalesCreditos(pool, clienteId, idTendero);

    let recomendacion;
    let mensaje;

    if (sinCreditoTienda) {
      recomendacion = 'con_precaucion';
      mensaje = `El cliente está registrado y vinculado a tu tienda, pero aún no tiene ningún crédito asociado contigo. Puedes crear el primero con un monto de hasta $${mapped.limite_sugerido.toLocaleString('es-CO')}.`;
    } else if (mapped.nivel_riesgo === 'bajo') {
      recomendacion = 'aprobar';
      mensaje = `El cliente tiene un excelente historial con ${mapped.puntaje} puntos. Es muy recomendable aprobar nuevos créditos.`;
    } else if (mapped.nivel_riesgo === 'medio') {
      recomendacion = 'con_precaucion';
      mensaje = `El cliente tiene ${mapped.puntaje} puntos y un nivel de riesgo ${mapped.nivel_riesgo}. Se recomienda aprobar con monitoreo regular.`;
    } else {
      recomendacion = 'rechazar';
      mensaje = `Con solo ${mapped.puntaje} puntos y nivel de riesgo ${mapped.nivel_riesgo}, el cliente presenta alto riesgo de mora. No se recomienda aprobar nuevos créditos en este momento.`;
    }

    res.json({
      estado: sinCreditoTienda ? 'sin_credito_tienda' : 'con_historial',
      id_cliente: clienteId,
      nombre_completo: clienteRow.rows[0].nombre_completo,
      relacion_estado: vinculo.rows[0].estado,
      recomendacion,
      mensaje,
      puntaje: mapped.puntaje,
      nivel_riesgo: mapped.nivel_riesgo,
      limite_sugerido: mapped.limite_sugerido,
      confianza: mapped.confianza,
      fecha_calculo: mapped.fecha_calculo,
      desglose: mapped.desglose,
      totales: {
        ...totales,
        total_historico: creditosHistorico,
      },
    });
  } catch (err) {
    console.error('Error en recomendación:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
