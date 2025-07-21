# ? 游戏仓库项目

软件工程专业实践课程项目 - 一个集成多款经典小游戏的网站

## 技术栈
- **前端**: HTML5/CSS3/JavaScript
- **后端**: Node.js + Express
- **数据库**: SQLite
- **部署**: Gitee Pages + Node服务

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