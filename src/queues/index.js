const { Queue } = require('bullmq');
const config = require('../config');

const redisConnection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
};

/**
 * 登录削峰队列
 * 上千人同时登录时按批次放行
 */
const loginQueue = new Queue('login', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 1000 },
  },
});

/**
 * 考试进场队列
 * 考试开始时学生涌入考场削峰
 */
const examEntryQueue = new Queue('exam-entry', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'fixed', delay: 1000 },
  },
});

/**
 * 服务端强制自动交卷队列
 * 考试开始时投递延迟任务，时间到后自动交卷
 */
const autoSubmitQueue = new Queue('auto-submit', {
  connection: redisConnection,
});

/**
 * 成绩计算队列（客观题自动评分）
 */
const gradingQueue = new Queue('grading', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
});

module.exports = {
  redisConnection,
  loginQueue,
  examEntryQueue,
  autoSubmitQueue,
  gradingQueue,
};
