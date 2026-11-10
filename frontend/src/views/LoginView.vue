<template>
  <div class="login-page">
    <div class="login-box">
      <h1>在线考试系统</h1>

      <!-- 账号密码登录 -->
      <div v-if="mode === 'password'" class="login-form">
        <div class="form-group">
          <label>用户名</label>
          <input v-model="form.username" placeholder="请输入用户名" @keyup.enter="handleLogin" />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input v-model="form.password" type="password" placeholder="请输入密码" @keyup.enter="handleLogin" />
        </div>
        <button class="btn btn-primary" :disabled="auth.loading" @click="handleLogin">
          {{ auth.loading ? '登录中...' : '登录' }}
        </button>
        <p v-if="error" class="error">{{ error }}</p>
        <a class="switch-link" @click="mode = 'qr'">扫码登录 →</a>
      </div>

      <!-- 扫码登录 -->
      <div v-else class="qr-section">
        <div v-if="qrState === 'pending'" class="qr-box">
          <p>请使用微信或浏览器扫码</p>
          <canvas ref="qrCanvas" width="200" height="200"></canvas>
          <p class="qr-tip">二维码 {{ qrCountdown }} 秒后过期</p>
        </div>
        <div v-else-if="qrState === 'scanned'" class="qr-status">
          <p>已扫码，请在手机上确认登录</p>
        </div>
        <div v-else-if="qrState === 'confirmed'" class="qr-status success">
          <p>登录成功，正在跳转...</p>
        </div>
        <div v-else-if="qrState === 'expired'" class="qr-status error">
          <p>二维码已过期</p>
          <button class="btn btn-primary" @click="generateQr">刷新二维码</button>
        </div>
        <a class="switch-link" @click="mode = 'password'">← 账号密码登录</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import * as authApi from '@/api/auth';

const router = useRouter();
const auth = useAuthStore();

const mode = ref<'password' | 'qr'>('password');
const form = ref({ username: '', password: '' });
const error = ref('');

// 二维码状态
const qrState = ref<'pending' | 'scanned' | 'confirmed' | 'expired'>('pending');
const qrToken = ref('');
const qrCountdown = ref(300);
let qrTimer: ReturnType<typeof setInterval> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

async function handleLogin() {
  error.value = '';
  try {
    await auth.login(form.value.username, form.value.password);
    redirectByRole();
  } catch (err: any) {
    error.value = err.message;
  }
}

function redirectByRole() {
  if (auth.isTeacher) {
    router.push('/admin');
  } else {
    router.push('/exam');
  }
}

// 扫码相关
async function generateQr() {
  qrState.value = 'pending';
  qrCountdown.value = 300;
  const res = await authApi.generateQr();
  qrToken.value = res.token;
  drawQrCode(res.token);
  startQrTimer();
  startPolling();
}

function drawQrCode(token: string) {
  nextTick(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 200, 200);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 200, 200);
    // 简化的 QR 绘制：实际项目应使用 qrcode.js
    ctx.fillStyle = '#000';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('QR Code', 100, 100);
    ctx.font = '10px sans-serif';
    ctx.fillText(token.slice(0, 20) + '...', 100, 120);
  });
}

function startQrTimer() {
  if (qrTimer) clearInterval(qrTimer);
  qrTimer = setInterval(() => {
    qrCountdown.value--;
    if (qrCountdown.value <= 0) {
      qrState.value = 'expired';
      stopTimers();
    }
  }, 1000);
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    if (!qrToken.value || qrState.value !== 'pending') return;
    try {
      const res = await authApi.getQrStatus(qrToken.value);
      if (res.status === 'scanned') {
        qrState.value = 'scanned';
      } else if (res.status === 'confirmed' && res.token) {
        qrState.value = 'confirmed';
        localStorage.setItem('token', res.token);
        auth.token = res.token;
        auth.user = res.user!;
        stopTimers();
        redirectByRole();
      }
    } catch {
      // ignore
    }
  }, 2000);
}

function stopTimers() {
  if (qrTimer) clearInterval(qrTimer);
  if (pollTimer) clearInterval(pollTimer);
}

watch(mode, (val) => {
  if (val === 'qr') {
    generateQr();
  } else {
    stopTimers();
  }
});

onUnmounted(stopTimers);
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1890ff 0%, #36cfc9 100%);
}

.login-box {
  width: 400px;
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}

.login-box h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #1890ff;
}

.login-form .btn {
  width: 100%;
  margin-top: 10px;
}

.error {
  color: #ff4d4f;
  font-size: 14px;
  margin-top: 10px;
  text-align: center;
}

.switch-link {
  display: block;
  text-align: center;
  margin-top: 20px;
  color: #1890ff;
  cursor: pointer;
  font-size: 14px;
}

.qr-section {
  text-align: center;
}

.qr-box canvas {
  margin: 20px auto;
  border: 1px solid #eee;
  border-radius: 8px;
}

.qr-tip {
  font-size: 13px;
  color: #999;
}

.qr-status {
  padding: 40px 0;
}

.qr-status.success { color: #52c41a; }
.qr-status.error { color: #ff4d4f; }
</style>
