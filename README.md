# 小游戏仓库项目

BUAA软院大二小学期课程项目 - 一个集成多款经典小游戏的网站

## 技术栈
- **前端**: HTML5/CSS3/JavaScript
- **后端**: Node.js + Express
- **数据库**: MySQL
- **部署**: Railway平台

## 功能列表
- [x] 游戏大厅界面
- [x] 五子棋游戏（双人对战）
- [x] 数独游戏（难度选择）
- [ ] 用户登录/注册系统
- [ ] 游戏进度保存

## 本地运行指南
```bash
# 1. 克隆仓库
git clone https://gitee.com/Isabella_Apus/summer2025.git

# 2. 安装依赖
cd game-hub/backend
npm install express sqlite3

# 3. 启动后端
node server.js

# 4. 访问前端
打开 frontend/index.html
```

## 项目进度
![开发进度](https://via.placeholder.com/400x200?text=游戏大厅界面截图) 
*当前界面截图*

## 开发日志
- 2025.07.20：项目初始化
- 2025.07.25：完成五子棋核心逻辑


Summer2025/  
├─ backend/  
│  ├─ > node_modules  
│  ├─ dump.sql                //与railway平台连接   
│  ├─ schema.sql              //关系表  
│  └─ server.js               //后端代码  
├─ frontend/  
│  ├─ src/  
│  │  ├─ components/      //可复用组件  
│  │  │  ├─ AuthModal.vue     //登录注册表单  
│  │  │  ├─ Footer.vue        //页尾  
│  │  │  ├─ Header.vue        //页头  
│  │  │  └─ Notification.vue  //提示信息  
│  │  ├─ router/          //路由配置  
│  │  │  └─  index.js         //前端路由管理   
│  │  ├─ services/        //集中进行数据处理  
│  │  │  └─ api.js            //API请求工具配置  
│  │  ├─ stores/          //管理全局应用的模块  
│  │  │  ├─ auth.js           //用户登录状态组件  
│  │  │  ├─ friends.js        //好友状态管理组件  
│  │  │  └─ user.js           //个人收藏管理组件  
│  │  ├─ views            //页面级组件  
│  │  │  ├─ FriendManage.vue  //我的好友页面组件  
│  │  │  ├─ HomeView.vue      //主页面组件  
│  │  │  ├─ MyGamesView.vue   //我的游戏仓库页面组件  
│  │  │  ├─ UserStatsView.vue //个人统计页面组件  
│  │  │  ├─ Gobang.vue        //五子棋小游戏页面组件  
│  │  │  └─ Sudoku.vue        //数独小游戏页面组件  
│  │  ├─ App.vue          //应用根组件  
│  │  └─ main.js          //核心入口  
│  └─ ...
└─ ...

