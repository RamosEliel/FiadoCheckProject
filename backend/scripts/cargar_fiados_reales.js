/**
 * Registra los 3 tenderos reales y carga créditos/abonos transcritos de los cuadernos.
 *
 * Mapeo de fotos:
 *   zip 13.13.10 (5 fotos, hoja blanca) → Yeison Duque / La Poderosa
 *   zip 13.12.54 (cartones)             → Antonio Banda / Mi Viejo San Roque
 *   zip 13.12.18 (15 fotos)             → Wilmar Soto / La Poderosa #3
 *
 * Uso (desde backend/):
 *   node scripts/cargar_fiados_reales.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('../src/config/database');

const PASSWORD = process.env.FIADOS_REALES_PASSWORD || 'FiadoReal2026!';
const JSON_PATH = path.join(__dirname, 'data', 'fiados_reales.json');

const TENDEROS = [
  {
    jsonId: 901,
    nombre: 'Yeison Duque',
    nombre_tienda: 'La Poderosa',
    email: 'yeison.duque@fiadocheck.com',
    cedula: '1090000901',
    telefono: '3001090901',
    direccion: 'Sincelejo',
    num_camara_comercio: 'CC-PODEROSA-001',
  },
  {
    jsonId: 902,
    nombre: 'Antonio Banda',
    nombre_tienda: 'Mi Viejo San Roque',
    email: 'antonio.banda@fiadocheck.com',
    cedula: '1090000902',
    telefono: '3001090902',
    direccion: 'Sincelejo',
    num_camara_comercio: 'CC-SANROQUE-001',
  },
  {
    jsonId: 903,
    nombre: 'Wilmar Soto',
    nombre_tienda: 'La Poderosa #3',
    email: 'wilmar.soto@fiadocheck.com',
    cedula: '1090000903',
    telefono: '3001090903',
    direccion: 'Sincelejo',
    num_camara_comercio: 'CC-PODEROSA3-001',
  },
];

function clienteCedula(jsonIdCliente) {
  return `88${String(jsonIdCliente).padStart(8, '0')}`;
}

async function upsertTendero(client, t, passwordHash) {
  const byEmail = await client.query(
    `SELECT u.id_usuario, tnd.id_tendero, tnd.nombre_tienda
     FROM usuario u
     LEFT JOIN tenderos tnd ON tnd.id_usuario = u.id_usuario
     WHERE u.email = $1`,
    [t.email]
  );

  if (byEmail.rows.length > 0) {
    const row = byEmail.rows[0];
    if (row.id_tendero) {
      await client.query(
        `UPDATE tenderos
         SET nombre = $1, nombre_tienda = $2, telefono = $3, direccion = $4, estado = true
         WHERE id_tendero = $5`,
        [t.nombre, t.nombre_tienda, t.telefono, t.direccion, row.id_tendero]
      );
      await client.query(`UPDATE usuario SET id_rol = 1, estado = 'activo' WHERE id_usuario = $1`, [row.id_usuario]);
      return String(row.id_tendero);
    }
  }

  const byCedula = await client.query('SELECT id_tendero FROM tenderos WHERE id_tendero = $1', [t.cedula]);
  if (byCedula.rows.length > 0) {
    await client.query(
      `UPDATE tenderos SET nombre = $1, nombre_tienda = $2, telefono = $3, direccion = $4, estado = true
       WHERE id_tendero = $5`,
      [t.nombre, t.nombre_tienda, t.telefono, t.direccion, t.cedula]
    );
    return t.cedula;
  }

  let idUsuario;
  if (byEmail.rows.length > 0) {
    idUsuario = byEmail.rows[0].id_usuario;
    await client.query(`UPDATE usuario SET id_rol = 1, estado = 'activo', password = $1 WHERE id_usuario = $2`, [
      passwordHash,
      idUsuario,
    ]);
  } else {
    const userRes = await client.query(
      `INSERT INTO usuario (email, password, id_rol, estado) VALUES ($1, $2, 1, 'activo') RETURNING id_usuario`,
      [t.email, passwordHash]
    );
    idUsuario = userRes.rows[0].id_usuario;
  }

  await client.query(
    `INSERT INTO tenderos (id_tendero, id_usuario, nombre, nombre_tienda, telefono, direccion, num_camara_comercio, estado)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
    [t.cedula, idUsuario, t.nombre, t.nombre_tienda, t.telefono, t.direccion, t.num_camara_comercio]
  );
  return t.cedula;
}

async function main() {
  const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  const client = await pool.connect();
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const mapTendero = {};
  const mapCliente = {};
  const mapCredito = {};

  try {
    const cols = await client.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('tenderos','clientes','creditos','abonos','tendero_cliente')
      ORDER BY table_name, ordinal_position
    `);
    const byTable = {};
    for (const r of cols.rows) {
      byTable[r.table_name] = byTable[r.table_name] || [];
      byTable[r.table_name].push(r.column_name);
    }
    console.log('columnas:', JSON.stringify(byTable));

    await client.query('BEGIN');

    for (const t of TENDEROS) {
      const id = await upsertTendero(client, t, passwordHash);
      mapTendero[t.jsonId] = id;
      console.log(`tendero ${t.nombre} / ${t.nombre_tienda} → id_tendero=${id} email=${t.email}`);
    }

    for (const cl of data.clientes) {
      const idTendero = mapTendero[cl.id_tendero];
      const idCliente = clienteCedula(cl.id_cliente);
      const existe = await client.query('SELECT id_cliente FROM clientes WHERE id_cliente = $1', [idCliente]);
      if (existe.rows.length === 0) {
        await client.query(
          `INSERT INTO clientes (id_cliente, id_usuario, nombre_completo, telefono, direccion, estado, created_at)
           VALUES ($1, NULL, $2, $3, $4, 'activo', $5::timestamptz)`,
          [idCliente, cl.nombre_completo, '3000000000', null, cl.created_at]
        );
      } else {
        await client.query(
          `UPDATE clientes SET nombre_completo = $1, estado = 'activo' WHERE id_cliente = $2`,
          [cl.nombre_completo, idCliente]
        );
      }

      await client.query(
        `INSERT INTO tendero_cliente (id_tendero, id_cliente, estado)
         VALUES ($1, $2, 'activo')
         ON CONFLICT (id_tendero, id_cliente) DO UPDATE SET estado = 'activo'`,
        [idTendero, idCliente]
      );
      mapCliente[cl.id_cliente] = idCliente;
    }

    const already = await client.query(
      `SELECT COUNT(*)::int AS n FROM creditos WHERE descripcion LIKE '[cuaderno-real]%'`
    );
    if (already.rows[0].n > 0) {
      console.log(`ya había ${already.rows[0].n} créditos [cuaderno-real]; se borran para recargar`);
      await client.query(
        `DELETE FROM abonos WHERE id_credito IN (SELECT id_credito FROM creditos WHERE descripcion LIKE '[cuaderno-real]%')`
      );
      await client.query(`DELETE FROM creditos WHERE descripcion LIKE '[cuaderno-real]%'`);
    }

    for (const cr of data.creditos) {
      const idTendero = mapTendero[cr.id_tendero];
      const idCliente = mapCliente[cr.id_cliente];
      const desc = `[cuaderno-real] ${cr.descripcion || ''}`.slice(0, 500);
      const ins = await client.query(
        `INSERT INTO creditos (
            id_cliente, id_tendero, monto_total, saldo_pendiente, descripcion,
            fecha_credito, fecha_limite_pago, estado, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz)
         RETURNING id_credito`,
        [
          idCliente,
          idTendero,
          cr.monto_total,
          cr.saldo_pendiente,
          desc,
          cr.fecha_credito,
          cr.fecha_limite_pago,
          cr.estado,
          cr.created_at,
        ]
      );
      mapCredito[cr.id_credito] = ins.rows[0].id_credito;
    }

    const abonoCols = byTable.abonos || [];
    const hasIdCliente = abonoCols.includes('id_cliente');
    for (const a of data.abonos) {
      const idCredito = mapCredito[a.id_credito];
      if (!idCredito) continue;
      if (hasIdCliente) {
        await client.query(
          `INSERT INTO abonos (id_credito, id_cliente, monto, fecha_abono, created_at)
           VALUES ($1, $2, $3, $4, $5::timestamptz)`,
          [idCredito, mapCliente[a.id_cliente], a.monto, a.fecha_abono, a.created_at]
        );
      } else {
        await client.query(
          `INSERT INTO abonos (id_credito, monto, fecha_abono, created_at)
           VALUES ($1, $2, $3, $4::timestamptz)`,
          [idCredito, a.monto, a.fecha_abono, a.created_at]
        );
      }
    }

    await client.query('COMMIT');

    const check = await client.query(`
      SELECT t.nombre, t.nombre_tienda, t.id_tendero,
             COUNT(DISTINCT tc.id_cliente)::int AS clientes,
             COUNT(DISTINCT cr.id_credito)::int AS creditos,
             COALESCE(SUM(cr.saldo_pendiente),0)::numeric AS saldo
      FROM tenderos t
      LEFT JOIN tendero_cliente tc ON tc.id_tendero = t.id_tendero AND tc.estado = 'activo'
      LEFT JOIN creditos cr ON cr.id_tendero = t.id_tendero AND cr.descripcion LIKE '[cuaderno-real]%'
      WHERE t.id_tendero = ANY($1)
      GROUP BY t.nombre, t.nombre_tienda, t.id_tendero
      ORDER BY t.nombre
    `, [Object.values(mapTendero)]);

    console.log('OK carga');
    console.log(JSON.stringify(check.rows, null, 2));
    console.log(`password de las 3 cuentas: ${PASSWORD}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
