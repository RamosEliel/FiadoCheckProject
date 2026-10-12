const base = 'https://fiadocheck-api.azurewebsites.net/api';
const webhook = $('Webhook Chat').first().json.body;
const token = webhook.authToken;
if (!token) return JSON.stringify({ error: 'authToken requerido' });

const headers = { Authorization: `Bearer ${token}` };
const hoyBogota = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());
const formatCop = (n) => `$${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;
const deudaDe = (c) => Number(c.total_deuda ?? c.deuda_total ?? 0) || 0;
const asList = (d) => (Array.isArray(d) ? d : (d?.resultados ?? []));
const idDe = (c) => String(c.id_cliente ?? c.clienteId ?? c.identificacion ?? '');

try {
  const data = await this.helpers.httpRequest({
    method: 'GET', url: `${base}/clientes`, headers, json: true,
  });
  const vistos = new Set();
  const lista = [];
  for (const c of asList(data)) {
    const id = idDe(c);
    if (id && vistos.has(id)) continue;
    if (id) vistos.add(id);
    lista.push(c);
  }
  const totalPorCobrar = lista.reduce((sum, c) => sum + deudaDe(c), 0);
  const conDeuda = lista.filter((c) => deudaDe(c) > 0);
  const sinDeuda = lista.filter((c) => deudaDe(c) <= 0);
  const para_decir = `Total por cobrar: ${formatCop(totalPorCobrar)}. ${conDeuda.length} cliente(s) con saldo, ${sinDeuda.length} al día (sin saldo). Tener saldo no es mora; para vencidos usa creditos_vencidos.`;

  return JSON.stringify({
    hoy_bogota: hoyBogota,
    total_por_cobrar: totalPorCobrar,
    clientes_con_deuda: conDeuda.length,
    clientes_sin_deuda: sinDeuda.length,
    para_decir,
  });
} catch (error) {
  return JSON.stringify({ status: error.statusCode || 500, error: error.message });
}
