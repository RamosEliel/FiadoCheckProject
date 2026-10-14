const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { validateQuery, validateParams, rules } = require('../middlewares/validateBody');
const { marcarCreditosVencidos } = require('../utils/creditosMora');
const { clasificarCredito } = require('../utils/avisosCredito');

const router = express.Router();
router.use(authMiddleware);

let tablaLista = false;

// Las alertas del tendero se calculan al consultarlas, a partir de sus créditos
// abiertos (misma regla que los recordatorios del cliente). Esta tabla solo
// recuerda cuáles ya leyó, por crédito y tipo, para no ocultar un aviso más grave.
async function asegurarTablaLeidos() {
  if (tablaLista) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS avisos_tendero_leidos (
      id_tendero VARCHAR(50) NOT NULL REFERENCES tenderos(id_tendero),
      id_credito INTEGER NOT NULL REFERENCES creditos(id_credito),
      tipo VARCHAR(20) NOT NULL,
      leido_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (id_tendero, id_credito, tipo)
    )
  `);
  tablaLista = true;
}

// GET /api/alertas
router.get('/', validateQuery([
  rules.oneOf('tipo', ['critica', 'proxima', 'informativa']),
]), async (req, res) => {
  try {
    const { tipo } = req.query;
    const idTendero = req.user.id_tendero;

    if (!idTendero) return res.json([]);

    await asegurarTablaLeidos();
    await marcarCreditosVencidos(pool, { idTendero });

    const creditos = await pool.query(`
      SELECT cr.id_credito, cr.id_cliente, cl.nombre_completo AS nombre_cliente,
             cr.monto_total, cr.saldo_pendiente, cr.estado, cr.fecha_limite_pago, cr.created_at
      FROM creditos cr
      JOIN clientes cl ON cl.id_cliente = cr.id_cliente
      WHERE cr.id_tendero = $1 AND cr.estado IN ('vigente', 'vencido')
    `, [idTendero]);

    const leidos = await pool.query(
      'SELECT id_credito, tipo FROM avisos_tendero_leidos WHERE id_tendero = $1',
      [idTendero]
    );
    const leidosSet = new Set(leidos.rows.map(r => `${r.id_credito}:${r.tipo}`));

    const alertas = [];
    for (const credito of creditos.rows) {
      const clasificacion = clasificarCredito(credito.estado, credito.fecha_limite_pago);
      if (!clasificacion) continue;
      if (tipo && clasificacion.tipo !== tipo) continue;
      if (leidosSet.has(`${credito.id_credito}:${clasificacion.tipo}`)) continue;

      alertas.push({
        id_alerta: credito.id_credito,
        id_cliente: credito.id_cliente,
        id_credito: credito.id_credito,
        nombre_cliente: credito.nombre_cliente,
        tipo: clasificacion.tipo,
        dias_atraso: clasificacion.dias_atraso,
        detalle: clasificacion.detalle,
        monto_total: parseFloat(credito.monto_total),
        saldo_pendiente: parseFloat(credito.saldo_pendiente),
        leida: false,
        created_at: credito.created_at,
      });
    }

    const orden = { critica: 1, proxima: 2, informativa: 3 };
    alertas.sort((a, b) => orden[a.tipo] - orden[b.tipo] || b.dias_atraso - a.dias_atraso);

    res.json(alertas);
  } catch (err) {
    console.error('Error en alertas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/alertas/:id/leer
// :id es el id_credito de la alerta. El tipo se toma de la clasificación actual
// del crédito, de modo que el cliente de la app no necesita enviarlo.
router.patch('/:id/leer', validateParams([rules.paramPositiveInt('id')]), async (req, res) => {
  try {
    const { id } = req.params;
    const idTendero = req.user.id_tendero;

    const credito = await pool.query(
      'SELECT estado, fecha_limite_pago FROM creditos WHERE id_credito = $1 AND id_tendero = $2',
      [id, idTendero]
    );

    if (credito.rows.length === 0) {
      return res.status(404).json({ error: 'Alerta no encontrada' });
    }

    await asegurarTablaLeidos();

    const clasificacion = clasificarCredito(credito.rows[0].estado, credito.rows[0].fecha_limite_pago);
    if (clasificacion) {
      await pool.query(
        `INSERT INTO avisos_tendero_leidos (id_tendero, id_credito, tipo)
         VALUES ($1, $2, $3)
         ON CONFLICT (id_tendero, id_credito, tipo) DO NOTHING`,
        [idTendero, id, clasificacion.tipo]
      );
    }

    res.json({ message: 'Alerta marcada como leída' });
  } catch (err) {
    console.error('Error al marcar alerta:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
