# 在线考试系统 - 设计文档

## 场景特点

- 平时访问量低，考试时瞬时高并发（上千人同时扫码登录）
- 典型的「低频高峰」场景

## 系统架构

```
                    ┌─────────────┐
                    │   Nginx/LB  │  limit_req + limit_conn
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐ ┌───▼────┐ ┌────▼─────┐
        │  API 服务  │ │ API x2 │ │ WS 网关  │  可独立扩缩
        └─────┬─────┘ └───┬────┘ └────┬─────┘
              │            │           │
              └────────────┼───────────┘
                           │
                    ┌──────▼──────┐
                    │    Redis    │  QR token / session / pub-sub
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  MySQL/PG   │  用户数据 / 考试数据
                    └─────────────┘
```

## 核心模块

### Phase 1: 基础框架 + 扫码登录
- 项目初始化（Express/Fastify + WebSocket）
- Redis 集成
- 数据库设计（用户、考试、题目）
- 扫码登录流程：
  - 生成 QR token（存 Redis，TTL 5min）
  - 前端用 qrcode.js 本地渲染二维码
  - WebSocket 推送扫码状态（pending → scanned → confirmed）
  - JWT 签发

### Phase 2: 考试核心功能
- 考试管理（创建、编辑、发布）
- 题库管理（选择题、判断题、填空题、简答题）
- 考试会话（进入考场、答题、提交）
- 倒计时 + 自动交卷

### Phase 3: 高并发优化
- 连接数控制（Nginx limit_conn / limit_req）
- WebSocket 网关独立部署
- Redis pub/sub 用于多实例间通信
- 排队机制（可选）
- 预热策略（考前开放登录）

### Phase 4: 扩展功能
- 防作弊（切屏检测、IP 限制）
- 断线重连
- 成绩统计与导出
- 管理后台

## 技术栈

- **运行时**: Node.js
- **框架**: Fastify（高性能）
- **WebSocket**: ws / @fastify/websocket
- **数据库**: MySQL（Knex.js 做 query builder）
- **缓存**: Redis (ioredis)
- **认证**: JWT (jsonwebtoken)
- **二维码**: 前端 qrcode.js 渲染，后端只提供 token

## 关键设计决策

| 决策 | 方案 | 原因 |
|---|---|---|
| QR 状态存储 | Redis | 高频读写，TTL 自动过期 |
| 扫码通知 | WebSocket | 避免轮询放大效应 |
| 二维码渲染 | 前端 qrcode.js | 减轻服务端压力 |
| 认证方式 | JWT | 无状态，不查库验证 |
| Session 管理 | Redis | 支持踢人/强制下线 |
| 数据库查询 | Knex.js | 灵活，轻量，不需要完整 ORM |
