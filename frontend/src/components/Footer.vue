<template>
  <footer>
    <div class="container">
      <p>&copy; 2025 夏程序设计实践 - 小游戏仓库</p>
      <div class="social-links">
        <a href="#" target="_blank">GitHub</a>
        <a href="#" target="_blank">文档</a>
      </div>
    </div>
  </footer>
</template>

<script setup>
// 这个组件没有复杂的逻辑，所以 script 部分是空的
</script>

<style scoped>
footer {
  background-color: #2c3e50;
  color: #ecf0f1;
  padding: 30px 0;
  margin-top: 50px;
}
footer .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.social-links a {
  color: #bdc3c7;
  text-decoration: none;
  margin-left: 15px;
  transition: color 0.3s;
}
.social-links a:hover {
  color: #3498db;
}
</style>