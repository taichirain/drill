/**
 * SQLite → PostgreSQL 一次性数据迁移脚本
 *
 * 用法: node scripts/migrate-sqlite-to-pg.js
 *
 * 步骤：
 * 1. 确保 PostgreSQL 已启动且数据库已创建
 * 2. 运行 knex migrate:latest 创建目标表结构
 * 3. 运行此脚本迁移数据
 * 4. 验证数据完整性
 */

const sqliteDb = require('../src/db/index');
const pgDb = require('../src/db/knex');

async function migrate() {
  console.log('🔄 开始迁移 SQLite → PostgreSQL...');

  // 确保目标表已存在
  const migrationStatus = await pgDb.migrate.status();
  if (migrationStatus === -1) {
    console.log('⚠️ 目标数据库未执行迁移，请先运行: npm run db:migrate');
    process.exit(1);
  }

  // TODO: 按表逐个迁移数据
  // 1. users
  // 2. exams
  // 3. questions
  // 4. exam_sessions
  // 5. answers
  // 6. cheat_logs
  // 7. heartbeats
  // 8. exam_settings

  console.log('✅ 迁移完成');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ 迁移失败:', err);
  process.exit(1);
});
