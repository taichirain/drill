const { authMiddleware } = require('../middleware/auth');

/**
 * SSE 实时推送路由骨架
 *
 * 使用场景：
 * - 考试倒计时时间同步（替代心跳 POST）
 * - 队列排队进度推送
 * - 系统公告广播
 */

async function sseRoutes(fastify) {
  /**
   * 考试倒计时时间同步
   * 服务端每 10 秒推送服务器时间戳，客户端校准本地倒计时
   */
  fastify.get('/api/exam/:examId/time-sync', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const interval = setInterval(() => {
      reply.raw.write(`data: ${JSON.stringify({ serverTime: Date.now() })}\n\n`);
    }, 10000);

    request.raw.on('close', () => {
      clearInterval(interval);
    });
  });

  /**
   * 队列排队进度推送
   * 用户排队时实时推送当前位次和预估等待时间
   */
  fastify.get('/api/queue-sync', async (request, reply) => {
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const interval = setInterval(() => {
      // TODO: 接入 BullMQ 后获取真实队列深度
      reply.raw.write(`data: ${JSON.stringify({ loginQueue: 0, examEntryQueue: 0, estimatedWaitMs: 0 })}\n\n`);
    }, 3000);

    request.raw.on('close', () => {
      clearInterval(interval);
    });
  });
}

module.exports = sseRoutes;
