# 在线考试系统

一个基于 Node.js 的在线考试系统，专为「低频高峰」场景设计——平时访问量低，考试时上千人同时涌入。

## 功能概览

### 已实现

- ✅ **扫码登录**：WebSocket 实时推送，前端渲染二维码，无 Redis 可降级为轮询
- ✅ **账号密码登录**：备用登录方式
- ✅ **考试管理**：创建、发布、开考、结束，完整生命周期
- ✅ **题库管理**：单选、多选、判断、填空、简答 五种题型
- ✅ **在线考试**：实时倒计时、自动保存答案、自动交卷
- ✅ **自动评分**：客观题自动批改，主观题待人工批阅
- ✅ **防作弊**：切屏检测、切屏次数限制、作弊日志
- ✅ **断线重连**：心跳检测、考试进度恢复、服务端时间校准
- ✅ **高并发优化**：限流、排队削峰、连接池、缓存、多进程
- ✅ **系统监控**：实时查看连接数、队列状态、缓存命中率
- ✅ **批量用户管理**：管理员可批量创建学生账号
- ✅ **成绩查看**：按考试查看所有学生成绩

### 后续可扩展

- 🔲 IP 限制（同一账号只能一个 IP 在线）
- 🔲 成绩导出（Excel / CSV）
- 🔲 更丰富的管理后台 UI
- 🔲 题目随机排序 / 选项打乱
- 🔲 考试时间窗口控制

## 技术栈

| 组件 | 技术 | 说明 |
|---|---|---|
| 运行时 | Node.js | v18+ |
| Web 框架 | Fastify 5 | 高性能，原生支持 async |
| WebSocket | @fastify/websocket | 扫码登录实时推送 |
| 数据库 | SQLite (better-sqlite3) | 零配置，WAL 模式提升并发 |
| 缓存 | Redis (ioredis) / 内存降级 | QR Token 存储、pub/sub |
| 认证 | JWT (jsonwebtoken) | 无状态认证，不查库验证 |
| 密码 | bcryptjs | 密码哈希 |
| 二维码 | qrcode.js（前端） | 服务端零压力 |

## 快速开始

```bash
# 克隆 / 进入项目
cd /home/walker-ubuntu/codeEnv/solocoder/drill

# 安装依赖
npm install

# 初始化数据库（建表 + 测试数据）
npm run db:migrate
npm run db:seed

# 启动（开发模式，带热重载）
npm run dev

# 或者：生产模式（多进程）
npm run start:cluster
```

启动后访问 `http://localhost:3000`

## 页面入口

| 页面 | 地址 | 说明 |
|---|---|---|
| 登录页 | `http://localhost:3000/` | 扫码登录 + 账号密码登录 |
| 考试页 | `http://localhost:3000/exam.html` | 考试列表、进入考场、答题、交卷 |
| 管理后台 | `http://localhost:3000/admin.html` | 创建考试、管理题目、查看成绩 |

## 测试账号

| 角色 | 用户名 | 密码 | 权限 |
|---|---|---|---|
| 管理员 | admin | admin123 | 全部权限 |
| 老师 | teacher1 | teacher123 | 考试管理、题目管理、成绩查看 |
| 学生 | student1 | student123 | 参加考试 |
| 学生 | student2 | student123 | 参加考试 |
| 学生 | student3 | student123 | 参加考试 |

## 项目结构

```
drill/
├── package.json
├── DESIGN.md               # 系统设计文档
├── README.md               # 本文件
├── TESTING.md              # 测试文档
├── .gitignore
│
├── public/                 # 前端页面
│   ├── index.html          # 登录页（扫码 + 账号）
│   ├── exam.html           # 考试页（答题 + 倒计时）
│   └── admin.html          # 管理后台
│
├── src/                    # 后端源码
│   ├── app.js              # Fastify 应用入口
│   ├── cluster.js          # 多进程集群启动
│   ├── config.js           # 配置文件
│   │
│   ├── db/                 # 数据库
│   │   ├── index.js        # SQLite 连接（WAL 模式）
│   │   ├── migrate.js      # 建表脚本
│   │   └── seed.js         # 测试数据填充
│   │
│   ├── routes/             # 路由层
│   │   ├── auth.js         # 认证（扫码登录 + 账号登录）
│   │   ├── exam.js         # 考试（题目、答题、交卷）
│   │   ├── admin.js        # 管理（考试管理、题目管理、成绩、用户）
│   │   ├── monitor.js      # 防作弊 + 心跳 + 断线重连
│   │   └── stats.js        # 系统监控
│   │
│   ├── services/           # 业务服务层
│   │   ├── jwt.js          # JWT 签发 / 验证
│   │   ├── qrcode.js       # QR Token 生命周期管理
│   │   ├── websocket.js    # WebSocket 连接 + 推送
│   │   └── anticheat.js    # 防作弊事件记录
│   │
│   ├── middleware/          # 中间件
│   │   ├── auth.js         # JWT 鉴权 + 角色检查
│   │   ├── ratelimit.js    # 请求限流（滑动窗口）
│   │   ├── connpool.js     # WebSocket 连接池
│   │   ├── queue.js        # 请求排队（削峰）
│   │   └── cache.js        # 内存缓存
│   │
│   └── utils/
│       └── redis.js        # Redis 客户端（可降级为内存）
│
├── deploy/                 # 部署配置
│   └── nginx.conf          # Nginx 反向代理（限流 + WS + 静态文件）
│
└── scripts/                # 工具脚本
    └── loadtest.js         # 压力测试脚本
```

## 启动命令

