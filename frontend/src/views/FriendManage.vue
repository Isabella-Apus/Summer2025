<template>
    <div class="container page-container">
        <h2>好友管理</h2>

        <!-- 全局加载和错误提示 -->
        <div v-if="friendStore.isLoading" class="loading-state">正在操作中...</div>
        <div v-if="friendStore.error" class="error-state">{{ friendStore.error }}</div>

        <!-- 搜索好友 -->
        <div class="friend-section">
            <h3><i class="fas fa-search"></i> 搜索好友</h3>
            <div class="search-bar">
                <input type="text" v-model="searchQuery" placeholder="输入用户名进行搜索..." @keyup.enter="performSearch">
                <button @click="performSearch">搜索</button>
            </div>
            <div class="search-results" v-if="friendStore.searchResults.length > 0">
                <div v-for="user in friendStore.searchResults" :key="user.id" class="result-item">
                    <span>{{ user.username }}</span>
                    <button v-if="user.status === 'not_friends'" class="btn-add" @click="sendRequest(user.id)">
                        <i class="fas fa-user-plus"></i> 添加
                    </button>
                    <span v-if="user.status === 'friends'" class="status-info">已是好友</span>
                    <span v-if="user.status === 'request_sent'" class="status-info">请求已发送</span>
                    <span v-if="user.status === 'request_received'" class="status-info">对方已发送请求</span>
                </div>
            </div>
        </div>

        <!-- 好友请求 -->
        <div class="friend-section" v-if="friendStore.friendRequests.length > 0">
            <h3><i class="fas fa-envelope"></i> 好友请求</h3>
            <div class="request-list">
                <div v-for="req in friendStore.friendRequests" :key="req.id" class="request-item">
                    <span><strong>{{ req.sender_username }}</strong> 想添加你为好友</span>
                    <div class="actions">
                        <button class="btn-accept" @click="acceptRequest(req.id)">接受</button>
                        <button class="btn-decline" @click="declineRequest(req.id)">拒绝</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 我的好友 -->
        <div class="friend-section">
            <h3><i class="fas fa-users"></i> 我的好友 ({{ friendStore.friends.length }})</h3>
            <div v-if="friendStore.friends.length === 0" class="no-data">
                你还没有好友，快去搜索添加吧！
            </div>
            <div v-else class="friend-list">
                <div v-for="friend in friendStore.friends" :key="friend.id" class="friend-item">
                    <span class="status-dot" :class="friendStore.getFriendStatus(friend).toLowerCase()"></span>
                    <span class="friend-name">{{ friend.username }}</span>
                    <span class="online-status">
                        {{friendStore.getFriendStatus(friend) }}</span>
                    <button class="btn-remove" @click="removeFriend(friend.id)">
                        <i class="fas fa-user-times"></i>
                    </button>
                </div>
            </div>
        </div>

        <!--好友排行榜-->
        <div class="friend-section">
            <h3><i class="fas fa-trophy"></i>好友排行榜</h3>
            <div class="rankings-container">
                <div class="tabs">
                    <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
                        :class="{ active: activeTab === tab.key }">
                        {{ tab.name }}
                    </button>
                </div>

                <div v-if="isLoading" class="loading-state">正在加载排行榜...</div>
                <div v-else-if="error" class="error-state">{{ error }}</div>
                <div v-else-if="rankedData.length === 0" class="empty-state">暂无好友数据</div>

                <div v-else class="ranking-content">
                    <div class="podium">
                        <!-- 第二名 -->
                        <div class="podium-item silver" v-if="rankedData[1]">
                            <div class="rank-badge">2</div>
                            <div class="avatar">{{ rankedData[1].username.charAt(0) }}</div>
                            <div class="username">{{ rankedData[1].username }}</div>
                            <div class="score">{{ formatScore(rankedData[1]) }}</div>
                        </div>
                        <!-- 第一名 -->
                        <div class="podium-item gold" v-if="rankedData[0]">
                            <div class="rank-badge">1</div>
                            <div class="avatar">{{ rankedData[0].username.charAt(0) }}</div>
                            <div class="username">{{ rankedData[0].username }}</div>
                            <div class="score">{{ formatScore(rankedData[0]) }}</div>
                        </div>
                        <!-- 第三名 -->
                        <div class="podium-item bronze" v-if="rankedData[2]">
                            <div class="rank-badge">3</div>
                            <div class="avatar">{{ rankedData[2].username.charAt(0) }}</div>
                            <div class="username">{{ rankedData[2].username }}</div>
                            <div class="score">{{ formatScore(rankedData[2]) }}</div>
                        </div>
                    </div>

                    <!-- 列表 (第四名及以后) -->
                    <ul class="rank-list">
                        <li v-for="(item, index) in rankedData.slice(3)" :key="item.user_id" class="list-item">
                            <span class="rank">{{ index + 4 }}</span>
                            <span class="username">{{ item.username }}</span>
                            <span class="score">{{ formatScore(item) }}</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed, watch} from 'vue';
