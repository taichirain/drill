const db = require('../db/index');
const { authMiddleware } = require('../middleware/auth');
const { apiLimiter, answerLimiter, createRateLimitHook } = require('../middleware/ratelimit');
const { examCache, questionCache } = require('../middleware/cache');
const { examEntryQueue } = require('../middleware/queue');

/**
 * 考试相关路由
 */
async function examRoutes(fastify) {

  // ========== 考试列表（公开，带缓存） ==========

  fastify.get('/api/exams', async (request, reply) => {
    const exams = await examCache.getOrLoad('exam:list:active', async () => {
      return db('exams as e')
        .leftJoin('users as u', 'e.created_by', 'u.id')
        .select('e.*', 'u.name as creator_name')
        .whereIn('e.status', ['published', 'ongoing'])
        .orderBy('e.created_at', 'desc');
    }, 10000);
    return { exams };
  });

  // ========== 考试详情 ==========

  fastify.get('/api/exams/:id', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const exam = await db('exams as e')
      .leftJoin('users as u', 'e.created_by', 'u.id')
      .select('e.*', 'u.name as creator_name')
      .where('e.id', request.params.id)
      .first();

    if (!exam) {
      return reply.code(404).send({ error: '考试不存在' });
    }

    return { exam };
  });

  // ========== 获取考试题目（缓存 + 排队） ==========

  fastify.get('/api/exams/:id/questions', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const examId = Number(request.params.id);

    // 高并发进场排队
    try {
      await examEntryQueue.enqueue(`${request.user.id}-${examId}`);
    } catch (err) {
      return reply.code(503).send({ error: err.message, queueStatus: examEntryQueue.status() });
    }

    // 考试信息走缓存
    const exam = await examCache.getOrLoad(`exam:${examId}`, async () => {
      return db('exams').where('id', examId).first();
    }, 30000);

    if (!exam) {
      return reply.code(404).send({ error: '考试不存在' });
    }

    // 检查是否有进行中的会话
    let session = await db('exam_sessions')
      .where({ exam_id: examId, user_id: request.user.id })
      .first();

    // 自动创建会话
    if (!session) {
      await db('exam_sessions')
        .insert({ exam_id: examId, user_id: request.user.id })
        .onConflict(['exam_id', 'user_id']).ignore();
      session = await db('exam_sessions')
        .where({ exam_id: examId, user_id: request.user.id }).first();
    }

    // 题目走缓存（考试进行中题目不变）
    const questions = await questionCache.getOrLoad(`questions:${examId}`, async () => {
      const qs = await db('questions')
        .select('id', 'type', 'content', 'options', 'score', 'sort_order')
        .where('exam_id', examId)
        .orderBy('sort_order');
      qs.forEach(q => { if (q.options) q.options = JSON.parse(q.options); });
      return qs;
    }, 60000);

    // 获取已有答案
    const answers = await db('answers')
      .select('question_id', 'user_answer')
      .where('session_id', session.id);

    const answerMap = {};
    answers.forEach(a => { answerMap[a.question_id] = a.user_answer; });

    return {
      exam,
      session,
      questions,
      answers: answerMap,
    };
  });

  // ========== 提交单题答案（限流 + 自动保存） ==========

  fastify.post('/api/exams/:id/answer', {
    preHandler: [authMiddleware, createRateLimitHook(answerLimiter, (req) => `answer:${req.user.id}`)],
    schema: {
      body: {
        type: 'object',
        required: ['questionId', 'answer'],
        properties: {
          questionId: { type: 'integer' },
          answer: { type: 'string', maxLength: 2000 },
        },
      },
    },
  }, async (request, reply) => {
    const examId = Number(request.params.id);
    const { questionId, answer } = request.body || {};

    const result = await db.transaction(async trx => {
      const session = await trx('exam_sessions')
        .where({ exam_id: examId, user_id: request.user.id })
        .forUpdate().first();
      if (!session || session.status !== 'in_progress') return 'no_session';
      const question = await trx('questions').where({ id: questionId, exam_id: examId }).first('id');
      if (!question) return 'no_question';
      await trx('answers')
        .insert({ session_id: session.id, question_id: questionId, user_answer: answer })
        .onConflict(['session_id', 'question_id'])
        .merge(['user_answer']);
      return 'ok';
    });
    if (result === 'no_session') {
      return reply.code(400).send({ error: '没有进行中的考试' });
    }
    if (result === 'no_question') return reply.code(400).send({ error: '题目不属于该考试' });

    return { success: true };
  });

  // ========== 交卷 ==========

  fastify.post('/api/exams/:id/submit', {
    preHandler: [authMiddleware],
  }, async (request, reply) => {
    const examId = Number(request.params.id);

    const totalScore = await db.transaction(async trx => {
      const session = await trx('exam_sessions')
        .where({ exam_id: examId, user_id: request.user.id })
        .forUpdate().first();

      if (!session || session.status !== 'in_progress') return null;

      // 自动评分（选择题、判断题、填空题）
      const questions = await trx('questions').where('exam_id', examId);
      const answers = await trx('answers').where('session_id', session.id);

      let totalScore = 0;
      const answerMap = {};
      answers.forEach(a => { answerMap[a.question_id] = a; });

      for (const q of questions) {
        if (['choice', 'multi_choice', 'judge', 'fill'].includes(q.type)) {
          const userAnswer = answerMap[q.id];
          if (userAnswer && userAnswer.user_answer === q.answer) {
            totalScore += Number(q.score);
            await trx('answers').where('id', userAnswer.id).update({ score: q.score });
          } else if (userAnswer) {
            await trx('answers').where('id', userAnswer.id).update({ score: 0 });
          }
        }
      }

      // 更新会话状态
      await trx('exam_sessions')
        .where('id', session.id)
        .update({ status: 'submitted', submit_time: trx.fn.now(), score: totalScore });
      return totalScore;
    });
    if (totalScore === null) return reply.code(400).send({ error: '没有进行中的考试' });

    return {
      success: true,
      score: totalScore,
      message: '交卷成功',
    };
  });
}

module.exports = examRoutes;
