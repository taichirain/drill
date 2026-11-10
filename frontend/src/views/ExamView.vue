<template>
  <div class="exam-page">
    <header class="exam-header">
      <span>在线考试系统</span>
      <div class="user-info">
        <span>{{ auth.user?.name }}</span>
        <button class="btn btn-sm" @click="auth.logout">退出</button>
      </div>
    </header>

    <!-- 考试列表 -->
    <div v-if="!takingExam" class="exam-list">
      <h2>可参加的考试</h2>
      <div v-if="examStore.loading" class="loading">加载中...</div>
      <div v-else-if="examStore.exams.length === 0" class="empty">暂无可用考试</div>
      <div v-else class="exam-cards">
        <div v-for="exam in examStore.exams" :key="exam.id" class="exam-card">
          <h3>{{ exam.title }}</h3>
          <p class="desc">{{ exam.description || '暂无描述' }}</p>
          <div class="meta">
            <span>时长: {{ exam.duration }} 分钟</span>
            <span :class="['tag', 'tag-' + exam.status]">{{ statusText(exam.status) }}</span>
          </div>
          <button class="btn btn-primary" @click="startExam(exam.id)">进入考试</button>
        </div>
      </div>
    </div>

    <!-- 考试界面 -->
    <div v-else class="exam-room">
      <div class="exam-toolbar">
        <div class="timer" :class="{ warning: timer.remaining.value < 300 }">
          剩余时间: {{ timer.formattedTime() }}
        </div>
        <button class="btn btn-success" @click="confirmSubmit">交卷</button>
      </div>

      <div class="exam-body">
        <div class="question-panel">
          <div v-for="(q, idx) in examStore.questions" :key="q.id" :id="'q-' + q.id" class="question-item">
            <div class="question-title">
              <span class="num">{{ idx + 1 }}.</span>
              <span class="type">[{{ typeLabel(q.type) }}]</span>
              <span>{{ q.content }}</span>
              <span class="score">({{ q.score }}分)</span>
            </div>

            <!-- 选择题 -->
            <div v-if="q.type === 'choice' || q.type === 'judge'" class="options">
              <label v-for="(opt, oi) in q.options" :key="oi" class="option">
                <input
                  v-model="examStore.answers[q.id]"
                  type="radio"
                  :name="'q' + q.id"
                  :value="String.fromCharCode(65 + oi)"
                />
                <span>{{ opt }}</span>
              </label>
            </div>

            <!-- 多选题 -->
            <div v-else-if="q.type === 'multi_choice'" class="options">
              <label v-for="(opt, oi) in q.options" :key="oi" class="option">
                <input
                  v-model="multiAnswers[q.id]"
                  type="checkbox"
                  :value="String.fromCharCode(65 + oi)"
                />
                <span>{{ opt }}</span>
              </label>
            </div>

            <!-- 填空题 -->
            <div v-else-if="q.type === 'fill'" class="fill-input">
              <input v-model="examStore.answers[q.id]" placeholder="请填写答案" />
            </div>

            <!-- 简答题 -->
            <div v-else-if="q.type === 'essay'" class="essay-input">
              <textarea v-model="examStore.answers[q.id]" rows="6" placeholder="请在此输入答案" />
            </div>
          </div>
        </div>

        <div class="answer-card">
          <h4>答题卡</h4>
          <div class="q-nav">
            <div
              v-for="(q, idx) in examStore.questions"
              :key="q.id"
              :class="['q-dot', { answered: hasAnswer(q.id) }]"
              @click="scrollToQuestion(q.id)"
            >
              {{ idx + 1 }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useExamStore } from '@/stores/exam';
import { useTimer } from '@/composables/useTimer';
import * as examApi from '@/api/exam';
import type { Question } from '@/types';

const auth = useAuthStore();
const examStore = useExamStore();
const takingExam = ref(false);
const multiAnswers = ref<Record<number, string[]>>({});
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let autoSaveTimer: ReturnType<typeof setInterval> | null = null;
let switchCount = 0;

const timer = useTimer(0, () => {
  alert('考试时间已到，系统将自动交卷');
  submitExam();
});

onMounted(() => {
  examStore.fetchExams();
  document.addEventListener('visibilitychange', onVisibilityChange);
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange);
  stopTimers();
});

async function startExam(examId: number) {
  const res = await examStore.enterExam(examId);
  takingExam.value = true;
  timer.sync(res.exam.duration * 60);
  timer.start();
  startHeartbeat(examId);
  startAutoSave(examId);
}

