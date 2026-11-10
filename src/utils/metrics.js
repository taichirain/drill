/**
 * Prometheus 指标收集
 *
 * 使用 fastify-metrics 插件自动暴露 /metrics 端点
 * 配合 Prometheus + Grafana 实现可观测性
 *
 * 安装: npm install fastify-metrics
 * 注册: await fastify.register(require('fastify-metrics'), metricsPluginConfig)
 */

const metricsPluginConfig = {
  endpoint: '/metrics',
  // 默认收集 HTTP 指标（请求率、延迟、错误率）
  // 自定义业务指标在下方注册
};

/**
 * 自定义业务指标定义（供后续业务代码使用）
 * 通过 fastify.metrics 注册到 Prometheus
 */
const customMetrics = {
  // 正在进行的考试数
  examsInProgress: {
    name: 'kaoshi_exams_in_progress',
    help: 'Number of exams currently in progress',
    type: 'Gauge',
  },
  // 每分钟交卷数
  submissionsPerMinute: {
    name: 'kaoshi_submissions_per_minute',
    help: 'Number of exam submissions per minute',
    type: 'Counter',
  },
  // WebSocket 连接数
  wsConnections: {
    name: 'kaoshi_websocket_connections',
    help: 'Number of active WebSocket connections',
    type: 'Gauge',
  },
  // 队列深度
  queueDepth: {
    name: 'kaoshi_queue_depth',
    help: 'Current depth of BullMQ queues',
    labelNames: ['queue_name'],
    type: 'Gauge',
  },
  // 缓存命中率
  cacheHitRate: {
    name: 'kaoshi_cache_hit_rate',
    help: 'Cache hit rate percentage',
    labelNames: ['cache_name'],
    type: 'Gauge',
  },
};

module.exports = {
  metricsPluginConfig,
  customMetrics,
};
