const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { validateBody, validateQuery, validateParams, rules } = require('../middlewares/validateBody');
const { triggerMLRetrain } = require('../utils/mlTrigger');
const { invalidateScoring } = require('../utils/mlScoring');
const { todayBusinessKey } = require('../utils/dateUtils');
const { marcarCreditosVencidos } = require('../utils/creditosMora');
const creditsController = require('../modules/creditos/credits.controller');

const router = express.Router();
router.use(authMiddleware);

// GET /api/creditos
router.get('/', validateQuery([
  rules.positiveInt('clienteId'),
  rules.oneOf('estado', ['vigente', 'pagado', 'vencido']),
]), async (req, res) => {
  try {
    const { clienteId, estado } = req.query;
    const idTendero = req.user.id_tendero;

    await marcarCreditosVencidos(pool, { idTendero });

    let query = `
      SELECT cr.*, cl.nombre_completo as nombre_cliente, cl.telefono
      FROM creditos cr
      JOIN clientes cl ON cr.id_cliente = cl.id_cliente
      WHERE cr.id_tendero = $1
    `;
    const params = [idTendero];

    if (clienteId) {
      query += ` AND cr.id_cliente = $${params.length + 1}`;
      params.push(clienteId);
    }

    if (estado) {
      query += ` AND cr.estado = $${params.length + 1}`;
      params.push(estado);
    }

    query += ` ORDER BY cr.created_at DESC`;

    const result = await pool.query(query, params);

    res.json(result.rows.map(c => ({
      id_credito: c.id_credito,
      id_cliente: c.id_cliente,
      nombre_cliente: c.nombre_cliente,
      telefono: c.telefono,
      monto_total: parseFloat(c.monto_total),
      saldo_pendiente: parseFloat(c.saldo_pendiente),
      descripcion: c.descripcion,
      fecha_credito: c.fecha_credito,
      fecha_limite_pago: c.fecha_limite_pago,
      estado: c.estado,
      created_at: c.created_at
    })));
  } catch (err) {
    console.error('Error en listar créditos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/creditos/cliente/:clienteId  ← DEBE IR ANTES de /:id para evitar conflicto de rutas
router.get('/cliente/:clienteId', async (req, res) => {
  try {
    const { clienteId } = req.params;
    const idTendero = req.user.id_tendero;

    const verifica = await pool.query(`
      SELECT 1 FROM tendero_cliente WHERE id_tendero = $1 AND id_cliente = $2 AND estado = 'activo'
    `, [idTendero, clienteId]);

    if (verifica.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const creditos = await pool.query(`
      SELECT id_credito, monto_total, saldo_pendiente, descripcion,
             fecha_credito, fecha_limite_pago, estado, created_at
      FROM creditos WHERE id_cliente = $1 AND id_tendero = $2 AND estado != 'pagado'
      ORDER BY created_at DESC
    `, [clienteId, idTendero]);

    res.json({
      cliente_id: clienteId,
      creditos: creditos.rows.map(c => ({
        id_credito: c.id_credito,
        monto_total: parseFloat(c.monto_total),
        saldo_pendiente: parseFloat(c.saldo_pendiente),
        descripcion: c.descripcion,
        fecha_credito: c.fecha_credito,
        fecha_limite_pago: c.fecha_limite_pago,
        estado: c.estado,
        created_at: c.created_at
      }))
    });
  } catch (err) {
    console.error('Error en créditos por cliente:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/creditos/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const idTendero = req.user.id_tendero;
    const idUsuario = req.user.id_usuario;

    if (idTendero) {
      await marcarCreditosVencidos(pool, { idTendero });
    }

    const credito = await pool.query(`
      SELECT cr.*, cl.nombre_completo as nombre_cliente, cl.telefono, cl.direccion,
             t.nombre as nombre_tendero, t.nombre_tienda
      FROM creditos cr
      JOIN clientes cl ON cr.id_cliente = cl.id_cliente
      JOIN tenderos t ON cr.id_tendero = t.id_tendero
      WHERE cr.id_credito = $1 AND (cr.id_tendero = $2 OR cl.id_usuario = $3)
    `, [id, idTendero, idUsuario]);

    if (credito.rows.length === 0) {
      return res.status(404).json({ error: 'Crédito no encontrado' });
    }

    const c = credito.rows[0];
    const diasAtraso = c.estado === 'vencido'
      ? Math.max(0, Math.floor((new Date() - new Date(c.fecha_limite_pago)) / (1000 * 60 * 60 * 24)))
      : 0;

    if (c.estado === 'vencido' && diasAtraso > 30) {
      triggerMLRetrain('credito_mora_30').catch(() => {});
    }

    const abonos = await pool.query(`
      SELECT id_abono, monto, fecha_abono, created_at
      FROM abonos WHERE id_credito = $1 ORDER BY fecha_abono ASC
    `, [id]);

    const totalAbonado = abonos.rows.reduce((sum, a) => sum + parseFloat(a.monto), 0);

    res.json({
      id_credito: c.id_credito,
      id_cliente: c.id_cliente,
      nombre_cliente: c.nombre_cliente,
      telefono: c.telefono,
      direccion: c.direccion,
      nombre_tendero: c.nombre_tendero,
      nombre_tienda: c.nombre_tienda,
      monto_total: parseFloat(c.monto_total),
      saldo_pendiente: parseFloat(c.saldo_pendiente),
      total_abonado: totalAbonado,
      descripcion: c.descripcion,
      fecha_credito: c.fecha_credito,
      fecha_limite_pago: c.fecha_limite_pago,
      estado: c.estado,
      dias_atraso: diasAtraso,
      created_at: c.created_at,
      abonos: abonos.rows.map(a => ({
        id_abono: a.id_abono,
        monto: parseFloat(a.monto),
        fecha_abono: a.fecha_abono,
        created_at: a.created_at
      }))
    });
  } catch (err) {
    console.error('Error en obtener crédito:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/creditos
router.post('/', validateBody([
  rules.required('clienteId'),
  rules.positiveInt('clienteId'),
  rules.required('montoTotal'),
  rules.positiveNumber('montoTotal'),
  rules.required('fechaLimitePago'),
  rules.isoDate('fechaLimitePago'),
  rules.string('descripcion', { max: 500 }),
]), async (req, res) => {
  try {
    const { clienteId, montoTotal, descripcion, fechaLimitePago } = req.body;
    const idTendero = req.user.id_tendero;

    // 1. Verificar que el cliente esté vinculado a la cartera de ESTE tendero
    const clienteVinculado = await pool.query(
      `SELECT 1 FROM tendero_cliente WHERE id_tendero = $1 AND id_cliente = $2 AND estado = 'activo'`,
      [idTendero, clienteId]
    );
    if (clienteVinculado.rows.length === 0) {
      return res.status(403).json({
        error: 'El cliente no está vinculado a tu cartera. Usa la opción "vincular cliente" primero.'
      });
    }

    const fechaCredito = todayBusinessKey();

    const result = await pool.query(`
      INSERT INTO creditos (id_cliente, id_tendero, monto_total, saldo_pendiente, descripcion, fecha_credito, fecha_limite_pago, estado)
      VALUES ($1, $2, $3, $3, $4, $5, $6, 'vigente')
      RETURNING id_credito
    `, [clienteId, idTendero, montoTotal, descripcion || '', fechaCredito, fechaLimitePago]);

    res.status(201).json({
      message: 'Crédito registrado correctamente',
      id_credito: result.rows[0].id_credito
    });
  } catch (err) {
    console.error('Error al registrar crédito:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/creditos/:id
router.patch('/:id', validateParams([rules.paramPositiveInt('id')]), async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const idTendero = req.user.id_tendero;

    const credito = await pool.query(`
      SELECT id_cliente FROM creditos WHERE id_credito = $1 AND id_tendero = $2
    `, [id, idTendero]);

    if (credito.rows.length === 0) {
      return res.status(404).json({ error: 'Crédito no encontrado' });
    }

    if (!estado || !['vigente', 'pagado', 'vencido'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido. Valores válidos: vigente, pagado, vencido' });
    }

    await pool.query(
      'UPDATE creditos SET estado = $1 WHERE id_credito = $2',
      [estado, id]
    );

    // El crédito se cerró (pagado o vencido): el historial que alimenta las
    // features de este par cambió, así que la predicción cacheada ya no aplica.
    if (estado === 'pagado' || estado === 'vencido') {
      try {
        await invalidateScoring(pool, credito.rows[0].id_cliente, idTendero);
      } catch (invalidateErr) {
        console.error('Error invalidando caché de scoring:', invalidateErr.message);
      }
    }

    res.json({ message: 'Estado del crédito actualizado' });
  } catch (err) {
    console.error('Error al actualizar crédito:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// NOTA: GET /cliente/:clienteId fue movido ANTES de GET /:id (línea ~58) para evitar conflicto de rutas Express.

// POST /api/creditos/:creditoId/abonos
router.post('/:creditoId/abonos', validateParams([rules.paramPositiveInt('creditoId')]), validateBody([
  rules.required('monto'),
  rules.positiveNumber('monto'),
  rules.required('fechaAbono'),
  rules.isoDate('fechaAbono'),
]), creditsController.registrarAbono);

// GET /api/creditos/:creditoId/abonos
router.get('/:creditoId/abonos', async (req, res) => {
  try {
    const { creditoId } = req.params;
    const idTendero = req.user.id_tendero;

    const credito = await pool.query(`
      SELECT 1 FROM creditos WHERE id_credito = $1 AND id_tendero = $2
    `, [creditoId, idTendero]);

    if (credito.rows.length === 0) {
      return res.status(404).json({ error: 'Crédito no encontrado' });
    }

    const abonos = await pool.query(`
      SELECT id_abono, monto, fecha_abono, created_at
      FROM abonos WHERE id_credito = $1 ORDER BY fecha_abono ASC
    `, [creditoId]);

    const totalAbonado = abonos.rows.reduce((sum, a) => sum + parseFloat(a.monto), 0);

    res.json({
      credito_id: parseInt(creditoId),
      total_abonado: totalAbonado,
      abonos: abonos.rows.map(a => ({
        id_abono: a.id_abono,
        monto: parseFloat(a.monto),
        fecha_abono: a.fecha_abono,
        created_at: a.created_at
      }))
    });
  } catch (err) {
    console.error('Error al listar abonos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;