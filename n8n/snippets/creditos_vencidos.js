const base = 'https://fiadocheck-api.azurewebsites.net/api';
const webhook = $('Webhook Chat').first().json.body;
const token = webhook.authToken;
if (!token) return JSON.stringify({ error: 'authToken requerido' });

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
const asList = (d) => (Array.isArray(d) ? d : (d?.resultados ?? []));

try {
  const data = await this.helpers.httpRequest({
    method: 'GET',
    url: `${base}/clientes?estado=mora`,
    headers,
    json: true,
  });
  const lista = asList(data);
  const detalles = await Promise.all(
    lista.map(async (c) => {
      const id = c.id_cliente ?? c.clienteId ?? c.identificacion;
      const nombre = c.nombre_completo ?? c.nombre ?? String(id);
      try {
        const creditos = await this.helpers.httpRequest({
          method: 'GET',
          url: `${base}/creditos/cliente/${encodeURIComponent(id)}`,
          headers,
          json: true,
        });
        const listaCreditos = Array.isArray(creditos)
          ? creditos
          : (creditos?.creditos ?? creditos?.data?.creditos ?? []);
        return listaCreditos
          .map((cr) => {
            const vence = fechaKey(cr.fecha_limite_pago ?? cr.fechaLimitePago);
            const saldo = Number(cr.saldo_pendiente ?? cr.saldoPendiente ?? 0) || 0;
            return {
              cliente: nombre,
              id_cliente: id,
              id_credito: cr.id_credito ?? cr.idCredito,
              saldo_pendiente: saldo,
              fecha_limite_pago: vence,
              vencido: Boolean(vence && vence < hoyBogota && saldo > 0),
            };
          })
          .filter((v) => v.vencido);
      } catch {
        return [];
      }
    }),
  );
  const creditos_vencidos = detalles.flat();
  const total = creditos_vencidos.reduce((s, c) => s + c.saldo_pendiente, 0);
  let para_decir;
  if (!creditos_vencidos.length) {
    para_decir = `Hoy ${hoyBogota}: no hay créditos vencidos con saldo.`;
  } else {
    const lineas = creditos_vencidos.map(
      (c) => `• ${c.cliente} · ${formatCop(c.saldo_pendiente)} · venció ${c.fecha_limite_pago}`,
    );
    para_decir = `Hoy ${hoyBogota}: ${creditos_vencidos.length} crédito(s) vencido(s), ${formatCop(total)}.\n${lineas.join('\n')}`;
  }
  return JSON.stringify({ hoy_bogota: hoyBogota, creditos_vencidos, para_decir });
} catch (error) {
  return JSON.stringify({ status: error.statusCode || 500, error: error.message });
}
