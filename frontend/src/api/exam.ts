import client from './client';
import type { Exam, Question, ExamSession } from '@/types';

export async function getExams() {
  const res = await client.get('/exams');
  return res.data as { exams: Exam[] };
}

export async function getExam(id: number) {
  const res = await client.get(`/exams/${id}`);
  return res.data as { exam: Exam };
}

export async function getQuestions(id: number) {
  const res = await client.get(`/exams/${id}/questions`);
  return res.data as {
    exam: Exam;
    session: ExamSession;
    questions: Question[];
    answers: Record<number, string>;
  };
}

export async function saveAnswer(examId: number, questionId: number, answer: string) {
  const res = await client.post(`/exams/${examId}/answer`, { questionId, answer });
  return res.data as { success: boolean };
}

export async function submitExam(examId: number) {
  const res = await client.post(`/exams/${examId}/submit`);
  return res.data as { success: boolean; score: number; message: string };
}

export async function heartbeat(examId: number) {
  const res = await client.post(`/exam/${examId}/heartbeat`);
  return res.data as {
    status: string;
    serverTime: number;
    elapsedSeconds: number;
    switchCount: number;
  };
}

export async function recoverExam(examId: number) {
  const res = await client.get(`/exam/${examId}/recover`);
  return res.data as {
    recoverable: boolean;
    reason?: string;
    remainingSeconds?: number;
    answers?: Record<number, string>;
    switchCount?: number;
  };
}
