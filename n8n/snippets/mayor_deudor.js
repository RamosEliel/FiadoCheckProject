const base = 'https://fiadocheck-api.azurewebsites.net/api';
const webhook = $('Webhook Chat').first().json.body;
const token = webhook.authToken;
const topN = Math.min(20, Math.max(1, Number(query.top_n) || 1));
if (!token) return JSON.stringify({ error: 'authToken requerido' });

const headers = { Authorization: `Bearer ${token}` };
const formatCop = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;
const deudaDe = (c) => Number(c.total_deuda ?? c.deuda_total ?? 0) || 0;
const asList = (d) => (Array.isArray(d) ? d : (d?.resultados ?? []));
const idDe = (c) => String(c.id_cliente ?? c.clienteId ?? c.identificacion ?? '');

try {
  const data = await this.helpers.httpRequest({
    method: 'GET', url: `${base}/clientes`, headers, json: true,
  });
  const vistos = new Set();
  const unicos = [];
  for (const c of asList(data)) {
    const deuda = deudaDe(c);
    if (deuda <= 0) continue;
    const id = idDe(c);
    if (id && vistos.has(id)) continue;
    if (id) vistos.add(id);
    unicos.push({
      id_cliente: c.id_cliente,
      nombre_completo: c.nombre_completo,
      total_deuda: deuda,
    });
  }
  const top = unicos.sort((a, b) => b.total_deuda - a.total_deuda).slice(0, topN);
  let para_decir;
  if (!top.length) {
    para_decir = 'Nadie debe en este momento. Total por cobrar $0.';
  } else if (top.length === 1) {
    para_decir = `Quien más debe: ${top[0].nombre_completo} con ${formatCop(top[0].total_deuda)}.`;
  } else {
    para_decir = `Quienes más deben:\n${top.map((c, i) => `${i + 1}. ${c.nombre_completo} · ${formatCop(c.total_deuda)}`).join('\n')}`;
  }
  return JSON.stringify({ top_deudores: top, para_decir });
} catch (error) {
  return JSON.stringify({ status: error.statusCode || 500, error: error.message });
}
