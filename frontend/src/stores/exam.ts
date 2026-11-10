import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Exam, Question, ExamSession } from '@/types';
import * as examApi from '@/api/exam';

export const useExamStore = defineStore('exam', () => {
  const exams = ref<Exam[]>([]);
  const currentExam = ref<Exam | null>(null);
  const currentSession = ref<ExamSession | null>(null);
  const questions = ref<Question[]>([]);
  const answers = ref<Record<number, string>>({});
  const loading = ref(false);

  async function fetchExams() {
    loading.value = true;
    try {
      const res = await examApi.getExams();
      exams.value = res.exams;
    } finally {
      loading.value = false;
    }
  }

  async function enterExam(examId: number) {
    loading.value = true;
    try {
      const res = await examApi.getQuestions(examId);
      currentExam.value = res.exam;
      currentSession.value = res.session;
      questions.value = res.questions;
      answers.value = res.answers;
      return res;
    } finally {
      loading.value = false;
    }
  }

  async function saveAnswer(examId: number, questionId: number, answer: string) {
    answers.value[questionId] = answer;
    await examApi.saveAnswer(examId, questionId, answer);
  }

  async function submitExam(examId: number) {
    const res = await examApi.submitExam(examId);
    if (currentSession.value) {
      currentSession.value.status = 'submitted';
      currentSession.value.score = res.score;
    }
    return res;
  }

  return {
    exams, currentExam, currentSession, questions, answers, loading,
    fetchExams, enterExam, saveAnswer, submitExam,
  };
});
