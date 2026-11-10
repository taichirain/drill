const { wsPool } = require('../middleware/connpool');
const { loginQueue, examEntryQueue } = require('../middleware/queue');
const { examCache, questionCache, userCache } = require('../middleware/cache');
const { requireRole } = require('../middleware/auth');

/**
 * 系统监控路由（管理员专用）
 */
async function statsRoutes(fastify) {

  // 系统状态概览
  fastify.get('/api/stats', {
    preHandler: [requireRole('admin')],
  }, async (request, reply) => {
    const memUsage = process.memoryUsage();

    return {
      server: {
        pid: process.pid,
        uptime: Math.floor(process.uptime()),
        memory: {
          rss: `${(memUsage.rss / 1024 / 1024).toFixed(1)} MB`,
          heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(1)} MB`,
          heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(1)} MB`,
        },
        nodeVersion: process.version,
      },
      websocket: wsPool.stats(),
      queues: {
        login: loginQueue.status(),
        examEntry: examEntryQueue.status(),
      },
      caches: {
        exam: examCache.stats(),
        question: questionCache.stats(),
        user: userCache.stats(),
      },
    };
  });

  // 排队状态（公开，用于前端展示排队进度）
  fastify.get('/api/queue-status', async (request, reply) => {
    return {
      login: {
        queueLength: loginQueue.status().queueLength,
        estimatedWaitMs: loginQueue.status().estimatedWaitMs,
      },
      examEntry: {
        queueLength: examEntryQueue.status().queueLength,
        estimatedWaitMs: examEntryQueue.status().estimatedWaitMs,
      },
    };
  });
}

module.exports = statsRoutes;
