const { Worker } = require('bullmq');
const { redisConnection } = require('./index');

/**
 * 登录削峰 Worker
 * 实际业务逻辑在 routes/auth.js 中通过排队调用
 * 此 Worker 仅用于处理队列状态和监控
 */
const loginWorker = new Worker('login', async (job) => {
  // 登录处理由应用层直接消费队列状态
  // 此处保留用于队列监控和后续扩展
  return { processed: true, userId: job.data.userId };
}, { connection: redisConnection });

/**
 * 考试进场削峰 Worker
 */
const examEntryWorker = new Worker('exam-entry', async (job) => {
  return { processed: true, examId: job.data.examId, userId: job.data.userId };
}, { connection: redisConnection });

/**
 * 自动交卷 Worker
 * 考试时间到后触发，强制提交未交卷的学生
 */
const autoSubmitWorker = new Worker('auto-submit', async (job) => {
  const { sessionId, examId, userId } = job.data;
  // TODO: 调用交卷逻辑
  // 1. 查询 session 是否仍未提交
  // 2. 自动保存所有答案
  // 3. 执行评分
  // 4. 更新 session 状态为 submitted
  console.log(`[AutoSubmit] session=${sessionId}, exam=${examId}, user=${userId}`);
  return { autoSubmitted: true, sessionId };
}, { connection: redisConnection });

/**
 * 成绩计算 Worker
 */
const gradingWorker = new Worker('grading', async (job) => {
  const { sessionId } = job.data;
  // TODO: 客观题自动评分逻辑
  console.log(`[Grading] session=${sessionId}`);
  return { graded: true, sessionId };
}, { connection: redisConnection });

// 错误处理
[loginWorker, examEntryWorker, autoSubmitWorker, gradingWorker].forEach(worker => {
  worker.on('failed', (job, err) => {
    console.error(`[Queue Worker] ${worker.name} job ${job.id} failed:`, err.message);
  });
});

module.exports = {
  loginWorker,
  examEntryWorker,
  autoSubmitWorker,
  gradingWorker,
};