| 命令 | 说明 |
|---|---|
| `npm run dev` | 开发模式（热重载） |
| `npm start` | 单进程启动 |
| `npm run start:cluster` | 多进程集群模式（按 CPU 核数 fork） |
| `npm run db:migrate` | 创建 / 更新数据库表 |
| `npm run db:seed` | 填充测试数据 |
| `npm run loadtest` | 压力测试（默认 500 并发） |
| `npm run loadtest:1000` | 压力测试（1000 并发） |

## API 接口

### 认证

| 方法 | 路径 | 说明 | 认证 |
|---|---|---|---|
| GET | `/api/auth/qr/generate` | 生成扫码登录 Token | 否 |
| GET | `/api/auth/qr/ws/:token` | WebSocket 监听扫码状态 | 否 |
| GET | `/api/auth/qr/status/:token` | 轮询扫码状态（降级方案） | 否 |
| POST | `/api/auth/qr/scan` | 手机端扫码 | 是 |
| POST | `/api/auth/qr/confirm` | 手机端确认登录 | 是 |
| POST | `/api/auth/login` | 账号密码登录 | 否 |
| GET | `/api/auth/me` | 获取当前用户信息 | 是 |

### 考试

| 方法 | 路径 | 说明 | 认证 |
|---|---|---|---|
| GET | `/api/exams` | 考试列表（已发布 / 进行中） | 否 |
| GET | `/api/exams/:id` | 考试详情 | 是 |
| GET | `/api/exams/:id/questions` | 获取考试题目 + 已有答案 | 是 |
| POST | `/api/exams/:id/answer` | 保存单题答案 | 是 |
| POST | `/api/exams/:id/submit` | 交卷（自动评分） | 是 |

### 防作弊 & 心跳

| 方法 | 路径 | 说明 | 认证 |
|---|---|---|---|
| POST | `/api/exam/:examId/heartbeat` | 心跳（维持连接 + 时间校准） | 是 |
| GET | `/api/exam/:examId/recover` | 断线重连恢复 | 是 |
| POST | `/api/exam/:examId/cheat-event` | 上报作弊事件 | 是 |
| GET | `/api/exam/:examId/settings` | 获取防作弊设置 | 是 |

### 管理

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| POST | `/api/admin/exams` | 创建考试 | teacher / admin |
| PUT | `/api/admin/exams/:id/status` | 修改考试状态 | teacher / admin |
| GET | `/api/admin/exams/:id` | 考试详情（含题目） | teacher / admin |
| POST | `/api/admin/exams/:id/questions` | 添加题目 | teacher / admin |
| PUT | `/api/admin/questions/:id` | 修改题目 | teacher / admin |
| DELETE | `/api/admin/questions/:id` | 删除题目 | teacher / admin |
| PUT | `/api/admin/exams/:id/settings` | 更新防作弊设置 | teacher / admin |
| GET | `/api/admin/exams/:id/results` | 查看成绩 | teacher / admin |
| GET | `/api/admin/exams/:id/cheat-logs` | 查看作弊日志 | teacher / admin |
| POST | `/api/admin/users/batch` | 批量创建用户 | admin |

### 监控

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | `/api/stats` | 系统状态（内存、连接、队列、缓存） | admin |
| GET | `/api/queue-status` | 排队状态（前端展示用） | 公开 |
| GET | `/api/health` | 健康检查 | 公开 |

## 高并发设计

### 限流策略

| 接口 | 限制 | 说明 |
|---|---|---|
| 账号登录 | 10 次/分/IP | 防暴力破解 |
| QR 生成 | 30 次/分/IP | 防恶意生成 |
| 通用 API | 200 次/分/IP | 防滥用 |
| 答题保存 | 120 次/分/用户 | 允许频繁自动保存 |

### 排队削峰

上千人同时进考场时，按批次放行：

- **登录队列**：每批 100 人，间隔 200ms
- **进场队列**：每批 50 人，间隔 300ms

前端可通过 `/api/queue-status` 获取当前排队进度。

### 缓存策略

| 数据 | 缓存时间 | 说明 |
|---|---|---|
| 考试列表 | 10 秒 | 减少列表查询 |
| 考试信息 | 30 秒 | 考试进行中几乎不变 |
| 题目列表 | 60 秒 | 考试开始后题目不变 |
| 用户信息 | 30 秒 | 登录后缓存 |

### 多进程

`npm run start:cluster` 会按 CPU 核数（最多 4 个）fork 工作进程，进程挂了自动重启。可通过 `WORKERS=N` 环境变量控制。

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| PORT | 3000 | 服务端口 |
| HOST | 0.0.0.0 | 监听地址 |
| JWT_SECRET | kaoshi-dev-secret... | JWT 签名密钥（生产环境必须修改） |
| REDIS_HOST | 127.0.0.1 | Redis 地址 |
| REDIS_PORT | 6379 | Redis 端口 |
| REDIS_PASSWORD | - | Redis 密码 |
| REDIS_ENABLED | true | 是否启用 Redis（false 则降级为内存） |
| DB_PATH | ./data/kaoshi.db | SQLite 数据库路径 |
| WORKERS | CPU 核数 | cluster 模式的工作进程数 |

## 部署

### 最简部署

```bash
npm install --production
npm run db:migrate
npm run db:seed
npm run start:cluster
```

### Nginx 反向代理

参考 `deploy/nginx.conf`，主要做三件事：

1. **静态文件直出**：HTML/CSS/JS 由 Nginx 直接返回，不经过 Node
2. **WebSocket 代理**：正确转发 Upgrade 头
3. **请求限流**：Nginx 层面的 `limit_req` + `limit_conn`

详见 [DESIGN.md](./DESIGN.md)
