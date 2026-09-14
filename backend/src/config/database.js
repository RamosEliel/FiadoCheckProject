const { Pool, types } = require('pg');
require('dotenv').config();

// Las columnas `timestamp without time zone` (created_at, scoring.fecha_calculo, etc.)
// se escriben con NOW() en una sesión de Postgres configurada en GMT, así que el valor
// crudo ya es un instante UTC sin la 'Z'. El parser por defecto de node-postgres para
// este tipo (OID 1114) no lo sabe: arma el Date con el constructor local (new Date(y,m,
// d,h,mi,s)), que en un proceso corriendo en America/Bogota interpreta esos mismos
// números como hora LOCAL y le suma 5 horas al convertir a UTC. Cada lectura de estas
// columnas quedaba desfasada +5h respecto al instante real que representaban.
types.setTypeParser(1114, (str) => new Date(`${str}Z`));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;
