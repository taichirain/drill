const { v4: uuidv4 } = require('uuid');
const { getRedis } = require('../utils/redis');
const config = require('../config');

const QR_PREFIX = 'qr:';

// QR 状态
const QR_STATUS = {
  PENDING: 'pending',     // 等待扫码
  SCANNED: 'scanned',     // 已扫码，待确认
  CONFIRMED: 'confirmed', // 已确认登录
  EXPIRED: 'expired',     // 已过期
};

/**
 * 生成 QR Token
 * @returns {string} token
 */
async function createQrToken() {
  const redis = getRedis();
  const token = uuidv4();
  const data = JSON.stringify({
    status: QR_STATUS.PENDING,
    userId: null,
    createdAt: Date.now(),
  });

  await redis.set(`${QR_PREFIX}${token}`, data, 'EX', config.qr.ttl);
  return token;
}

/**
 * 获取 QR Token 状态
 */
async function getQrStatus(token) {
  const redis = getRedis();
  const data = await redis.get(`${QR_PREFIX}${token}`);
  if (!data) return { status: QR_STATUS.EXPIRED };
  return JSON.parse(data);
}

/**
 * 扫码：更新状态为 scanned
 */
async function scanQrToken(token, userId) {
  const redis = getRedis();
  const data = await redis.get(`${QR_PREFIX}${token}`);
  if (!data) return { success: false, message: '二维码已过期' };

  const qrData = JSON.parse(data);
  if (qrData.status !== QR_STATUS.PENDING) {
    return { success: false, message: '二维码已被使用' };
  }

  qrData.status = QR_STATUS.SCANNED;
  qrData.userId = userId;
  await redis.set(`${QR_PREFIX}${token}`, JSON.stringify(qrData), 'EX', config.qr.ttl);

  // 发布扫码事件（通知 WebSocket）
  await redis.publish(`qr:${token}:status`, JSON.stringify(qrData));

  return { success: true };
}

/**
 * 确认登录
 */
async function confirmQrToken(token, userId) {
  const redis = getRedis();
  const data = await redis.get(`${QR_PREFIX}${token}`);
  if (!data) return { success: false, message: '二维码已过期' };

  const qrData = JSON.parse(data);
  if (qrData.status !== QR_STATUS.SCANNED || qrData.userId !== userId) {
    return { success: false, message: '无效操作' };
  }

  qrData.status = QR_STATUS.CONFIRMED;
  await redis.set(`${QR_PREFIX}${token}`, JSON.stringify(qrData), 'EX', 30); // 确认后 30 秒过期

  // 发布确认事件
  await redis.publish(`qr:${token}:status`, JSON.stringify(qrData));

  return { success: true };
}

module.exports = {
  QR_STATUS,
  createQrToken,
  getQrStatus,
  scanQrToken,
  confirmQrToken,
};
