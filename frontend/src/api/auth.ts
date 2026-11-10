import client from './client';
import type { User } from '@/types';

export async function login(username: string, password: string) {
  const res = await client.post('/auth/login', { username, password });
  return res.data as { token: string; user: User };
}

export async function getMe() {
  const res = await client.get('/auth/me');
  return res.data as { user: User };
}

export async function generateQr() {
  const res = await client.get('/auth/qr/generate');
  return res.data as { token: string };
}

export async function getQrStatus(token: string) {
  const res = await client.get(`/auth/qr/status/${token}`);
  return res.data as { status: string; token?: string; user?: User };
}
