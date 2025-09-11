<template>
    <header>
        <div class="container">
            <div class="header-top">
                <h1>
                    <router-link to="/" class="header-title-link">小游戏仓库&#127918;</router-link>
                </h1>
                <div class="title-user-status">
                    <span class="user-profile" v-if="authStore.isLoggedIn">{{ authStore.username.charAt(0) }}</span>
                    <span class="user-name">{{ authStore.username }}</span>
                    <!-- v-if/v-else 用于根据登录状态条件性地显示元素 -->
                    <button v-if="authStore.isLoggedIn" class="logout-btn" @click="handleLogout">退出</button>
                    <button v-else class="auth-btn" @click="authStore.openAuthModal('login')">登录/注册</button>
                </div>
            </div>
            <nav>
                <!-- <router-link> 是 Vue Router 提供的组件，用于导航 -->
                <!-- :class 动态绑定 class，当路由匹配时应用 'active' 样式 -->
                <router-link to="/" :class="{ active: $route.path === '/' }">首页</router-link>
                <a href="/#game-store" @click.prevent="scrollToGameStore">挑选游戏</a>
                <router-link to="/mygames" :class="{ active: $route.path === '/mygames' }">我的游戏仓库</router-link>
                <router-link to="/stats" :class="{ active: $route.path === '/stats' }">个人统计</router-link>
                <router-link to="/friends" :class="{ active: $route.path === '/friends' }">我的好友</router-link>
            </nav>
        </div>
    </header>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const handleLogout = () => {
    authStore.logout("您已成功退出登录");
    router.push('/');
}

const scrollToGameStore = () => {
    // 如果当前不在首页，先跳转到首页，然后滚动
    if (router.currentRoute.value.path !== '/') {
        router.push('/').then(() => {
            setTimeout(() => { // 等待 DOM 更新
                const gameStoreEl = document.getElementById('game-store');
                if (gameStoreEl) {
                    gameStoreEl.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100);
        });
    } else {
        // 如果已在首页，直接滚动
        const gameStoreEl = document.getElementById('game-store');
        if (gameStoreEl) {
            gameStoreEl.scrollIntoView({ behavior: 'smooth' });
        }
    }
};
</script>

<style scoped>
/* 这里的样式只对当前 Header 组件生效 */
header {
    background-color: #2c3e50;
    color: white;
    padding: 15px 0;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.header-title-link {
    color: white;
    text-decoration: none;
}

h1 {
    font-size: 1.8rem;
}

.title-user-status {
    display: flex;
    align-items: center;
    gap: 15px;
}

.user-name {
    color: #f5f8f8;
    font-size: 0.9rem;
}

.user-profile {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #3498db;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    margin: 10px auto;
}

.auth-btn,
.logout-btn {
    border: none;
    border-radius: 5px;
    padding: 6px 12px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background-color 0.3s;
}

.auth-btn {
    background-color: #3498db;
    color: white;
}

.auth-btn:hover {
    background-color: #2980b9;
}

.logout-btn {
    background: none;
    color: #e74c3c;
    font-weight: bold;
}

.logout-btn:hover {
    color: #c0392b;
    text-decoration: underline;
}

nav a {
    color: #ecf0f1;
    text-decoration: none;
    margin-left: 20px;
    padding: 5px 10px;
    border-radius: 4px;
    transition: background-color 0.3s;
}

nav a:first-child {
    margin-left: 0;
}

nav a.active,
nav a:hover {
    background-color: #3498db;
}
</style>