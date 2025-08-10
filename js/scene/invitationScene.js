/**
 * 邀请功能展示场景
 * 显示用户的邀请统计和邀请列表
 */
import Background from '../runtime/background';
import DataStore from '../base/DataStore';
import { getInvitationStats, getInvitedUsers } from '../utils/api';
import { generateShareConfig } from '../utils/invitation';

const screenWidth = window.innerWidth;
const screenHeight = window.innerHeight;

export default class InvitationScene {
    constructor(ctx) {
        this.ctx = ctx;
        this.invitationStats = null;
        this.invitedUsers = [];
        this.isLoading = true;
        
        this.loadInvitationData();
    }

    /**
     * 加载邀请相关数据
     */
    async loadInvitationData() {
        try {
            this.isLoading = true;
            this.render();
            
            // 并行加载邀请统计和邀请列表
            const [statsResult, usersResult] = await Promise.all([
                getInvitationStats(),
                getInvitedUsers()
            ]);
            
            this.invitationStats = statsResult.data;
            this.invitedUsers = usersResult.data || [];
            
            this.isLoading = false;
            this.render();
        } catch (error) {
            console.error('加载邀请数据失败:', error);
            this.isLoading = false;
            
            wx.showToast({
                title: '加载失败',
                icon: 'none'
            });
            
            this.render();
        }
    }

    /**
     * 渲染邀请场景
     */
    render() {
        // 清空画布
        this.ctx.clearRect(0, 0, screenWidth, screenHeight);
        
        // 绘制背景
        this.drawBackground();
        
        // 绘制标题栏
        this.drawHeader();
        
        if (this.isLoading) {
            this.drawLoading();
        } else {
            // 绘制邀请统计
            this.drawInvitationStats();
            
            // 绘制分享按钮
            this.drawShareButton();
            
            // 绘制邀请列表
            this.drawInvitedUsersList();
        }
    }

    /**
     * 绘制背景
     */
    drawBackground() {
        // 绘制渐变背景
        const gradient = this.ctx.createLinearGradient(0, 0, 0, screenHeight);
        gradient.addColorStop(0, '#4facfe');
        gradient.addColorStop(1, '#00f2fe');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, screenWidth, screenHeight);
    }

    /**
     * 绘制标题栏
     */
    drawHeader() {
        // 绘制返回按钮
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(20, 30, 40, 40);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('←', 40, 55);
        
        // 绘制标题
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('我的邀请', screenWidth / 2, 55);
        
        // 保存返回按钮区域
        this.backButtonArea = {
            x: 20,
            y: 30,
            width: 40,
            height: 40
        };
    }

    /**
     * 绘制加载状态
     */
    drawLoading() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('加载中...', screenWidth / 2, screenHeight / 2);
    }

    /**
     * 绘制邀请统计信息
     */
    drawInvitationStats() {
        const startY = 100;
        
        // 绘制统计卡片背景
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillRect(20, startY, screenWidth - 40, 120);
        
        // 绘制统计标题
        this.ctx.fillStyle = '#333333';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('邀请统计', screenWidth / 2, startY + 30);
        
        if (this.invitationStats) {
            // 绘制邀请人数
            this.ctx.fillStyle = '#007AFF';
            this.ctx.font = 'bold 32px Arial';
            this.ctx.fillText(this.invitationStats.totalInvited || 0, screenWidth / 2, startY + 70);
            
            this.ctx.fillStyle = '#666666';
            this.ctx.font = '16px Arial';
            this.ctx.fillText('已邀请好友', screenWidth / 2, startY + 95);
        } else {
            this.ctx.fillStyle = '#999999';
            this.ctx.font = '16px Arial';
            this.ctx.fillText('暂无数据', screenWidth / 2, startY + 70);
        }
    }

    /**
     * 绘制分享按钮
     */
    drawShareButton() {
        const buttonY = 250;
        const buttonHeight = 50;
        
        // 绘制分享按钮
        this.ctx.fillStyle = '#FF6B6B';
        this.ctx.fillRect(40, buttonY, screenWidth - 80, buttonHeight);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('邀请好友一起玩', screenWidth / 2, buttonY + 32);
        
        // 保存分享按钮区域
        this.shareButtonArea = {
            x: 40,
            y: buttonY,
            width: screenWidth - 80,
            height: buttonHeight
        };
    }

    /**
     * 绘制邀请用户列表
     */
    drawInvitedUsersList() {
        const listStartY = 330;
        
        // 绘制列表标题
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('邀请记录', 30, listStartY);
        
        if (this.invitedUsers.length === 0) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('还没有邀请任何好友', screenWidth / 2, listStartY + 50);
            this.ctx.fillText('快去分享给好友吧！', screenWidth / 2, listStartY + 80);
            return;
        }
        
        // 绘制用户列表
        let currentY = listStartY + 40;
        const itemHeight = 60;
        const maxVisibleItems = Math.floor((screenHeight - currentY - 50) / itemHeight);
        
        for (let i = 0; i < Math.min(this.invitedUsers.length, maxVisibleItems); i++) {
            const user = this.invitedUsers[i];
            
            // 绘制用户项背景
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.fillRect(20, currentY, screenWidth - 40, itemHeight - 10);
            
            // 绘制用户头像占位符
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.fillRect(35, currentY + 10, 40, 40);
            
            // 绘制用户信息
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(user.nickname || '匿名用户', 90, currentY + 25);
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.font = '12px Arial';
            const joinTime = user.joinTime ? new Date(user.joinTime).toLocaleDateString() : '未知时间';
            this.ctx.fillText(`加入时间: ${joinTime}`, 90, currentY + 45);
            
            currentY += itemHeight;
        }
        
        // 如果有更多用户，显示提示
        if (this.invitedUsers.length > maxVisibleItems) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`还有 ${this.invitedUsers.length - maxVisibleItems} 位好友...`, screenWidth / 2, currentY + 20);
        }
    }

    /**
     * 处理触摸事件
     */
    handleTouch(x, y) {
        // 检查返回按钮
        if (this.backButtonArea && 
            x >= this.backButtonArea.x && 
            x <= this.backButtonArea.x + this.backButtonArea.width &&
            y >= this.backButtonArea.y && 
            y <= this.backButtonArea.y + this.backButtonArea.height) {
            
            // 返回到上一个场景
            DataStore.getInstance().director.backToTabScene();
            return true;
        }
        
        // 检查分享按钮
        if (this.shareButtonArea && 
            x >= this.shareButtonArea.x && 
            x <= this.shareButtonArea.x + this.shareButtonArea.width &&
            y >= this.shareButtonArea.y && 
            y <= this.shareButtonArea.y + this.shareButtonArea.height) {
            
            this.handleShare();
            return true;
        }
        
        return false;
    }

    /**
     * 处理分享操作
     */
    handleShare() {
        try {
            const shareConfig = generateShareConfig({
                title: '快来和我一起挑战频率小游戏吧！',
                imageUrl: 'https://mtshop1.meitudata.com/5ad58b143a94621047.jpg'
            });
            
            wx.shareAppMessage({
                ...shareConfig,
                success: (res) => {
                    console.log('分享成功:', res);
                    wx.showToast({
                        title: '分享成功',
                        icon: 'success'
                    });
                },
                fail: (res) => {
                    console.error('分享失败:', res);
                    wx.showToast({
                        title: '分享失败',
                        icon: 'none'
                    });
                }
            });
        } catch (error) {
            console.error('分享操作失败:', error);
            wx.showToast({
                title: '分享失败',
                icon: 'none'
            });
        }
    }

    /**
     * 刷新数据
     */
    refresh() {
        this.loadInvitationData();
    }
}