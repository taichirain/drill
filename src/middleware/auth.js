const { verifyToken } = require('../services/jwt');

/**
 * JWT 鉴权中间件
 */
async function authMiddleware(request, reply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ error: '未登录' });
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return reply.code(401).send({ error: '登录已过期' });
  }

  request.user = payload;
}

/**
 * 角色检查中间件
 */
function requireRole(...roles) {
  return async (request, reply) => {
    await authMiddleware(request, reply);
    if (reply.sent) return;

    if (!roles.includes(request.user.role)) {
      return reply.code(403).send({ error: '权限不足' });
    }
  };
}

module.exports = { authMiddleware, requireRole };
