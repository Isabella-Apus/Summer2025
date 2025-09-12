<template>
  <!-- 整个应用的容器 -->
  <div id="app-container">
    <!-- 顶部导航栏 -->
    <Header></Header>
    <main class="main-content">
      <router-view />
    </main>

    <!-- 底部页脚  -->
    <Footer></Footer>
    <Notification />
    <!-- 登录/注册模态框  -->
    <AuthModal />
  </div>
</template>

<script setup>
// 导入组件
import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
import AuthModal from './components/AuthModal.vue'
import { useAuthStore } from './stores/auth'
import { onMounted, watch} from 'vue'
import { useFriendStore } from './stores/friends'
import Notification from './components/Notification.vue'
import { useUserStore } from './stores/user'

const authStore = useAuthStore()
const friendStore = useFriendStore()
const userStore=useUserStore();

onMounted(() => {
  authStore.validateAuthToken()
})

//watch监听登录状态的变化 
watch(() => authStore.isLoggedIn, (isLoggedInNow) => {
  if (isLoggedInNow) {
    console.log("用户已登录，启动好友状态轮询...");
    friendStore.startPolling();
    userStore.fetchFavorites();
  } else {
    console.log("用户已退出，停止好友状态轮询...");
    friendStore.stopPolling();
    userStore.clearFavorites();
  }
}, { immediate: true }); 
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
}

/* alert(全局生效) */
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