require('dotenv').config();

module.exports = {
  // 服务端口
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',

  // 环境
  env: process.env.NODE_ENV || 'development',

  // 日志
  logLevel: process.env.LOG_LEVEL || 'info',

  // JWT 配置
  jwt: {
    secret: process.env.JWT_SECRET || 'kaoshi-dev-secret-change-in-production',
    expiresIn: '15m',
    refreshExpiresIn: '4h',
  },

  // Redis 配置
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    enabled: process.env.REDIS_ENABLED !== 'false',
  },

  // QR Code 配置
  qr: {
    ttl: 300,
    pollInterval: 2000,
  },

  // 数据库
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'kaoshi',
    user: process.env.DB_USER || 'kaoshi',
    password: process.env.DB_PASSWORD || 'kaoshi_password',
  },
};
