/**
 * k6 负载测试脚本骨架
 *
 * 使用 k6 进行专业级负载测试：
 *   k6 run scripts/loadtest.js
 *   k6 run --vus 2000 --duration 60s scripts/loadtest.js
 *
 * 场景：
 * 1. 登录海啸（2000 VU 在 60s 内 Ramp up）
 * 2. 持续考试（2000 并发在线答题）
 * 3. 答案自动保存（500 VU 每 5s 保存一次）
 * 4. WebSocket 连接（1000 并发 WS）
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// 默认配置：模拟 500 并发用户，持续 5 分钟
export const options = {
  stages: [
    { duration: '30s', target: 100 },   // 预热
    { duration: '2m', target: 500 },    // 持续负载
    { duration: '30s', target: 0 },     // 降级
  ],
  thresholds: {
    http_req_duration: ['p(99)<500'],    // 99% 请求 < 500ms
    http_req_failed: ['rate<0.01'],      // 错误率 < 1%
  },
};

export default function () {
  // 场景 1：获取考试列表（公开接口）
  const res1 = http.get(`${BASE_URL}/api/exams`);
  check(res1, {
    'exams list status 200': (r) => r.status === 200,
    'exams list fast': (r) => r.timings.duration < 200,
  });

  sleep(1);

  // 场景 2：健康检查
  const res2 = http.get(`${BASE_URL}/api/health`);
  check(res2, {
    'health status 200': (r) => r.status === 200,
  });

  sleep(2);
}
