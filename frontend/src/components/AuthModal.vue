<template>
  <div class="auth-modal" v-if="authStore.showAuthModal">
    <div class="auth-container">
      <button class="close-modal" @click="authStore.hideAuthModal()">&times;</button>
      <div class="auth-header">
        <!-- 标题的动态变化 -->
        <h2 id="auth-title">{{ isLoginTab ? '登录账号' : '注册新账号' }}</h2>
        <p id="auth-subtitle">{{ isLoginTab ? '请输入您的用户名和密码' : '创建您的游戏仓库账号' }}</p>
      </div>

      <!-- 提示信息区域 -->
      <div v-if="authStore.authModalAlert.message" :class="['alert', `alert-${authStore.authModalAlert.type}`]">
        {{ authStore.authModalAlert.message }}
      </div>

      <div class="auth-tabs">
        <div class="auth-tab" :class="{ active: isLoginTab }" @click="switchTab('login')">登录</div>
        <div class="auth-tab" :class="{ active: !isLoginTab }" @click="switchTab('register')">注册</div>
      </div>

      <!-- 登录表单（v-if）-->
      <form v-if="isLoginTab" class="auth-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="login-username">用户名</label>
          <input type="text" id="login-username" v-model="loginUsername" class="form-control" placeholder="请输入用户名"
            required />
        </div>
        <div class="form-group">
          <label for="login-password">密码</label>
          <input type="password" id="login-password" v-model="loginPassword" class="form-control" placeholder="请输入密码"
            required />
        </div>
        <button type="submit" class="auth-btn-submit">登录</button>
        <div class="auth-footer">
          <p>还没有账号？ <a @click.prevent="switchTab('register')">立即注册</a></p>
        </div>
      </form>

      <!-- 注册表单（v-else） -->
      <form v-else class="auth-form" @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="register-username">用户名</label>
          <input type="text" id="register-username" v-model="registerUsername" class="form-control" placeholder="请设置用户名"
            required />
        </div>
        <div class="form-group">
          <label for="register-password">密码</label>
          <input type="password" id="register-password" v-model="registerPassword" class="form-control"
            placeholder="请设置密码" required />
        </div>
        <div class="form-group">
          <label for="register-confirm">确认密码</label>
          <input type="password" id="register-confirm" v-model="registerConfirmPassword" class="form-control"
            placeholder="请再次输入密码" required />
        </div>
        <button type="submit" class="auth-btn-submit">注册</button>
        <div class="auth-footer">
          <p>已有账号？ <a @click.prevent="switchTab('login')">立即登录</a></p>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { faL } from '@fortawesome/free-solid-svg-icons';

const authStore = useAuthStore();
const isLoading = ref(false);
const loginUsername = ref('');
const loginPassword = ref('');
const registerUsername = ref('');
const registerPassword = ref('');
const registerConfirmPassword = ref('');

const isLoginTab = computed(() => authStore.authModalTab === 'login');

const switchTab = (tab) => {
  if (isLoading.value) return;
  authStore.authModalTab = tab;
  authStore.clearAlert(); // 切换时清除旧的提示
};

const handleLogin = async () => {
  if (!loginUsername.value || !loginPassword.value) {
    authStore.setAlert('请输入用户名和密码', 'error');
    return;
  }
  isLoading.value = true;
  try {
    await authStore.login(loginUsername.value, loginPassword.value);
  } catch (error) {
    console.log('Login组件抛出错误');
  } finally {
    isLoading.value = false;
  }
};

const handleRegister = async () => {
  if (!registerUsername.value || !registerPassword.value) {
    authStore.setAlert('请输入用户名和密码', 'error');
    return;
  }
  if (registerPassword.value !== registerConfirmPassword.value) {
    authStore.setAlert('两次输入的密码不一致', 'error');
    return;
  }
  if (registerUsername.length < 3 || registerUsername.length > 20) {
    alert("用户名长度必须在3到20个字符之间！");
    return;
  }
  if (!/^[a-zA-Z0-9_]+$/.test(registerPassword)) {
    alert("用户名只能包含字母、数字和下划线！");
    return;
  }
  if (registerPassword.length < 6) {
    alert("密码至少需要6个字符！");
    return;
  }
  isLoading.value = true;
  try {
    await authStore.register(registerUsername.value, registerPassword.value);
    loginUsername.value = registerUsername.value; // 自动填充用户名
    loginPassword.value = '';
  } catch (error) {
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.auth-modal {
  display: flex;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  justify-content: center;
  align-items: center;
}

.auth-container {
  background-color: white;
  border-radius: 10px;
  width: 90%;
  max-width: 400px;
  padding: 30px;
  box-shadow: 0 5px 25px rgba(0, 0, 0, 0.3);
  position: relative;
}

.auth-header {
  text-align: center;
  margin-bottom: 20px;
}

.auth-header h2 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.auth-tabs {
  display: flex;
  margin-bottom: 20px;
  border-bottom: 2px solid #eee;
}

.auth-tab {
  flex: 1;
  text-align: center;
  padding: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.auth-tab.active {
  color: #3498db;
  border-bottom: 3px solid #3498db;
  font-weight: bold;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #2c3e50;
  font-weight: bold;
}

.form-control {
  width: 100%;
  padding: 12px 15px;
  border: 2px solid #ddd;
  border-radius: 5px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.form-control:focus {
  border-color: #3498db;
  outline: none;
}

.auth-btn-submit {
  width: 100%;
  padding: 12px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.auth-btn-submit:hover {
  background-color: #2980b9;
}

.auth-footer {
  text-align: center;
  margin-top: 20px;
  color: #7f8c8d;
}

.auth-footer a {
  color: #3498db;
  text-decoration: none;
  cursor: pointer;
}

.close-modal {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #7f8c8d;
}
</style>