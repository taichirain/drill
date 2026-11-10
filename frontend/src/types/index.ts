export interface User {
  id: number;
  username: string;
  name: string;
  role: 'student' | 'teacher' | 'admin';
}

export interface Exam {
  id: number;
  title: string;
  description: string | null;
  duration: number;
  start_time: string | null;
  end_time: string | null;
  status: 'draft' | 'published' | 'ongoing' | 'finished';
  created_by: number;
  created_at: string;
  creator_name?: string;
}

export type QuestionType = 'choice' | 'multi_choice' | 'judge' | 'fill' | 'essay';

export interface Question {
  id: number;
  exam_id: number;
  type: QuestionType;
  content: string;
  options: string[] | null;
  answer: string | null;
  score: number;
  sort_order: number;
}

export interface ExamSession {
  id: number;
  exam_id: number;
  user_id: number;
  start_time: string;
  submit_time: string | null;
  score: number | null;
  status: 'in_progress' | 'submitted' | 'graded';
}

export interface ExamSettings {
  exam_id: number;
  max_tab_switches: number;
  allow_copy_paste: boolean;
  fullscreen_required: boolean;
  ip_limit: boolean;
  auto_submit_on_cheat: boolean;
}

export interface CheatLog {
  id: number;
  session_id: number;
  event_type: string;
  detail: string;
  created_at: string;
  student_name?: string;
  username?: string;
}

export interface LoginForm {
  username: string;
  password: string;
}

export interface ApiError {
  error: string;
}
