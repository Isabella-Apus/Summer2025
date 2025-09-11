import { defineStore } from 'pinia'
import api from '@/services/api' // 我们将使用封装后的 api
import { useUserStore } from './user';


export const useAuthStore = defineStore('auth', {
  state: () => ({
    isLoggedIn: !!localStorage.getItem('authToken'), // 根据 token 初始化登录状态
    currentUser: JSON.parse(localStorage.getItem('user')) || null,
    authToken: localStorage.getItem('authToken') || null,
    showAuthModal: false,
    authModalTab: 'login',
    authModalAlert: { message: '', type: '' },
  }),
  getters: {
    username: (state) => (state.currentUser ? state.currentUser.username : '游客'),
  },
  actions: {
    openAuthModal(tab = 'login') {
          console.log('接口连接成功！');
          this.authModalTab = tab;
          this.showAuthModal = true;
          this.clearAlert();
    },
    hideAuthModal() {
        this.showAuthModal = false;
        this.clearAlert();
    },
    setAlert(message, type) {
        this.authModalAlert = { message, type };
    },
    clearAlert() {
        this.authModalAlert = { message: '', type: '' };
    },
    async login(username, password) {
        console.log('正在尝试登录用户:', username);
        this.clearAlert();
      try {
          const response = await api.post('/login', { username, password });
          console.log('登录API响应成功', response.data);
          const { token, userId, username: returnedUsername } = response.data;
          this.authToken = token;
          this.currentUser = { id: userId, username: returnedUsername };
          this.isLoggedIn = true;
          localStorage.setItem('authToken', token);
          localStorage.setItem('user', JSON.stringify(this.currentUser));
          console.log('状态已更新，isLoggedIn：', this.isLoggedIn, '用户：', this.currentUser.username);
          const userStore = useUserStore();
          await userStore.fetchFavorites();
          this.hideAuthModal();
      } catch (error) {
          console.error('登录失败：', error);
          this.setAlert(error.response?.data?.error || '登录失败，请检查您的凭据', 'error');
          throw error;
      }
    },
    async register(username, password) {
        this.clearAlert();
      try {
          await api.post('/register', { username, password });
          this.setAlert('注册成功！请登录', 'success');
          this.authModalTab = 'login';
      } catch (error) {
          this.setAlert(error.response?.data?.error || '注册失败', 'error');
          throw error;
        }
    },
    logout() {
        console.log('退出登录中')
        this.authToken = null
        this.currentUser = null
        this.isLoggedIn = false
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
        const userStore = useUserStore()
        userStore.clearFavorites();  
        console.log('用户状态已清除 isLoggedIn:', this.isLoggedIn)
    },
    async validateAuthToken() {
      if (!this.authToken) {
          this.isLoggedIn = false;
          return;
      }
      try {
          const response = await api.get('/profile');
          if (response.data && response.data.id && response.data.username) {
              this.currentUser = { id: response.data.id, username: response.data.username }
          } else {
              this.logout('后端返回数据不完整，登录失败');
          }
              this.isLoggedIn = true;
      } catch (error) {
          this.logout('登录已过期，请重新登录。');
      }
    },
  },
})


