import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * 考试完整流程集成测试骨架
 *
 * 测试范围：
 * 1. 创建考试
 * 2. 添加题目
 * 3. 学生登录
 * 4. 进入考场
 * 5. 答题并保存
 * 6. 交卷并自动评分
 */

describe('Exam Flow Integration', () => {
  beforeAll(async () => {
    // TODO: 初始化测试数据库
    // TODO: 启动 Fastify 测试实例
  });

  afterAll(async () => {
    // TODO: 清理测试数据
  });

  it('should create an exam', async () => {
    // TODO
  });

  it('should add questions to exam', async () => {
    // TODO
  });

  it('should allow student to take exam and auto-grade', async () => {
    // TODO
  });
});
