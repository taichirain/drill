const db = require('../db/index');
const { authMiddleware } = require('../middleware/auth');
const { logCheatEvent, getSwitchCount } = require('../services/anticheat');

/**
 * 防作弊 + 心跳 路由
 */
async function monitorRoutes(fastify) {

  // ========== 心跳（断线重连核心） ==========

  fastify.post('/api/exam/:examId/heartbeat', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { examId } = request.params;
    const userId = request.user.id;

    const session = await db('exam_sessions')
      .where({ exam_id: examId, user_id: userId })
      .first();

    if (!session) {
      return reply.code(404).send({ error: '未找到考试会话' });
    }

    // 记录心跳
    await db('heartbeats').insert({
      session_id: session.id,
      client_ip: request.ip,
      user_agent: request.headers['user-agent'] || '',
    });

    // 返回服务端时间和会话状态（客户端用于校准倒计时）
    const elapsed = Math.floor(
      (Date.now() - new Date(session.start_time).getTime()) / 1000
    );

    return {
      status: session.status,
      serverTime: Date.now(),
      elapsedSeconds: elapsed,
      switchCount: await getSwitchCount(session.id),
    };
  });

  // ========== 重连恢复 ==========

  fastify.get('/api/exam/:examId/recover', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const { examId } = request.params;
    const userId = request.user.id;

    const session = await db('exam_sessions')
      .where({ exam_id: examId, user_id: userId })
      .first();

    if (!session) {
      return { recoverable: false, reason: '未找到考试会话' };
    }

    if (session.status !== 'in_progress') {
      return { recoverable: false, reason: '考试已结束', status: session.status, score: session.score };
    }

    // 检查考试是否超时
    const exam = await db('exams').where('id', examId).first();
    const elapsed = Math.floor(
      (Date.now() - new Date(session.start_time).getTime()) / 1000
    );
    const remaining = Math.max(0, exam.duration * 60 - elapsed);

    if (remaining <= 0) {
      // 超时自动交卷
      return { recoverable: false, reason: '考试时间已到', autoSubmit: true };
    }

    // 恢复答题进度
    const answers = await db('answers')
      .select('question_id', 'user_answer')
      .where('session_id', session.id);

    const answerMap = {};
    answers.forEach(a => { answerMap[a.question_id] = a.user_answer; });

    return {
      recoverable: true,
      remainingSeconds: remaining,
      elapsedSeconds: elapsed,
      serverTime: Date.now(),
      answers: answerMap,
      switchCount: await getSwitchCount(session.id),
    };
  });

  // ========== 防作弊事件上报 ==========

  fastify.post('/api/exam/:examId/cheat-event', {
    preHandler: [authMiddleware],
    schema: {
      body: {
        type: 'object',
        required: ['eventType'],
        properties: {
          eventType: { type: 'string', minLength: 1, maxLength: 100 },
          detail: { type: 'string', maxLength: 500 },
        },
      },
    },
  }, async (request, reply) => {
    const { examId } = request.params;
    const { eventType, detail } = request.body || {};

    const session = await db('exam_sessions')
      .where({ exam_id: examId, user_id: request.user.id, status: 'in_progress' })
      .first();

    if (!session) {
      return reply.code(400).send({ error: '没有进行中的考试' });
    }

    // 记录作弊事件
    await logCheatEvent(session.id, eventType, detail || '');

    // 检查切屏次数是否超限
    const settings = await db('exam_settings')
      .where('exam_id', examId)
      .first();

    const maxSwitches = settings?.max_tab_switches ?? 5;
    const switchCount = await getSwitchCount(session.id);

    let warning = null;
    let forceSubmit = false;

    if (eventType === 'tab_switch') {
      if (switchCount >= maxSwitches) {
        if (settings?.auto_submit_on_cheat) {
          forceSubmit = true;
          warning = `切屏次数已达上限(${maxSwitches}次)，系统已自动交卷`;
        } else {
          warning = `切屏次数已达上限(${maxSwitches}次)，请注意考试纪律`;
        }
      } else {
        warning = `您已切屏 ${switchCount} 次，最多允许 ${maxSwitches} 次`;
      }
    }

    return {
      received: true,
      switchCount,
      maxSwitches,
      warning,
      forceSubmit,
    };
  });

  // ========== 获取防作弊设置 ==========

  fastify.get('/api/exam/:examId/settings', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const settings = await db('exam_settings')
      .where('exam_id', request.params.examId)
      .first();

    return {
      settings: settings || {
        max_tab_switches: 5,
        allow_copy_paste: 0,
        fullscreen_required: 0,
        ip_limit: 1,
        auto_submit_on_cheat: 0,
      },
    };
  });
}

module.exports = monitorRoutes;
