<template>
  <div class="container page-container">
    <div class="header-section">
      <h2>我的游戏统计</h2>
      <button class="btn-refresh" @click="fetchStatsData" :disabled="isLoading">
        <i class="fas fa-sync-alt" :class="{ spinning: isLoading }"></i>
        {{ isLoading ? '正在刷新...' : '刷新数据' }}
      </button>
    </div>

    <div v-if="isLoading && !stats" class="loading-state">正在加载统计数据...</div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <div v-else-if="stats" class="stats-grid">

      <!-- 生涯总览 -->
      <div class="stat-card full-width">
        <h3><i class="fas fa-star"></i> 生涯总览</h3>
        <div class="stat-item">
          <span class="label">总游戏局数</span>
          <span class="value">{{ stats.total_sessions }} 局</span>
        </div>
        <div class="stat-item">
          <span class="label">总游戏时长</span>
          <span class="value">{{ stats.total_duration_minutes }} 分钟</span>
        </div>
        <div class="stat-item">
          <span class="label">最常玩的游戏</span>
          <span class="value game-name">{{ formatGameName(stats.most_played_game) }}</span>
        </div>
      </div>

      <!-- 五子棋统计 -->
      <div class="stat-card">
        <h3>⚫⚪ 五子棋战绩（人机模式）</h3>
        <div class="stat-item">
          <span class="label">胜利</span>
          <span class="value win">{{ stats.gobang_wins }} 场</span>
        </div>
        <div class="stat-item">
          <span class="label">失败</span>
          <span class="value loss">{{ stats.gobang_losses }} 场</span>
        </div>
        <div class="stat-item">
          <span class="label">胜率</span>
          <span class="value">{{ gobangWinRate }} %</span>
        </div>
      </div>

      <!-- 数独统计 -->
      <div class="stat-card">
        <h3>🔢 数独记录</h3>
        <div class="stat-item">
          <span class="label">最佳用时 (胜利局)</span>
          <span class="value time">{{ formattedBestTime }}</span>
        </div>
        <!-- 可以在这里添加更多数独相关的统计，例如平均用时、平均错误数等 -->
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import api from '@/services/api';
import { useUserStore } from '@/stores/user';

const stats = ref(null);
const isLoading = ref(true);
const error = ref(null);

const fetchStatsData = async () => {
  isLoading.value = true;
  error.value = null;
  try {
    const response = await api.get('/api/stats/summary');
    stats.value = response.data.data;
  } catch (err) {
    console.error("加载统计数据失败:", err);
    error.value = "无法加载统计数据，请稍后再试。";
  } finally {
    isLoading.value = false;
  }
};

//处理和格式化从后端获取的数据
const gobangWinRate = computed(() => {
  if (!stats.value || (stats.value.gobang_wins + stats.value.gobang_losses === 0)) {
    return '0.00';
  }
  const total = stats.value.gobang_wins + stats.value.gobang_losses;
  return ((stats.value.gobang_wins / total) * 100).toFixed(2);
});

const formattedBestTime = computed(() => {
  if (!stats.value || stats.value.sudoku_best_time_seconds === null) {
    return '暂无记录';
  }
  const seconds = stats.value.sudoku_best_time_seconds;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m} 分 ${s} 秒`;
});

const formatGameName = (gameId) => {
  if (gameId === 'gobang') return '五子棋';
  if (gameId === 'sudoku') return '数独';
  return gameId;
};

onMounted(fetchStatsData);

</script>

<style scoped>
.page-container {
  padding-top: 40px;
  padding-bottom: 40px;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
}

h2 {
  color: #2c3e50;
  font-size: 2rem;
}

.btn-refresh {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.3s;
}

.btn-refresh:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.btn-refresh .fa-sync-alt.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.loading-state,
.error-state {
  text-align: center;
  font-size: 1.2rem;
  color: #7f8c8d;
  margin-top: 50px;
}

.error-state {
  color: #e74c3c;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 25px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 25px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.stat-card.full-width {
  grid-column: 1 / -1;
}

.stat-card h3 {
  color: #2c3e50;
  margin-bottom: 20px;
  border-bottom: 2px solid #ecf0f1;
  padding-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.1rem;
  margin-bottom: 15px;
}

.stat-item .label {
  color: #7f8c8d;
}

.stat-item .value {
  font-weight: bold;
  color: #34495e;
}

.stat-item .value.game-name {
  color: #3498db;
}

.stat-item .value.win {
  color: #2ecc71;
}

.stat-item .value.loss {
  color: #e74c3c;
}

.stat-item .value.time {
  color: #f39c12;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>