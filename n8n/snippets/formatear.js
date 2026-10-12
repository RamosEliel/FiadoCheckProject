const webhook = $('Webhook Chat').first().json.body;
const agentOut = $input.first().json;
const raw = agentOut.output ?? agentOut.text ?? '';
const userMsg = webhook.message ?? webhook.mensaje ?? '';

const WRITE = ['agregar_pago', 'agregar_credito', 'agregar_cliente'];
const CONSULT = ['buscar_cliente', 'buscar Cliente', 'creditos_vencidos', 'mayor_deudor', 'consultar_cartera'];

function parseToolPayload(item) {
  if (!item) return null;
  const j = item.json ?? item;
  const rawOut = j.response ?? j.text ?? j.output ?? j;
  if (rawOut && typeof rawOut === 'object' && !Array.isArray(rawOut)) {
    if (rawOut.status != null || rawOut.error != null || rawOut.data != null || rawOut.ok != null || rawOut.para_decir != null) return rawOut;
  }
  const str = typeof rawOut === 'string' ? rawOut : (typeof j === 'string' ? j : null);
  if (!str) return null;
  try { return JSON.parse(str); } catch { return null; }
}

function isWriteSuccess(name, payload) {
  if (!payload) return false;
  if (payload.error && payload.status == null) return false;
  const status = Number(payload.status);
  if (name === 'agregar_cliente') return status === 200 || status === 201;
  return status === 201;
}

function collectPayloads(name, agentOut) {
  const out = [];
  try {
    const items = $(name).all() || [];
    for (const item of items) {
      const p = parseToolPayload(item);
      if (p) out.push(p);
    }
  } catch (e) { /* tool puede no estar en $() */ }
  const steps = agentOut.intermediateSteps || agentOut.intermediate_steps || [];
  for (const s of steps) {
    const t = String(s?.action?.tool || s?.tool || '').toLowerCase();
    if (t !== String(name).toLowerCase()) continue;
    const obs = s?.observation ?? s?.action?.observation ?? s?.response;
    let payload = null;
    if (typeof obs === 'string') {
      try { payload = JSON.parse(obs); } catch (e) { payload = null; }
    } else if (obs && typeof obs === 'object') {
      payload = obs;
    }
    if (payload) out.push(payload);
  }
  return out;
}

function lastSuccessPayload(name, agentOut) {
  let last = null;
  for (const p of collectPayloads(name, agentOut)) {
    if (isWriteSuccess(name, p)) last = p;
  }
  return last;
}

function detectAction(agentOut) {
  const hits = [];
  for (const name of WRITE) {
    const payload = lastSuccessPayload(name, agentOut);
    if (payload) hits.push({ name, payload });
  }
  if (!hits.length) return null;
  return hits.find((h) => h.name === 'agregar_pago')
    || hits.find((h) => h.name === 'agregar_credito')
    || hits[hits.length - 1];
}

function lastFailedWrite(agentOut) {
  let last = null;
  for (const name of WRITE) {
    const payloads = collectPayloads(name, agentOut);
    if (payloads.some((p) => isWriteSuccess(name, p))) continue;
    for (const p of payloads) {
      if (p && !isWriteSuccess(name, p)) last = { name, payload: p };
    }
  }
  return last;
}

function collectParaDecir(agentOut) {
  const seen = new Set();
  const parts = [];
  for (const name of CONSULT) {
    for (const p of collectPayloads(name, agentOut)) {
      const txt = p && p.para_decir ? String(p.para_decir).trim() : '';
      if (!txt || seen.has(txt)) continue;
      seen.add(txt);
      parts.push(txt);
    }
  }
  return parts.join('\n\n');
}

function scopeFor(action) {
  if (!action) return null;
  if (action === 'agregar_cliente') return ['clientes'];
  if (action === 'agregar_credito') return ['clientes', 'dashboard'];
  return ['clientes', 'dashboard', 'pagos'];
}

