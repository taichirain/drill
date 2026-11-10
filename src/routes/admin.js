const db = require('../db/index');
const { requireRole } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

/**
 * 管理路由
 */
async function adminRoutes(fastify) {

  // ========== 考试管理 ==========

  // 创建考试
  fastify.post('/api/admin/exams', {
    preHandler: [requireRole('teacher', 'admin')],
    schema: {
      body: {
        type: 'object',
        required: ['title', 'duration'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string', maxLength: 1000 },
          duration: { type: 'integer', minimum: 1, maximum: 300 },
          start_time: { type: 'string', format: 'date-time' },
          end_time: { type: 'string', format: 'date-time' },
        },
      },
    },
  }, async (request, reply) => {
    const { title, description, duration, start_time, end_time } = request.body || {};

    const [result] = await db('exams').insert({
      title,
      description: description || null,
      duration,
      start_time: start_time || null,
      end_time: end_time || null,
      created_by: request.user.id,
    }).returning('id');

    return { id: result.id, message: '考试创建成功' };
  });

  // 修改考试状态
  fastify.put('/api/admin/exams/:id/status', {
    preHandler: [requireRole('teacher', 'admin')],
  }, async (request, reply) => {
    const { status } = request.body || {};
    const validStatuses = ['draft', 'published', 'ongoing', 'finished'];
    if (!validStatuses.includes(status)) {
      return reply.code(400).send({ error: '无效的状态' });
    }

    await db('exams').where('id', request.params.id).update({ status });
    return { success: true, message: '状态已更新' };
  });

  // ========== 题目管理 ==========

  // 添加题目
  fastify.post('/api/admin/exams/:id/questions', {
    preHandler: [requireRole('teacher', 'admin')],
    schema: {
      body: {
        type: 'object',
        required: ['type', 'content'],
        properties: {
          type: { type: 'string', enum: ['choice', 'multi_choice', 'judge', 'fill', 'essay'] },
          content: { type: 'string', minLength: 1, maxLength: 2000 },
          options: { type: 'array', items: { type: 'string' } },
          answer: { type: 'string', maxLength: 500 },
          score: { type: 'number', minimum: 0 },
          sort_order: { type: 'integer' },
        },
      },
    },
  }, async (request, reply) => {
    const examId = Number(request.params.id);
    const { type, content, options, answer, score, sort_order } = request.body || {};

    const [result] = await db('questions').insert({
      exam_id: examId,
      type,
      content,
      options: options ? JSON.stringify(options) : null,
      answer: answer || null,
      score: score || 0,
      sort_order: sort_order || 0,
    }).returning('id');

    return { id: result.id, message: '题目添加成功' };
  });

  // ========== 成绩查看 ==========

  fastify.get('/api/admin/exams/:id/results', {
    preHandler: [requireRole('teacher', 'admin')],
  }, async (request, reply) => {
    const results = await db('exam_sessions as es')
      .join('users as u', 'es.user_id', 'u.id')
      .select('es.*', 'u.name as student_name', 'u.username')
      .where('es.exam_id', request.params.id)
      .orderBy('es.score', 'desc');

    return { results };
  });

  // ========== 防作弊设置 ==========

  // 更新考试的防作弊设置
  fastify.put('/api/admin/exams/:id/settings', {
    preHandler: [requireRole('teacher', 'admin')],
  }, async (request, reply) => {
    const examId = Number(request.params.id);
    const {
      max_tab_switches = 5,
      allow_copy_paste = 0,
      fullscreen_required = 0,
      ip_limit = 1,
      auto_submit_on_cheat = 0,
    } = request.body || {};

    await db('exam_settings')
      .insert({
        exam_id: examId,
        max_tab_switches,
        allow_copy_paste: allow_copy_paste ? 1 : 0,
        fullscreen_required: fullscreen_required ? 1 : 0,
        ip_limit: ip_limit ? 1 : 0,
        auto_submit_on_cheat: auto_submit_on_cheat ? 1 : 0,
      })
      .onConflict('exam_id')
      .merge();

    return { success: true, message: '防作弊设置已更新' };
  });

  // 查看作弊日志
  fastify.get('/api/admin/exams/:id/cheat-logs', {
    preHandler: [requireRole('teacher', 'admin')],
  }, async (request, reply) => {
    const logs = await db('cheat_logs as cl')
      .join('exam_sessions as es', 'cl.session_id', 'es.id')
      .join('users as u', 'es.user_id', 'u.id')
      .select('cl.*', 'u.name as student_name', 'u.username')
      .where('es.exam_id', request.params.id)
      .orderBy('cl.created_at', 'desc');

    return { logs };
  });

  // ========== 考试详情（含题目列表） ==========

  fastify.get('/api/admin/exams/:id', {
    preHandler: [requireRole('teacher', 'admin')],
  }, async (request, reply) => {
    const exam = await db('exams').where('id', request.params.id).first();
    if (!exam) return reply.code(404).send({ error: '考试不存在' });

    const questions = await db('questions')
      .where('exam_id', request.params.id)
      .orderBy('sort_order');

    questions.forEach(q => {
      if (q.options) q.options = JSON.parse(q.options);
    });

    const settings = await db('exam_settings')
      .where('exam_id', request.params.id)
      .first();

    return { exam, questions, settings };
  });

  // 删除题目
  fastify.delete('/api/admin/questions/:id', {
    preHandler: [requireRole('teacher', 'admin')],
  }, async (request, reply) => {
    await db('questions').where('id', request.params.id).del();
    return { success: true, message: '题目已删除' };
  });

  // 修改题目
  fastify.put('/api/admin/questions/:id', {
    preHandler: [requireRole('teacher', 'admin')],
  }, async (request, reply) => {
    const { type, content, options, answer, score, sort_order } = request.body || {};
    await db('questions').where('id', request.params.id).update({
      type,
      content,
      options: options ? JSON.stringify(options) : null,
      answer: answer || null,
      score: score || 0,
      sort_order: sort_order || 0,
    });
    return { success: true, message: '题目已更新' };
  });

  // ========== 用户管理 ==========

  // 批量创建用户
  fastify.post('/api/admin/users/batch', {
    preHandler: [requireRole('admin')],
  }, async (request, reply) => {
    const { users } = request.body || {};
    if (!Array.isArray(users) || users.length === 0) {
      return reply.code(400).send({ error: '请提供用户列表' });
    }

    const salt = bcrypt.genSaltSync(10);
    let created = 0;

    for (const u of users) {
      try {
        await db('users').insert({
          username: u.username,
          password: bcrypt.hashSync(u.password || '123456', salt),
          name: u.name || u.username,
          role: u.role || 'student',
        });
        created++;
      } catch (err) {
        // 用户名重复则跳过
        if (err.code !== '23505') throw err;
      }
    }

    return { created, message: `成功创建 ${created} 个用户` };
  });
}

module.exports = adminRoutes;
