/**
 * 连接池管理 - WebSocket 连接数控制
 */

class ConnectionPool {
  constructor({ maxPerIp = 5, maxTotal = 2000, cleanupIntervalMs = 30000 } = {}) {
    this.maxPerIp = maxPerIp;
    this.maxTotal = maxTotal;
    this.connections = new Map(); // ip → Set<ws>
    this.totalCount = 0;

    this.cleanupInterval = setInterval(() => this._cleanup(), cleanupIntervalMs);
    if (this.cleanupInterval.unref) this.cleanupInterval.unref();
  }

  _cleanup() {
    for (const [ip, conns] of this.connections) {
      for (const ws of conns) {
        if (ws.readyState > 1) { // CLOSING or CLOSED
          conns.delete(ws);
          this.totalCount--;
        }
      }
      if (conns.size === 0) this.connections.delete(ip);
    }
  }

  /**
   * 尝试添加连接
   * @returns {{ allowed: boolean, reason?: string }}
   */
  add(ip, ws) {
    // 总数限制
    if (this.totalCount >= this.maxTotal) {
      return { allowed: false, reason: '服务器连接数已满，请稍后重试' };
    }

    // 单 IP 限制
    if (!this.connections.has(ip)) {
      this.connections.set(ip, new Set());
    }
    const ipConns = this.connections.get(ip);
    if (ipConns.size >= this.maxPerIp) {
      return { allowed: false, reason: '同一 IP 连接数已达上限' };
    }

    ipConns.add(ws);
    this.totalCount++;

    // 连接关闭时自动移除
    ws.on('close', () => {
      ipConns.delete(ws);
      this.totalCount--;
      if (ipConns.size === 0) this.connections.delete(ip);
    });

    return { allowed: true };
  }

  stats() {
    return {
      totalConnections: this.totalCount,
      uniqueIps: this.connections.size,
      maxTotal: this.maxTotal,
      maxPerIp: this.maxPerIp,
    };
  }
}

// 单例
const wsPool = new ConnectionPool({
  maxPerIp: 5,
  maxTotal: 2000,
});

module.exports = { ConnectionPool, wsPool };
