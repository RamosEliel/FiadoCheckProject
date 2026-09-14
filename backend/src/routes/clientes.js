const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { CLIENTE_NUEVO_SCORING, mapScoringRow, queryCreditosCerrados } = require('../utils/scoringUtils');
const { getOrComputeScoring } = require('../utils/mlScoring');

const router = express.Router();
router.use(authMiddleware);

const verificarAccesoHistorial = async (idCliente, { idTendero, idUsuario }) => {
  if (idUsuario) {
    const esPropio = await pool.query(
      `SELECT 1 FROM clientes WHERE id_usuario = $1 AND id_cliente = $2`,
      [idUsuario, idCliente]
    );
    if (esPropio.rows.length > 0) return { permitido: true, esClientePropio: true };
  }

  if (idTendero) {
    const verifica = await pool.query(
      `SELECT 1 FROM tendero_cliente WHERE id_tendero = $1 AND id_cliente = $2 AND estado = 'activo'`,
      [idTendero, idCliente]
    );
    if (verifica.rows.length > 0) return { permitido: true, esClientePropio: false };
  }

  return { permitido: false, esClientePropio: false };
};

const construirHistorial = async (idCliente, { idTendero, esClientePropio }) => {
  let resolvedTendero = idTendero;

  if (esClientePropio || !resolvedTendero) {
    const tcResult = await pool.query(
      `SELECT id_tendero FROM tendero_cliente WHERE id_cliente = $1 AND estado = 'activo' LIMIT 1`,
      [idCliente]
    );
    resolvedTendero = tcResult.rows[0]?.id_tendero || null;
  }

  if (!resolvedTendero) return [];

  const creditos = await pool.query(`
    SELECT c.*,
           (SELECT COALESCE(SUM(monto), 0) FROM abonos WHERE id_credito = c.id_credito) as total_abonado
    FROM creditos c
    WHERE c.id_cliente = $1 AND c.id_tendero = $2
    ORDER BY c.fecha_credito DESC
  `, [idCliente, resolvedTendero]);

  const historial = [];

  for (const credito of creditos.rows) {
    const abonos = await pool.query(`
      SELECT id_abono, monto, fecha_abono, created_at
      FROM abonos WHERE id_credito = $1 ORDER BY fecha_abono ASC
    `, [credito.id_credito]);

    historial.push({
      credito: {
        id_credito: credito.id_credito,
        monto_total: parseFloat(credito.monto_total),
        saldo_pendiente: parseFloat(credito.saldo_pendiente),
        descripcion: credito.descripcion,
        fecha_credito: credito.fecha_credito,
        fecha_limite_pago: credito.fecha_limite_pago,
        estado: credito.estado,
        created_at: credito.created_at
      },
      total_abonado: parseFloat(credito.total_abonado),
      abonos: abonos.rows.map(a => ({
        id_abono: a.id_abono,
        monto: parseFloat(a.monto),
        fecha_abono: a.fecha_abono,
        created_at: a.created_at
      }))
    });
  }

  return historial;
};

