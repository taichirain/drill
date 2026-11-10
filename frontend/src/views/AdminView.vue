<template>
  <div class="admin-page">
    <header class="admin-header">
      <h2>管理后台</h2>
      <div class="user-info">
        <span>{{ auth.user?.name }} ({{ auth.user?.role }})</span>
        <button class="btn btn-sm" @click="auth.logout">退出</button>
      </div>
    </header>

    <div class="admin-body">
      <!-- 侧边栏 -->
      <aside class="sidebar">
        <div class="nav-item" :class="{ active: tab === 'exams' }" @click="tab = 'exams'">考试管理</div>
        <div class="nav-item" :class="{ active: tab === 'questions' }" @click="tab = 'questions'">题目管理</div>
        <div class="nav-item" :class="{ active: tab === 'results' }" @click="tab = 'results'">成绩查看</div>
        <div class="nav-item" :class="{ active: tab === 'cheat' }" @click="tab = 'cheat'">作弊日志</div>
        <div class="nav-item" :class="{ active: tab === 'users' }" @click="tab = 'users'">用户管理</div>
      </aside>

      <main class="main-content">
        <!-- 考试管理 -->
        <div v-if="tab === 'exams'">
          <div class="section-header">
            <h3>考试管理</h3>
            <button class="btn btn-primary" @click="showCreateExam = true">+ 创建考试</button>
          </div>

          <div v-if="showCreateExam" class="card form-card">
            <h4>创建考试</h4>
            <div class="form-group">
              <label>标题</label>
              <input v-model="newExam.title" placeholder="考试标题" />
            </div>
            <div class="form-group">
              <label>描述</label>
              <textarea v-model="newExam.description" rows="2" placeholder="考试描述"></textarea>
            </div>
            <div class="form-group">
              <label>时长（分钟）</label>
              <input v-model.number="newExam.duration" type="number" min="1" max="300" />
            </div>
            <div class="form-actions">
              <button class="btn btn-primary" @click="createExam">创建</button>
              <button class="btn" @click="showCreateExam = false">取消</button>
            </div>
          </div>

          <table class="table">
            <thead>
              <tr><th>ID</th><th>标题</th><th>时长</th><th>状态</th><th>操作</th></tr>
            </thead>
            <tbody>
              <tr v-for="exam in examStore.exams" :key="exam.id">
                <td>{{ exam.id }}</td>
                <td>{{ exam.title }}</td>
                <td>{{ exam.duration }}分钟</td>
                <td><span :class="['tag', 'tag-' + exam.status]">{{ statusText(exam.status) }}</span></td>
                <td>
                  <button class="btn btn-sm" @click="selectExam(exam.id)">管理</button>
                  <button v-if="exam.status === 'draft'" class="btn btn-sm btn-success" @click="publishExam(exam.id)">发布</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 题目管理 -->
        <div v-if="tab === 'questions'">
          <div class="section-header">
            <h3>题目管理</h3>
            <select v-model="selectedExamId" @change="selectExam(Number(selectedExamId))">
              <option value="">选择考试</option>
              <option v-for="e in examStore.exams" :key="e.id" :value="e.id">{{ e.title }}</option>
            </select>
          </div>

          <div v-if="adminStore.currentExam" class="card form-card">
            <h4>添加题目</h4>
            <div class="form-group">
              <label>题型</label>
              <select v-model="newQuestion.type">
                <option value="choice">单选题</option>
                <option value="multi_choice">多选题</option>
                <option value="judge">判断题</option>
                <option value="fill">填空题</option>
                <option value="essay">简答题</option>
              </select>
            </div>
            <div class="form-group">
              <label>题目内容</label>
              <textarea v-model="newQuestion.content" rows="2"></textarea>
            </div>
            <div v-if="newQuestion.type === 'choice' || newQuestion.type === 'judge' || newQuestion.type === 'multi_choice'" class="form-group">
              <label>选项（每行一个，如 A. xxx）</label>
              <textarea v-model="optionsText" rows="4" placeholder="A. 选项A&#10;B. 选项B&#10;C. 选项C&#10;D. 选项D"></textarea>
            </div>
            <div class="form-group">
              <label>答案</label>
              <input v-model="newQuestion.answer" placeholder="答案" />
            </div>
            <div class="form-group">
              <label>分值</label>
              <input v-model.number="newQuestion.score" type="number" min="0" />
            </div>
            <div class="form-actions">
              <button class="btn btn-primary" @click="addQuestion">添加</button>
            </div>
          </div>

          <table v-if="adminStore.questions.length" class="table">
            <thead>
              <tr><th>序号</th><th>题型</th><th>内容</th><th>答案</th><th>分值</th><th>操作</th></tr>
            </thead>
            <tbody>
              <tr v-for="(q, i) in adminStore.questions" :key="q.id">
                <td>{{ i + 1 }}</td>
                <td>{{ typeLabel(q.type) }}</td>
                <td>{{ q.content.slice(0, 40) }}...</td>
                <td>{{ q.answer }}</td>
                <td>{{ q.score }}</td>
                <td>
                  <button class="btn btn-sm btn-danger" @click="deleteQuestion(q.id)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 成绩查看 -->
        <div v-if="tab === 'results'">
          <div class="section-header">
            <h3>成绩查看</h3>
            <select v-model="selectedExamId" @change="loadResults(Number(selectedExamId))">
              <option value="">选择考试</option>
              <option v-for="e in examStore.exams" :key="e.id" :value="e.id">{{ e.title }}</option>
            </select>
          </div>
          <table v-if="adminStore.results.length" class="table">
            <thead>
              <tr><th>学生</th><th>学号</th><th>得分</th><th>状态</th></tr>
            </thead>
            <tbody>
              <tr v-for="r in adminStore.results" :key="r.id">
                <td>{{ r.student_name }}</td>
                <td>{{ r.username }}</td>
                <td>{{ r.score ?? '-' }}</td>
                <td>{{ r.status }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 作弊日志 -->
        <div v-if="tab === 'cheat'">
          <div class="section-header">
            <h3>作弊日志</h3>
            <select v-model="selectedExamId" @change="loadCheatLogs(Number(selectedExamId))">
              <option value="">选择考试</option>
              <option v-for="e in examStore.exams" :key="e.id" :value="e.id">{{ e.title }}</option>
            </select>
          </div>
          <table v-if="adminStore.cheatLogs.length" class="table">
            <thead>
              <tr><th>时间</th><th>学生</th><th>事件</th><th>详情</th></tr>
            </thead>
            <tbody>
              <tr v-for="log in adminStore.cheatLogs" :key="log.id">
                <td>{{ new Date(log.created_at).toLocaleString() }}</td>
                <td>{{ log.student_name }}</td>
                <td>{{ log.event_type }}</td>
                <td>{{ log.detail }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 用户管理 -->
        <div v-if="tab === 'users'">
          <div class="section-header"><h3>批量创建用户</h3></div>
          <div class="card form-card">
            <div class="form-group">
              <label>用户列表（每行一个，格式：用户名,姓名,密码,角色）</label>
              <textarea v-model="batchUsers" rows="10" placeholder="student01,张三,123456,student&#10;student02,李四,123456,student"></textarea>
            </div>
            <button class="btn btn-primary" @click="createUsers">批量创建</button>
            <p v-if="batchResult" class="success">{{ batchResult }}</p>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useExamStore } from '@/stores/exam';
import { useAdminStore } from '@/stores/admin';

const auth = useAuthStore();
const examStore = useExamStore();
const adminStore = useAdminStore();

const tab = ref('exams');
const selectedExamId = ref('');
const showCreateExam = ref(false);
const newExam = ref({ title: '', description: '', duration: 60 });
const newQuestion = ref({ type: 'choice', content: '', answer: '', score: 10 });
const optionsText = ref('');
const batchUsers = ref('');
const batchResult = ref('');

onMounted(() => {
  examStore.fetchExams();
});

async function createExam() {
  await adminStore.createExam(newExam.value);
  showCreateExam.value = false;
  newExam.value = { title: '', description: '', duration: 60 };
  examStore.fetchExams();
}

async function publishExam(id: number) {
  await adminStore.updateExamStatus(id, 'published');
  examStore.fetchExams();
}

async function selectExam(id: number) {
  selectedExamId.value = String(id);
  await adminStore.fetchExam(id);
}

async function addQuestion() {
  const examId = Number(selectedExamId.value);
  const opts = optionsText.value.trim().split('\n').filter(Boolean);
  const q = {
    type: newQuestion.value.type as 'choice' | 'multi_choice' | 'judge' | 'fill' | 'essay',
    content: newQuestion.value.content,
    answer: newQuestion.value.answer,
    score: newQuestion.value.score,
    options: opts.length ? opts : undefined,
  };
  await adminStore.addQuestion(examId, q);
  newQuestion.value = { type: 'choice', content: '', answer: '', score: 10 };
  optionsText.value = '';
  adminStore.fetchExam(examId);
}

async function deleteQuestion(id: number) {
  if (!confirm('确定删除此题目？')) return;
  await adminStore.deleteQuestion(id);
  adminStore.fetchExam(Number(selectedExamId.value));
}

async function loadResults(examId: number) {
  if (!examId) return;
  await adminStore.fetchResults(examId);
}

async function loadCheatLogs(examId: number) {
  if (!examId) return;
  await adminStore.fetchCheatLogs(examId);
}

async function createUsers() {
  const lines = batchUsers.value.trim().split('\n').filter(Boolean);
  const users = lines.map(line => {
    const [username, name, password, role] = line.split(',');
    return { username: username?.trim(), name: name?.trim(), password: password?.trim(), role: role?.trim() || 'student' };
  });
  const res = await adminStore.batchCreateUsers(users);
  batchResult.value = res.message;
  batchUsers.value = '';
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
.admin-page { min-height: 100vh; background: #f5f5f5; }
.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.user-info { display: flex; align-items: center; gap: 12px; }

.admin-body { display: flex; min-height: calc(100vh - 60px); }
.sidebar {
  width: 180px;
  background: white;
  padding: 16px 0;
  box-shadow: 2px 0 8px rgba(0,0,0,0.04);
}
.nav-item {
  padding: 12px 24px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}
.nav-item:hover { background: #f5f5f5; }
.nav-item.active { background: #e6f7ff; color: #1890ff; font-weight: 500; }

.main-content { flex: 1; padding: 24px; overflow-y: auto; }
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.section-header select { padding: 6px 12px; border-radius: 4px; border: 1px solid #d9d9d9; }

.form-card { max-width: 600px; margin-bottom: 20px; }
.form-actions { display: flex; gap: 12px; margin-top: 16px; }
.success { color: #52c41a; margin-top: 10px; }
</style>
