const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { marcarCreditosVencidos } = require('../utils/creditosMora');
const { todayBusinessKey, toDateKey } = require('../utils/dateUtils');

const router = express.Router();
router.use(authMiddleware);

// GET /api/dashboard
router.get('/', async (req, res) => {
  try {
    let idTendero = req.user.id_tendero;

    // Fallback: tokens emitidos antes del fix de id_rol, o JWT sin id_tendero
    if (!idTendero && Number(req.user.id_rol) === 1 && req.user.id_usuario) {
      const tendero = await pool.query(
        'SELECT id_tendero FROM tenderos WHERE id_usuario = $1',
        [req.user.id_usuario]
      );
      idTendero = tendero.rows[0]?.id_tendero || null;
    }

    if (!idTendero) {
      return res.status(403).json({ error: 'No tienes permisos para acceder al dashboard' });
    }

    await marcarCreditosVencidos(pool, { idTendero });

    // Cartera total
    const carteraResult = await pool.query(`
      SELECT COALESCE(SUM(monto_total), 0) as cartera_total,
             COALESCE(SUM(saldo_pendiente), 0) as monto_total_pendiente,
             COALESCE(SUM(CASE WHEN estado = 'vencido' THEN saldo_pendiente ELSE 0 END), 0) as monto_en_mora,
             COALESCE(SUM(CASE WHEN estado = 'vigente' THEN saldo_pendiente ELSE 0 END), 0) as monto_al_dia
      FROM creditos
      WHERE id_tendero = $1 AND estado != 'pagado'
    `, [idTendero]);

    // Conteo de clientes
    const clientesCount = await pool.query(`
      SELECT COUNT(*) as total_clientes,
            COUNT(CASE WHEN c.estado = 'sin_deuda' THEN 1 END) as clientes_sin_deuda
      FROM clientes c
      JOIN tendero_cliente tc ON c.id_cliente = tc.id_cliente
      WHERE tc.id_tendero = $1 AND tc.estado = 'activo'
    `, [idTendero]);

    // Clientes en mora
    const moraCount = await pool.query(`
      SELECT COUNT(DISTINCT c.id_cliente) as clientes_en_mora
      FROM clientes c
      JOIN creditos cr ON c.id_cliente = cr.id_cliente
      WHERE cr.id_tendero = $1 AND cr.estado = 'vencido'
    `, [idTendero]);

    const primerDiaMes = `${todayBusinessKey().slice(0, 8)}01`;

    const movimientos = await pool.query(`
      SELECT * FROM (
        SELECT
          a.id_abono AS id,
          a.monto,
          a.fecha_abono AS fecha,
          c.nombre_completo,
          cr.monto_total,
          cr.saldo_pendiente,
          'pago'::text AS tipo
        FROM abonos a
        JOIN clientes c ON a.id_cliente = c.id_cliente
        JOIN creditos cr ON a.id_credito = cr.id_credito
        WHERE cr.id_tendero = $1

        UNION ALL

        SELECT
          cr.id_credito AS id,
          cr.monto_total AS monto,
          cr.fecha_credito AS fecha,
          c.nombre_completo,
          cr.monto_total,
          cr.saldo_pendiente,
          'credito'::text AS tipo
        FROM creditos cr
        JOIN clientes c ON cr.id_cliente = c.id_cliente
        WHERE cr.id_tendero = $1
      ) mov
      WHERE fecha::date >= $2::date
      ORDER BY fecha DESC, CASE WHEN tipo = 'pago' THEN 0 ELSE 1 END
      LIMIT 50
    `, [idTendero, primerDiaMes]);

    const montoTotalPendiente = parseFloat(carteraResult.rows[0].monto_total_pendiente) || 0;

    res.json({
      cartera_total: montoTotalPendiente,
      monto_total_pendiente: montoTotalPendiente,
      monto_en_mora: parseFloat(carteraResult.rows[0].monto_en_mora) || 0,
      monto_al_dia: parseFloat(carteraResult.rows[0].monto_al_dia) || 0,
      total_clientes: parseInt(clientesCount.rows[0].total_clientes) || 0,
      clientes_en_mora: parseInt(moraCount.rows[0].clientes_en_mora) || 0,
      clientes_sin_deuda: parseInt(clientesCount.rows[0].clientes_sin_deuda) || 0,
      ultimos_movimientos: movimientos.rows.map(m => ({
        id_abono: m.id,
        monto: parseFloat(m.monto),
        fecha: toDateKey(m.fecha),
        cliente: m.nombre_completo,
        credito_monto: parseFloat(m.monto_total),
        saldo_pendiente: parseFloat(m.saldo_pendiente),
        tipo: m.tipo
      }))
    });
  } catch (err) {
    console.error('Error en dashboard:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;