function startHeartbeat(examId: number) {
  heartbeatTimer = setInterval(async () => {
    try {
      const res = await examApi.heartbeat(examId);
      const remaining = examStore.currentExam!.duration * 60 - res.elapsedSeconds;
      timer.sync(Math.max(0, remaining));
      switchCount = res.switchCount;
    } catch {
      // ignore
    }
  }, 15000);
}

function startAutoSave(examId: number) {
  autoSaveTimer = setInterval(async () => {
    for (const q of examStore.questions) {
      const ans = getAnswerValue(q);
      if (ans) {
        await examApi.saveAnswer(examId, q.id, ans).catch(() => {});
      }
    }
  }, 10000);
}

function stopTimers() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (autoSaveTimer) clearInterval(autoSaveTimer);
  timer.stop();
}

function getAnswerValue(q: Question): string | null {
  if (q.type === 'multi_choice') {
    const arr = multiAnswers.value[q.id] || [];
    return arr.length ? arr.sort().join(',') : null;
  }
  return examStore.answers[q.id] || null;
}

function hasAnswer(qid: number) {
  const q = examStore.questions.find(x => x.id === qid);
  if (!q) return false;
  const val = getAnswerValue(q);
  return !!val;
}

function scrollToQuestion(id: number) {
  document.getElementById('q-' + id)?.scrollIntoView({ behavior: 'smooth' });
}

async function confirmSubmit() {
  if (!confirm('确定要交卷吗？交卷后无法修改答案。')) return;
  await submitExam();
}

async function submitExam() {
  stopTimers();
  const examId = examStore.currentExam!.id;
  // 先保存所有答案
  for (const q of examStore.questions) {
    const ans = getAnswerValue(q);
    if (ans) {
      await examApi.saveAnswer(examId, q.id, ans).catch(() => {});
    }
  }
  const res = await examStore.submitExam(examId);
  alert(`交卷成功！得分: ${res.score}`);
  takingExam.value = false;
  examStore.fetchExams();
}

async function onVisibilityChange() {
  if (document.hidden && takingExam.value) {
    switchCount++;
    const examId = examStore.currentExam!.id;
    await examApi.heartbeat(examId).catch(() => {});
    // 实际应调用 cheat-event API，这里简化
  }
}

function statusText(s: string) {
  const map: Record<string, string> = { draft: '草稿', published: '已发布', ongoing: '进行中', finished: '已结束' };
  return map[s] || s;
}

function typeLabel(t: string) {
  const map: Record<string, string> = { choice: '单选', multi_choice: '多选', judge: '判断', fill: '填空', essay: '简答' };
  return map[t] || t;
}
</script>

<style scoped>
.exam-page { min-height: 100vh; background: #f5f5f5; }
.exam-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.exam-header span { font-weight: 500; }
.user-info { display: flex; align-items: center; gap: 12px; }
.btn-sm { padding: 4px 12px; font-size: 12px; }

.exam-list { max-width: 960px; margin: 0 auto; padding: 24px; }
.exam-list h2 { margin-bottom: 20px; }
.exam-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.exam-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.exam-card h3 { margin-bottom: 8px; }
.desc { color: #666; font-size: 14px; margin-bottom: 12px; }
.meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; font-size: 13px; }
.meta span:first-child { color: #666; }

.exam-room { padding: 16px; }
.exam-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 12px 24px;
  border-radius: 8px;
  margin-bottom: 16px;
  position: sticky;
  top: 0;
  z-index: 10;
}
.timer { font-size: 18px; font-weight: 600; color: #333; }
.timer.warning { color: #ff4d4f; }

.exam-body { display: flex; gap: 16px; }
.question-panel { flex: 1; }
.question-item {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 12px;
}
.question-title { font-weight: 500; margin-bottom: 12px; }
.question-title .num { margin-right: 4px; }
.question-title .type { color: #1890ff; font-size: 13px; margin-right: 4px; }
.question-title .score { color: #ff4d4f; font-size: 13px; margin-left: 8px; }

.options { display: flex; flex-direction: column; gap: 8px; }
.option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}
.option:hover { background: #f5f5f5; }
.option input { margin: 0; }

.fill-input input, .essay-input textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
}
.essay-input textarea { resize: vertical; }

.answer-card {
  width: 200px;
  background: white;
  border-radius: 8px;
  padding: 16px;
  position: sticky;
  top: 80px;
  align-self: flex-start;
}
.answer-card h4 { margin-bottom: 12px; }
.q-nav { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
.q-dot {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f0f0f0;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.q-dot.answered { background: #52c41a; color: white; }
.q-dot:hover { background: #1890ff; color: white; }
</style>
