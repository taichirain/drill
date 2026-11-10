const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

/**
 * JWT 服务 - 支持 Access Token + Refresh Token 双令牌机制
 */

function signAccessToken(payload) {
  return jwt.sign(
    { ...payload, jti: uuidv4(), type: 'access' },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

function signRefreshToken(payload) {
  return jwt.sign(
    { id: payload.id, jti: uuidv4(), type: 'refresh' },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
}

/**
 * 兼容旧版的单 Token 签发
 */
function signToken(payload) {
  return signAccessToken(payload);
}

function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (err) {
    return null;
  }
}

/**
 * 签发双令牌
 */
function signTokens(payload) {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

/**
 * 使用 Refresh Token 换取新 Access Token
 * TODO: 接入 Redis 黑名单后验证 refreshToken 未被撤销
 */
async function refreshAccessToken(refreshToken) {
  const payload = verifyToken(refreshToken);
  if (!payload || payload.type !== 'refresh') {
    return null;
  }
  // TODO: 检查 Redis 黑名单
  return signAccessToken({ id: payload.id });
}

module.exports = {
  signToken,
  signAccessToken,
  signRefreshToken,
  verifyToken,
  signTokens,
  refreshAccessToken,
};
