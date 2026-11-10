# 测试文档

本文档覆盖在线考试系统的功能测试、接口测试和压力测试。

---

## 一、环境准备

```bash
cd /home/walker-ubuntu/codeEnv/solocoder/drill

# 安装依赖
npm install

# 初始化数据库
npm run db:migrate
npm run db:seed

# 启动服务
npm run dev
```

服务启动后默认监听 `http://localhost:3000`

---

## 二、功能测试（手动）

### 2.1 账号密码登录

1. 打开 `http://localhost:3000`
2. 切换到「账号登录」标签
3. 输入 `student1` / `student123`
4. 点击登录，应跳转到 `exam.html`

**验证点：**
- ✅ 正确账号可登录
- ✅ 错误密码提示「用户名或密码错误」
- ✅ 空字段提示「请输入用户名和密码」
- ✅ 登录后 localStorage 存有 token 和 user

### 2.2 扫码登录

1. 打开 `http://localhost:3000`
2. 默认在「扫码登录」标签，应显示二维码
3. 二维码下方显示「请使用手机扫描二维码」
4. 等待 5 分钟，应显示「二维码已过期」
5. 点击「刷新二维码」重新生成

**验证点：**
- ✅ 二维码正常生成和渲染
- ✅ WebSocket 连接成功（控制台无报错）
- ✅ 过期后提示正确
- ✅ 刷新后生成新二维码

### 2.3 参加考试

1. 用 student1 登录
2. 在考试列表页看到「Node.js 基础测试」
3. 点击进入考场
4. 看到 5 道题目，右上角倒计时 60 分钟
5. 依次答题（选择题点击选项，填空题输入答案）
6. 点击「交卷」→ 确认 → 显示得分

**验证点：**
- ✅ 题目正确加载（5 道题）
- ✅ 选择题点击选项后高亮
- ✅ 倒计时正常运行
- ✅ 答案自动保存（刷新页面后答案还在）
- ✅ 交卷后显示分数
- ✅ 交卷后不能重复答题

### 2.4 管理后台

1. 用 teacher1 / teacher123 登录
2. 访问 `http://localhost:3000/admin.html`
3. 创建一场新考试（填写标题和时长）
4. 切换到「成绩查看」标签，选择考试查看成绩

**验证点：**
- ✅ 老师和管理员可以访问后台
- ✅ 学生访问后台会提示「权限不足」
- ✅ 创建考试成功
- ✅ 可以修改考试状态（发布 → 开考 → 结束）
- ✅ 成绩正确显示

### 2.5 断线重连

1. 用 student1 进入考试，答几道题
2. 关闭浏览器标签页
3. 重新打开 `exam.html`，进入同一场考试
4. 之前的答案应该还在，倒计时从正确的剩余时间继续

**验证点：**
- ✅ 答题进度恢复
- ✅ 倒计时校准（基于服务端时间）
- ✅ 考试超时则自动交卷

---

## 三、接口测试（curl）

以下命令可以直接复制到终端运行。

### 3.1 健康检查

```bash
curl http://localhost:3000/api/health
```

**期望返回：**
```json
{"status":"ok","time":"2026-04-12T..."}
```

### 3.2 账号登录

```bash
# 正确登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"student1","password":"student123"}'
```

**期望返回：**
```json
{"token":"eyJhbG...","user":{"id":3,"username":"student1","name":"李同学","role":"student"}}
```

```bash
# 错误密码
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"student1","password":"wrong"}'
```

**期望返回：**
```json
{"error":"用户名或密码错误"}
```

### 3.3 获取用户信息

