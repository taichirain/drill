const fastify = require('fastify')({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    serializers: {
      req(req) {
        return {
          method: req.method,
          url: req.url,
          remoteAddress: req.ip,
          requestId: req.id,
        };
      },
    },
  },
});
const path = require('path');
const config = require('./config');
const db = require('./db/index');

// 注册插件
async function bootstrap() {
  // Helmet 安全头
  await fastify.register(require('@fastify/helmet'), {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  });

  // CORS
  await fastify.register(require('@fastify/cors'), {
    origin: true,
    credentials: true,
  });

  // 静态文件
  await fastify.register(require('@fastify/static'), {
    root: path.join(__dirname, '..', 'public'),
    prefix: '/',
  });

  // WebSocket
  await fastify.register(require('@fastify/websocket'));

  // 路由
  await fastify.register(require('./routes/auth'));
  await fastify.register(require('./routes/exam'));
  await fastify.register(require('./routes/admin'));
  await fastify.register(require('./routes/monitor'));
  await fastify.register(require('./routes/stats'));
  await fastify.register(require('./routes/sse'));

  // 初始化 WebSocket 订阅
  const { initSubscriber } = require('./services/websocket');
  initSubscriber();

  // 启动队列 Workers（BullMQ）
  require('./queues/workers');

  // TODO: Prometheus 指标端点
  // await fastify.register(require('fastify-metrics'), {
  //   endpoint: '/metrics',
  // });

  // 健康检查
  fastify.get('/api/health', async () => {
    const checks = {
      database: await checkDatabase(),
      redis: await checkRedis(),
    };
    const healthy = Object.values(checks).every((c) => c.status === 'ok');
    return {
      status: healthy ? 'ok' : 'degraded',
      time: new Date().toISOString(),
      checks,
    };
  });

  // 启动
  try {
    await fastify.listen({ port: config.port, host: config.host });
    console.log(`\n🚀 考试系统已启动: http://localhost:${config.port}`);
    console.log(`   - 登录页: http://localhost:${config.port}/`);
    console.log(`   - 健康检查: http://localhost:${config.port}/api/health\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

async function checkDatabase() {
  try {
    await db.raw('SELECT 1');
    return { status: 'ok' };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

async function checkRedis() {
  try {
    const { getRedis } = require('./utils/redis');
    const redis = getRedis();
    await redis.ping();
    return { status: 'ok' };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

module.exports = fastify;
bootstrap();