import { useFriendStore } from '@/stores/friends';
import api from '@/services/api';

const friendStore = useFriendStore();
const searchQuery = ref('');
const activeTab = ref('total_sessions');
const rankingsData = ref([]);
const isLoading = ref(true);
const error = ref(null);

const performSearch = () => {
    if (searchQuery.value.trim()) {
        friendStore.searchUsers(searchQuery.value.trim());
    }
};

const sendRequest = (friendId) => {
    friendStore.sendFriendRequest(friendId);
};

const acceptRequest = (requestId) => {
    friendStore.handleFriendRequest(requestId, 1); 
};

const declineRequest = (requestId) => {
    friendStore.handleFriendRequest(requestId, 2); 
};

const removeFriend = (friendId) => {
    friendStore.deleteFriend(friendId);
};

const tabs = [
    { key: 'total_sessions', name: '总局数', descending: true },
    { key: 'total_duration_minutes', name: '总时长', descending: true },
    { key: 'gobang_win_rate', name: '五子棋胜率', descending: true },
    { key: 'sudoku_best_time', name: '数独最佳用时', descending: false },
];

const fetchRankings = async () => {
    isLoading.value = true;
    error.value = null;
    try {
        const response = await api.get('/api/stats/friend-rankings');
        rankingsData.value = response.data.data;
    } catch (err) {
        error.value = '加载排行榜失败';
        console.error(err);
    } finally {
        isLoading.value = false;
    }
};

const rankedData = computed(() => {
    const tabInfo = tabs.find(t => t.key === activeTab.value);
    if (!tabInfo) return [];

    return [...rankingsData.value].sort((a, b) => {
        // 考虑数独最佳用时中null 值排在最后
        if (tabInfo.key === 'sudoku_best_time') {
            if (a.sudoku_best_time === null) return 1;
            if (b.sudoku_best_time === null) return -1;
        }

        const valA = a[tabInfo.key] || 0;
        const valB = b[tabInfo.key] || 0;

        return tabInfo.descending ? valB - valA : valA - valB;
    });
});

const formatScore = (item) => {
    const key = activeTab.value;
    const value = item[key];
    switch (key) {
        case 'total_sessions': return `${value} 局`;
        case 'total_duration_minutes': return `${value} 分钟`;
        case 'gobang_win_rate': return `${value} %`;
        case 'sudoku_best_time':
            if (value === null) return '无记录';
            const m = Math.floor(value / 60);
            const s = value % 60;
            return `${m}分${s}秒`;
        default: return value;
    }
};

onMounted(() => {
    friendStore.fetchFriendData();
    fetchRankings();
});
</script>

<style scoped>
.page-container {
    padding-top: 40px;
    padding-bottom: 40px;
}

h2 {
    text-align: center;
    margin-bottom: 40px;
    color: #2c3e50;
    font-size: 2rem;
}

.loading-state,
.error-state {
    text-align: center;
    font-size: 1.2rem;
    color: #7f8c8d;
    margin-bottom: 20px;
}

.error-state {
    color: #e74c3c;
    font-weight: bold;
}

.no-data {
    color: #7f8c8d;
    text-align: center;
    padding: 20px 0;
}

.friend-section {
    background: white;
    border-radius: 8px;
    padding: 25px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    margin-bottom: 30px;
}

