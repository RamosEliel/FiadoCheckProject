const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const wfPath = path.join(root, 'workflows', 'FiadoCheck — Asistente IA.json');
const snippets = path.join(root, 'snippets');

const wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));

const byName = (name) => {
  const n = wf.nodes.find((x) => x.name === name);
  if (!n) throw new Error(`No existe nodo ${name}`);
  return n;
};

byName('AI Agent').parameters.options.systemMessage = fs.readFileSync(
  path.join(snippets, 'prompt-asistente.txt'),
  'utf8',
);
byName('AI Agent').parameters.options.returnIntermediateSteps = true;

byName('Formatear Respuesta').parameters.jsCode = fs.readFileSync(
  path.join(snippets, 'formatear.js'),
  'utf8',
);

const buscar = byName('buscar Cliente');
buscar.parameters.jsCode = fs.readFileSync(path.join(snippets, 'buscar_cliente.js'), 'utf8');
buscar.parameters.description =
  'Ficha de UN cliente: total_deuda y para_decir ya calculados. query=nombre o clienteId=cédula. Si hay varios, no elige el primero: devuelve candidatos. Copia para_decir. No sumes.';
buscar.parameters.name = 'buscar_cliente';

const cartera = byName('consultar_cartera');
cartera.parameters.jsCode = fs.readFileSync(path.join(snippets, 'consultar_cartera.js'), 'utf8');
cartera.parameters.description =
  'Total por cobrar de la tienda (un GET /clientes, sin duplicar). Copia para_decir. clientes_con_deuda = con saldo, NO es mora por fecha.';

const mayor = byName('mayor_deudor');
mayor.parameters.jsCode = fs.readFileSync(path.join(snippets, 'mayor_deudor.js'), 'utf8');
mayor.parameters.description =
  'Ranking de clientes con saldo, mayor primero, sin duplicar id. top_n default 1. Copia para_decir.';

const vencidos = byName('creditos_vencidos');
vencidos.parameters.jsCode = fs.readFileSync(path.join(snippets, 'creditos_vencidos.js'), 'utf8');
vencidos.parameters.description =
  'Créditos con fecha_limite_pago < hoy America/Bogota y saldo > 0. Copia para_decir. Tener saldo no basta.';

fs.writeFileSync(wfPath, `${JSON.stringify(wf, null, 2)}\n`);
console.log('Workflow actualizado:', wfPath);
