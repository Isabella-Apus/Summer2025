import { createApp } from 'vue'
import { createPinia } from 'pinia' // 引入 Pinia
import App from './App.vue'
import router from './router' // 引入路由

// 引入 Font Awesome 核心库和图标
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faStar as fasStar } from '@fortawesome/free-solid-svg-icons' // 实心星星
import { faStar as farStar } from '@fortawesome/free-regular-svg-icons' // 空心星星
// 添加需要的图标到库
library.add(fasStar, farStar)

const app = createApp(App)

app.use(createPinia()) // 使用 Pinia
app.use(router) // 使用路由

app.component('font-awesome-icon', FontAwesomeIcon) // 全局注册 Font Awesome 组件

app.mount('#app') // 将 Vue 应用挂载到 index.html 中的 #app 元素
