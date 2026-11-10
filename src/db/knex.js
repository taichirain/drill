const knex = require('knex');
const config = require('../config');

const knexConfig = {
  client: 'postgresql',
  connection: {
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password,
  },
  pool: {
    min: config.env === 'production' ? 2 : 2,
    max: config.env === 'production' ? 20 : 10,
  },
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './seeds',
  },
};

module.exports = knex(knexConfig);
