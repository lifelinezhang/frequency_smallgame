import Background from '../runtime/background';
import DataStore from '../base/DataStore';
import { apiRequest } from '../utils/api';

export default class FriendsTab {
    constructor(ctx) {
        this.ctx = ctx;
        this.friendsList = [];
        this.loadFriends();
    }

    async loadFriends() {
        try {
            // 获取微信好友关系链
            const friendsData = await this.getFriendsFromWechat();
            // 获取好友的答题报告
            const friendsReports = await this.getFriendsReports(friendsData);
            
            this.friendsList = friendsReports;
            this.render();
        } catch (error) {
            console.error('加载好友数据失败:', error);
        }
    }

    async getFriendsFromWechat() {
        // 使用微信开放数据域获取好友信息
        return new Promise((resolve) => {
            wx.getFriendCloudStorage({
                keyList: ['score'],
                success: (res) => {
                    resolve(res.data);
                },
                fail: () => {
                    resolve([]);
                }
            });
        });
    }

    async getFriendsReports(friendsData) {
        // 根据好友openid获取他们的报告
        const reports = [];
        for (const friend of friendsData) {
            try {
                const userInfo = await apiRequest(`/api/user/openid/${friend.openid}`);
                if (userInfo.data) {
                    const userReports = await apiRequest(`/report/list?userId=${userInfo.data.id}`);
                    if (userReports.data.length > 0) {
                        reports.push({
                            ...friend,
                            userId: userInfo.data.id,
                            reports: userReports.data,
                            similarity: this.calculateSimilarity(userReports.data)
                        });
                    }
                }
            } catch (error) {
                console.log('获取好友报告失败:', error);
            }
        }
        return reports;
    }

    calculateSimilarity(friendReports) {
        // 计算与当前用户的同频度
        const myReports = DataStore.getInstance().userReports || [];
        // 这里实现同频度计算逻辑
        return Math.floor(Math.random() * 100); // 临时随机值
    }

    render() {
        const background = new Background(this.ctx);
        
        // 绘制标题
        this.ctx.fillStyle = '#333333';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('好友同频', window.innerWidth/2, 50);
        
        // 绘制好友列表
        this.drawFriendsList();
    }

    drawFriendsList() {
        const startY = 100;
        const itemHeight = 100;
        
        if (this.friendsList.length === 0) {
            this.ctx.fillStyle = '#999999';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('暂无好友数据', window.innerWidth/2, window.innerHeight/2);
            return;
        }
        
        this.friendsList.forEach((friend, index) => {
            const y = startY + index * itemHeight;
            
            // 绘制好友卡片
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(20, y, window.innerWidth - 40, itemHeight - 10);
            
            // 绘制头像占位
            this.ctx.fillStyle = '#cccccc';
            this.ctx.fillRect(30, y + 10, 60, 60);
            
            // 绘制好友昵称
            this.ctx.fillStyle = '#333333';
            this.ctx.font = '18px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(friend.nickname || '好友', 100, y + 30);
            
            // 绘制同频度
            this.ctx.fillStyle = '#007AFF';
            this.ctx.font = 'bold 20px Arial';
            this.ctx.fillText(`${friend.similarity}%`, 100, y + 55);
            
            // 绘制同频度标签
            this.ctx.fillStyle = '#666666';
            this.ctx.font = '14px Arial';
            this.ctx.fillText('同频度', 160, y + 55);
            
            // 绘制查看按钮
            this.ctx.fillStyle = '#28a745';
            this.ctx.fillRect(window.innerWidth - 80, y + 25, 50, 30);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('查看', window.innerWidth - 55, y + 43);
        });
    }

    handleTouch(x, y) {
        const startY = 100;
        const itemHeight = 100;
        
        // 检查是否点击了查看按钮
        if (x > window.innerWidth - 80 && x < window.innerWidth - 30) {
            const index = Math.floor((y - startY) / itemHeight);
            if (index >= 0 && index < this.friendsList.length) {
                this.showFriendDetail(this.friendsList[index]);
            }
        }
    }

    showFriendDetail(friend) {
        // 显示好友详情和同频度分析
        console.log('显示好友详情:', friend);
    }
}