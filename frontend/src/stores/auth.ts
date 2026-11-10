import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from '@/types';
import * as authApi from '@/api/auth';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref(localStorage.getItem('token') || '');
  const loading = ref(false);

  const isLoggedIn = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const isTeacher = computed(() => user.value?.role === 'teacher' || user.value?.role === 'admin');

  async function login(username: string, password: string) {
    loading.value = true;
    try {
      const res = await authApi.login(username, password);
      token.value = res.token;
      user.value = res.user;
      localStorage.setItem('token', res.token);
      return true;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || '登录失败');
    } finally {
      loading.value = false;
    }
  }

  async function fetchUser() {
    if (!token.value) return;
    try {
      const res = await authApi.getMe();
      user.value = res.user;
    } catch {
      logout();
    }
  }

  function logout() {
    user.value = null;
    token.value = '';
    localStorage.removeItem('token');
  }

  return { user, token, loading, isLoggedIn, isAdmin, isTeacher, login, fetchUser, logout };
});
