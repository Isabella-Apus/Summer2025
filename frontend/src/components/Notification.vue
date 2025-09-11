<template>
    <div class="notification-manager">
        <!-- Vue 的 <transition-group> 组件可以为列表的进入和离开添加动画 -->
        <transition-group name="notification-fade" tag="div">
            <div v-for="notification in friendStore.notifications" :key="notification.id" class="notification-item">
                <span class="message">🔔 {{ notification.message }}</span>
                <button class="close-btn" @click="friendStore.removeNotification(notification.id)">&times;</button>
            </div>
        </transition-group>
    </div>
</template>

<script setup>
import { useFriendStore } from '@/stores/friends';
const friendStore = useFriendStore();
</script>

<style scoped>
.notification-manager {
    position: fixed;
    /* 固定在屏幕上 */
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    /* 确保在最顶层 */
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.notification-item {
    background-color: rgba(30, 30, 40, 0.9);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    gap: 15px;
    border-left: 4px solid #2ecc71;
    /* 绿色边框表示上线 */
}

.message {
    font-weight: 500;
}

.close-btn {
    background: none;
    border: none;
    color: white;
    opacity: 0.7;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0 5px;
}

.close-btn:hover {
    opacity: 1;
}

/* 过渡动画 */
.notification-fade-enter-active,
.notification-fade-leave-active {
    transition: all 0.5s ease;
}

.notification-fade-enter-from,
.notification-fade-leave-to {
    opacity: 0;
    transform: translateX(30px);
}
</style>