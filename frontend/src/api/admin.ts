import client from './client';
import type { Exam, Question, ExamSettings, CheatLog, User } from '@/types';

export async function createExam(data: Partial<Exam>) {
  const res = await client.post('/admin/exams', data);
  return res.data as { id: number; message: string };
}

export async function updateExamStatus(id: number, status: string) {
  const res = await client.put(`/admin/exams/${id}/status`, { status });
  return res.data as { success: boolean };
}

export async function getAdminExam(id: number) {
  const res = await client.get(`/admin/exams/${id}`);
  return res.data as { exam: Exam; questions: Question[]; settings: ExamSettings };
}

export async function addQuestion(examId: number, data: Partial<Question>) {
  const res = await client.post(`/admin/exams/${examId}/questions`, data);
  return res.data as { id: number; message: string };
}

export async function updateQuestion(id: number, data: Partial<Question>) {
  const res = await client.put(`/admin/questions/${id}`, data);
  return res.data as { success: boolean };
}

export async function deleteQuestion(id: number) {
  const res = await client.delete(`/admin/questions/${id}`);
  return res.data as { success: boolean };
}

export async function getResults(examId: number) {
  const res = await client.get(`/admin/exams/${examId}/results`);
  return res.data as { results: { id: number; student_name: string; username: string; score: number | null; status: string }[] };
}

export async function getCheatLogs(examId: number) {
  const res = await client.get(`/admin/exams/${examId}/cheat-logs`);
  return res.data as { logs: CheatLog[] };
}

export async function updateSettings(examId: number, data: Partial<ExamSettings>) {
  const res = await client.put(`/admin/exams/${examId}/settings`, data);
  return res.data as { success: boolean };
}

export async function batchCreateUsers(users: Partial<User>[]) {
  const res = await client.post('/admin/users/batch', { users });
  return res.data as { created: number; message: string };
}
