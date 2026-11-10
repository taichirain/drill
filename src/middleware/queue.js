/**
 * 请求排队系统 - 考试开始时的瞬时高并发削峰
 *
 * 工作原理：
 * 1. 请求进来先进队列，拿到排队号
 * 2. 按批次放行（每批 N 个，间隔 M ms）
 * 3. 前端展示排队进度
 */

class RequestQueue {
  constructor({ batchSize = 50, batchIntervalMs = 500, maxQueueSize = 5000 } = {}) {
    this.batchSize = batchSize;
    this.batchIntervalMs = batchIntervalMs;
    this.maxQueueSize = maxQueueSize;

    this.queue = [];           // 排队中的请求
    this.processing = false;
    this.processedCount = 0;
    this.totalQueued = 0;
  }

  /**
   * 将请求加入队列
   * @returns {Promise} resolve 时表示轮到该请求了
   */
  enqueue(requestId) {
    if (this.queue.length >= this.maxQueueSize) {
      return Promise.reject(new Error('排队人数已满，请稍后再试'));
    }

    this.totalQueued++;
    const position = this.queue.length + 1;

    return new Promise((resolve, reject) => {
      this.queue.push({
        id: requestId,
        position,
        resolve,
        reject,
        enqueuedAt: Date.now(),
      });

      if (!this.processing) {
        this._processBatch();
      }
    });
  }

  _processBatch() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const batch = this.queue.splice(0, this.batchSize);
    this.processedCount += batch.length;

    // 放行这一批
    for (const item of batch) {
      item.resolve({
        position: 0,
        waitedMs: Date.now() - item.enqueuedAt,
      });
    }

    // 下一批
    if (this.queue.length > 0) {
      setTimeout(() => this._processBatch(), this.batchIntervalMs);
    } else {
      this.processing = false;
    }
  }

  /**
   * 获取当前排队状态
   */
  status() {
    return {
      queueLength: this.queue.length,
      processedCount: this.processedCount,
      totalQueued: this.totalQueued,
      estimatedWaitMs: Math.ceil(this.queue.length / this.batchSize) * this.batchIntervalMs,
    };
  }
}

// 登录排队队列
const loginQueue = new RequestQueue({
  batchSize: 100,        // 每批放行 100 人
  batchIntervalMs: 200,  // 每 200ms 一批
  maxQueueSize: 5000,
});

// 进入考场排队队列
const examEntryQueue = new RequestQueue({
  batchSize: 50,
  batchIntervalMs: 300,
  maxQueueSize: 3000,
});

module.exports = { RequestQueue, loginQueue, examEntryQueue };
