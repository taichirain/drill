const bcrypt = require('bcryptjs');
const db = require('../db/index');
const { signToken } = require('../services/jwt');
const {
  createQrToken,
  getQrStatus,
  scanQrToken,
  confirmQrToken,
  QR_STATUS,
} = require('../services/qrcode');
const { registerConnection, notifyConnections } = require('../services/websocket');
const { loginLimiter, qrGenerateLimiter, createRateLimitHook } = require('../middleware/ratelimit');
const { wsPool } = require('../middleware/connpool');
const { loginQueue } = require('../middleware/queue');
const { userCache } = require('../middleware/cache');

/**
 * 注册认证路由
 */
async function authRoutes(fastify) {

  // ========== 扫码登录流程 ==========

  // 1. PC 端：生成二维码 Token（限流）
  fastify.get('/api/auth/qr/generate', {
    preHandler: [createRateLimitHook(qrGenerateLimiter)],
  }, async (request, reply) => {
    const token = await createQrToken();
    return { token };
  });

  // 2. PC 端：WebSocket 监听扫码状态（连接池控制）
  fastify.get('/api/auth/qr/ws/:token', { websocket: true }, (socket, request) => {
    const { token } = request.params;

    // 连接池检查
    const poolResult = wsPool.add(request.ip, socket);
    if (!poolResult.allowed) {
      socket.send(JSON.stringify({ status: 'error', message: poolResult.reason }));
      socket.close();
      return;
    }

    registerConnection(token, socket);

    socket.send(JSON.stringify({ status: 'connected', message: '等待扫码...' }));

    // 定时检查过期
    const interval = setInterval(async () => {
      const qrData = await getQrStatus(token);
      if (qrData.status === QR_STATUS.EXPIRED) {
        socket.send(JSON.stringify({ status: 'expired', message: '二维码已过期' }));
        clearInterval(interval);
        socket.close();
      }
    }, 5000);

    socket.on('close', () => clearInterval(interval));
  });

  // 3. PC 端：轮询方式查询状态（WebSocket 的降级方案）
  fastify.get('/api/auth/qr/status/:token', async (request, reply) => {
    const { token } = request.params;
    const qrData = await getQrStatus(token);

    if (qrData.status === QR_STATUS.CONFIRMED) {
      // 登录成功，返回 JWT
      const user = await db('users')
        .select('id', 'username', 'name', 'role')
        .where('id', qrData.userId)
        .first();
      if (user) {
        const jwt = signToken({ id: user.id, username: user.username, name: user.name, role: user.role });
        return { status: 'confirmed', token: jwt, user };
      }
    }

    return { status: qrData.status };
  });

  // 4. 手机端：扫码
  fastify.post('/api/auth/qr/scan', async (request, reply) => {
    const { qrToken } = request.body || {};
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: '请先登录手机端' });
    }

    const { verifyToken } = require('../services/jwt');
    const payload = verifyToken(authHeader.slice(7));
    if (!payload) {
      return reply.code(401).send({ error: '登录已过期' });
    }

    const result = await scanQrToken(qrToken, payload.id);
    if (!result.success) {
      return reply.code(400).send({ error: result.message });
    }

    // 通知 PC 端
    notifyConnections(qrToken, JSON.stringify({
      status: 'scanned',
      message: '已扫码，请在手机上确认',
      userName: payload.name,
    }));

    return { success: true, message: '扫码成功，请确认登录' };
  });

  // 5. 手机端：确认登录
  fastify.post('/api/auth/qr/confirm', async (request, reply) => {
    const { qrToken } = request.body || {};
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: '请先登录' });
    }

    const { verifyToken } = require('../services/jwt');
    const payload = verifyToken(authHeader.slice(7));
    if (!payload) {
      return reply.code(401).send({ error: '登录已过期' });
    }

    const result = await confirmQrToken(qrToken, payload.id);
    if (!result.success) {
      return reply.code(400).send({ error: result.message });
    }

    // 通知 PC 端：登录成功
    const user = await db('users')
      .select('id', 'username', 'name', 'role')
      .where('id', payload.id)
      .first();
    const jwt = signToken({ id: user.id, username: user.username, name: user.name, role: user.role });

    notifyConnections(qrToken, JSON.stringify({
      status: 'confirmed',
      message: '登录成功',
      token: jwt,
      user,
    }));

    return { success: true, message: '登录成功' };
  });

  // ========== 账号密码登录（限流 + 排队） ==========

  fastify.post('/api/auth/login', {
    preHandler: [createRateLimitHook(loginLimiter)],
    schema: {
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', minLength: 1, maxLength: 100 },
          password: { type: 'string', minLength: 1, maxLength: 200 },
        },
      },
    },
  }, async (request, reply) => {
    const { username, password } = request.body || {};

    // 高并发时排队
    try {
      await loginQueue.enqueue(username);
    } catch (err) {
      return reply.code(503).send({ error: err.message });
    }

    const user = await db('users').where('username', username).first();
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return reply.code(401).send({ error: '用户名或密码错误' });
    }

    const token = signToken({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    });

    // 缓存用户信息
    userCache.set(`user:${user.id}`, {
      id: user.id, username: user.username, name: user.name, role: user.role,
    });

    return {
      token,
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
    };
  });

  // ========== 获取当前用户信息 ==========

  fastify.get('/api/auth/me', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: '未登录' });
    }

    const { verifyToken } = require('../services/jwt');
    const payload = verifyToken(authHeader.slice(7));
    if (!payload) {
      return reply.code(401).send({ error: '登录已过期' });
    }

    const user = await db('users')
      .select('id', 'username', 'name', 'role')
      .where('id', payload.id)
      .first();
    return { user };
  });
}

module.exports = authRoutes;
