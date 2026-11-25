// Pruebas del módulo de notificaciones push. No usan base de datos ni la API de
// Expo: el pool y el middleware de sesión se sustituyen por dobles y `fetch`
// hacia exp.host se intercepta.  Ejecutar:  npm test

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const express = require('express');

const SRC = path.join(__dirname, '..', 'src');

// ── Dobles ───────────────────────────────────────────────────────────────────
const consultas = [];
let respuestasPool = [];

const poolFalso = {
  query: async (sql, params) => {
    consultas.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
    return respuestasPool.length ? respuestasPool.shift() : { rows: [], rowCount: 0 };
  },
};

const sustituir = (ruta, exports) => {
  const resuelta = require.resolve(ruta);
  require.cache[resuelta] = { id: resuelta, filename: resuelta, loaded: true, exports };
};

sustituir(path.join(SRC, 'config', 'database'), poolFalso);
sustituir(path.join(SRC, 'middleware', 'auth'), (req, res, next) => {
  req.user = { id_usuario: 7, id_rol: 2 };
  req.tokenHash = 'hash-de-prueba';
  next();
});

const {
  esTokenExpoValido,
  enviarPush,
} = require(path.join(SRC, 'utils', 'pushNotifications'));
const authRouter = require(path.join(SRC, 'routes', 'auth'));

// ── fetch hacia Expo interceptado ────────────────────────────────────────────
const fetchReal = global.fetch;
let llamadasExpo = [];
let manejadorExpo = null;

global.fetch = async (url, opciones) => {
  if (String(url).startsWith('http://127.0.0.1')) return fetchReal(url, opciones);
  const mensajes = JSON.parse(opciones.body);
  llamadasExpo.push({ url: String(url), mensajes, headers: opciones.headers });
  return manejadorExpo(mensajes);
};

const respuestaExpo = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => (status === 200 ? { data } : { errors: [{ message: 'fallo de Expo' }] }),
});

const todosOk = (mensajes) => respuestaExpo(mensajes.map((_, i) => ({ status: 'ok', id: `ticket-${i}` })));

test.beforeEach(() => {
  consultas.length = 0;
  respuestasPool = [];
  llamadasExpo = [];
  manejadorExpo = todosOk;
});

const TOKEN = 'ExponentPushToken[abc123_-XYZ]';

// ── Formato del token ────────────────────────────────────────────────────────
test('esTokenExpoValido acepta los dos formatos de Expo y rechaza el resto', () => {
  assert.equal(esTokenExpoValido(TOKEN), true);
  assert.equal(esTokenExpoValido('ExpoPushToken[abc123]'), true);
  assert.equal(esTokenExpoValido('  ExponentPushToken[abc]  '), true);
  for (const malo of ['', null, undefined, 42, 'abc', 'ExponentPushToken[]', 'ExponentPushToken[a b]', 'fcm:APA91bH...']) {
    assert.equal(esTokenExpoValido(malo), false, `debería rechazar ${String(malo)}`);
  }
});

// ── enviarPush ───────────────────────────────────────────────────────────────
test('enviarPush entrega el mensaje a Expo y devuelve el ticket', async () => {
  const [r] = await enviarPush([{ to: TOKEN, title: 'Hola', body: 'Cuerpo', data: { type: 'prueba' } }]);

  assert.deepEqual(r, { to: TOKEN, ok: true, id: 'ticket-0' });
  assert.equal(llamadasExpo.length, 1);
  assert.equal(llamadasExpo[0].url, 'https://exp.host/--/api/v2/push/send');
  assert.equal(llamadasExpo[0].mensajes[0].title, 'Hola');
  assert.equal(llamadasExpo[0].mensajes[0].sound, 'default');
  assert.deepEqual(llamadasExpo[0].mensajes[0].data, { type: 'prueba' });
});

test('enviarPush ni siquiera llama a Expo con tokens mal formados', async () => {
  const [r] = await enviarPush([{ to: 'no-es-un-token', title: 'x', body: 'y' }]);

  assert.equal(r.ok, false);
  assert.equal(r.error, 'TokenInvalido');
  assert.equal(llamadasExpo.length, 0);
});

test('enviarPush parte los envíos en lotes de 100 y conserva el orden', async () => {
  const mensajes = Array.from({ length: 250 }, (_, i) => ({ to: `ExponentPushToken[t${i}]`, title: 'a', body: String(i) }));
  const resultados = await enviarPush(mensajes);

  assert.deepEqual(llamadasExpo.map((l) => l.mensajes.length), [100, 100, 50]);
  assert.equal(resultados.length, 250);
  assert.ok(resultados.every((r, i) => r.ok && r.to === `ExponentPushToken[t${i}]`));
});

test('enviarPush mezcla tokens inválidos y válidos sin perder la posición de cada uno', async () => {
  const resultados = await enviarPush([
    { to: TOKEN, title: 'a', body: 'a' },
    { to: 'malo', title: 'b', body: 'b' },
    { to: 'ExponentPushToken[otro]', title: 'c', body: 'c' },
  ]);

  assert.deepEqual(resultados.map((r) => r.ok), [true, false, true]);
  assert.equal(resultados[1].error, 'TokenInvalido');
  assert.equal(llamadasExpo[0].mensajes.length, 2);
});

test('enviarPush borra de la base los tokens que Expo declara muertos', async () => {
  manejadorExpo = () => respuestaExpo([
    { status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } },
  ]);

  const [r] = await enviarPush([{ to: TOKEN, title: 'a', body: 'b' }]);

  assert.equal(r.ok, false);
  assert.equal(r.error, 'DeviceNotRegistered');
  assert.equal(consultas.length, 1);
  assert.match(consultas[0].sql, /UPDATE usuario SET push_token = NULL WHERE push_token = ANY/);
  assert.deepEqual(consultas[0].params, [[TOKEN]]);
});

