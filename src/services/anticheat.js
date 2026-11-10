const db = require('../db/index');

/**
 * 防作弊服务
 */

// 记录切屏事件
async function logCheatEvent(sessionId, eventType, detail = '') {
  await db('cheat_logs').insert({
    session_id: sessionId,
    event_type: eventType,
    detail,
  });
}

// 获取某次考试的作弊记录
async function getCheatLogs(sessionId) {
  return db('cheat_logs')
    .where('session_id', sessionId)
    .orderBy('created_at');
}

// 获取切屏次数
async function getSwitchCount(sessionId) {
  const result = await db('cheat_logs')
    .where({ session_id: sessionId, event_type: 'tab_switch' })
    .count('id as count')
    .first();
  return Number(result.count);
}

module.exports = { logCheatEvent, getCheatLogs, getSwitchCount };
