import { createApp } from 'vue'
import { createPinia } from 'pinia' 
import App from './App.vue'
import router from './router' 

import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faStar as fasStar } from '@fortawesome/free-solid-svg-icons' // 实心星星
import { faStar as farStar } from '@fortawesome/free-regular-svg-icons' // 空心星星
library.add(fasStar, farStar)

const app = createApp(App)

app.use(createPinia()) 
app.use(router) 

app.component('font-awesome-icon', FontAwesomeIcon) 

app.mount('#app') 