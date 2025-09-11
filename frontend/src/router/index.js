import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/mygames',
      name: 'my-games',
      component: () => import('../views/MyGamesView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/stats',
      name: 'user-stats',
      component: () => import('../views/UserStatsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/friends',
      name: 'friend-manager',
      component: () => import('../views/FriendManagerView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/games/gobang',
      name: 'gabang',
      component: () => import('../views/Gobang.vue'),
      mata:{ requiresAuth : true }
    },
    {
      path: '/games/sudoku', 
      name: 'sudoku',
      component: () => import('../views/Sudoku.vue'), 
      meta: { requiresAuth: true } 
    }
  ],
})

// 全局前置守卫 (已修复)
router.beforeEach(async (to, from, next) => {
  const { useAuthStore } = await import('@/stores/auth')
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    // 如果需要登录但用户未登录
    authStore.openAuthModal('login') // 弹出登录框
    next(false) // 取消导航，停留在当前页面
  } else {
    // 否则，正常进行导航
    next()
  }
})

export default router
