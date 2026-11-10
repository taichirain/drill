const cluster = require('node:cluster');
const os = require('node:os');

const WORKER_COUNT = parseInt(process.env.WORKERS || '0') || Math.min(os.cpus().length, 4);

if (cluster.isPrimary) {
  console.log(`\n🔧 主进程 ${process.pid} 启动，准备 fork ${WORKER_COUNT} 个 worker...\n`);

  // Fork workers
  for (let i = 0; i < WORKER_COUNT; i++) {
    cluster.fork();
  }

  // Worker 退出后自动重启
  cluster.on('exit', (worker, code, signal) => {
    if (signal !== 'SIGTERM' && code !== 0) {
      console.log(`⚠️  Worker ${worker.process.pid} 异常退出 (code: ${code}, signal: ${signal})，重启中...`);
      cluster.fork();
    }
  });

  // 优雅关闭
  const shutdown = () => {
    console.log('\n🛑 收到关闭信号，正在优雅退出...');
    for (const id in cluster.workers) {
      cluster.workers[id].send('shutdown');
    }
    setTimeout(() => {
      console.log('⏰ 优雅关闭超时，强制退出');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

} else {
  // Worker 进程：运行应用
  const app = require('./app');

  // 监听主进程的关闭信号
  process.on('message', async (msg) => {
    if (msg === 'shutdown') {
      console.log(`Worker ${process.pid} 正在优雅关闭...`);
      try {
        // 尝试优雅关闭 Fastify 实例
        if (app && app.close) {
          await app.close();
        }
      } catch (err) {
        console.error('关闭出错:', err);
      }
      process.exit(0);
    }
  });
}
