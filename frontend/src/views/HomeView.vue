<template>
  <main>
    <section class="hero">
      <div class="container">
        <h2>发现经典游戏</h2>
        <p>精选多款经典单机小游戏，随时随地畅玩</p>
        <button @click="scrollToGameStore">挑选游戏</button>
      </div>
    </section>

    <section class="games" id="game-store">
      <div class="container">
        <h2>游戏商店</h2>
        <div class="game-grid">
          <div class="game-card" @click="navigateToGame('/games/gobang')">
            <div class="game-icon">&#x26AB;&#x26AA;</div>
            <h3>五子棋</h3>
            <div class="game-tags">
              <span class="game-tag">人机对战</span>
              <span class="game-tag">双人对战</span>
            </div>
            <button class="favorite-btn" @click.stop="userStore.toggleFavorite('gobang')"
              :class="{ active: userStore.isGameFavorite('gobang') }" title="收藏游戏">
              <i class="fas fa-star"></i>
            </button>
          </div>

          <div class="game-card" @click="navigateToGame('/games/sudoku')">
            <div class="game-icon">&#x1F522;</div>
            <h3>数独</h3>
            <div class="game-tags">
              <span class="game-tag">单人解密</span>
            </div>
            <button class="favorite-btn" @click.stop="userStore.toggleFavorite('sudoku')"
              :class="{ active: userStore.isGameFavorite('sudoku') }" title="收藏游戏">
              <i class="fas fa-star"></i>
            </button>
          </div>

          <div class="game-card-placeholder">
            <h3>更多游戏<br>敬请期待...</h3>
          </div>

        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const userStore = useUserStore();

const scrollToGameStore = () => {
  const gameStoreEl = document.getElementById('game-store');
  if (gameStoreEl) {
    gameStoreEl.scrollIntoView({ behavior: 'smooth' });
  }
};

onMounted(() => { 
    userStore.fetchFavorites();
})
const navigateToGame = (path) => {

  router.push(path);
};
</script>

<style scoped>

.hero {
  background: linear-gradient(135deg, #3498db, #8e44ad);
  color: white;
  text-align: center;
  padding: 80px 0;
  margin-bottom: 40px;
}

.hero h2 {
  font-size: 2.5rem;
  margin-bottom: 15px;
}

.hero p {
  font-size: 1.2rem;
  margin-bottom: 25px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.hero button {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 12px 30px;
  font-size: 1.1rem;
  border-radius: 30px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.hero button:hover {
  background-color: #c0392b;
}

.games {
  padding: 40px 0;
}

.games h2 {
  text-align: center;
  margin-bottom: 40px;
  color: #2c3e50;
  font-size: 2rem;
}

.game-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 25px;
}

.game-card {
  background: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
  cursor: pointer;
  position: relative;
  padding: 20px;
  text-align: center;
}

.game-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
}

.game-card p {
  padding: 0 20px 15px;
  color: #7f8c8d;
}

.game-icon {
  font-size: 4rem;
  margin-bottom: 15px;
  color: #2c3e50;
}

.game-card h3 {
  margin-bottom: 15px;
  color: #2c3e50;
}

.game-tags {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
}

.game-tag {
  display: inline-block;
  background: #e74c3c;
  color: white;
  padding: 5px 15px;
  border-radius: 20px;
  font-size: 0.8rem;
}

.game-card-placeholder {
  background: #cbcfd4;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  cursor: default;
  min-height: 250px;
}

.favorite-btn {
  position: absolute;
  bottom: 15px;
  right: 15px;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #ccc;
  cursor: pointer;
  transition: color 0.2s, transform 0.2s;
}

.game-card-placeholder h3 {
  color: #6c757d;
  font-size: 1.2rem;
  line-height: 1.6;
}

.favorite-btn:hover {
  transform: scale(1.2);
}

.favorite-btn.active {
  color: #ffd700;
}
</style>