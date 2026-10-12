const { todayBusinessKey, toDateKey } = require('../../utils/dateUtils');

const fold = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const STOP_NAME = new Set([
  'credito', 'fiado', 'pago', 'abono', 'cuota', 'pesos', 'cop', 'el', 'la', 'los',
  'las', 'un', 'una', 'unos', 'unas', 'hoy', 'manana', 'vencimiento', 'fecha',
  'cliente', 'cedula', 'monto', 'por', 'para', 'con', 'de', 'del', 'al', 'a',
  'dias', 'dia', 'vence', 'registra', 'registrar', 'anota', 'anotar', 'agrega',
]);

const CONSULTA_RE =
  /^(quien|quienes|cuanto|cuanta|cual|cuales|como|puedo |se puede|mora|resumen|vencid|deuda|scoring|riesgo|lista|mostrar|ver |dime |dame )/i;

const addDaysKey = (key, days) => {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
};

const parseMonto = (t) => {
  const mil = t.match(/(\d+(?:[.,]\d+)?)\s*mil\b/);
  if (mil) {
    return Math.round(Number(String(mil[1]).replace(',', '.')) * 1000);
  }

  const dollar = t.match(/\$\s*([\d.]+(?:\,\d{1,2})?)/);
  if (dollar) {
    const raw = dollar[1].replace(/\./g, '').replace(',', '.');
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  const grouped = t.match(/\b(\d{1,3}(?:\.\d{3})+)(?:\s*(?:pesos|cop))?\b/);
  if (grouped) {
    return Number(grouped[1].replace(/\./g, ''));
  }

  const de = t.match(/\b(?:de|por|monto)\s+(\d{3,9})\b/);
  if (de) return Number(de[1]);

  return null;
};

const parseCedula = (t) => {
  const labeled = t.match(/\b(?:cedula|id(?:\s*cliente)?)\s*(\d{6,12})\b/);
  if (labeled) return labeled[1];
  return null;
};

const parseFecha = (t, { defaultOffsetDays = null } = {}) => {
  const iso = t.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso && toDateKey(iso[1])) return iso[1];

  const dmy = t.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (dmy) {
    const dd = dmy[1].padStart(2, '0');
    const mm = dmy[2].padStart(2, '0');
    let yyyy = dmy[3];
    if (yyyy.length === 2) yyyy = `20${yyyy}`;
    const key = `${yyyy}-${mm}-${dd}`;
    if (toDateKey(key)) return key;
  }

  if (/\bhoy\b/.test(t)) return todayBusinessKey();
  if (/\bmanana\b/.test(t)) return addDaysKey(todayBusinessKey(), 1);

  const enDias = t.match(/\ben\s+(\d{1,3})\s+dias\b/);
  if (enDias) return addDaysKey(todayBusinessKey(), Number(enDias[1]));

  if (defaultOffsetDays != null) return addDaysKey(todayBusinessKey(), defaultOffsetDays);
  return null;
};

const parseNombre = (t) => {
  const m = t.match(
    /\b(?:a|de|del cliente|cliente|para)\s+([a-zñ]+(?:\s+[a-zñ]+){0,3})\b/,
  );
  if (!m) return null;
  const tokens = m[1].split(/\s+/).filter((w) => !STOP_NAME.has(w) && !/^\d+$/.test(w));
  if (tokens.length === 0) return null;
  return tokens.join(' ');
};

const parseDescripcion = (t) => {
  const m = t.match(/\b(?:por|descripcion)\s+([^,.]+)$/);
  if (!m) return '';
  const d = m[1].trim();
  if (STOP_NAME.has(fold(d))) return '';
  return d.slice(0, 500);
};

const detectTipo = (texto) => {
  const t = fold(texto);
  const hasPagoWord = /\b(pago|abono|cuota)\b/.test(t);
  const hasCreditoWord = /\b(credito|fiado)\b/.test(t);
  const hasWriteVerb =
    /\b(registra\w*|agrega\w*|anota\w*|apunta\w*|crea(?:r)?|fiar|fiale|fiame|abona(?:r|le|me)?|abone|paga(?:r|le)?|haz|hacer)\b/.test(t)
    || /\bnuevo\s+(credito|fiado|pago|abono)\b/.test(t);
  const pagoShortcut = /\b(abona(?:le|me)?|abone|pagale)\b/.test(t);
  const creditoShortcut = /\b(fiale|fiame|anotale)\b/.test(t);

  if ((hasPagoWord && hasWriteVerb) || pagoShortcut) return 'pago';
  if ((hasCreditoWord && hasWriteVerb) || creditoShortcut) return 'credito';
  return null;
};

const unlabeledNumbers = (t) => {
  const withoutLabeled = t
    .replace(/\$\s*[\d.]+(?:\,\d{1,2})?/g, ' ')
    .replace(/\b(?:cedula|id(?:\s*cliente)?)\s*\d{6,12}\b/g, ' ')
    .replace(/\b\d{1,3}(?:\.\d{3})+\b/g, ' ')
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ')
    .replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, ' ');
  return [...withoutLabeled.matchAll(/\b(\d{3,12})\b/g)].map((m) => m[1]);
};

const parseIntent = (texto, { allowFill = false } = {}) => {
  const t = fold(texto);
  if (!t) return null;

  if (isConsulta(texto)) return null;

  const tipo = detectTipo(t);
  if (!tipo && !allowFill) return null;

  const parsed = {
    tipo: tipo || null,
    monto: parseMonto(t),
    cedula: parseCedula(t),
    nombre: parseNombre(t),
    fecha: parseFecha(t, { defaultOffsetDays: tipo === 'credito' ? 7 : null }),
    descripcion: parseDescripcion(t),
    fechaAbono: tipo === 'pago' ? parseFecha(t) || todayBusinessKey() : null,
  };

  const nums = unlabeledNumbers(t).filter((n) => parsed.monto !== Number(n));
  if (!parsed.monto) {
    const comoMonto = nums.find((n) => n.length >= 3 && n.length <= 7);
    if (comoMonto) parsed.monto = Number(comoMonto);
  }
  if (!parsed.cedula) {
    const comoCedula = nums.find(
      (n) => n.length >= 8 && n.length <= 12 && Number(n) !== parsed.monto,
    );
    if (comoCedula) parsed.cedula = comoCedula;
  }

  if (!tipo && allowFill) {
    if (/^\d{6,12}$/.test(t) && !parsed.cedula) parsed.cedula = t;
    if (!parsed.nombre && /^[a-zñ]+(?:\s+[a-zñ]+){0,3}$/.test(t) && !STOP_NAME.has(t)) {
      parsed.nombre = t;
    }
  }

  return parsed;
};

const stripLead = (texto) => fold(texto).replace(/^[¿?\s]+/, '');

const isConsulta = (texto) => {
  const t = stripLead(texto);
  if (CONSULTA_RE.test(t)) return true;
  if (/[?]/.test(texto)) return true;
  return false;
};

module.exports = {
  fold,
  addDaysKey,
  detectTipo,
  parseIntent,
  isConsulta,
  stripLead,
};
