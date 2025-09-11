import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import api from '@/services/api'
import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000'

export const useUserStore = defineStore('user', {
  state: () => ({
    // 可以存储用户收藏的游戏列表等
    favoriteGames: [],
    allGames: [
      { id: 'gobang', name: '五子棋', icon: '⚫⚪', path: 'games/gobang' },
      { id: 'sudoku', name: '数独', icon: '🔢', path: 'games/sudoku' },
    ],
  }),
  getters: {
    getFavoriteGames: (state) => {
      return state.allGames.filter((game) => state.favoriteGames.includes(game.id))
    },
  },
  actions: {
    async fetchFavorites() {
      const authStore = useAuthStore();
      if (!authStore.isLoggedIn) {
        this.favoriteGames = []; // 未登录则清空
        return;
      }
      try {
        const response = await api.get('/api/user/favorites');
        this.favoriteGames = response.data.data;
      } catch (error) {
        console.error("获取收藏列表失败:", error);
        this.favoriteGames = []; // 出错时也清空
      }
    },

    // 切换收藏状态 
    async toggleFavorite(gameId) {
      const authStore = useAuthStore();
      if (!authStore.isLoggedIn) {
        alert('请先登录才能收藏游戏！');
        authStore.openAuthModal('login');
        return;
      }

      const isFavorited = this.favoriteGames.includes(gameId);
      try {
        if (isFavorited) {
          // 如果已收藏，则调用后端删除接口
          await api.delete(`/api/user/favorites/${gameId}`);
          // 成功后再更新前端状态
          this.favoriteGames = this.favoriteGames.filter(id => id !== gameId);
        } else {
          // 如果未收藏，则调用后端添加接口
          await api.post('/api/user/favorites', { game_id: gameId });
          // 成功后再更新前端状态
          this.favoriteGames.push(gameId);
        }
      } catch (error) {
        console.error("更新收藏失败:", error);
        alert("操作失败，请稍后重试。");
      }
    },

    // 检查是否收藏 
    isGameFavorite(gameId) {
      return this.favoriteGames.includes(gameId);
    },
    
    // 清空收藏状态 (退出登录时调用)
    clearFavorites() {
        this.favoriteGames = [];
    }
  },
})
