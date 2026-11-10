import axios, { AxiosError } from 'axios';

const client = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// 请求拦截器：自动附加 JWT
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：统一错误处理
client.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ error: string }>) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default client;