test('enviarPush informa un fallo de Expo sin lanzar excepción ni tocar la base', async () => {
  manejadorExpo = () => respuestaExpo(null, 500);

  const [r] = await enviarPush([{ to: TOKEN, title: 'a', body: 'b' }]);

  assert.equal(r.ok, false);
  assert.equal(r.error, 'ErrorDeEnvio');
  assert.match(r.mensaje, /fallo de Expo/);
  assert.equal(consultas.length, 0);
});

test('enviarPush usa EXPO_ACCESS_TOKEN solo si está configurado', async () => {
  await enviarPush([{ to: TOKEN, title: 'a', body: 'b' }]);
  assert.equal(llamadasExpo[0].headers.Authorization, undefined);

  process.env.EXPO_ACCESS_TOKEN = 'secreto';
  try {
    await enviarPush([{ to: TOKEN, title: 'a', body: 'b' }]);
    assert.equal(llamadasExpo[1].headers.Authorization, 'Bearer secreto');
  } finally {
    delete process.env.EXPO_ACCESS_TOKEN;
  }
});

// ── Rutas /api/auth ──────────────────────────────────────────────────────────
let servidor;
let base;

test.before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  servidor = http.createServer(app);
  await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${servidor.address().port}/api/auth`;
});

test.after(() => servidor.close());

const llamar = async (metodo, ruta, cuerpo) => {
  const res = await fetch(base + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer x' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  return { status: res.status, cuerpo: await res.json() };
};

test('PUT /push-token sin token responde 400', async () => {
  const r = await llamar('PUT', '/push-token', {});
  assert.equal(r.status, 400);
  assert.match(r.cuerpo.error, /pushToken es requerido/);
  assert.equal(consultas.length, 0);
});

test('PUT /push-token con formato inválido responde 400 y no escribe', async () => {
  const r = await llamar('PUT', '/push-token', { pushToken: 'fcm:APA91b...' });
  assert.equal(r.status, 400);
  assert.match(r.cuerpo.error, /formato válido/);
  assert.equal(consultas.length, 0);
});

test('PUT /push-token asigna el token al usuario y se lo quita a los demás en una sola sentencia', async () => {
  const r = await llamar('PUT', '/push-token', { pushToken: TOKEN });

  assert.equal(r.status, 200);
  assert.match(r.cuerpo.message, /Push token actualizado/);
  assert.equal(consultas.length, 1);
  assert.match(consultas[0].sql, /CASE WHEN id_usuario = \$2 THEN \$1 ELSE NULL END/);
  assert.match(consultas[0].sql, /WHERE id_usuario = \$2 OR push_token = \$1/);
  assert.deepEqual(consultas[0].params, [TOKEN, 7]);
});

test('DELETE /push-token deja al usuario sin token', async () => {
  const r = await llamar('DELETE', '/push-token');

  assert.equal(r.status, 200);
  assert.match(consultas[0].sql, /SET push_token = NULL WHERE id_usuario = \$1/);
  assert.deepEqual(consultas[0].params, [7]);
});

test('POST /logout revoca la sesión y borra el token del dispositivo', async () => {
  const r = await llamar('POST', '/logout');

  assert.equal(r.status, 200);
  assert.equal(consultas.length, 2);
  assert.match(consultas[0].sql, /UPDATE sesiones SET revocado = true/);
  assert.match(consultas[1].sql, /UPDATE usuario SET push_token = NULL WHERE id_usuario = \$1/);
  assert.deepEqual(consultas[1].params, [7]);
});

test('POST /push-token/prueba envía la notificación al dispositivo del usuario', async () => {
  respuestasPool = [{ rows: [{ push_token: TOKEN }] }];

  const r = await llamar('POST', '/push-token/prueba');

  assert.equal(r.status, 200);
  assert.equal(r.cuerpo.ticket, 'ticket-0');
  assert.equal(llamadasExpo.length, 1);
  assert.equal(llamadasExpo[0].mensajes[0].to, TOKEN);
  assert.deepEqual(llamadasExpo[0].mensajes[0].data, { type: 'prueba' });
});

test('POST /push-token/prueba sin dispositivo registrado responde 409 y no llama a Expo', async () => {
  respuestasPool = [{ rows: [{ push_token: null }] }];

  const r = await llamar('POST', '/push-token/prueba');

  assert.equal(r.status, 409);
  assert.match(r.cuerpo.error, /no tiene un dispositivo registrado/);
  assert.equal(llamadasExpo.length, 0);
});

test('POST /push-token/prueba con dispositivo dado de baja responde 409 y limpia el token', async () => {
  respuestasPool = [{ rows: [{ push_token: TOKEN }] }];
  manejadorExpo = () => respuestaExpo([
    { status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } },
  ]);

  const r = await llamar('POST', '/push-token/prueba');

  assert.equal(r.status, 409);
  assert.match(r.cuerpo.error, /ya no está registrado/);
  assert.ok(consultas.some((c) => /SET push_token = NULL WHERE push_token = ANY/.test(c.sql)));
});

test('POST /push-token/prueba responde 502 si Expo no está disponible', async () => {
  respuestasPool = [{ rows: [{ push_token: TOKEN }] }];
  manejadorExpo = () => respuestaExpo(null, 503);

  const r = await llamar('POST', '/push-token/prueba');

  assert.equal(r.status, 502);
  assert.match(r.cuerpo.error, /No se pudo enviar/);
});