.friend-section h3 {
    color: #2c3e50;
    margin-bottom: 20px;
    border-bottom: 2px solid #ecf0f1;
    padding-bottom: 10px;
}

.friend-section h3 i {
    margin-right: 10px;
    color: #3498db;
}

.search-bar {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}

.search-bar input {
    flex-grow: 1;
    padding: 10px;
    border: 2px solid #ddd;
    border-radius: 5px;
    font-size: 1rem;
}

.search-bar button {
    background-color: #3498db;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
}

.result-item,
.request-item,
.friend-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px;
    border-radius: 5px;
    transition: background-color 0.2s;
}

.result-item:hover,
.request-item:hover,
.friend-item:hover {
    background-color: #f8f9fa;
}

.btn-add {
    background-color: #2ecc71;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 5px;
    cursor: pointer;
}

.status-info {
    font-style: italic;
    color: #7f8c8d;
}

.request-item .actions {
    display: flex;
    gap: 10px;
}

.btn-accept {
    background-color: #2ecc71;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 5px;
    cursor: pointer;
}

.btn-decline {
    background-color: #95a5a6;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 5px;
    cursor: pointer;
}

.friend-item {
    display: grid;
    grid-template-columns: 20px 1fr auto auto;
    gap: 15px;
    align-items: center;
}

.status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
}

.status-dot.online {
    background-color: #2ecc71;
}

.status-dot.offline {
    background-color: #95a5a6;
}

.friend-name {
    font-weight: 500;
}

.online-status {
    color: #7f8c8d;
    font-size: 0.9em;
}

.btn-remove {
    background: none;
    border: none;
    color: #e74c3c;
    cursor: pointer;
    font-size: 1.1em;
}
.rankings-container {
    background: white;
    border-radius: 8px;
    padding: 25px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.tabs {
    display: flex;
    gap: 10px;
    border-bottom: 2px solid #ecf0f1;
    margin-bottom: 25px;
}

.tabs button {
    background: none;
    border: none;
    padding: 10px 15px;
    cursor: pointer;
    font-size: 1rem;
    color: #7f8c8d;
    position: relative;
    bottom: -2px;
}

.tabs button.active {
    color: #3498db;
    font-weight: bold;
    border-bottom: 3px solid #3498db;
}

.loading-state,
.error-state,
.empty-state {
    text-align: center;
    padding: 40px 0;
    color: #7f8c8d;
}

.podium {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 15px;
    min-height: 220px;
}

.podium-item {
    width: 120px;
    text-align: center;
    background: linear-gradient(to top, #f0f0f0, #ffffff);
    border-radius: 10px 10px 0 0;
    padding: 15px;
    position: relative;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.podium-item.silver {
    height: 160px;
}

.podium-item.gold {
    height: 200px;
}

.podium-item.bronze {
    height: 120px;
}

.rank-badge {
    position: absolute;
    top: -15px;
    left: 50%;
    transform: translateX(-50%);
    width: 30px;
    height: 30px;
    border-radius: 50%;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
}

.podium-item.gold .rank-badge {
    background: #ffd700;
}

.podium-item.silver .rank-badge {
    background: #c0c0c0;
}

.podium-item.bronze .rank-badge {
    background: #cd7f32;
}

.avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: #3498db;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    margin: 10px auto;
}

.username {
    font-weight: bold;
    color: #2c3e50;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.score {
    font-size: 1.1rem;
    color: #e74c3c;
    font-weight: 500;
    margin-top: 5px;
}

.rank-list {
    list-style: none;
    padding: 0;
    margin-top: 30px;
}

.list-item {
    display: grid;
    grid-template-columns: 40px 1fr auto;
    align-items: center;
    padding: 15px;
    border-radius: 8px;
}

.list-item:nth-child(odd) {
    background-color: #f8f9fa;
}

.rank {
    font-size: 1.1rem;
    font-weight: bold;
    color: #7f8c8d;
}

.list-item .username {
    font-size: 1rem;
    color: #34495e;
}

.list-item .score {
    font-size: 1rem;
    color: #34495e;
    font-weight: 500;
}
</style>