function userPideWrite(msg) {
  const t = String(msg || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const verboReg = /(registr|agreg|anot|apunt|fia|fiar|abona|abone)/.test(t);
  const pideCredito = verboReg && /(credito|fiado|deuda)/.test(t)
    || /(anota|anotale|apuntal[eo]|fiale|fiame|fiar)\b/.test(t);
  const pidePago = verboReg && /(pago|abono|cuota)/.test(t)
    || /\b(abona|abone|abonale)\b/.test(t);
  return { pideCredito, pidePago, pideWrite: pideCredito || pidePago };
}

function looksSuccess(text) {
  return /registrad[oa]|listo|ya qued[oó]|qued[oó] hecho|pago registrado|cr[eé]dito (creado|registrado)/i.test(text);
}

function extractIds(payload) {
  const d = payload?.data && typeof payload.data === 'object' ? payload.data : (payload || {});
  return {
    id_credito: d.id_credito ?? d.idCredito ?? null,
    id_abono: d.id_abono ?? d.idAbono ?? null,
  };
}

function limpiarMarkdown(texto) {
  const lines = texto.split('\n').map((line) => {
    const trimmedEnd = line.replace(/\s+$/, '');
    if (/^\s*:?-{3,}:?\s*$/.test(trimmedEnd)) return null;
    if (/^\s*\|/.test(trimmedEnd)) {
      const cells = trimmedEnd.split('|').map((c) => c.trim()).filter(Boolean);
      if (cells.length > 0 && cells.every((c) => /^:?-{3,}:?$/.test(c))) return null;
      return cells.join(' · ');
    }
    return trimmedEnd;
  }).filter((line) => line !== null);

  return lines.join('\n')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\s*-\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const detected = detectAction(agentOut);
const action_executed = detected?.name ?? null;
const writePayload = detected?.payload ?? null;
const write201 = action_executed === 'agregar_pago' || action_executed === 'agregar_credito';
const clienteOk = action_executed === 'agregar_cliente';

const sinAction = raw.replace(/\n?ACTION:[a-z_]+/gi, '').trim();
const pide = userPideWrite(userMsg);
let respuesta = limpiarMarkdown(sinAction);

const paraDecir = collectParaDecir(agentOut);
if (paraDecir && !write201 && !clienteOk) {
  respuesta = paraDecir;
}

if (pide.pideWrite && !write201 && !clienteOk) {
  const failed = lastFailedWrite(agentOut);
  if (looksSuccess(respuesta) || failed) {
    const err = failed?.payload?.error ? String(failed.payload.error) : '';
    respuesta = err
      ? `No quedó registrado. ${err}`
      : 'No quedó registrado. En el chat escribe: Registra un crédito de MONTO a NOMBRE (o un pago).';
  }
} else if (write201 || clienteOk) {
  const ids = extractIds(writePayload);
  const bits = [];
  if (ids.id_credito != null) bits.push(`id_credito ${ids.id_credito}`);
  if (ids.id_abono != null) bits.push(`id_abono ${ids.id_abono}`);
  if (bits.length) {
    const already = bits.some((b) => respuesta.includes(String(b.split(' ').pop())));
    if (!already) {
      respuesta = [respuesta, `Confirmado: ${bits.join(', ')}.`].filter(Boolean).join('\n').trim();
    }
  }
}

const sugerenciasPorAccion = {
  buscar_cliente: ['Registrar un pago', 'Agregar crédito', 'Ver mora'],
  agregar_credito: ['Consultar saldo', 'Registrar pago'],
  agregar_pago: ['Ver historial', '¿Quién me debe más?'],
  agregar_cliente: ['Agregar crédito', 'Buscar cliente'],
};

return [{
  json: {
    respuesta,
    mensaje: respuesta,
    action_executed,
    refresh: Boolean(action_executed),
    refresh_scope: scopeFor(action_executed),
    sessionId: webhook.sessionId,
    sugerencias: action_executed
      ? (sugerenciasPorAccion[action_executed] ?? [])
      : ['¿Quién me debe más?', 'Créditos vencidos', '¿Cuánto me deben en total?'],
    success: true,
  },
}];
