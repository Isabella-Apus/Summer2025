<template>
  <div class="container page-container">
    <h2>我的游戏仓库</h2>
    <section class="content-section">
      <h3>⭐ 收藏的游戏</h3>
      <div v-if="userStore.getFavoriteGames.length === 0" class="empty-state">
        <p>你还没有收藏任何游戏。</p>
        <router-link to="/#game-store" class="btn-primary">去游戏商店看看</router-link>
      </div>
      <div v-else class="records-grid">
        <div v-for="game in userStore.getFavoriteGames" :key="game.id" class="favorite-card-container">
          <div class="favorite-content" @click="navigateToGame(game.path)">
            <div class="game-icon">{{ game.icon }}</div>
            <h3>{{ game.name }}</h3>
          </div>
          <button class="btn-primary" @click="navigateToGame(game.path)">开始游戏</button>
        </div>
      </div>
    </section>
    <section class="content-section">
      <h3>💾 保存的残局</h3>
      <div class="filter-controls">
        <button @click="filterBy = 'all'" :class="{ active: filterBy === 'all' }">全部</button>
        <button @click="filterBy = 'gobang'" :class="{ active: filterBy === 'gobang' }">五子棋</button>
        <button @click="filterBy = 'sudoku'" :class="{ active: filterBy === 'sudoku' }">数独</button>
      </div>

      <div v-if="isLoading" class="loading">正在加载游戏记录...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>
      <div v-else-if="filteredRecords.length === 0" class="empty-state">
        <p>没有找到符合条件的残局记录。</p>
      </div>
      <div v-else class="records-grid">
        <div v-for="record in filteredRecords" :key="record.id" class="record-card">
          <h4>{{ record.name }}</h4>
          <p class="game-type">{{ record.gameType === 'gobang' ? '五子棋' : '数独' }}</p>
          <div class="record-details">
            <div v-if="record.simpleState">
              <p v-if="record.simpleState.difficulty">难度: {{ record.simpleState.difficulty }}</p>
              <p v-if="record.simpleState.playtime">用时: {{ record.simpleState.playtime }}</p>
              <p v-if="record.simpleState.progress">进度: {{ record.simpleState.progress }}</p>
              <p v-if="record.simpleState.gameMode">模式: {{ record.simpleState.gameMode }}</p>
            </div>
          </div>
          <p class="timestamp">保存于: {{ new Date(record.updatedAt).toLocaleString() }}</p>
          <div class="card-actions">
            <button class="btn btn-primary" @click="loadGame(record.id)">加载</button>
            <button class="btn btn-danger" @click="deleteGame(record.id)">删除</button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>


<script setup>
import { ref, onMounted, computed } from 'vue';
import api from '@/services/api'; 
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();
const gameRecords = ref([]);
const isLoading = ref(true);
const error = ref(null);
const filterBy = ref('all');

const filteredRecords = computed(() => {
  if (filterBy.value === 'all') {
    return gameRecords.value;
  }
  return gameRecords.value.filter(record => record.gameType === filterBy.value);
});

const fetchGameHistory = async () => {
  try {
    isLoading.value = true;
    error.value = null;
    const response = await api.get('/game-history');
    gameRecords.value = response.data.data;
  } catch (err) {
    error.value = '加载游戏记录失败，请稍后重试。';
    console.error(err);
  } finally {
    isLoading.value = false;
  }
};

const navigateToGame = (path) => {
  router.push(path);
}

const loadGame = (recordId) => {
  const record = gameRecords.value.find(r => r.id === recordId);
  if (record) {
    router.push(`/games/${record.gameType}?load=${recordId}`);
  }
};

const deleteGame = async (recordId) => {
  if (confirm('确定要删除这个游戏记录吗？')) {
    try {
      await api.delete(`/delete-game/${recordId}`);
      gameRecords.value = gameRecords.value.filter(r => r.id !== recordId);
    } catch (err) {
      alert('删除失败，请重试。');
      console.error(err);
    }
  }
};

onMounted(fetchGameHistory);
</script>

<style scoped>
.page-container {
  padding-top: 40px;
  padding-bottom: 40px;
}

h2 {
  text-align: center;
  margin-bottom: 40px;
  color: #2c3e50;
  font-size: 2rem;
}

.loading,
.empty-state,
.error-message {
  text-align: center;
  margin-top: 50px;
  font-size: 1.2rem;
  color: #7f8c8d;
}

.btn-primary {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
}

.btn-danger {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
}

.filter-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  margin-top: 5px;
}

.filter-controls button {
  padding: 6px 12px;
  border: none;
  border-radius: 20px;
  background-color: #e5e7eb;
  color: #4b5563;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.filter-controls button.active {
  background-color: #3498db;
  color: #fff;
}

.filter-controls button:hover {
  background-color: #d1d5db;
}

.favorite-card-container {
  display: flex;
  flex-direction: row;
  /* 明确设置为行布局 */
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 15px 20px;
}

.game-icon {
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.record-card.favorite-card {
  display: flex;
  justify-content: space-between;
}

.favorite-content {
  display: flex;
  align-items: center;
  gap: 20px;
  cursor: pointer;
}

/* 记录卡片样式 */
.records-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 25px;
}

.record-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.record-card h3 {
  color: #2c3e50;
  margin-bottom: 5px;
}

.game-type {
  color: #3498db;
  font-weight: bold;
  margin-bottom: 15px;
}

.record-details {
  flex-grow: 1;
  color: #7f8c8d;
  font-size: 0.9rem;
  margin-bottom: 15px;
}

.timestamp {
  font-size: 0.8rem;
  color: #bdc3c7;
  margin-bottom: 20px;
}

.card-actions {
  display: flex;
  gap: 10px;
}
</style>