```bash
# 先登录获取 token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"student1","password":"student123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# 查询当前用户
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### 3.4 QR 码生成

```bash
curl http://localhost:3000/api/auth/qr/generate
```

**期望返回：**
```json
{"token":"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}
```

### 3.5 考试列表

```bash
curl http://localhost:3000/api/exams
```

### 3.6 获取考试题目

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"student1","password":"student123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

curl http://localhost:3000/api/exams/1/questions \
  -H "Authorization: Bearer $TOKEN"
```

### 3.7 提交答案

```bash
curl -X POST http://localhost:3000/api/exams/1/answer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"questionId":1,"answer":"B"}'
```

### 3.8 交卷

```bash
curl -X POST http://localhost:3000/api/exams/1/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

**期望返回：**
```json
{"success":true,"score":50,"message":"交卷成功"}
```

### 3.9 管理接口

```bash
# 用老师账号登录
TEACHER_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"teacher1","password":"teacher123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# 创建考试
curl -X POST http://localhost:3000/api/admin/exams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -d '{"title":"数学期中考试","duration":90,"description":"高等数学上册"}'

# 添加题目
curl -X POST http://localhost:3000/api/admin/exams/2/questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -d '{"type":"choice","content":"1+1=?","options":["A. 1","B. 2","C. 3","D. 4"],"answer":"B","score":10,"sort_order":1}'

# 发布考试
curl -X PUT http://localhost:3000/api/admin/exams/2/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -d '{"status":"published"}'

# 查看成绩
curl http://localhost:3000/api/admin/exams/1/results \
  -H "Authorization: Bearer $TEACHER_TOKEN"

# 设置防作弊
curl -X PUT http://localhost:3000/api/admin/exams/1/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -d '{"max_tab_switches":3,"auto_submit_on_cheat":true}'

# 查看作弊日志
curl http://localhost:3000/api/admin/exams/1/cheat-logs \
  -H "Authorization: Bearer $TEACHER_TOKEN"
```

### 3.10 系统监控

```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# 系统状态
curl http://localhost:3000/api/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 排队状态（公开）
curl http://localhost:3000/api/queue-status
```

### 3.11 防作弊 & 心跳

```bash
# 心跳
curl -X POST http://localhost:3000/api/exam/1/heartbeat \
  -H "Authorization: Bearer $TOKEN"

# 断线恢复
curl http://localhost:3000/api/exam/1/recover \
  -H "Authorization: Bearer $TOKEN"

# 上报切屏事件
curl -X POST http://localhost:3000/api/exam/1/cheat-event \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"eventType":"tab_switch","detail":"切换到微信"}'
```

### 3.12 批量创建用户

```bash
curl -X POST http://localhost:3000/api/admin/users/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"users":[{"username":"student10","name":"张十","password":"123456"},{"username":"student11","name":"李十一","password":"123456"}]}'
```

### 3.13 限流测试

```bash
# 快速连续请求 15 次登录，第 11 次开始应该返回 429
for i in $(seq 1 15); do
  echo "第 $i 次:"
  curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"student1","password":"student123"}'
  echo ""
done
```

---

## 四、压力测试

### 4.1 内置压测脚本

项目自带压测脚本 `scripts/loadtest.js`，无需安装额外工具。

```bash
# 500 并发（默认）
npm run loadtest

# 1000 并发
npm run loadtest:1000

# 自定义并发数和地址
node scripts/loadtest.js 2000 http://localhost:3000
```

#### 压测内容

脚本会依次执行 4 轮测试：

| 轮次 | 测试内容 | 接口 | 关注指标 |
|---|---|---|---|
| 1 | 健康检查 | GET /api/health | 基准性能 |
| 2 | QR 码生成 | GET /api/auth/qr/generate | 登录页并发 |
| 3 | 账号登录 | POST /api/auth/login | 登录高峰 |
| 4 | 考试列表 | GET /api/exams | 缓存效果 |

#### 输出解读

```
📌 测试 1: QR 生成接口 (500 并发 GET /api/auth/qr/generate)

   QR 生成 结果:
   ├── 总请求: 500 | 成功: 480 | 失败: 20
   ├── 耗时: 1200ms | QPS: 416
   ├── 延迟: avg=20ms p50=18ms p95=35ms p99=45ms
   └── 错误: {"HTTP 429": 20}
```

| 指标 | 含义 | 参考值 |
|---|---|---|
| QPS | 每秒处理请求数 | > 300 较好 |
| avg | 平均延迟 | < 50ms 优秀 |
| p50 | 50% 请求的延迟 | < 30ms 优秀 |
| p95 | 95% 请求的延迟 | < 100ms 可接受 |
| p99 | 99% 请求的延迟 | < 200ms 可接受 |
| HTTP 429 | 被限流的请求 | 说明限流在工作 ✅ |
| TIMEOUT | 超时 | 出现较多则需优化 ⚠️ |
| ECONNREFUSED | 连接被拒 | 系统已过载 ❌ |

### 4.2 逐步加压建议

```bash
# 第一轮：轻压，验证基本功能
node scripts/loadtest.js 100

# 第二轮：中压，观察限流是否生效
node scripts/loadtest.js 500

# 第三轮：重压，找到系统瓶颈
node scripts/loadtest.js 1000

# 第四轮：极限压测（建议用 cluster 模式）
npm run start:cluster  # 先切到集群模式
node scripts/loadtest.js 2000
```

### 4.3 使用 cluster 模式对比

```bash
# 对比单进程 vs 多进程

