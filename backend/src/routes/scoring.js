const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { getOrComputeScoring } = require('../utils/mlScoring');
const { CLIENTE_NUEVO_SCORING, mapScoringRow, queryTotalesCreditos, queryCreditosHistorico } = require('../utils/scoringUtils');

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

    const creditosHistorico = await queryCreditosHistorico(pool, clienteId, idTendero);
    const sinHistorialCrediticio = creditosHistorico === 0;

    if (sinHistorialCrediticio) {
      return res.json({ id_cliente: parseInt(clienteId), ...CLIENTE_NUEVO_SCORING });
    }

    const scoringRow = await getOrComputeScoring(pool, clienteId, idTendero, { sinHistorialCrediticio });
    if (!scoringRow) {
      return res.status(503).json({ error: 'No se pudo calcular el scoring. Intenta nuevamente en unos minutos.' });
    }

    const mapped = mapScoringRow(scoringRow, { sinHistorialCrediticio });

    res.json({
      id_cliente: parseInt(clienteId),
      puntaje: mapped.puntaje,
      nivel_riesgo: mapped.nivel_riesgo,
      limite_sugerido: mapped.limite_sugerido,
      fecha_calculo: mapped.fecha_calculo,
      confianza: mapped.confianza,
    });
  } catch (err) {
    console.error('Error en scoring:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/scoring/:clienteId/recomendacion
// Fuente única para la UI de Recomendación IA: predicción del RF + creditos + clientes
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

    let mapped;
    if (sinCreditoTienda) {
      mapped = CLIENTE_NUEVO_SCORING;
    } else {
      const scoringRow = await getOrComputeScoring(pool, clienteId, idTendero, { sinHistorialCrediticio: false });
      if (!scoringRow) {
        return res.status(503).json({ error: 'No se pudo calcular la recomendación. Intenta nuevamente en unos minutos.' });
      }
      mapped = mapScoringRow(scoringRow, { sinHistorialCrediticio: false });
    }

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
