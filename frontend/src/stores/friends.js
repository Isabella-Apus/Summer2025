import { defineStore } from 'pinia'
import api from '@/services/api'
import { useAuthStore } from './auth'

export const useFriendStore = defineStore('friends', {
  state: () => ({
    friends: [],
    friendRequests: [],
    searchResults: [],
    isLoading: false,
    error: null,
    pollingInterval: null,
    previousOnline: new Set(),
    notifications: [],
  }),
  getters: {
    getFriendStatus: () => (friend) => {
      if (!friend.last_online) return '离线'
      const lastOnlineTime = new Date(friend.last_online)
      const now = new Date()
      return (now - lastOnlineTime) / (1000 * 60) < 10 ? '在线' : '离线'
    },
  },
  actions: {
    _addNotification(message) {
      const newNotification = {
        id: Date.now(),
        message: message,
      };
      this.notifications.push(newNotification);
      setTimeout(() => { this.removeNotification(newNotification.id); }, 3000);
    },
    removeNotification(id) {
      this.notifications = this.notifications.filter(n => n.id !== id);
    },
    //轮询好友状态
    async pollFriendStatus() {
      if (!useAuthStore().isLoggedIn) return;
      try {
        const response = await api.get('/api/friend/list');
        const currentFriends = response.data.data;
        this.friends = currentFriends;

        //找出当前在线好友
        const currentOnlineId = new Set();
        currentFriends.forEach(friend => {
          if (this.getFriendStatus(friend) === '在线') {
            currentOnlineId.add(friend.id);
            if (!this.previousOnline.has(friend.id)) {
              this._addNotification(`您的好友 ${friend.username} 已上线`);
            }
          }
        });
        this.previousOnline = currentOnlineId;
      } catch (error) {
        console.error("轮询好友状态失败：", error);
      }
    },
    startPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
      }
      this.pollFriendStatus();
      this.pollingInterval = setInterval(this.pollFriendStatus, 10000);
    },
    stopPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval=null;
        this.previousOnline.clear();
        console.log("好友状态轮询已停止");
      }
    },
    _setLoading(status) {
      this.isLoading = status
    },
    _setError(message) {
      this.error = message
      setTimeout(() => (this.error = null), 5000)
    },
    async searchUsers(username) {
      this._setLoading(true)
      try {
        const response = await api.get('/api/friend/search', { params: { username } })
        this.searchResults = response.data.data
      } catch (err) {
        this._setError('搜索用户失败: ' + (err.response?.data?.error || err.message))
      } finally {
        this._setLoading(false)
      }
    },
    async sendFriendRequest(friendId) {
      try {
        const response = await api.post('/api/friend/request', { friend_id: friendId })
        alert(response.data.message || '好友请求已发送。')
        const user = this.searchResults.find((u) => u.id === friendId)
        if (user) user.status = 'request_sent'
      } catch (err) {
        this._setError('发送请求失败: ' + (err.response?.data?.error || err.message))
      }
    },
    async fetchFriendData() {
      this._setLoading(true)
      try {
        const [friendsRes, requestsRes] = await Promise.all([
          api.get('/api/friend/list'),
          api.get('/api/friend/requests'),
        ])
        this.friends = friendsRes.data.data
        this.friendRequests = requestsRes.data.data
      } catch (err) {
        this._setError('加载好友数据失败: ' + (err.response?.data?.error || err.message))
      } finally {
        this._setLoading(false)
      }
    },
    async handleFriendRequest(requestId, status) {
      try {
        const response = await api.put(`/api/friend/request/${requestId}`, { status })
        alert(response.data.message || '请求已处理。')
        this.fetchFriendData() 
      } catch (err) {
        this._setError('处理请求失败: ' + (err.response?.data?.error || err.message))
      }
    },
    async deleteFriend(friendId) {
      if (!confirm('确定要删除这位好友吗？')) return
      try {
        const response = await api.delete(`/api/friend/${friendId}`)
        alert(response.data.message || '好友已删除。')
        this.fetchFriendData() 
      } catch (err) {
        this._setError('删除好友失败: ' + (err.response?.data?.error || err.message))
      }
    },
  },
})
