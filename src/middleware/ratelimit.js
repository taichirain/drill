const config = require('../config');

/**
 * Redis-backed 限流配置
 *
 * 使用 @fastify/rate-limit 插件，Redis 存储计数器。
 * 多实例间共享限流状态，cluster 部署时行为一致。
 *
 * 安装: npm install @fastify/rate-limit
 * 注册: await fastify.register(require('@fastify/rate-limit'), { ... })
 */

const redisRateLimitConfig = {
  max: 200, // 默认每分钟 200 请求
  timeWindow: '1 minute',
  redis: config.redis.enabled
    ? {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
      }
    : undefined,
  keyGenerator: (req) => req.ip,
  errorResponseBuilder: (req, context) => ({
    error: '请求过于频繁，请稍后再试',
    retryAfter: context.after,
  }),
};

/**
 * 各端点限流策略
 */
const rateLimitStrategies = {
  // 登录接口：每 IP 每分钟 10 次
  login: {
    max: 10,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
  },

  // QR 生成：每 IP 每分钟 30 次
  qrGenerate: {
    max: 30,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
  },

  // 通用 API：每 IP 每分钟 200 次
  api: {
    max: 200,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
  },

  // 答题保存：每用户每分钟 120 次（约 2 秒一次自动保存）
  answerSave: {
    max: 120,
    timeWindow: '1 minute',
    keyGenerator: (req) => `answer:${req.user?.id || req.ip}`,
  },

  // 心跳：每用户每分钟 60 次
  heartbeat: {
    max: 60,
    timeWindow: '1 minute',
    keyGenerator: (req) => `heartbeat:${req.user?.id || req.ip}`,
  },
};

/**
 * 兼容旧版内存限流的 Hook 工厂
 * 待 @fastify/rate-limit 注册后，可逐步替换为插件原生用法
 */
function createRateLimitHook(strategyName) {
  return async (request, reply) => {
    // TODO: 接入 @fastify/rate-limit 后移除此 hook
    // 当前保留空实现以兼容现有路由
    return;
  };
}

module.exports = {
  redisRateLimitConfig,
  rateLimitStrategies,
  createRateLimitHook,
};
