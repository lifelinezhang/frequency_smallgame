import Background from '../runtime/background';
import DataStore from '../base/DataStore';
import QuestionScene from './questionScene';
import { apiRequest } from '../utils/api';

export default class ProfileTab {
    constructor(ctx) {
        this.ctx = ctx;
        this.userInfo = null;
        this.keyInfo = null;
        this.reports = [];
        this.adList = [];
        this.loadData();
    }

    async loadData() {
        try {
            // 获取用户信息
            const userInfo = DataStore.getInstance().userInfo;
            // 获取钥匙信息
            const keyInfo = await apiRequest('/api/key/info');
            // 获取用户报告
            const reports = await apiRequest('/report/list');
            // 获取广告列表
            const adList = await apiRequest('/api/ad/list');
            
            this.userInfo = userInfo;
            this.keyInfo = keyInfo.data;
            this.reports = reports.data;
            this.adList = adList.data;
            this.render();
        } catch (error) {
            console.error('加载用户数据失败:', error);
        }
    }

    render() {
        const background = new Background(this.ctx);
        
        // 绘制用户头像和信息
        this.drawUserInfo();
        
        // 绘制钥匙信息
        this.drawKeyInfo();
        
        // 绘制功能按钮
        this.drawActionButtons();
        
        // 绘制我的报告
        this.drawMyReports();
    }

    drawUserInfo() {
        // 绘制头像占位
        this.ctx.fillStyle = '#cccccc';
        this.ctx.fillRect(window.innerWidth/2 - 40, 30, 80, 80);
        
        // 绘制用户昵称
        this.ctx.fillStyle = '#333333';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.userInfo?.nickname || '用户', window.innerWidth/2, 130);
    }

    drawKeyInfo() {
        const y = 160;
        
        // 钥匙背景
        this.ctx.fillStyle = '#FFD700';
        this.ctx.fillRect(20, y, window.innerWidth - 40, 60);
        
        // 钥匙图标和数量
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('🔑', 40, y + 35);
        this.ctx.fillText(`钥匙数量: ${this.keyInfo?.keyCount || 0}`, 80, y + 35);
        
        // 观看广告按钮
        this.ctx.fillStyle = '#007AFF';
        this.ctx.fillRect(window.innerWidth - 120, y + 10, 80, 40);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('看广告', window.innerWidth - 80, y + 33);
    }

    drawActionButtons() {
        const y = 240;
        const buttonWidth = (window.innerWidth - 60) / 2;
        
        // 开始答题按钮
        this.ctx.fillStyle = '#28a745';
        this.ctx.fillRect(20, y, buttonWidth, 50);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('开始答题', 20 + buttonWidth/2, y + 30);
        
        // 我的报告按钮
        this.ctx.fillStyle = '#6c757d';
        this.ctx.fillRect(40 + buttonWidth, y, buttonWidth, 50);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText('我的报告', 40 + buttonWidth + buttonWidth/2, y + 30);
    }

    drawMyReports() {
        const startY = 320;
        
        this.ctx.fillStyle = '#333333';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('我的报告', 20, startY);
        
        if (this.reports.length === 0) {
            this.ctx.fillStyle = '#999999';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('暂无报告，快去答题吧！', window.innerWidth/2, startY + 50);
            return;
        }
        
        // 绘制报告列表
        this.reports.slice(0, 3).forEach((report, index) => {
            const y = startY + 40 + index * 60;
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(20, y, window.innerWidth - 40, 50);
            
            this.ctx.fillStyle = '#333333';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(report.title, 30, y + 20);
            
            this.ctx.fillStyle = '#666666';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(report.createTime, 30, y + 35);
        });
    }

    async handleTouch(x, y) {
        // 检查观看广告按钮
        if (x > window.innerWidth - 120 && x < window.innerWidth - 40 && y > 170 && y < 210) {
            await this.showAdVideo();
            return;
        }
        
        // 检查开始答题按钮
        const buttonWidth = (window.innerWidth - 60) / 2;
        if (y > 240 && y < 290) {
            if (x > 20 && x < 20 + buttonWidth) {
                this.startQuiz();
            } else if (x > 40 + buttonWidth && x < 40 + buttonWidth * 2) {
                this.showMyReports();
            }
        }
    }

    async showAdVideo() {
        try {
            // 获取可观看的广告
            const availableAds = this.adList.filter(ad => ad.canWatch);
            if (availableAds.length === 0) {
                wx.showToast({
                    title: '暂无可观看的广告',
                    icon: 'none'
                });
                return;
            }
            
            const ad = availableAds[0];
            
            // 显示激励视频广告
            const rewardedVideoAd = wx.createRewardedVideoAd({
                adUnitId: ad.adUrl
            });
            
            rewardedVideoAd.onClose((res) => {
                if (res && res.isEnded) {
                    // 用户完整观看了广告
                    this.watchAdComplete(ad.id, ad.duration);
                }
            });
            
            await rewardedVideoAd.show();
        } catch (error) {
            console.error('显示广告失败:', error);
            wx.showToast({
                title: '广告加载失败',
                icon: 'error'
            });
        }
    }

    async watchAdComplete(adId, duration) {
        try {
            // 提交观看广告记录
            const result = await apiRequest('/api/ad/watch', {
                method: 'POST',
                data: {
                    adId: adId,
                    watchDuration: duration
                }
            });
            
            if (result.data.isCompleted) {
                wx.showToast({
                    title: `获得${result.data.rewardKeys}个钥匙`,
                    icon: 'success'
                });
                
                // 刷新钥匙信息
                await this.loadData();
            }
        } catch (error) {
            console.error('提交观看记录失败:', error);
        }
    }

    startQuiz() {
        // 保存当前TabScene的引用，以便返回
        DataStore.getInstance().currentTabScene = DataStore.getInstance().director.tabScene;
        
        // 跳转到答题场景
        DataStore.getInstance().director.toQuestionScene();
    }

    showMyReports() {
        // 显示完整的报告列表
        console.log('显示我的报告列表');
    }
}