<template>
  <!-- 整个应用的容器 -->
  <div id="app-container">
    <!-- 1. 顶部导航栏 -->
    <Header></Header>
    <main class="main-content">
      <router-view /><!-- 路由视图：根据当前 URL，这里会显示不同的页面 (HomeView, MyGamesView 等) -->
    </main>

    <!-- 底部页脚  -->
    <Footer></Footer>
    <Notification />
    <!-- 登录/注册模态框  -->
    <AuthModal />
  </div>
</template>

<script setup>
// 导入我们即将创建的组件
import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import AuthModal from './components/AuthModal.vue'
import { useAuthStore } from './stores/auth'
import { onMounted, watch} from 'vue'
import { useFriendStore } from './stores/friends'
import Notification from './components/Notification.vue'
import { useUserStore } from './stores/user'

// 获取 auth store 的实例
const authStore = useAuthStore()
const friendStore = useFriendStore()
const userStore=useUserStore();

// onMounted 是一个生命周期钩子，当组件第一次加载到页面上时执行
onMounted(() => {
  // 尝试从浏览器本地存储中恢复用户的登录状态
  authStore.validateAuthToken()
})

//使用 watch 监听登录状态的变化 
watch(() => authStore.isLoggedIn, (isLoggedInNow) => {
  if (isLoggedInNow) {
    // 如果用户刚刚登录，启动轮询
    console.log("用户已登录，启动好友状态轮询...");
    friendStore.startPolling();
    userStore.fetchFavorites();
  } else {
    // 如果用户刚刚退出登录，停止轮询
    console.log("用户已退出，停止好友状态轮询...");
    friendStore.stopPolling();
    userStore.clearFavorites();
  }
}, { immediate: true }); // immediate: true 确保在组件加载时立即执行一次
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Microsoft YaHei', sans-serif;
}

body,
html,
#app {
  height: 100%;
  /* 让根元素占满整个视口高度 */
}

body {
  background-color: #f8f9fa;
  color: #333;
  line-height: 1.6;
}


.container {
  width: 90%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

html {
  scroll-behavior: smooth;
}

#app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex-grow: 1;
  /* 4. (关键!) 让这个元素占据所有剩余的垂直空间 */
}

/* 全局 alert 样式 */
.alert {
  padding: 12px;
  border-radius: 5px;
  margin-bottom: 15px;
  display: block;
  text-align: center;
  font-weight: 500;
}

.alert-success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.alert-error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}
</style>