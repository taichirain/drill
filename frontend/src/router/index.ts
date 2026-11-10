import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import LoginView from '@/views/LoginView.vue';
import ExamView from '@/views/ExamView.vue';
import AdminView from '@/views/AdminView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'login', component: LoginView },
    {
      path: '/exam',
      name: 'exam',
      component: ExamView,
      meta: { requiresAuth: true, role: 'student' },
    },
    {
      path: '/admin',
      name: 'admin',
      component: AdminView,
      meta: { requiresAuth: true, role: 'teacher' },
    },
  ],
});

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    next('/');
    return;
  }
  if (to.meta.role === 'teacher' && !auth.isTeacher) {
    next('/exam');
    return;
  }
  next();
});

export default router;