# 测试 1：单进程
npm start &
node scripts/loadtest.js 500
kill %1

# 测试 2：多进程
npm run start:cluster &
node scripts/loadtest.js 500
kill %1
```

预期：cluster 模式的 QPS 应明显高于单进程，p99 延迟更低。

### 4.4 WebSocket 并发测试

如果需要测试 WebSocket 并发（模拟上千人同时扫码），可以用以下脚本：

```bash
# 创建 ws-test.js
cat > /tmp/ws-test.js << 'EOF'
const http = require('http');
const WebSocket = require('ws');

const COUNT = parseInt(process.argv[2] || '200');
const BASE = process.argv[3] || 'http://localhost:3000';

let connected = 0, failed = 0, messages = 0;

async function run() {
  console.log(`\n🔌 WebSocket 并发测试: ${COUNT} 连接\n`);
  const start = Date.now();

  const promises = Array.from({ length: COUNT }, async (_, i) => {
    try {
      // 先获取 QR token
      const res = await fetch(`${BASE}/api/auth/qr/generate`);
      const { token } = await res.json();

      // 建立 WebSocket
      return new Promise((resolve) => {
        const wsUrl = BASE.replace('http', 'ws');
        const ws = new WebSocket(`${wsUrl}/api/auth/qr/ws/${token}`);

        const timeout = setTimeout(() => { ws.close(); resolve(); }, 10000);

        ws.on('open', () => { connected++; });
        ws.on('message', () => { messages++; });
        ws.on('error', () => { failed++; });
        ws.on('close', () => { clearTimeout(timeout); resolve(); });

        // 5 秒后主动关闭
        setTimeout(() => ws.close(), 5000);
      });
    } catch (e) {
      failed++;
    }
  });

  await Promise.all(promises);

  console.log(`   ├── 成功连接: ${connected}`);
  console.log(`   ├── 连接失败: ${failed}`);
  console.log(`   ├── 收到消息: ${messages}`);
  console.log(`   └── 耗时: ${Date.now() - start}ms\n`);
}

run();
EOF

# 运行（需要项目里安装了 ws）
node /tmp/ws-test.js 200
```

---

## 五、性能调优指南

如果压测结果不理想，按以下顺序排查：

| 现象 | 可能原因 | 解决方案 |
|---|---|---|
| p99 延迟高 | 数据库查询慢 | 增加缓存时间，检查索引 |
| 大量 429 | 限流过严 | 调整 `ratelimit.js` 中的 `maxRequests` |
| TIMEOUT | 请求堆积 | 增加排队批次大小 `batchSize` |
| ECONNREFUSED | 连接数满 | 增加 `connpool.js` 中的 `maxTotal` |
| 内存增长快 | 缓存未清理 | 减小 `cache.js` 中的 `maxSize` |
| QPS 上不去 | CPU 瓶颈 | 使用 `npm run start:cluster`，增加 `WORKERS` |

### 关键配置位置

| 配置 | 文件 | 参数 |
|---|---|---|
| 限流阈值 | `src/middleware/ratelimit.js` | `windowMs`, `maxRequests` |
| 连接池上限 | `src/middleware/connpool.js` | `maxPerIp`, `maxTotal` |
| 排队批次 | `src/middleware/queue.js` | `batchSize`, `batchIntervalMs` |
| 缓存时间 | `src/middleware/cache.js` | `defaultTtl`, `maxSize` |
| Worker 数 | `src/cluster.js` | 环境变量 `WORKERS` |

---

## 六、测试检查清单

### 上线前必测

- [ ] 账号密码登录（正确/错误）
- [ ] 扫码登录（生成/过期/刷新）
- [ ] 考试流程（进场 → 答题 → 交卷 → 查分）
- [ ] 断线重连（关闭浏览器后恢复）
- [ ] 管理后台（创建考试 → 添加题目 → 发布 → 查成绩）
- [ ] 权限控制（学生不能访问管理接口）
- [ ] 限流生效（快速请求返回 429）
- [ ] 压测通过（目标并发下 p99 < 200ms）

### 考试前必测

- [ ] 数据库已初始化，测试数据已清理
- [ ] 考试已创建并设为「已发布」状态
- [ ] 测试账号可以正常登录
- [ ] 从登录到交卷完整走一遍
- [ ] cluster 模式启动正常
- [ ] 系统监控接口 `/api/stats` 返回正常
