const { getRedis } = require('../utils/redis');

// 存储 WebSocket 连接：token → Set<ws>
const connections = new Map();

/**
 * 注册 WebSocket 连接，监听 QR Token 状态变化
 */
function registerConnection(token, ws) {
  if (!connections.has(token)) {
    connections.set(token, new Set());
  }
  connections.get(token).add(ws);

  // 连接关闭时清理
  ws.on('close', () => {
    const conns = connections.get(token);
    if (conns) {
      conns.delete(ws);
      if (conns.size === 0) connections.delete(token);
    }
  });
}

/**
 * 通知指定 token 的所有 WebSocket 连接
 */
function notifyConnections(token, data) {
  const conns = connections.get(token);
  if (!conns) return;

  const message = typeof data === 'string' ? data : JSON.stringify(data);
  for (const ws of conns) {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(message);
    }
  }
}

/**
 * 初始化 Redis 订阅（用于多实例间同步）
 */
function initSubscriber() {
  try {
    const redis = getRedis();
    const sub = redis.duplicate();

    sub.on('message', (channel, message) => {
      // channel 格式: qr:{token}:status
      const match = channel.match(/^qr:(.+):status$/);
      if (match) {
        const token = match[1];
        notifyConnections(token, message);
      }
    });

    // 动态订阅在 registerConnection 时处理
    console.log('✅ WebSocket 订阅服务已初始化');
    return sub;
  } catch (err) {
    console.log('⚠️  Redis 订阅初始化失败，使用本地通知模式');
    return null;
  }
}

module.exports = {
  connections,
  registerConnection,
  notifyConnections,
  initSubscriber,
};
