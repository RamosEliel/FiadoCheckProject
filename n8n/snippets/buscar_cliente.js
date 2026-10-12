const base = 'https://fiadocheck-api.azurewebsites.net/api';
const webhook = $('Webhook Chat').first().json.body;
const token = webhook.authToken;
if (!token) return JSON.stringify({ error: 'authToken requerido' });

const clienteId = String(query.clienteId ?? '').replace(/\D/g, '').trim();
const queryTexto = String(query.query ?? '').trim();
const headers = { Authorization: `Bearer ${token}` };

const hoyBogota = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

const formatCop = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;
const fechaKey = (v) => {
  if (v == null || v === '') return null;
  const s = String(v);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s.slice(0, 10);
};
const fold = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

async function fetchJson(url) {
  try {
    const data = await this.helpers.httpRequest({ method: 'GET', url, headers, json: true });
    return { status: 200, data };
  } catch (error) {
    return { status: error.statusCode || 500, data: { error: error.message } };
  }
}

function flattenCreditos(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.creditos)) return data.creditos;
  if (Array.isArray(data.data)) return data.data;
  if (data.data && Array.isArray(data.data.creditos)) return data.data.creditos;
  return [];
}

function asList(d) {
  return Array.isArray(d) ? d : (d?.resultados ?? []);
}

function pickCliente(resultados, term) {
  if (!resultados.length) return { status: 'none' };
  if (resultados.length === 1) return { status: 'ok', cliente: resultados[0] };
  const q = fold(term);
  const exacto = resultados.find((c) =>
    String(c.id_cliente) === String(term) || fold(c.nombre_completo) === q
  );
  if (exacto) return { status: 'ok', cliente: exacto };
  const porNombre = resultados.filter((c) => {
    const n = fold(c.nombre_completo);
    return n === q || n.startsWith(`${q} `) || n.split(/\s+/)[0] === q;
  });
  if (porNombre.length === 1) return { status: 'ok', cliente: porNombre[0] };
  return { status: 'many', clientes: resultados };
}

function armarFicha(nombre, id, creditos) {
  const items = creditos.map((cr) => {
    const saldo = Number(cr.saldo_pendiente ?? cr.saldoPendiente ?? 0) || 0;
    const vence = fechaKey(cr.fecha_limite_pago ?? cr.fechaLimitePago);
    const vencido = Boolean(vence && vence < hoyBogota && saldo > 0);
    return {
      id_credito: cr.id_credito ?? cr.idCredito,
      saldo_pendiente: saldo,
      fecha_limite_pago: vence,
      estado_fecha: vencido ? 'vencido' : 'vigente',
      descripcion: cr.descripcion || '',
    };
  }).filter((c) => c.saldo_pendiente > 0);

  const total = items.reduce((s, c) => s + c.saldo_pendiente, 0);
  const nVenc = items.filter((c) => c.estado_fecha === 'vencido').length;

  let para_decir;
  if (total <= 0) {
    para_decir = `${nombre} no tiene deuda pendiente.`;
  } else {
    const lineas = items.map((c) =>
      `• ${formatCop(c.saldo_pendiente)} · vence ${c.fecha_limite_pago || 's/f'} · ${c.estado_fecha}${c.descripcion ? ` · ${c.descripcion}` : ''}`
    );
    const moraTxt = nVenc > 0
      ? `${nVenc} crédito(s) vencido(s).`
      : 'Ningún crédito vencido (al día).';
    para_decir = `${nombre} debe ${formatCop(total)}. ${items.length} crédito(s) activo(s). ${moraTxt}\n${lineas.join('\n')}`;
  }

  return {
    ok: true,
    hoy_bogota: hoyBogota,
    nombre,
    id_cliente: id,
    total_deuda: total,
    creditos_activos: items,
    creditos_vencidos_count: nVenc,
    para_decir,
  };
}

async function fichaPorId(id, nombreHint) {
  const [detalle, creditos] = await Promise.all([
    fetchJson.call(this, `${base}/clientes/${encodeURIComponent(id)}`),
    fetchJson.call(this, `${base}/creditos/cliente/${encodeURIComponent(id)}`),
  ]);
  if (detalle.status === 404) {
    return {
      ok: false,
      para_decir: `No encontré al cliente ${id} en tu cartera.`,
      error: detalle.data?.error || '404',
    };
  }
  const nombre = detalle.data?.nombre_completo || nombreHint || String(id);
  const lista = flattenCreditos(creditos.data);
  return armarFicha(nombre, id, lista);
}

if (clienteId) {
  const ficha = await fichaPorId.call(this, clienteId);
  return JSON.stringify(ficha);
}

if (queryTexto) {
  const busqueda = await fetchJson.call(this, `${base}/clientes?q=${encodeURIComponent(queryTexto)}`);
  const resultados = asList(busqueda.data);
  const picked = pickCliente(resultados, queryTexto);
  if (picked.status === 'none') {
    return JSON.stringify({
      ok: false,
      para_decir: `No encontré a "${queryTexto}" en tu cartera.`,
      resultados: [],
    });
  }
  if (picked.status === 'many') {
    const candidatos = picked.clientes.slice(0, 8).map((c) => ({
      id_cliente: c.id_cliente,
      nombre_completo: c.nombre_completo,
      total_deuda: Number(c.total_deuda) || 0,
    }));
    const lista = candidatos
      .map((c) => `• ${c.nombre_completo} (${c.id_cliente}) · ${formatCop(c.total_deuda)}`)
      .join('\n');
    return JSON.stringify({
      ok: false,
      varios: true,
      para_decir: `Hay ${candidatos.length} clientes con "${queryTexto}". ¿Cuál?\n${lista}`,
      candidatos,
    });
  }
  const id = picked.cliente.id_cliente;
  const ficha = await fichaPorId.call(this, id, picked.cliente.nombre_completo);
  return JSON.stringify(ficha);
}

return JSON.stringify({ error: 'Debes proporcionar clienteId o query', para_decir: 'Dime el nombre o la cédula del cliente.' });
