import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import router from '@/router';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout:60000,
  withCredentials: true, 
});

// 请求拦截器：在发送请求前添加 JWT Token
api.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.authToken) {
      config.headers.Authorization = `Bearer ${authStore.authToken}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
);

// 响应拦截器：处理 Token 过期或其他认证失败的情况
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 403 || error.response.status === 401) {
      // Token 无效或过期，强制登出
      const authStore = useAuthStore()
      authStore.logout('您的登录已过期，请重新登录。')
      // 重定向到登录页
      router.push({ path: '/', query: { showLogin: 'true', redirect: router.currentRoute.value.fullPath } });
    }
    return Promise.reject(error)
  },
);

export default api;
