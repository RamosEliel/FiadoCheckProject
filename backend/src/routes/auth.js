const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');
const { esTokenExpoValido, enviarPushAUsuario } = require('../utils/pushNotifications');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const result = await pool.query('SELECT * FROM usuario WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];

    if (user.estado !== 'activo') {
      return res.status(403).json({ error: 'Usuario desactivado' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const tenderoResult = await pool.query(
      'SELECT * FROM tenderos WHERE id_usuario = $1',
      [user.id_usuario]
    );

    const tendero = tenderoResult.rows[0] || null;
    const esTendero = Number(user.id_rol) === 1;

    let cliente = null;
    if (!tendero) {
      const clienteResult = await pool.query(
        'SELECT id_cliente, nombre_completo FROM clientes WHERE id_usuario = $1',
        [user.id_usuario]
      );
      cliente = clienteResult.rows[0] || null;
    }

    const token = jwt.sign(
      {
        id_usuario: user.id_usuario,
        email: user.email,
        id_rol: user.id_rol,
        // Solo incluir id_tendero cuando el rol activo es tendero (id_rol=1).
        // Number() porque pg puede devolver id_rol como string.
        id_tendero: esTendero && tendero ? tendero.id_tendero : null
      },
      process.env.JWT_SECRET || 'fiadocheck_jwt_secret_2024_secure',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      'INSERT INTO sesiones (id_usuario, token_hash, expires_at, revocado) VALUES ($1, $2, $3, false)',
      [user.id_usuario, tokenHash, expiresAt]
    );

    res.json({
      token,
      usuario: {
        id_usuario: user.id_usuario,
        email: user.email,
        id_rol: user.id_rol
      },
      tendero: tendero ? {
        id_tendero: tendero.id_tendero,
        nombre: tendero.nombre,
        nombre_tienda: tendero.nombre_tienda
      } : null,
      cliente: cliente ? {
        id_cliente: cliente.id_cliente,
        nombre_completo: cliente.nombre_completo
      } : null
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/logout
router.post('/logout', require('../middleware/auth'), async (req, res) => {
  try {
    const pool = require('../config/database');

    await pool.query(
      'UPDATE sesiones SET revocado = true WHERE token_hash = $1',
      [req.tokenHash]
    );

    // Sin sesión no debe seguir recibiendo recordatorios en este dispositivo.
    await pool.query('UPDATE usuario SET push_token = NULL WHERE id_usuario = $1', [req.user.id_usuario]);

    res.json({ message: 'Sesión cerrada correctamente' });
  } catch (err) {
    console.error('Error en logout:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/auth/profile
router.get('/profile', require('../middleware/auth'), async (req, res) => {
  try {
    const idUsuario = req.user.id_usuario;
    const idRol = Number(req.user.id_rol);

    const userResult = await pool.query(
      'SELECT id_usuario, email, id_rol, foto_perfil FROM usuario WHERE id_usuario = $1',
      [idUsuario]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = userResult.rows[0];
    let profile = {};

    if (idRol === 1) {
      const tenderoResult = await pool.query(
        'SELECT id_tendero, nombre, nombre_tienda, telefono, direccion, num_camara_comercio FROM tenderos WHERE id_usuario = $1',
        [idUsuario]
      );
      profile = tenderoResult.rows[0] || {};
    } else if (idRol === 2) {
      const clienteResult = await pool.query(
        'SELECT id_cliente, nombre_completo, telefono, direccion FROM clientes WHERE id_usuario = $1',
        [idUsuario]
      );
      profile = clienteResult.rows[0] || {};
    }

    res.json({
      ...user,
      ...profile,
    });
  } catch (err) {
    console.error('Error obteniendo perfil:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/auth/profile
router.put('/profile', require('../middleware/auth'), async (req, res) => {
  try {
    const { email, foto_perfil, ...otherData } = req.body;
    const idUsuario = req.user.id_usuario;
    const idRol = Number(req.user.id_rol);

    // Validaciones de formato
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'El email no tiene un formato válido' });
    }

    const { nombre, nombre_tienda, telefono, direccion, nombre_completo } = otherData;

    if (telefono !== undefined && telefono !== null && telefono !== '' && !/^[0-9]{7,10}$/.test(telefono.trim())) {
      return res.status(400).json({ error: 'El teléfono debe tener entre 7 y 10 dígitos numéricos' });
    }
    if (nombre !== undefined && nombre !== null && !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre no puede estar vacío' });
    }
    if (nombre_completo !== undefined && nombre_completo !== null && !nombre_completo.trim()) {
      return res.status(400).json({ error: 'El nombre completo no puede estar vacío' });
    }
    if (nombre_tienda !== undefined && nombre_tienda !== null && !nombre_tienda.trim()) {
      return res.status(400).json({ error: 'El nombre de la tienda no puede estar vacío' });
    }
    if (direccion !== undefined && direccion !== null && !direccion.trim()) {
      return res.status(400).json({ error: 'La dirección no puede estar vacía' });
    }

    await pool.query('BEGIN');

    // 1. Actualizar datos básicos del usuario
    if (email) {
      await pool.query('UPDATE usuario SET email = $1 WHERE id_usuario = $2', [email.trim(), idUsuario]);
    }
    if (foto_perfil) {
      await pool.query('UPDATE usuario SET foto_perfil = $1 WHERE id_usuario = $2', [foto_perfil, idUsuario]);
    }

    // 2. Actualizar datos específicos según rol
    if (idRol === 1) { // Tendero
      await pool.query(
        'UPDATE tenderos SET nombre = COALESCE($1, nombre), nombre_tienda = COALESCE($2, nombre_tienda), telefono = COALESCE($3, telefono), direccion = COALESCE($4, direccion) WHERE id_usuario = $5',
        [nombre?.trim(), nombre_tienda?.trim(), telefono?.trim(), direccion?.trim(), idUsuario]
      );
    } else if (idRol === 2) { // Cliente
      await pool.query(
        'UPDATE clientes SET nombre_completo = COALESCE($1, nombre_completo), telefono = COALESCE($2, telefono), direccion = COALESCE($3, direccion) WHERE id_usuario = $4',
        [nombre_completo?.trim(), telefono?.trim(), direccion?.trim(), idUsuario]
      );
    }

    await pool.query('COMMIT');
    res.json({ message: 'Perfil actualizado correctamente' });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error actualizando perfil:', err);

    if (err.code === '23505' && err.detail && err.detail.includes('email')) {
      return res.status(400).json({ error: 'Ese email ya está registrado por otro usuario' });
    }

    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/auth/push-token
router.put('/push-token', require('../middleware/auth'), async (req, res) => {
  try {
    const { pushToken } = req.body;
    const idUsuario = req.user.id_usuario;

    if (!pushToken) {
      return res.status(400).json({ error: 'pushToken es requerido' });
    }
    if (!esTokenExpoValido(pushToken)) {
      return res.status(400).json({ error: 'pushToken no tiene un formato válido de Expo' });
    }

    const token = pushToken.trim();

    // Un token identifica un dispositivo, no una persona: si otro usuario inició
    // sesión antes en este mismo teléfono, se le retira para que los recordatorios
    // de esa cuenta no lleguen a quien ahora usa el dispositivo.
    // Una sola sentencia: asigna el token a este usuario y se lo quita a los demás.
    await pool.query(
      `UPDATE usuario
          SET push_token = CASE WHEN id_usuario = $2 THEN $1 ELSE NULL END
        WHERE id_usuario = $2 OR push_token = $1`,
      [token, idUsuario]
    );

    res.json({ message: 'Push token actualizado correctamente' });
  } catch (err) {
    console.error('Error actualizando push token:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/auth/push-token
// El usuario deja de recibir push (por ejemplo al desactivar las notificaciones).
router.delete('/push-token', require('../middleware/auth'), async (req, res) => {
  try {
    await pool.query('UPDATE usuario SET push_token = NULL WHERE id_usuario = $1', [req.user.id_usuario]);
    res.json({ message: 'Push token eliminado correctamente' });
  } catch (err) {
    console.error('Error eliminando push token:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/push-token/prueba
// Envía una notificación de prueba al dispositivo del propio usuario: comprueba
// de punta a punta que el token está registrado y que Expo lo acepta.
router.post('/push-token/prueba', require('../middleware/auth'), async (req, res) => {
  try {
    const resultado = await enviarPushAUsuario(req.user.id_usuario, {
      title: 'Notificación de prueba',
      body: 'Las notificaciones push de FiadoCheck funcionan en este dispositivo.',
      data: { type: 'prueba' },
    });

    if (resultado.ok) {
      return res.json({ message: 'Notificación de prueba enviada', ticket: resultado.id });
    }
    if (resultado.error === 'SinToken') {
      return res.status(409).json({ error: 'Este usuario no tiene un dispositivo registrado para recibir push' });
    }
    if (resultado.error === 'DeviceNotRegistered') {
      return res.status(409).json({ error: 'El dispositivo ya no está registrado en Expo; vuelve a iniciar sesión en la app' });
    }
    return res.status(502).json({ error: `No se pudo enviar la notificación: ${resultado.mensaje}` });
  } catch (err) {
    console.error('Error enviando push de prueba:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', require('../middleware/auth'), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const idUsuario = req.user.id_usuario;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
    }
    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos una mayúscula y un número' });
    }

    const result = await pool.query('SELECT password FROM usuario WHERE id_usuario = $1', [idUsuario]);
    const user = result.rows[0];

    const validCurrentPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validCurrentPassword) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    await pool.query('UPDATE usuario SET password = $1 WHERE id_usuario = $2', [hashedNewPassword, idUsuario]);

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('Error cambiando contraseña:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/registerClientes

router.post('/registerClientes', async (req, res) => {
  const client = await pool.connect();
  try {
    const { nombre_completo, email, telefono, cedula, direccion, password, id_rol } = req.body;

    // 1. Validaciones básicas
    if (!email || !password || !nombre_completo || !cedula) {
      return res.status(400).json({ error: 'Email, contraseña, nombre y cédula son requeridos' });
    }

    // 2. Validaciones de formato y complejidad.
    // Deben coincidir con las de registerTendero y change-password: sin esto
    // un cliente podía registrarse con una contraseña que el propio sistema
    // le rechazaría después al intentar cambiarla.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    if (cedula.trim().length < 7) {
      return res.status(400).json({ error: 'La cédula debe tener al menos 7 caracteres' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos una mayúscula y un número' });
    }

    await client.query('BEGIN');

    // 2. Verificar si el email ya existe
    const existeEmail = await client.query('SELECT id_usuario FROM usuario WHERE email = $1', [email]);
    if (existeEmail.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // 3. Verificar si la cédula ya existe como id_cliente
    const existeCedula = await client.query('SELECT id_cliente FROM clientes WHERE id_cliente = $1', [cedula]);
    if (existeCedula.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'La cédula ya está registrada' });
    }

    // 4. Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Crear el usuario (id_rol 2 = cliente)
    const userResult = await client.query(
      'INSERT INTO usuario (email, password, id_rol, estado) VALUES ($1, $2, $3, $4) RETURNING id_usuario',
      [email, hashedPassword, id_rol || 2, 'activo']
    );
    const idUsuario = userResult.rows[0].id_usuario;

    // 6. Crear el registro en clientes usando la cédula como id_cliente
    await client.query(
      'INSERT INTO clientes (id_cliente, id_usuario, nombre_completo, telefono, direccion, estado) VALUES ($1, $2, $3, $4, $5, $6)',
      [cedula, idUsuario, nombre_completo, telefono, direccion, 'activo']
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Usuario registrado correctamente' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en registro:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});


// POST /api/auth/registerTendero
router.post('/registerTendero', async (req, res) => {
  const client = await pool.connect();
  try {
    const { nombre_completo, email, telefono, cedula, direccion, num_camara_comercio, password, id_rol } = req.body;

    // 1. Validaciones de campos requeridos
    const missing = [];
    if (!nombre_completo || !nombre_completo.trim()) missing.push('nombre completo');
    if (!email || !email.trim()) missing.push('email');
    if (!telefono || !telefono.trim()) missing.push('teléfono');
    if (!cedula || !cedula.trim()) missing.push('cédula');
    if (!direccion || !direccion.trim()) missing.push('dirección');
    if (!num_camara_comercio || !num_camara_comercio.trim()) missing.push('número de cámara de comercio');
    if (!password) missing.push('contraseña');

    if (missing.length > 0) {
      return res.status(400).json({ error: `Campos requeridos: ${missing.join(', ')}` });
    }

    // 2. Validaciones de formato
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    if (cedula.trim().length < 7) {
      return res.status(400).json({ error: 'La cédula debe tener al menos 7 caracteres' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    await client.query('BEGIN');

    // 3. Verificar si el email ya existe
    const existeEmail = await client.query('SELECT id_usuario FROM usuario WHERE email = $1', [email.trim()]);
    if (existeEmail.rows.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // 4. Verificar si la cédula (id_tendero) ya existe
    const existeCedula = await client.query('SELECT id_tendero FROM tenderos WHERE id_tendero = $1', [cedula.trim()]);
    if (existeCedula.rows.length > 0) {
      return res.status(400).json({ error: 'La cédula ya está registrada' });
    }

    // 5. Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 6. Crear el usuario (id_rol 1 para tenderos)
    const userResult = await client.query(
      'INSERT INTO usuario (email, password, id_rol, estado) VALUES ($1, $2, $3, $4) RETURNING id_usuario',
      [email.trim(), hashedPassword, id_rol || 1, 'activo']
    );
    const idUsuario = userResult.rows[0].id_usuario;

    // 7. Crear el registro en la tabla tenderos (id_tendero = cedula)
    await client.query(
      'INSERT INTO tenderos (id_tendero, id_usuario, nombre, nombre_tienda, telefono, direccion, num_camara_comercio, estado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [cedula.trim(), idUsuario, nombre_completo.trim(), nombre_completo.trim(), telefono.trim(), direccion.trim(), num_camara_comercio.trim(), true]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Tendero registrado correctamente' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en registro de tendero:', err);

    // Manejar error de clave duplicada
    if (err.code === '23505') {
      if (err.detail && err.detail.includes('id_tendero')) {
        return res.status(400).json({ error: 'La cédula ya está registrada' });
      }
      if (err.detail && err.detail.includes('email')) {
        return res.status(400).json({ error: 'El email ya está registrado' });
      }
      return res.status(400).json({ error: 'El registro ya existe' });
    }

    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
});

module.exports = router;
