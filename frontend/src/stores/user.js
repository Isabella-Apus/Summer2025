import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import api from '@/services/api'
import axios from 'axios'

export const useUserStore = defineStore('user', {
  state: () => ({
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
          await api.delete(`/api/user/favorites/${gameId}`);
          this.favoriteGames = this.favoriteGames.filter(id => id !== gameId);
        } else {
          await api.post('/api/user/favorites', { game_id: gameId });
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