// GET /api/clientes
router.get('/', async (req, res) => {
  try {
    const { estado, q } = req.query;
    const idTendero = req.user.id_tendero;

    let query = `
      SELECT c.id_cliente, c.nombre_completo, c.telefono, c.direccion, c.estado, c.created_at,
             COALESCE(SUM(CASE WHEN cr.estado != 'pagado' THEN cr.saldo_pendiente ELSE 0 END), 0) as total_deuda,
             COUNT(CASE WHEN cr.estado != 'pagado' THEN cr.id_credito END) as total_creditos
      FROM clientes c
      JOIN tendero_cliente tc ON c.id_cliente = tc.id_cliente
      LEFT JOIN creditos cr ON c.id_cliente = cr.id_cliente AND cr.id_tendero = tc.id_tendero
      WHERE tc.id_tendero = $1 AND tc.estado = 'activo'
    `;
    const params = [idTendero];

    if (q) {
      query += ` AND (c.nombre_completo ILIKE $${params.length + 1} OR c.id_cliente::text ILIKE $${params.length + 1})`;
      params.push(`%${q}%`);
    }

    query += ` GROUP BY c.id_cliente, c.nombre_completo, c.telefono, c.direccion, c.estado, c.created_at`;

    if (estado === 'mora') {
      query += ` HAVING COALESCE(SUM(CASE WHEN cr.estado != 'pagado' THEN cr.saldo_pendiente ELSE 0 END), 0) > 0`;
    } else if (estado === 'al_dia') {
      query += ` HAVING COUNT(CASE WHEN cr.estado = 'vigente' THEN 1 END) > 0 AND COUNT(CASE WHEN cr.estado = 'vencido' THEN 1 END) = 0`;
    } else if (estado === 'sin_deuda') {
      query += ` HAVING COALESCE(SUM(CASE WHEN cr.saldo_pendiente > 0 THEN cr.saldo_pendiente ELSE 0 END), 0) = 0`;
    }

    query += ` ORDER BY total_deuda DESC`;

    const result = await pool.query(query, params);

    res.json(result.rows.map(c => ({
      id_cliente: c.id_cliente,
      nombre_completo: c.nombre_completo,
      telefono: c.telefono,
      direccion: c.direccion,
      estado: c.estado,
      created_at: c.created_at,
      total_deuda: parseFloat(c.total_deuda) || 0,
      total_creditos: parseInt(c.total_creditos) || 0
    })));
  } catch (err) {
    console.error('Error en listar clientes:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/clientes/buscar-asociar?cedula= — busca cliente registrado no vinculado a la tienda
router.get('/buscar-asociar', async (req, res) => {
  try {
    const cedula = String(req.query.cedula || '').trim();
    const idTendero = req.user.id_tendero;

    if (!idTendero) {
      return res.status(403).json({ error: 'Acceso restringido a tenderos' });
    }
    if (!cedula) {
      return res.status(400).json({ error: 'La cédula es requerida' });
    }

    const cliente = await pool.query(`
      SELECT c.id_cliente, c.nombre_completo, c.telefono, c.direccion
      FROM clientes c
      WHERE c.id_cliente = $1
    `, [cedula]);

    if (cliente.rows.length === 0) {
      return res.status(404).json({ error: 'No existe un cliente registrado con esa cédula' });
    }

    const relacion = await pool.query(`
      SELECT estado FROM tendero_cliente
      WHERE id_tendero = $1 AND id_cliente = $2
    `, [idTendero, cedula]);

    if (relacion.rows.length > 0 && relacion.rows[0].estado === 'activo') {
      return res.status(409).json({ error: 'Este cliente ya está en tu cartera' });
    }

    res.json({
      id_cliente: cliente.rows[0].id_cliente,
      nombre_completo: cliente.rows[0].nombre_completo,
      telefono: cliente.rows[0].telefono,
      direccion: cliente.rows[0].direccion,
      relacion_inactiva: relacion.rows.length > 0 && relacion.rows[0].estado !== 'activo',
    });
  } catch (err) {
    console.error('Error en buscar-asociar:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/clientes/asociar — vincula un cliente existente sin crear crédito
router.post('/asociar', async (req, res) => {
  const client = await pool.connect();
  try {
    const idTendero = req.user.id_tendero;
    const clienteId = String(req.body.id_cliente || req.body.cedula || '').trim();

    if (!idTendero) {
      return res.status(403).json({ error: 'Acceso restringido a tenderos' });
    }
    if (!clienteId) {
      return res.status(400).json({ error: 'La cédula del cliente es requerida' });
    }

    await client.query('BEGIN');

    const existeCliente = await client.query(
      'SELECT id_cliente, nombre_completo FROM clientes WHERE id_cliente = $1',
      [clienteId],
    );

    if (existeCliente.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const relacion = await client.query(
      'SELECT estado FROM tendero_cliente WHERE id_tendero = $1 AND id_cliente = $2',
      [idTendero, clienteId],
    );

    if (relacion.rows.length > 0) {
      if (relacion.rows[0].estado === 'activo') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Este cliente ya está en tu cartera' });
      }
      await client.query(
        `UPDATE tendero_cliente SET estado = 'activo' WHERE id_tendero = $1 AND id_cliente = $2`,
        [idTendero, clienteId],
      );
    } else {
      await client.query(
        `INSERT INTO tendero_cliente (id_tendero, id_cliente, estado) VALUES ($1, $2, 'activo')`,
        [idTendero, clienteId],
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Cliente asociado a tu tienda correctamente',
      id_cliente: clienteId,
      nombre_completo: existeCliente.rows[0].nombre_completo,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al asociar cliente:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// GET /api/clientes/me/tiendas-deuda — tiendas con deuda activa (cliente logueado)
router.get('/me/tiendas-deuda', async (req, res) => {
  try {
    const idUsuario = req.user.id_usuario;

    const cliente = await pool.query(
      `SELECT id_cliente FROM clientes WHERE id_usuario = $1 LIMIT 1`,
      [idUsuario]
    );

    if (cliente.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const idCliente = cliente.rows[0].id_cliente;

    const result = await pool.query(`
      SELECT t.id_tendero,
             t.nombre_tienda,
             t.nombre AS nombre_tendero,
             t.telefono,
             t.direccion,
             COALESCE(SUM(cr.saldo_pendiente), 0) AS total_deuda,
             COUNT(cr.id_credito) AS creditos_activos
      FROM tendero_cliente tc
      JOIN tenderos t ON t.id_tendero = tc.id_tendero
      JOIN creditos cr ON cr.id_cliente = tc.id_cliente AND cr.id_tendero = tc.id_tendero
      WHERE tc.id_cliente = $1
        AND tc.estado = 'activo'
        AND cr.estado != 'pagado'
        AND cr.saldo_pendiente > 0
      GROUP BY t.id_tendero, t.nombre_tienda, t.nombre, t.telefono, t.direccion
      HAVING COALESCE(SUM(cr.saldo_pendiente), 0) > 0
      ORDER BY total_deuda DESC
    `, [idCliente]);

    res.json({
      tiendas: result.rows.map((row) => ({
        id_tendero: row.id_tendero,
        nombre_tienda: row.nombre_tienda,
        nombre_tendero: row.nombre_tendero,
        telefono: row.telefono,
        direccion: row.direccion,
        total_deuda: parseFloat(row.total_deuda) || 0,
        creditos_activos: parseInt(row.creditos_activos, 10) || 0,
      })),
    });
  } catch (err) {
    console.error('Error en tiendas-deuda:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/clientes/me (cliente logueado) — DEBE ir antes de /:id
router.get('/me', async (req, res) => {
  try {
    const idUsuario = req.user.id_usuario;
    const idTenderoQuery = req.query.id_tendero ? parseInt(req.query.id_tendero, 10) : null;

    const cliente = await pool.query(`
      SELECT c.*, tc.estado as relacion_estado, tc.id_tendero
      FROM clientes c
      JOIN tendero_cliente tc ON c.id_cliente = tc.id_cliente AND tc.estado = 'activo'
      WHERE c.id_usuario = $1
      ${idTenderoQuery ? 'AND tc.id_tendero = $2' : ''}
      ORDER BY tc.id_tendero ASC
      LIMIT 1
    `, idTenderoQuery ? [idUsuario, idTenderoQuery] : [idUsuario]);

    if (cliente.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const idCliente = cliente.rows[0].id_cliente;
    const idTendero = cliente.rows[0].id_tendero;

    const totales = await pool.query(`
      SELECT COALESCE(SUM(saldo_pendiente), 0) as total_deuda,
             COUNT(*) as total_creditos,
             COUNT(CASE WHEN estado = 'vencido' THEN 1 END) as creditos_vencidos
      FROM creditos WHERE id_cliente = $1 AND id_tendero = $2 AND estado != 'pagado'
    `, [idCliente, idTendero]);

    const creditosCerrados = await queryCreditosCerrados(pool, idCliente, idTendero);
    const sinHistorialCrediticio = creditosCerrados === 0;
    let scoringMapped = null;
    if (sinHistorialCrediticio) {
      scoringMapped = CLIENTE_NUEVO_SCORING;
    } else {
      const scoringRow = await getOrComputeScoring(pool, idCliente, idTendero, { sinHistorialCrediticio: false });
      scoringMapped = scoringRow ? mapScoringRow(scoringRow, { sinHistorialCrediticio: false }) : null;
    }

    const tiendaResult = await pool.query(`
      SELECT t.id_tendero, t.nombre, t.nombre_tienda, t.telefono, t.direccion
      FROM tenderos t
      JOIN tendero_cliente tc ON t.id_tendero = tc.id_tendero
      WHERE tc.id_cliente = $1 AND tc.id_tendero = $2 AND tc.estado = 'activo'
      LIMIT 1
    `, [idCliente, idTendero]);

    const tienda = tiendaResult.rows[0] || null;

    res.json({
      id_cliente: idCliente,
      nombre_completo: cliente.rows[0].nombre_completo,
      telefono: cliente.rows[0].telefono,
      direccion: cliente.rows[0].direccion,
      estado: cliente.rows[0].estado,
      created_at: cliente.rows[0].created_at,
      tienda: tienda ? {
        id_tendero: tienda.id_tendero,
        nombre_tendero: tienda.nombre,
        nombre_tienda: tienda.nombre_tienda,
        telefono: tienda.telefono,
        direccion: tienda.direccion
      } : null,
      id_tendero: idTendero,
      scoring: scoringMapped,
      totales: {
        total_deuda: parseFloat(totales.rows[0].total_deuda) || 0,
        total_creditos: parseInt(totales.rows[0].total_creditos) || 0,
        creditos_vencidos: parseInt(totales.rows[0].creditos_vencidos) || 0
      }
    });
  } catch (err) {
    console.error('Error en obtener cliente logueado:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/clientes/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const idTendero = req.user.id_tendero;

    const cliente = await pool.query(`
      SELECT c.*, tc.estado as relacion_estado
      FROM clientes c
      LEFT JOIN tendero_cliente tc ON c.id_cliente = tc.id_cliente AND tc.id_tendero = $2
      WHERE c.id_cliente = $1
    `, [id, idTendero]);

    if (cliente.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const totales = await pool.query(`
      SELECT COALESCE(SUM(saldo_pendiente), 0) as total_deuda,
             COUNT(*) as total_creditos,
             COUNT(CASE WHEN estado = 'vencido' THEN 1 END) as creditos_vencidos
      FROM creditos WHERE id_cliente = $1 AND id_tendero = $2 AND estado != 'pagado'
    `, [id, idTendero]);

    const creditosCerrados = await queryCreditosCerrados(pool, id, idTendero);
    const sinHistorialCrediticio = creditosCerrados === 0;
    let scoringMapped = null;
    if (sinHistorialCrediticio) {
      scoringMapped = CLIENTE_NUEVO_SCORING;
    } else {
      const scoringRow = await getOrComputeScoring(pool, id, idTendero, { sinHistorialCrediticio: false });
      scoringMapped = scoringRow ? mapScoringRow(scoringRow, { sinHistorialCrediticio: false }) : null;
    }

    const tiendaResult = await pool.query(`
      SELECT t.nombre, t.nombre_tienda, t.telefono, t.direccion
      FROM tenderos t
      JOIN tendero_cliente tc ON t.id_tendero = tc.id_tendero
      WHERE tc.id_cliente = $1 AND tc.estado = 'activo'
      LIMIT 1
    `, [id]);

    const tienda = tiendaResult.rows[0] || null;

    res.json({
      id_cliente: cliente.rows[0].id_cliente,
      nombre_completo: cliente.rows[0].nombre_completo,
      telefono: cliente.rows[0].telefono,
      direccion: cliente.rows[0].direccion,
      estado: cliente.rows[0].estado,
      relacion_estado: cliente.rows[0].relacion_estado,
      created_at: cliente.rows[0].created_at,
      tienda: tienda ? {
        nombre_tendero: tienda.nombre,
        nombre_tienda: tienda.nombre_tienda,
        telefono: tienda.telefono,
        direccion: tienda.direccion
      } : null,
      scoring: scoringMapped,
      totales: {
        total_deuda: parseFloat(totales.rows[0].total_deuda) || 0,
        total_creditos: parseInt(totales.rows[0].total_creditos) || 0,
        creditos_vencidos: parseInt(totales.rows[0].creditos_vencidos) || 0
      }
    });
  } catch (err) {
    console.error('Error en obtener cliente:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/clientes
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { nombre, identificacion, telefono, direccion } = req.body;
    const idTendero = req.user.id_tendero;

    if (!idTendero) {
      return res.status(403).json({ error: 'Acceso restringido a tenderos' });
    }

    if (!nombre || !identificacion || !telefono) {
      return res.status(400).json({ error: 'Nombre, identificación y teléfono son requeridos' });
    }

    await client.query('BEGIN');

    const cedula = String(identificacion).trim();

    const existe = await client.query(
      'SELECT id_cliente, nombre_completo FROM clientes WHERE id_cliente = $1',
      [cedula],
    );

    let clienteId;
    let nombreCliente;

    if (existe.rows.length > 0) {
      clienteId = existe.rows[0].id_cliente;
      nombreCliente = existe.rows[0].nombre_completo;
    } else {
      const result = await client.query(`
        INSERT INTO clientes (id_cliente, id_usuario, nombre_completo, telefono, direccion, estado)
        VALUES ($1, NULL, $2, $3, $4, $5) RETURNING id_cliente, nombre_completo
      `, [cedula, nombre.trim(), telefono.trim(), direccion?.trim() || null, 'activo']);
      clienteId = result.rows[0].id_cliente;
      nombreCliente = result.rows[0].nombre_completo;
    }

    const relacion = await client.query(
      'SELECT estado FROM tendero_cliente WHERE id_tendero = $1 AND id_cliente = $2',
      [idTendero, clienteId],
    );

    if (relacion.rows.length > 0) {
      if (relacion.rows[0].estado === 'activo') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Este cliente ya está en tu cartera' });
      }
      await client.query(
        `UPDATE tendero_cliente SET estado = 'activo' WHERE id_tendero = $1 AND id_cliente = $2`,
        [idTendero, clienteId],
      );
    } else {
      await client.query(
        `INSERT INTO tendero_cliente (id_tendero, id_cliente, estado) VALUES ($1, $2, 'activo')`,
        [idTendero, clienteId],
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: existe.rows.length > 0
        ? 'Cliente asociado a tu tienda correctamente'
        : 'Cliente registrado y asociado correctamente',
      id_cliente: clienteId,
      nombre_completo: nombreCliente,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al crear cliente:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

// PUT /api/clientes/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_completo, telefono, direccion, estado } = req.body;
    const idTendero = req.user.id_tendero;

    // Verificar pertenencia
    const verifica = await pool.query(`
      SELECT 1 FROM tendero_cliente WHERE id_tendero = $1 AND id_cliente = $2 AND estado = 'activo'
    `, [idTendero, id]);

    if (verifica.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (nombre_completo) {
      updates.push(`nombre_completo = $${paramIndex++}`);
      values.push(nombre_completo);
    }
    if (telefono) {
      updates.push(`telefono = $${paramIndex++}`);
      values.push(telefono);
    }
    if (direccion) {
      updates.push(`direccion = $${paramIndex++}`);
      values.push(direccion);
    }
    if (estado) {
      const estadosValidos = ['activo', 'sin_deuda', 'inactivo'];
      if (!estadosValidos.includes(estado)) {
        return res.status(400).json({
          error: `Estado inválido. Valores válidos: ${estadosValidos.join(', ')}`,
        });
      }
      updates.push(`estado = $${paramIndex++}`);
      values.push(estado);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No se proporcionaron datos para actualizar' });
    }

    values.push(id);
    await pool.query(
      `UPDATE clientes SET ${updates.join(', ')} WHERE id_cliente = $${paramIndex}`,
      values
    );

    res.json({ message: 'Cliente actualizado correctamente' });
  } catch (err) {
    console.error('Error al actualizar cliente:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/clientes/me/historial — historial del cliente logueado
router.get('/me/historial', async (req, res) => {
  try {
    const idUsuario = req.user.id_usuario;

    const cliente = await pool.query(
      `SELECT id_cliente FROM clientes WHERE id_usuario = $1 LIMIT 1`,
      [idUsuario]
    );

    if (cliente.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const idCliente = cliente.rows[0].id_cliente;
    const idTenderoQuery = req.query.id_tendero ? parseInt(req.query.id_tendero, 10) : null;

    const acceso = await verificarAccesoHistorial(idCliente, {
      idTendero: idTenderoQuery,
      idUsuario,
    });

    if (!acceso.permitido) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    let idTendero = idTenderoQuery;
    if (!idTendero) {
      const tcResult = await pool.query(
        `SELECT id_tendero FROM tendero_cliente WHERE id_cliente = $1 AND estado = 'activo' LIMIT 1`,
        [idCliente]
      );
      idTendero = tcResult.rows[0]?.id_tendero || null;
    }

    const historial = await construirHistorial(idCliente, {
      idTendero,
      esClientePropio: true,
    });

    res.json({ cliente_id: idCliente, historial });
  } catch (err) {
    console.error('Error en historial /me:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/clientes/:id/historial
router.get('/:id/historial', async (req, res) => {
  try {
    const { id } = req.params;
    const { id_tendero: idTendero, id_usuario: idUsuario } = req.user;

    const acceso = await verificarAccesoHistorial(id, { idTendero, idUsuario });

    if (!acceso.permitido) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const historial = await construirHistorial(id, {
      idTendero,
      esClientePropio: acceso.esClientePropio,
    });

    res.json({ cliente_id: id, historial });
  } catch (err) {
    console.error('Error en historial:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/clientes/:id/pagos
router.get('/:id/pagos', async (req, res) => {
  try {
    const { id } = req.params;
    const idTendero = req.user.id_tendero;

    const verifica = await pool.query(`
      SELECT 1 FROM tendero_cliente WHERE id_tendero = $1 AND id_cliente = $2 AND estado = 'activo'
    `, [idTendero, id]);

    if (verifica.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const pagos = await pool.query(`
      SELECT a.id_abono, a.monto, a.fecha_abono, a.created_at,
             c.id_credito, c.monto_total, c.saldo_pendiente, c.descripcion
      FROM abonos a
      JOIN creditos c ON a.id_credito = c.id_credito
      WHERE a.id_cliente = $1 AND c.id_tendero = $2
      ORDER BY a.fecha_abono DESC
    `, [id, idTendero]);

    res.json({
      cliente_id: id,
      pagos: pagos.rows.map(p => ({
        id_abono: p.id_abono,
        monto: parseFloat(p.monto),
        fecha_abono: p.fecha_abono,
        created_at: p.created_at,
        credito: {
          id_credito: p.id_credito,
          monto_total: parseFloat(p.monto_total),
          saldo_pendiente: parseFloat(p.saldo_pendiente),
          descripcion: p.descripcion
        }
      }))
    });
  } catch (err) {
    console.error('Error en pagos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


module.exports = router;