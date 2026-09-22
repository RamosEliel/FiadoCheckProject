const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');
const { validateParams, validateBody, rules } = require('../middlewares/validateBody');

const router = express.Router();
router.use(authMiddleware);

let tablaLista = false;

async function asegurarTablaLeidos() {
  if (tablaLista) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS avisos_cliente_leidos (
      id_cliente VARCHAR(50) NOT NULL REFERENCES clientes(id_cliente),
      id_credito INTEGER NOT NULL REFERENCES creditos(id_credito),
      tipo VARCHAR(20) NOT NULL,
      leido_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (id_cliente, id_credito, tipo)
    )
  `);
  tablaLista = true;
}

async function clienteDeLaSesion(req) {
  if (Number(req.user.id_rol) === 1) return null;
  const result = await pool.query(
    'SELECT id_cliente FROM clientes WHERE id_usuario = $1 LIMIT 1',
    [req.user.id_usuario]
  );
  return result.rows[0]?.id_cliente ?? null;
}

function clasificarCredito(estado, fechaLimite) {
  const limite = new Date(fechaLimite);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  limite.setHours(0, 0, 0, 0);
  const dias = Math.floor((hoy - limite) / (1000 * 60 * 60 * 24));

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

// GET /api/recordatorios/me
// Recordatorios del cliente autenticado, a partir de sus créditos abiertos.
router.get('/me', async (req, res) => {
  try {
    const idCliente = await clienteDeLaSesion(req);
    if (!idCliente) {
      return res.status(403).json({ error: 'Los recordatorios de esta ruta son para clientes' });
    }

    await asegurarTablaLeidos();

    const creditos = await pool.query(`
      SELECT cr.id_credito, cr.id_cliente, cr.monto_total, cr.saldo_pendiente,
             cr.estado, cr.fecha_limite_pago, cr.created_at,
             COALESCE(t.nombre_tienda, t.nombre, 'Tu tienda') AS nombre_tienda
      FROM creditos cr
      JOIN tenderos t ON t.id_tendero = cr.id_tendero
      WHERE cr.id_cliente = $1 AND cr.estado IN ('vigente', 'vencido')
      ORDER BY cr.fecha_limite_pago ASC
    `, [idCliente]);

    const leidos = await pool.query(`
      SELECT id_credito, tipo FROM avisos_cliente_leidos WHERE id_cliente = $1
    `, [idCliente]);
    const leidosSet = new Set(leidos.rows.map(r => `${r.id_credito}:${r.tipo}`));

    const avisos = [];
    for (const credito of creditos.rows) {
      const clasificacion = clasificarCredito(credito.estado, credito.fecha_limite_pago);
      if (!clasificacion) continue;
      if (leidosSet.has(`${credito.id_credito}:${clasificacion.tipo}`)) continue;

      avisos.push({
        id_alerta: credito.id_credito,
        id_cliente: credito.id_cliente,
        id_credito: credito.id_credito,
        nombre_cliente: credito.nombre_tienda,
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
    avisos.sort((a, b) => orden[a.tipo] - orden[b.tipo] || b.dias_atraso - a.dias_atraso);

    res.json(avisos);
  } catch (err) {
    console.error('Error en recordatorios del cliente:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/recordatorios/:id/leer
// :id es el id_credito. El tipo evita ocultar un aviso más grave del mismo crédito.
router.patch('/:id/leer', validateParams([
  rules.paramPositiveInt('id'),
]), validateBody([
  rules.required('tipo'),
  rules.oneOf('tipo', ['critica', 'proxima', 'informativa']),
]), async (req, res) => {
  try {
    const idCliente = await clienteDeLaSesion(req);
    if (!idCliente) {
      return res.status(403).json({ error: 'Los recordatorios de esta ruta son para clientes' });
    }

    await asegurarTablaLeidos();

    const { id } = req.params;
    const { tipo } = req.body;

    const propio = await pool.query(`
      SELECT 1 FROM creditos WHERE id_credito = $1 AND id_cliente = $2
    `, [id, idCliente]);

    if (propio.rows.length === 0) {
      return res.status(404).json({ error: 'Recordatorio no encontrado' });
    }

    await pool.query(`
      INSERT INTO avisos_cliente_leidos (id_cliente, id_credito, tipo)
      VALUES ($1, $2, $3)
      ON CONFLICT (id_cliente, id_credito, tipo) DO NOTHING
    `, [idCliente, id, tipo]);

    res.json({ message: 'Recordatorio marcado como leído' });
  } catch (err) {
    console.error('Error al marcar recordatorio:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
