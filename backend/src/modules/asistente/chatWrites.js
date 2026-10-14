/**
 * Escrituras deterministas del asistente (crédito / pago).
 * No usa LLM: parsea el texto, resuelve el cliente en cartera y llama
 * las mismas operaciones que POST /creditos y POST /creditos/:id/abonos.
 */

const pool = require('../../config/database');
const AppError = require('../../utils/AppError');
const { todayBusinessKey } = require('../../utils/dateUtils');
const creditsService = require('../creditos/credits.service');
const {
  detectTipo,
  parseIntent,
  isConsulta,
} = require('./chatWrites.parse');

const PENDING_TTL_MS = 10 * 60 * 1000;
const pendingByKey = new Map();

const formatCop = (n) =>
  `$${Number(n).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;

const pendingKey = (idTendero, sessionId) => `${idTendero}:${sessionId}`;

const getPending = (key) => {
  const row = pendingByKey.get(key);
  if (!row) return null;
  if (Date.now() - row.at > PENDING_TTL_MS) {
    pendingByKey.delete(key);
    return null;
  }
  return row.intent;
};

const setPending = (key, intent) => {
  pendingByKey.set(key, { intent, at: Date.now() });
};

const clearPending = (key) => pendingByKey.delete(key);

const mergeIntent = (base, next) => {
  if (!next) return base;
  const merged = { ...base };
  if (next.tipo) merged.tipo = next.tipo;
  if (next.monto) merged.monto = next.monto;
  if (next.cedula) merged.cedula = next.cedula;
  if (next.nombre) merged.nombre = next.nombre;
  if (next.fecha) merged.fecha = next.fecha;
  if (next.descripcion) merged.descripcion = next.descripcion;
  if (next.fechaAbono) merged.fechaAbono = next.fechaAbono;
  return merged;
};

const ask = (respuesta, intent, key) => {
  setPending(key, intent);
  return {
    handled: true,
    respuesta,
    mensaje: respuesta,
    sugerencias: [],
    action_executed: null,
    refresh: false,
    refresh_scope: null,
    success: true,
  };
};

const ok = (respuesta, action, scope) => ({
  handled: true,
  respuesta,
  mensaje: respuesta,
  sugerencias: [],
  action_executed: action,
  refresh: true,
  refresh_scope: scope,
  success: true,
});

const fail = (respuesta, key) => {
  if (key) clearPending(key);
  return {
    handled: true,
    respuesta,
    mensaje: respuesta,
    sugerencias: [],
    action_executed: null,
    refresh: false,
    refresh_scope: null,
    success: true,
  };
};

const resolverCliente = async (idTendero, { cedula, nombre }) => {
  const term = cedula || nombre;
  if (!term) return { status: 'missing' };

  const result = await pool.query(
    `SELECT c.id_cliente, c.nombre_completo
     FROM clientes c
     JOIN tendero_cliente tc ON c.id_cliente = tc.id_cliente
     WHERE tc.id_tendero = $1 AND tc.estado = 'activo'
       AND (c.id_cliente::text ILIKE $2 OR c.nombre_completo ILIKE $2)
     ORDER BY c.nombre_completo
     LIMIT 8`,
    [idTendero, `%${term}%`],
  );

  if (result.rows.length === 0) {
    return { status: 'none', term };
  }

  if (result.rows.length === 1) {
    return { status: 'ok', cliente: result.rows[0] };
  }

  const fold = (s) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const exacto = result.rows.find(
    (c) =>
      String(c.id_cliente) === String(term) ||
      fold(c.nombre_completo) === fold(term),
  );
  if (exacto) return { status: 'ok', cliente: exacto };

  return { status: 'many', clientes: result.rows, term };
};

const registrarCredito = async ({ idTendero, clienteId, monto, fechaLimite, descripcion }) => {
  const vinculado = await pool.query(
    `SELECT 1 FROM tendero_cliente WHERE id_tendero = $1 AND id_cliente = $2 AND estado = 'activo'`,
    [idTendero, clienteId],
  );
  if (vinculado.rows.length === 0) {
    throw new AppError(
      'El cliente no está vinculado a tu cartera. Usa la opción "vincular cliente" primero.',
      403,
    );
  }

  const fechaCredito = todayBusinessKey();
  const result = await pool.query(
    `INSERT INTO creditos (id_cliente, id_tendero, monto_total, saldo_pendiente, descripcion, fecha_credito, fecha_limite_pago, estado)
     VALUES ($1, $2, $3, $3, $4, $5, $6, 'vigente')
     RETURNING id_credito`,
    [clienteId, idTendero, monto, descripcion || '', fechaCredito, fechaLimite],
  );
  return result.rows[0].id_credito;
};

const creditosActivos = async (idTendero, clienteId) => {
  const result = await pool.query(
    `SELECT id_credito, saldo_pendiente, descripcion, fecha_limite_pago, estado
     FROM creditos
     WHERE id_cliente = $1 AND id_tendero = $2 AND estado != 'pagado'
     ORDER BY fecha_limite_pago ASC, created_at ASC`,
    [clienteId, idTendero],
  );
  return result.rows;
};

const executeChatWrite = async ({ texto, idTendero, sessionId }) => {
  const key = pendingKey(idTendero, sessionId || `t${idTendero}`);

  try {
    return await runChatWrite({ texto, idTendero, key });
  } catch (err) {
    console.error('[Asistente] escritura determinista:', err.message);
    return fail(err instanceof AppError ? err.message : 'No se pudo registrar. Inténtalo de nuevo.', key);
  }
};

const runChatWrite = async ({ texto, idTendero, key }) => {
  if (isConsulta(texto)) {
    clearPending(key);
    return null;
  }

  const pending = getPending(key);
  const parsed = parseIntent(texto, { allowFill: Boolean(pending) });

  if (!parsed && !pending) return null;
  if (!parsed?.tipo && !pending) return null;

  const intent = mergeIntent(pending || { tipo: parsed.tipo }, parsed || {});
  if (!intent.tipo) return null;

  if (!intent.monto || intent.monto <= 0) {
    return ask('¿De cuánto es el monto? Escríbelo en pesos, por ejemplo 50000.', intent, key);
  }

  if (!intent.cedula && !intent.nombre) {
    return ask('¿A qué cliente? Dime el nombre o la cédula.', intent, key);
  }

  const resolved = await resolverCliente(idTendero, intent);
  if (resolved.status === 'none') {
    return fail(
      `No encontré a "${resolved.term}" en tu cartera. Verifica el nombre o la cédula.`,
      key,
    );
  }
  if (resolved.status === 'many') {
    const lista = resolved.clientes
      .map((c) => `• ${c.nombre_completo} (${c.id_cliente})`)
      .join('\n');
    return ask(
      `Hay varios clientes con "${resolved.term}". ¿Cuál?\n${lista}`,
      intent,
      key,
    );
  }

  const cliente = resolved.cliente;

  if (intent.tipo === 'credito') {
    if (!intent.fecha) {
      return ask('¿Cuál es la fecha de vencimiento? Escríbela DD/MM/AAAA o YYYY-MM-DD.', intent, key);
    }
    const fechaLimite = intent.fecha;
    const idCredito = await registrarCredito({
      idTendero,
      clienteId: cliente.id_cliente,
      monto: intent.monto,
      fechaLimite,
      descripcion: intent.descripcion,
    });
    clearPending(key);
    return ok(
      `Listo. Crédito de ${formatCop(intent.monto)} a ${cliente.nombre_completo} (vence ${fechaLimite}). Folio ${idCredito}.`,
      'agregar_credito',
      ['clientes', 'dashboard'],
    );
  }

  const creditos = await creditosActivos(idTendero, cliente.id_cliente);
  if (creditos.length === 0) {
    clearPending(key);
    return fail(`${cliente.nombre_completo} no tiene créditos activos para abonar.`, key);
  }

  let credito = creditos[0];
  if (creditos.length > 1) {
    const porSaldo = creditos.find(
      (c) => Number(c.saldo_pendiente) === Number(intent.monto),
    );
    credito = porSaldo || creditos[0];
  }

  const fechaAbono = todayBusinessKey();
  const resultado = await creditsService.registrarPago({
    creditoId: credito.id_credito,
    idTendero,
    monto: intent.monto,
    fechaAbono,
  });
  clearPending(key);
  return ok(
    `Listo. Pago de ${formatCop(intent.monto)} de ${cliente.nombre_completo}. Saldo: ${formatCop(resultado.saldo_nuevo)}.`,
    'agregar_pago',
    ['clientes', 'dashboard', 'pagos'],
  );
};

const tryExecuteChatWrite = async ({ texto, idTendero, sessionId }) =>
  executeChatWrite({ texto, idTendero, sessionId });

module.exports = {
  tryExecuteChatWrite,
  parseIntent,
  detectTipo,
};
