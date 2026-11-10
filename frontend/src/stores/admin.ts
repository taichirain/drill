import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Exam, Question, ExamSettings } from '@/types';
import * as adminApi from '@/api/admin';

export const useAdminStore = defineStore('admin', () => {
  const currentExam = ref<Exam | null>(null);
  const questions = ref<Question[]>([]);
  const settings = ref<ExamSettings | null>(null);
  const results = ref<any[]>([]);
  const cheatLogs = ref<any[]>([]);
  const loading = ref(false);

  async function fetchExam(id: number) {
    loading.value = true;
    try {
      const res = await adminApi.getAdminExam(id);
      currentExam.value = res.exam;
      questions.value = res.questions;
      settings.value = res.settings;
    } finally {
      loading.value = false;
    }
  }

  async function createExam(data: Partial<Exam>) {
    return adminApi.createExam(data);
  }

  async function addQuestion(examId: number, data: Partial<Question>) {
    return adminApi.addQuestion(examId, data);
  }

  async function updateQuestion(id: number, data: Partial<Question>) {
    return adminApi.updateQuestion(id, data);
  }

  async function deleteQuestion(id: number) {
    return adminApi.deleteQuestion(id);
  }

  async function updateExamStatus(id: number, status: string) {
    return adminApi.updateExamStatus(id, status);
  }

  async function fetchResults(examId: number) {
    const res = await adminApi.getResults(examId);
    results.value = res.results;
  }

  async function fetchCheatLogs(examId: number) {
    const res = await adminApi.getCheatLogs(examId);
    cheatLogs.value = res.logs;
  }

  async function updateSettings(examId: number, data: Partial<ExamSettings>) {
    return adminApi.updateSettings(examId, data);
  }

  async function batchCreateUsers(users: any[]) {
    return adminApi.batchCreateUsers(users);
  }

  return {
    currentExam, questions, settings, results, cheatLogs, loading,
    fetchExam, createExam, addQuestion, updateQuestion, deleteQuestion,
    updateExamStatus, fetchResults, fetchCheatLogs, updateSettings, batchCreateUsers,
  };
});
