import Background from '../runtime/background';
import DataStore from '../base/DataStore';
import Sprite from '../base/Sprite';
import { apiRequest } from '../utils/api';

export default class RecommendTab {
    constructor(ctx) {
        this.ctx = ctx;
        this.recommendList = [];
        this.keyInfo = { keyCount: 0 }; // 设置默认值
        this.render(); // 先渲染基本界面
        this.loadData(); // 异步加载数据
    }

    async loadData() {
        try {
            // 获取热门报告列表
            const popularReports = await apiRequest('/report/popular');
            // 获取用户钥匙信息
            const keyInfo = await apiRequest('/api/key/info');
            
            this.recommendList = popularReports.data || [];
            this.keyInfo = keyInfo.data || { keyCount: 0 };
            this.render(); // 重新渲染
        } catch (error) {
            console.error('加载推荐数据失败:', error);
            // 即使加载失败也显示基本界面
            this.render();
        }
    }

    render() {
        const background = new Background(this.ctx);
        
        // 绘制标题
        this.ctx.fillStyle = '#333333';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('同频推荐', window.innerWidth/2, 50);
        
        // 绘制钥匙数量
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`钥匙: ${this.keyInfo?.keyCount || 0}`, window.innerWidth - 20, 30);
        
        // 绘制推荐列表
        this.drawRecommendList();
    }

    drawRecommendList() {
        const startY = 100;
        const itemHeight = 120;
        
        this.recommendList.forEach((item, index) => {
            const y = startY + index * itemHeight;
            
            // 绘制卡片背景
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(20, y, window.innerWidth - 40, itemHeight - 10);
            
            // 绘制用户信息
            this.ctx.fillStyle = '#333333';
            this.ctx.font = '18px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(item.title, 40, y + 30);
            
            // 绘制同频度
            this.ctx.fillStyle = '#666666';
            this.ctx.font = '14px Arial';
            this.ctx.fillText(`完成题目: ${item.totalCount}`, 40, y + 55);
            
            // 绘制解锁按钮或状态
            if (item.isPublic) {
                this.ctx.fillStyle = '#28a745';
                this.ctx.fillRect(window.innerWidth - 100, y + 20, 60, 30);
                this.ctx.fillStyle = '#ffffff';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('查看', window.innerWidth - 70, y + 38);
            } else {
                this.ctx.fillStyle = '#007AFF';
                this.ctx.fillRect(window.innerWidth - 100, y + 20, 60, 30);
                this.ctx.fillStyle = '#ffffff';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('解锁', window.innerWidth - 70, y + 38);
            }
        });
    }

    async handleTouch(x, y) {
        const startY = 100;
        const itemHeight = 120;
        
        // 检查是否点击了解锁按钮
        if (x > window.innerWidth - 100 && x < window.innerWidth - 40) {
            const index = Math.floor((y - startY) / itemHeight);
            if (index >= 0 && index < this.recommendList.length) {
                const item = this.recommendList[index];
                if (!item.isPublic) {
                    await this.unlockReport(item.id);
                } else {
                    await this.viewReport(item.id);
                }
            }
        }
    }

    async unlockReport(reportId) {
        try {
            // 检查钥匙数量
            if (this.keyInfo.keyCount < 1) {
                wx.showToast({
                    title: '钥匙不足，请观看广告获取',
                    icon: 'none'
                });
                return;
            }
            
            // 解锁报告
            await apiRequest('/api/key/unlock', {
                method: 'POST',
                data: {
                    reportId: reportId,
                    keyCost: 1
                }
            });
            
            // 刷新数据
            await this.loadData();
            
            wx.showToast({
                title: '解锁成功',
                icon: 'success'
            });
        } catch (error) {
            wx.showToast({
                title: '解锁失败',
                icon: 'error'
            });
        }
    }

    async viewReport(reportId) {
        try {
            const report = await apiRequest(`/report/${reportId}`);
            // 显示报告详情
            this.showReportDetail(report.data);
        } catch (error) {
            wx.showToast({
                title: '加载失败',
                icon: 'error'
            });
        }
    }

    showReportDetail(report) {
        // 实现报告详情显示逻辑
        console.log('显示报告详情:', report);
    }
}