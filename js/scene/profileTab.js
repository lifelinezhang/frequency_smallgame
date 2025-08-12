import Background from '../runtime/background';
import DataStore from '../base/DataStore';
import QuestionScene from './questionScene';
import { apiRequest, userLogin, startQuiz as startQuizAPI, submitAnswer } from '../utils/api';
import { login, createUserInfoButton } from '../utils/auth';
import { recordInvitationAfterLogin } from '../utils/invitation';

export default class ProfileTab {
    constructor(ctx) {
        this.ctx = ctx;
        this.userInfo = null;
        this.keyInfo = null;
        this.myReport = null; // 存储我的最新报告
        this.adList = [];
        this.isLoggedIn = false;
        this.loginButton = null;
        
        // 报告tab相关属性
        this.currentReportTab = 0; // 当前选中的报告tab索引
        this.reportTabs = []; // 动态从报告数据中获取tab标签
        this.reportTabBounds = []; // 存储每个tab的点击区域
        this.moreButtonBounds = null; // 存储"查看更多"按钮的点击区域
        
        // 底部链接相关
        this.footerLinks = [
            { name: '用户协议', action: 'userAgreement' },
            { name: '隐私政策', action: 'privacyPolicy' },
            { name: '联系我们', action: 'contactUs' },
            { name: '关于我们', action: 'aboutUs' }
        ];
        this.footerLinkBounds = []; // 存储底部链接的点击区域
        
        // 下拉刷新相关属性
        this.pullRefresh = {
            startY: 0,
            currentY: 0,
            isPulling: false,
            isRefreshing: false,
            threshold: 80, // 下拉阈值
            maxPullDistance: 120 // 最大下拉距离
        };
        
        this.checkLoginStatus();
        this.loadData();
    }

    // 检查登录状态
    checkLoginStatus() {
        const userInfo = wx.getStorageSync('userInfo');
        if (userInfo && userInfo.token) {
            this.isLoggedIn = true;
            this.userInfo = userInfo;
            DataStore.getInstance().userInfo = userInfo;
        } else {
            this.isLoggedIn = false;
        }
    }

    async loadData() {
        try {
            if (!this.isLoggedIn) {
                this.render(); // 显示登录界面
                return;
            }
            
            // 获取用户信息
            const userInfo = DataStore.getInstance().userInfo;
            // 获取钥匙信息
            const keyInfo = await apiRequest('/api/key/info');
            // 获取我的最新报告
            const myReport = await apiRequest('/report/my');
            // 获取广告列表
            const adList = await apiRequest('/api/ad/list');
            
            this.userInfo = userInfo;
            this.keyInfo = keyInfo.data;
            this.myReport = myReport.data; // 存储我的报告数据
            this.adList = adList.data;
            
            // 解析报告数据，更新tab标签
            this.parseReportData();
            
            this.render();
        } catch (error) {
            console.error('加载用户数据失败:', error);
            // 如果是token失效，清除登录状态
            if (error.message.includes('token') || error.message.includes('登录')) {
                this.logout();
            }
        }
    }

    /**
     * 渲染ProfileTab内容
     * 注意：不要覆盖底部tab栏区域
     */
    render() {
        // 先绘制背景，但要避免覆盖底部tab栏
        this.drawBackground();
        
        if (!this.isLoggedIn) {
            this.drawLoginInterface();
        } else {
            // 绘制用户头像和信息
            this.drawUserInfo();
            
            // 绘制钥匙信息
            this.drawKeyInfo();
            
            // 绘制我的报告
            this.drawMyReports();
        }
        
        // 绘制底部链接
        this.drawFooterLinks();
    }
    
    /**
     * 绘制背景，但不覆盖底部tab栏区域
     */
    drawBackground() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const tabHeight = 100;
        
        // 只绘制内容区域的背景，不覆盖tab栏
        const bgImg = DataStore.getInstance().res.get('background');
        if (bgImg) {
            this.ctx.drawImage(bgImg, 0, 0, screenWidth, screenHeight - tabHeight);
        }
        
        // 绘制logo
        const logoImg = DataStore.getInstance().res.get('logo');
        if (logoImg) {
            this.ctx.drawImage(logoImg, 10, -10, logoImg.width / 2, logoImg.height / 2);
        }
    }

    // 绘制登录界面
    drawLoginInterface() {
        // 清除之前的登录按钮
        if (this.loginButton) {
            this.loginButton.destroy();
            this.loginButton = null;
        }

        // 绘制登录提示
        this.ctx.fillStyle = '#333333';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('我的', window.innerWidth/2, 80);
        
        // 绘制未登录提示
        this.ctx.fillStyle = '#666666';
        this.ctx.font = '18px Arial';
        this.ctx.fillText('请先登录以查看个人信息', window.innerWidth/2, 200);
        
        // 绘制登录按钮背景
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonX = (window.innerWidth - buttonWidth) / 2;
        const buttonY = 250;
        
        this.ctx.fillStyle = '#007AFF';
        this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '18px Arial';
        this.ctx.fillText('快速登录', window.innerWidth/2, buttonY + 32);
        
        // 设置登录按钮区域
        this.createLoginButton(buttonX, buttonY, buttonWidth, buttonHeight);
    }

    // 创建登录按钮
    createLoginButton(x, y, width, height) {
        this.loginButton = wx.createUserInfoButton({
            type: 'text',
            text: '',
            style: {
                left: x,
                top: y,
                width: width,
                height: height,
                backgroundColor: 'transparent',
                color: 'transparent',
                fontSize: 1,
                borderRadius: 8
            }
        });
        
        this.loginButton.show();
        
        this.loginButton.onTap(async (res) => {
            console.log('登录按钮点击，返回数据:', res);
            
            if (res.userInfo) {
                console.log('获取到用户信息，开始登录流程');
                await this.handleLogin(res);
            } else {
                console.log('未获取到用户信息，可能用户拒绝授权');
                
                // 检查用户是否拒绝了授权
                wx.getSetting({
                    success: (settingRes) => {
                        console.log('用户授权设置:', settingRes.authSetting);
                        
                        if (settingRes.authSetting['scope.userInfo'] === false) {
                            // 用户拒绝了授权，引导用户手动开启
                            wx.showModal({
                                title: '需要授权',
                                content: '需要获取您的用户信息才能登录，请在设置中开启授权',
                                confirmText: '去设置',
                                success: (modalRes) => {
                                    if (modalRes.confirm) {
                                        wx.openSetting();
                                    }
                                }
                            });
                        } else {
                            // 其他情况，可能是网络问题或系统问题
                            wx.showToast({
                                title: '获取用户信息失败，请重试',
                                icon: 'none'
                            });
                        }
                    }
                });
            }
        });
    }

    // 处理登录
    async handleLogin(userInfoRes) {
        try {
            wx.showLoading({
                title: '登录中...'
            });
            
            // 获取微信登录code
            const loginRes = await new Promise((resolve, reject) => {
                wx.login({
                    success: resolve,
                    fail: reject
                });
            });
            
            // 检查是否有邀请者信息
            const inviterOpenId = wx.getStorageSync('inviterOpenId');
            
            // 调用后端登录接口，传入邀请者信息
            const loginResult = await userLogin(loginRes.code, userInfoRes.userInfo, inviterOpenId);
            
            if (loginResult.code === '200' || loginResult.code === 200) {
                // 保存用户信息和token
                const userInfo = {
                    ...userInfoRes.userInfo,
                    token: loginResult.data.token,
                    id: loginResult.data.id // 同时保存id字段以确保兼容性
                };
                
                wx.setStorageSync('userInfo', userInfo);
                DataStore.getInstance().userInfo = userInfo;
                
                this.isLoggedIn = true;
                this.userInfo = userInfo;
                
                // 清除之前的云存储数据
                this.clearPreviousCloudData();
                
                // 记录邀请关系（如果有的话）
                try {
                    await recordInvitationAfterLogin();
                } catch (error) {
                    console.error('记录邀请关系失败:', error);
                    // 不影响登录流程，只记录错误
                }
                
                // 隐藏登录按钮
                if (this.loginButton) {
                    this.loginButton.destroy();
                    this.loginButton = null;
                }
                
                wx.hideLoading();
                wx.showToast({
                    title: '登录成功',
                    icon: 'success'
                });
                
                // 重新加载数据
                this.loadData();
            } else {
                throw new Error(loginResult.msg || '登录失败');
            }
        } catch (error) {
            wx.hideLoading();
            console.error('登录失败:', error);
            wx.showToast({
                title: error.message || '登录失败',
                icon: 'none'
            });
        }
    }

    // 退出登录
    logout() {
        wx.removeStorageSync('userInfo');
        DataStore.getInstance().userInfo = null;
        this.isLoggedIn = false;
        this.userInfo = null;
        this.keyInfo = null;
        this.reports = [];
        this.adList = [];
        
        wx.showToast({
            title: '已退出登录',
            icon: 'success'
        });
        
        this.render();
    }

    drawUserInfo() {
        if (!this.userInfo) return;
        
        // 绘制头部渐变背景
        const headerGradient = this.ctx.createLinearGradient(0, 0, 0, 160);
        headerGradient.addColorStop(0, '#667eea');
        headerGradient.addColorStop(1, '#764ba2');
        this.ctx.fillStyle = headerGradient;
        this.ctx.fillRect(0, 0, window.innerWidth, 160);
        
        // 绘制标题
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 26px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('我的', window.innerWidth/2, 35);
        
        // 绘制退出登录按钮
        const logoutBtnWidth = 70;
        const logoutBtnHeight = 32;
        const logoutBtnX = window.innerWidth - logoutBtnWidth - 15;
        const logoutBtnY = 15;
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.fillRect(logoutBtnX, logoutBtnY, logoutBtnWidth, logoutBtnHeight);
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(logoutBtnX, logoutBtnY, logoutBtnWidth, logoutBtnHeight);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('退出', logoutBtnX + logoutBtnWidth/2, logoutBtnY + 21);
        
        // 绘制用户信息卡片
        const cardX = 20;
        const cardY = 60;
        const cardWidth = window.innerWidth - 40;
        const cardHeight = 85;
        
        // 卡片阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(cardX + 2, cardY + 2, cardWidth, cardHeight);
        
        // 卡片背景
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
        
        // 绘制用户头像
        this.drawUserAvatar(this.userInfo.avatarUrl, cardX + 20, cardY + 15, 55, 55);
        
        // 绘制用户信息
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(this.userInfo.nickName || '用户', cardX + 90, cardY + 35);
        
        // 在线状态指示器
        this.ctx.fillStyle = '#28a745';
        this.ctx.beginPath();
        this.ctx.arc(cardX + 90, cardY + 50, 4, 0, 2 * Math.PI);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#7f8c8d';
        this.ctx.font = '14px Arial';
        this.ctx.fillText('在线', cardX + 105, cardY + 55);
        
        // 绘制更新报告按钮
        const buttonWidth = 90;
        const buttonHeight = 35;
        const buttonX = cardX + cardWidth - buttonWidth - 15;
        const buttonY = cardY + 25;
        
        const btnGradient = this.ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
        btnGradient.addColorStop(0, '#4facfe');
        btnGradient.addColorStop(1, '#00f2fe');
        this.ctx.fillStyle = btnGradient;
        this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        this.ctx.strokeStyle = 'rgba(79, 172, 254, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('更新报告', buttonX + buttonWidth/2, buttonY + buttonHeight/2 + 5);
    }

    /**
     * 绘制用户头像
     * @param {string} avatarUrl - 头像URL
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {number} width - 宽度
     * @param {number} height - 高度
     */
    drawUserAvatar(avatarUrl, x, y, width, height) {
        if (avatarUrl && avatarUrl.trim() !== '') {
            // 如果有头像URL，尝试加载并绘制头像
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                // 保存当前状态
                this.ctx.save();
                
                // 创建圆形裁剪路径
                this.ctx.beginPath();
                this.ctx.arc(x + width/2, y + height/2, width/2, 0, 2 * Math.PI);
                this.ctx.clip();
                
                // 绘制头像
                this.ctx.drawImage(img, x, y, width, height);
                
                // 恢复状态
                this.ctx.restore();
                
                // 绘制圆形边框
                this.ctx.strokeStyle = '#d0d0d0';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.arc(x + width/2, y + height/2, width/2, 0, 2 * Math.PI);
                this.ctx.stroke();
            };
            img.onerror = () => {
                // 头像加载失败时绘制默认头像
                this.drawDefaultAvatar(x, y, width, height);
            };
            img.src = avatarUrl;
        } else {
            // 没有头像URL时绘制默认头像
            this.drawDefaultAvatar(x, y, width, height);
        }
    }

    /**
     * 绘制默认头像
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {number} width - 宽度
     * @param {number} height - 高度
     */
    drawDefaultAvatar(x, y, width, height) {
        // 绘制圆形背景
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.beginPath();
        this.ctx.arc(x + width/2, y + height/2, width/2, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // 绘制用户图标
        this.ctx.fillStyle = '#999999';
        this.ctx.font = `${width * 0.4}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('👤', x + width/2, y + height/2);
        
        // 绘制圆形边框
        this.ctx.strokeStyle = '#d0d0d0';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(x + width/2, y + height/2, width/2, 0, 2 * Math.PI);
        this.ctx.stroke();
    }

    drawKeyInfo() {
        // 动态计算钥匙信息区域的位置，确保与用户信息区域有合适间距
        const userInfoEndY = 145; // 用户信息卡片结束位置（60 + 85）
        const spacing = 15; // 与用户信息区域的间距
        const y = userInfoEndY + spacing;
        const cardWidth = window.innerWidth - 40;
        const cardHeight = 70;
        const cardX = 20;
        
        // 卡片阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(cardX + 2, y + 2, cardWidth, cardHeight);
        
        // 钥匙卡片渐变背景
        const keyGradient = this.ctx.createLinearGradient(cardX, y, cardX, y + cardHeight);
        keyGradient.addColorStop(0, '#ffecd2');
        keyGradient.addColorStop(1, '#fcb69f');
        this.ctx.fillStyle = keyGradient;
        this.ctx.fillRect(cardX, y, cardWidth, cardHeight);
        
        // 钥匙图标背景圆圈
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(cardX + 35, y + 35, 20, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // 钥匙图标
        this.ctx.fillStyle = '#ff6b35';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🔑', cardX + 35, y + 42);
        
        // 钥匙数量标题
        this.ctx.fillStyle = '#8b4513';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('我的钥匙', cardX + 65, y + 25);
        
        // 钥匙数量
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.font = 'bold 28px Arial';
        this.ctx.fillText(`${this.keyInfo?.keyCount || 0}`, cardX + 65, y + 50);
        
        // 观看广告按钮
        const adBtnWidth = 90;
        const adBtnHeight = 35;
        const adBtnX = cardX + cardWidth - adBtnWidth - 15;
        const adBtnY = y + 18;
        
        const adBtnGradient = this.ctx.createLinearGradient(adBtnX, adBtnY, adBtnX, adBtnY + adBtnHeight);
        adBtnGradient.addColorStop(0, '#ff9a9e');
        adBtnGradient.addColorStop(1, '#fecfef');
        this.ctx.fillStyle = adBtnGradient;
        this.ctx.fillRect(adBtnX, adBtnY, adBtnWidth, adBtnHeight);
        
        this.ctx.strokeStyle = 'rgba(255, 154, 158, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(adBtnX, adBtnY, adBtnWidth, adBtnHeight);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillText('📺 看广告', adBtnX + adBtnWidth/2, adBtnY + adBtnHeight/2 + 5);
    }

    drawActionButtons() {
        const y = 260;
        const buttonHeight = 50;
        const buttonSpacing = 15;
        const totalButtonWidth = window.innerWidth - 60;
        const buttonWidth = (totalButtonWidth - buttonSpacing) / 2;
        
        // 开始答题按钮
        const startButtonX = 30;
        
        // 按钮阴影
        this.ctx.fillStyle = 'rgba(40, 167, 69, 0.3)';
        this.ctx.fillRect(startButtonX + 2, y + 2, buttonWidth, buttonHeight);
        
        // 按钮渐变背景
        const startGradient = this.ctx.createLinearGradient(startButtonX, y, startButtonX, y + buttonHeight);
        startGradient.addColorStop(0, '#48c78e');
        startGradient.addColorStop(0.5, '#28a745');
        startGradient.addColorStop(1, '#20c997');
        this.ctx.fillStyle = startGradient;
        this.ctx.fillRect(startButtonX, y, buttonWidth, buttonHeight);
        
        // 按钮高光
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.fillRect(startButtonX, y, buttonWidth, buttonHeight/3);
        
        // 按钮图标和文字
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🚀', startButtonX + buttonWidth/2 - 20, y + buttonHeight/2);
        
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillText('开始答题', startButtonX + buttonWidth/2 + 10, y + buttonHeight/2);
        
        // 我的报告按钮
        const reportButtonX = startButtonX + buttonWidth + buttonSpacing;
        
        // 按钮阴影
        this.ctx.fillStyle = 'rgba(108, 117, 125, 0.3)';
        this.ctx.fillRect(reportButtonX + 2, y + 2, buttonWidth, buttonHeight);
        
        // 按钮渐变背景
        const reportGradient = this.ctx.createLinearGradient(reportButtonX, y, reportButtonX, y + buttonHeight);
        reportGradient.addColorStop(0, '#8e9aaf');
        reportGradient.addColorStop(0.5, '#6c757d');
        reportGradient.addColorStop(1, '#5a6268');
        this.ctx.fillStyle = reportGradient;
        this.ctx.fillRect(reportButtonX, y, buttonWidth, buttonHeight);
        
        // 按钮高光
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.fillRect(reportButtonX, y, buttonWidth, buttonHeight/3);
        
        // 按钮图标和文字
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('📋', reportButtonX + buttonWidth/2 - 20, y + buttonHeight/2);
        
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillText('我的报告', reportButtonX + buttonWidth/2 + 10, y + buttonHeight/2);
        
        // 存储按钮点击区域
        this.actionButtonBounds = [
            {
                x: startButtonX,
                y: y,
                width: buttonWidth,
                height: buttonHeight,
                action: 'startTest'
            },
            {
                x: reportButtonX,
                y: y,
                width: buttonWidth,
                height: buttonHeight,
                action: 'myReports'
            }
        ];
    }

    /**
     * 绘制我的报告按钮
     * 显示一个可点击的按钮，点击后展示报告详情
     */
    /**
     * 绘制我的报告区域
     * 根据屏幕高度动态调整位置和大小，确保在不同机型下都能正常显示
     * 
     * 适配策略：
     * 1. 根据屏幕高度动态计算可用空间
     * 2. 设置最小和最大报告高度限制
     * 3. 在空间不足时调整起始位置
     * 4. 动态调整内容显示行数
     * 5. 确保与底部tab栏和链接区域不重叠
     */
    drawMyReports() {
        const screenHeight = window.innerHeight;
        const tabHeight = 100; // 底部tab栏高度
        const footerLinksHeight = this.footerLinks ? this.footerLinks.length * 47 + 70 : 250; // 底部链接区域高度
        const margin = 20;
        
        // 动态计算报告区域的起始位置和高度
        const userInfoHeight = 160; // 用户信息区域高度（包括头部渐变背景）
        const keyInfoHeight = 70; // 钥匙信息区域高度
        const spacing = 15; // 组件间距
        const fixedContentHeight = userInfoHeight + keyInfoHeight + spacing * 2; // 固定内容总高度
        
        const availableHeight = screenHeight - tabHeight - footerLinksHeight - fixedContentHeight - 40; // 40是额外的边距
        const minReportHeight = 160; // 最小报告高度
        const maxReportHeight = 280; // 最大报告高度
        
        const baseStartY = userInfoHeight + keyInfoHeight + spacing * 2;
        const reportHeight = Math.max(minReportHeight, Math.min(maxReportHeight, availableHeight));
        
        // 如果可用高度不足，调整起始位置以确保报告区域可见
        const adjustedStartY = availableHeight < minReportHeight ? 
            Math.max(baseStartY, screenHeight - tabHeight - footerLinksHeight - minReportHeight - 20) : baseStartY;
        
        // 绘制报告容器阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(margin + 2, adjustedStartY + 2, window.innerWidth - 2 * margin, reportHeight);
        
        // 绘制报告容器背景
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(margin, adjustedStartY, window.innerWidth - 2 * margin, reportHeight);
        
        // 绘制顶部装饰条
        const decorGradient = this.ctx.createLinearGradient(margin, adjustedStartY, margin + window.innerWidth - 2 * margin, adjustedStartY);
        decorGradient.addColorStop(0, '#667eea');
        decorGradient.addColorStop(1, '#764ba2');
        this.ctx.fillStyle = decorGradient;
        this.ctx.fillRect(margin, adjustedStartY, window.innerWidth - 2 * margin, 4);
        
        // 绘制标题区域背景
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(margin, adjustedStartY + 4, window.innerWidth - 2 * margin, 40);
        
        // 绘制标题
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText('📊 我的报告', margin + 15, adjustedStartY + 20);
        
        // 确保报告数据已解析
        if (this.reportTabs.length === 0) {
            this.parseReportData();
        }
        
        // 绘制tab标签
        const tabY = adjustedStartY + 55;
        const reportTabHeight = 30;
        const tabWidth = 70;
        const tabSpacing = 8;
        
        // 存储tab点击区域用于点击检测
        this.reportTabBounds = [];
        
        // 只有当有tab数据时才绘制
        if (this.reportTabs.length > 0) {
            this.reportTabs.forEach((tab, index) => {
            const tabX = margin + 15 + index * (tabWidth + tabSpacing);
            
            // 存储tab点击区域
            this.reportTabBounds.push({
                x: tabX,
                y: tabY,
                width: tabWidth,
                height: reportTabHeight,
                index: index
            });
            
            // 绘制tab背景
            if (index === this.currentReportTab) {
                const activeTabGradient = this.ctx.createLinearGradient(tabX, tabY, tabX, tabY + reportTabHeight);
                activeTabGradient.addColorStop(0, '#667eea');
                activeTabGradient.addColorStop(1, '#764ba2');
                this.ctx.fillStyle = activeTabGradient;
            } else {
                this.ctx.fillStyle = '#e9ecef';
            }
            this.ctx.fillRect(tabX, tabY, tabWidth, reportTabHeight);
            
            // 绘制tab边框
            this.ctx.strokeStyle = index === this.currentReportTab ? 'rgba(102, 126, 234, 0.3)' : '#dee2e6';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(tabX, tabY, tabWidth, reportTabHeight);
            
            // 绘制tab文字
            this.ctx.fillStyle = index === this.currentReportTab ? '#ffffff' : '#6c757d';
            this.ctx.font = index === this.currentReportTab ? 'bold 12px Arial' : '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(tab, tabX + tabWidth/2, tabY + reportTabHeight/2);
            });
        }
        
        // 绘制报告内容预览
        const contentY = tabY + reportTabHeight + 20;
        // 根据可用空间动态调整内容高度
        const remainingHeight = adjustedStartY + reportHeight - contentY - 60; // 60是底部按钮区域的高度
        const contentHeight = Math.max(60, Math.min(90, remainingHeight));
        
        // 内容区域背景
        this.ctx.fillStyle = '#fafafa';
        this.ctx.fillRect(margin + 10, contentY - 5, window.innerWidth - 2 * margin - 20, contentHeight);
        
        if (this.myReport && this.myReport.content) {
            // 显示报告内容的前几行
            const previewText = this.getReportPreview();
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.font = '13px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'top';
            
            // 分行显示文本，根据内容高度动态调整显示行数
            const lines = this.wrapText(previewText, window.innerWidth - 2 * margin - 50, 13);
            const maxLines = Math.floor((contentHeight - 10) / 18); // 根据内容高度计算最大行数
            const displayLines = Math.max(1, Math.min(maxLines, lines.length));
            lines.slice(0, displayLines).forEach((line, index) => {
                this.ctx.fillText(line, margin + 20, contentY + 5 + index * 18);
            });
        } else {
            // 空状态显示
            this.ctx.fillStyle = '#e0e0e0';
            this.ctx.font = '32px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('📝', window.innerWidth/2, contentY + 25);
            
            this.ctx.fillStyle = '#999999';
            this.ctx.font = '16px Arial';
            this.ctx.fillText('暂无报告', window.innerWidth/2, contentY + 50);
            
            this.ctx.fillStyle = '#cccccc';
            this.ctx.font = '14px Arial';
            this.ctx.fillText('快去答题生成你的专属报告吧！', window.innerWidth/2, contentY + 70);
        }
        
        // 绘制"查看更多"按钮
        const moreButtonWidth = 70;
        const moreButtonHeight = 24;
        const moreButtonX = window.innerWidth - margin - 15 - moreButtonWidth;
        const moreButtonY = adjustedStartY + reportHeight - 20 - moreButtonHeight;
        
        const moreBtnGradient = this.ctx.createLinearGradient(moreButtonX, moreButtonY, moreButtonX, moreButtonY + moreButtonHeight);
        moreBtnGradient.addColorStop(0, '#4facfe');
        moreBtnGradient.addColorStop(1, '#00f2fe');
        this.ctx.fillStyle = moreBtnGradient;
        this.ctx.fillRect(moreButtonX, moreButtonY, moreButtonWidth, moreButtonHeight);
        
        this.ctx.strokeStyle = 'rgba(79, 172, 254, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(moreButtonX, moreButtonY, moreButtonWidth, moreButtonHeight);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('查看更多', moreButtonX + moreButtonWidth/2, moreButtonY + moreButtonHeight/2);
        
        // 存储按钮位置用于点击检测
        this.moreButtonBounds = {
            x: moreButtonX,
            y: moreButtonY,
            width: moreButtonWidth,
            height: moreButtonHeight
        };
    }

    /**
     * 获取报告内容预览
     * @returns {string} 预览文本
     */
    /**
     * 获取报告预览内容
     * @returns {string} 报告预览文本
     */
    /**
     * 解析报告数据并更新tab标签
     */
    parseReportData() {
        if (!this.myReport || !this.myReport.content) {
            this.reportTabs = [];
            return;
        }
        
        try {
            // 尝试解析JSON格式的报告数据
            const reportData = typeof this.myReport.content === 'string' 
                ? JSON.parse(this.myReport.content) 
                : this.myReport.content;
            
            // 从JSON数据中提取tab标签
            this.reportTabs = Object.keys(reportData);
            
            // 确保当前选中的tab索引有效
            if (this.currentReportTab >= this.reportTabs.length) {
                this.currentReportTab = 0;
            }
        } catch (error) {
            console.error('解析报告数据失败:', error);
            // 如果解析失败，使用默认的tab标签
            this.reportTabs = ['报告内容'];
            this.currentReportTab = 0;
        }
    }
    
    /**
     * 获取报告预览内容
     * @returns {string} 预览文本
     */
    getReportPreview() {
        if (!this.myReport || !this.myReport.content) {
            return '';
        }
        
        // 确保报告数据已解析
        if (this.reportTabs.length === 0) {
            this.parseReportData();
        }
        
        if (this.reportTabs.length === 0) {
            return '';
        }
        
        try {
            // 解析JSON格式的报告数据
            const reportData = typeof this.myReport.content === 'string' 
                ? JSON.parse(this.myReport.content) 
                : this.myReport.content;
            
            // 获取当前选中tab的内容
            const currentTabName = this.reportTabs[this.currentReportTab];
            const tabContent = reportData[currentTabName] || '';
            
            // 截取预览长度
            return tabContent.length > 200 ? tabContent.substring(0, 200) + '...' : tabContent;
        } catch (error) {
            console.error('获取报告预览失败:', error);
            // 如果解析失败，回退到原始内容
            const content = this.myReport.content;
            return content.length > 200 ? content.substring(0, 200) + '...' : content;
        }
    }
    

    
    /**
     * 文本换行处理
     * @param {string} text - 要换行的文本
     * @param {number} maxWidth - 最大宽度
     * @param {number} fontSize - 字体大小
     * @returns {Array} 换行后的文本数组
     */
    wrapText(text, maxWidth, fontSize) {
        const words = text.split('');
        const lines = [];
        let currentLine = '';
        
        // 设置字体以测量文本宽度
        this.ctx.font = `${fontSize}px Arial`;
        
        for (let i = 0; i < words.length; i++) {
            const testLine = currentLine + words[i];
            const metrics = this.ctx.measureText(testLine);
            const testWidth = metrics.width;
            
            if (testWidth > maxWidth && currentLine !== '') {
                lines.push(currentLine);
                currentLine = words[i];
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }
    
    /**
     * 处理触摸开始事件
     * @param {number} x - 触摸点 x 坐标
     * @param {number} y - 触摸点 y 坐标
     */
    handleTouchStart(x, y) {
        // 只在页面顶部区域启用下拉刷新
        if (y < 100 && !this.pullRefresh.isRefreshing) {
            this.pullRefresh.startY = y;
            this.pullRefresh.currentY = y;
            this.pullRefresh.isPulling = true;
        }
    }

    /**
     * 处理触摸移动事件
     * @param {number} x - 触摸点 x 坐标
     * @param {number} y - 触摸点 y 坐标
     */
    handleTouchMove(x, y) {
        if (this.pullRefresh.isPulling && !this.pullRefresh.isRefreshing) {
            this.pullRefresh.currentY = y;
            const pullDistance = Math.max(0, y - this.pullRefresh.startY);
            
            // 限制最大下拉距离
            if (pullDistance <= this.pullRefresh.maxPullDistance) {
                this.drawPullRefreshIndicator(pullDistance);
            }
        }
    }

    /**
     * 处理触摸结束事件
     * @param {number} x - 触摸点 x 坐标
     * @param {number} y - 触摸点 y 坐标
     */
    async handleTouchEnd(x, y) {
        if (this.pullRefresh.isPulling) {
            const pullDistance = this.pullRefresh.currentY - this.pullRefresh.startY;
            
            if (pullDistance >= this.pullRefresh.threshold) {
                // 触发刷新
                await this.triggerRefresh();
            }
            
            // 重置下拉状态
            this.pullRefresh.isPulling = false;
            this.pullRefresh.startY = 0;
            this.pullRefresh.currentY = 0;
            
            // 重新渲染，清除下拉指示器
            this.render();
        }
    }

    async handleTouch(x, y) {
        console.log('ProfileTab handleTouch:', x, y, 'isLoggedIn:', this.isLoggedIn);
        
        if (!this.isLoggedIn) {
            // 检查是否点击了登录按钮区域
            const buttonWidth = 200;
            const buttonHeight = 50;
            const buttonX = (window.innerWidth - buttonWidth) / 2;
            const buttonY = 250;
            
            if (x >= buttonX && x <= buttonX + buttonWidth && 
                y >= buttonY && y <= buttonY + buttonHeight) {
                console.log('点击了登录按钮区域');
                // 这里可以触发登录流程
                return true; // 表示事件已处理
            }
            return false; // 没有处理事件，让TabScene处理tab切换
        }
        
        // 检查是否点击了退出登录按钮
        if (x >= window.innerWidth - 80 && x <= window.innerWidth - 20 && y >= 20 && y <= 50) {
            wx.showModal({
                title: '确认退出',
                content: '确定要退出登录吗？',
                success: (res) => {
                    if (res.confirm) {
                        this.logout();
                    }
                }
            });
            return true; // 表示事件已处理
        }
        
        // 检查是否点击了更新报告按钮（动态计算位置）
        const cardX = 20;
        const cardY = 60;
        const cardWidth = window.innerWidth - 40;
        const updateButtonWidth = 90;
        const updateButtonHeight = 35;
        const updateButtonX = cardX + cardWidth - updateButtonWidth - 15;
        const updateButtonY = cardY + 25;
        
        if (x >= updateButtonX && x <= updateButtonX + updateButtonWidth && 
            y >= updateButtonY && y <= updateButtonY + updateButtonHeight) {
            console.log('点击了更新报告按钮，跳转到答题页面');
            this.startQuiz();
            return true; // 表示事件已处理
        }
        
        // 检查是否点击了观看广告按钮（动态计算位置）
        const keyInfoY = 145 + 15; // 用户信息结束位置 + 间距
        const adButtonY = keyInfoY + 35; // 钥匙信息中间位置
        if (y >= adButtonY - 20 && y <= adButtonY + 20 && x >= window.innerWidth - 120) {
            this.showAdVideo();
            return true; // 表示事件已处理
        }
        
        // 检查是否点击了报告tab
        if (this.reportTabBounds) {
            for (let tabBound of this.reportTabBounds) {
                if (x >= tabBound.x && x <= tabBound.x + tabBound.width &&
                    y >= tabBound.y && y <= tabBound.y + tabBound.height) {
                    console.log('点击了报告tab:', this.reportTabs[tabBound.index]);
                    this.currentReportTab = tabBound.index;
                    this.render(); // 重新渲染以更新tab显示
                    return true; // 表示事件已处理
                }
            }
        }
        
        // 检查是否点击了"查看更多"按钮
        if (this.moreButtonBounds && 
            x >= this.moreButtonBounds.x && x <= this.moreButtonBounds.x + this.moreButtonBounds.width &&
            y >= this.moreButtonBounds.y && y <= this.moreButtonBounds.y + this.moreButtonBounds.height) {
            this.showMyReports();
            return true; // 表示事件已处理
        }
        
        // 检查是否点击了底部链接
        if (this.footerLinkBounds) {
            for (let linkBound of this.footerLinkBounds) {
                if (x >= linkBound.x && x <= linkBound.x + linkBound.width &&
                    y >= linkBound.y && y <= linkBound.y + linkBound.height) {
                    console.log('点击了底部链接:', linkBound.action);
                    this.handleFooterLinkClick(linkBound.action);
                    return true; // 表示事件已处理
                }
            }
        }
        
        // 没有处理事件，返回false让TabScene处理tab切换
        return false;
    }

    async showAdVideo() {
        try {
            // 获取可观看的广告
            const availableAds = this.adList.filter(ad => ad.canWatch);
            if (availableAds.length === 0) {
                wx.showToast({
                    title: '暂无观看广告',
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

    async startQuiz() {
        try {
            wx.showLoading({
                title: '准备答题中...'
            });
            
            // 清理之前的答题数据
            this.clearPreviousQuizData();
            
            // 调用后端开始答题接口
            const quizResult = await startQuizAPI();
            
            if (quizResult.code === '200' || quizResult.code === 200) {
                if (quizResult.data && quizResult.data.questions) {
                    // 转换后端题目格式为前端需要的格式
                    const convertedQuestions = quizResult.data.questions.map(q => {
                        // 新的选项格式: options 是一个对象 {"A": "选项内容", "B": "选项内容"}
                        let options = [];
                        let optionKeys = [];
                        
                        if (q.options && typeof q.options === 'object') {
                            // 遍历选项对象，提取键值对
                            Object.entries(q.options).forEach(([key, value]) => {
                                optionKeys.push(key); // A, B, C, D
                                options.push(String(value)); // 选项内容
                            });
                        }
                        
                        return {
                            id: q.id,
                            title: String(q.title || ''),
                            content: String(q.content || ''),
                            choices: options, // 选项文本数组
                            optionKeys: optionKeys, // 选项键数组
                            pic: 'images/question-bg.png',
                            category: String(q.category || ''),
                            sortOrder: q.sortOrder || 0
                        };
                    });
                    
                    DataStore.getInstance().quizSession = {
                        questions: convertedQuestions,
                        totalCount: quizResult.data.totalCount || convertedQuestions.length,
                        category: quizResult.data.category,
                        currentIndex: 0,
                        userAnswers: []
                    };
                    
                    console.log('转换后的题目数据:', convertedQuestions);
                }
                
                // 重置Director的答题索引，确保从第一题开始
                const director = DataStore.getInstance().director;
                director.currentIndex = 0;
                console.log('已重置Director答题索引为:', director.currentIndex);
                
                DataStore.getInstance().currentTabScene = director.tabScene;
                wx.hideLoading();
                director.toQuestionScene();
            } else {
                throw new Error(quizResult.msg || '开始答题失败');
            }
        } catch (error) {
            wx.hideLoading();
            console.error('开始答题失败:', error);
            wx.showToast({
                title: error.message || '开始答题失败，请重试',
                icon: 'none'
            });
        }
    }

    /**
     * 显示我的报告详情
     * 当用户点击"我的报告"按钮时调用
     */
    /**
     * 显示完整的报告内容
     */
    /**
     * 显示完整报告内容
     */
    /**
     * 显示完整的报告内容
     */
    async showMyReports() {
        try {
            // 获取完整的报告内容
            const fullReportContent = this.getFullReportContent();
            
            wx.showModal({
                title: '我的完整报告',
                content: fullReportContent,
                showCancel: true,
                cancelText: '关闭',
                confirmText: '分享',
                success: (res) => {
                    if (res.confirm) {
                        // 用户点击了分享按钮
                        this.shareReport();
                    }
                }
            });
            
        } catch (error) {
            console.error('显示报告失败:', error);
            wx.showToast({
                title: '加载报告失败',
                icon: 'error'
            });
        }
    }
    
    /**
     * 获取完整的报告内容
     * @returns {string} 完整的报告内容
     */
    /**
     * 获取完整报告内容
     * @returns {string} 完整报告内容
     */
    /**
     * 获取完整的报告内容（所有tab的内容）
     * @returns {string} 完整的报告内容
     */
    getFullReportContent() {
        if (!this.myReport || !this.myReport.content) {
            return '暂无报告内容';
        }
        
        // 确保报告数据已解析
        if (this.reportTabs.length === 0) {
            this.parseReportData();
        }
        
        if (this.reportTabs.length === 0) {
            return '暂无报告内容';
        }
        
        try {
            // 解析JSON格式的报告数据
            const reportData = typeof this.myReport.content === 'string' 
                ? JSON.parse(this.myReport.content) 
                : this.myReport.content;
            
            // 获取所有tab的完整内容
            let fullContent = '';
            for (let i = 0; i < this.reportTabs.length; i++) {
                const tabName = this.reportTabs[i];
                const tabContent = reportData[tabName] || '';
                
                if (tabContent) {
                    fullContent += `【${tabName}】\n\n${tabContent}\n\n`;
                }
            }
            
            return fullContent || '暂无报告内容';
        } catch (error) {
            console.error('获取完整报告失败:', error);
            // 如果解析失败，回退到原始内容
            return this.myReport.content || '暂无报告内容';
        }
    }
    

    
    /**
     * 格式化报告内容用于显示
     * @param {Object} report - 报告数据
     * @returns {string} 格式化后的报告内容
     */
    formatReportContent(report) {
        let content = '';
        
        if (report.content) {
            // 如果内容太长，截取前200个字符
            content = report.content.length > 200 
                ? report.content.substring(0, 200) + '...'
                : report.content;
        }
        
        // 添加统计信息
        const stats = [];
        if (report.totalCount) {
            stats.push(`总题数: ${report.totalCount}`);
        }
        if (report.completionTime) {
            stats.push(`完成时间: ${report.completionTime}`);
        }
        if (report.viewCount !== undefined) {
            stats.push(`查看次数: ${report.viewCount}`);
        }
        
        if (stats.length > 0) {
            content += '\n\n' + stats.join('\n');
        }
        
        return content || '暂无详细内容';
    }
    
    /**
     * 分享报告
     */
    shareReport() {
        if (!this.myReport) {
            return;
        }
        
        wx.shareAppMessage({
            title: this.myReport.title || '我的同频度报告',
            path: `/pages/report/detail?id=${this.myReport.id}`,
            imageUrl: 'images/share.jpg'
        });
        
        wx.showToast({
            title: '分享成功',
            icon: 'success'
        });
    }
    
    /**
     * 清理之前的答题数据
     * 确保新的答题会话从干净的状态开始
     */
    clearPreviousQuizData() {
        console.log('🧹 开始清理之前的答题数据');
        
        // 清理DataStore中的答题会话数据
        const dataStore = DataStore.getInstance();
        if (dataStore.quizSession) {
            console.log('清理DataStore中的quizSession');
            dataStore.quizSession = null;
        }
        
        // 清理Director中的答题状态
        const director = dataStore.director;
        if (director) {
            console.log('重置Director的currentIndex');
            director.currentIndex = 0;
        }
        
        // 清理微信本地存储中的答题数据
        try {
            wx.removeStorageSync('lastQuizAnswers');
            console.log('已清理本地存储中的lastQuizAnswers');
        } catch (error) {
            console.warn('清理本地存储失败:', error);
        }
        
        // 清理微信云存储中的答题数据（可选，根据需求决定）
        // 注意：这里不清理云存储，因为云存储的数据用于好友排行榜比较
        
        console.log('✅ 答题数据清理完成');
    }

    /**
     * 清理之前的云存储分享数据
     * 在用户登录时调用，确保清除之前的分享数据
     */
    clearPreviousCloudData() {
        console.log('🧹 开始清理之前的云存储分享数据');
        
        try {
            // 清除微信云存储中的所有答题相关数据
            wx.removeUserCloudStorage({
                keyList: ['completeAnswers', 'answers', 'timestamp', 'totalQuestions'],
                success: (res) => {
                    console.log('✅ 云存储数据清理成功:', res);
                },
                fail: (error) => {
                    console.warn('⚠️ 云存储数据清理失败:', error);
                    // 清理失败不影响登录流程，只记录警告
                }
            });
        } catch (error) {
            console.warn('⚠️ 调用wx.removeUserCloudStorage失败:', error);
        }
        
        console.log('✅ 云存储分享数据清理完成');
    }

    /**
     * 绘制下拉刷新指示器
     * @param {number} pullDistance - 下拉距离
     */
    drawPullRefreshIndicator(pullDistance) {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const tabHeight = 100;
        const contentHeight = screenHeight - tabHeight;
        const progress = Math.min(pullDistance / this.pullRefresh.threshold, 1);
        
        // 先重新渲染原有内容，但不包括tab栏区域
        this.ctx.clearRect(0, 0, screenWidth, contentHeight);
        
        // 重新绘制背景内容
        this.drawBackground();
        
        if (!this.isLoggedIn) {
            this.drawLoginInterface();
        } else {
            // 绘制用户头像和信息
            this.drawUserInfo();
            
            // 绘制钥匙信息
            this.drawKeyInfo();
            
            // 绘制功能按钮
            this.drawActionButtons();
            
            // 绘制我的报告
            this.drawMyReports();
        }
        
        // 在顶部绘制下拉刷新指示器
        if (pullDistance > 0) {
            // 绘制下拉背景
            this.ctx.fillStyle = `rgba(240, 240, 240, ${progress * 0.8})`;
            this.ctx.fillRect(0, 0, screenWidth, Math.min(pullDistance, this.pullRefresh.maxPullDistance));
            
            // 绘制刷新图标或文字
            this.ctx.fillStyle = '#666666';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            
            const indicatorY = Math.min(pullDistance, this.pullRefresh.maxPullDistance);
            if (progress >= 1) {
                this.ctx.fillText('松开刷新', screenWidth / 2, indicatorY - 20);
            } else {
                this.ctx.fillText('下拉刷新', screenWidth / 2, indicatorY - 20);
            }
            
            // 绘制进度指示器
            const indicatorSize = 20;
            const centerX = screenWidth / 2;
            const centerY = indicatorY - 40;
            
            if (centerY > 10) { // 确保指示器在可见区域内
                this.ctx.strokeStyle = '#007AFF';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, indicatorSize / 2, 0, 2 * Math.PI * progress);
                this.ctx.stroke();
            }
        }
    }

    /**
     * 触发刷新操作
     */
    async triggerRefresh() {
        if (this.pullRefresh.isRefreshing) {
            return;
        }
        
        this.pullRefresh.isRefreshing = true;
        console.log('🔄 触发个人资料tab下拉刷新');
        
        try {
            // 显示刷新状态
            this.drawRefreshingIndicator();
            
            // 重新加载数据
            await this.loadData();
            
            console.log('✅ 个人资料tab刷新完成');
        } catch (error) {
            console.error('❌ 个人资料tab刷新失败:', error);
        } finally {
            // 延迟一下再隐藏刷新状态，让用户看到刷新完成
            setTimeout(() => {
                this.pullRefresh.isRefreshing = false;
                this.render();
            }, 500);
        }
    }

    /**
     * 绘制刷新中指示器
     */
    drawRefreshingIndicator() {
        const screenWidth = window.innerWidth;
        const indicatorHeight = 60;
        
        // 绘制刷新背景
        this.ctx.fillStyle = 'rgba(240, 240, 240, 0.9)';
        this.ctx.fillRect(0, 0, screenWidth, indicatorHeight);
        
        // 绘制刷新文字
        this.ctx.fillStyle = '#007AFF';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('正在刷新...', screenWidth / 2, indicatorHeight - 20);
        
        // 绘制旋转的加载图标
        const centerX = screenWidth / 2;
        const centerY = 25;
        const radius = 10;
        const rotation = (Date.now() / 100) % (2 * Math.PI);
        
        this.ctx.strokeStyle = '#007AFF';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, rotation, rotation + Math.PI * 1.5);
        this.ctx.stroke();
    }

    /**
     * 强制刷新数据（供外部调用）
     * 重新加载用户信息、钥匙信息、报告数据等
     */
    async forceRefresh() {
        console.log('🔄 强制刷新个人资料tab数据');
        try {
            wx.showLoading({
                title: '刷新中...'
            });
            await this.loadData();
            wx.hideLoading();
            wx.showToast({
                title: '刷新成功',
                icon: 'success',
                duration: 1000
            });
        } catch (error) {
            wx.hideLoading();
            console.error('刷新失败:', error);
            wx.showToast({
                title: '刷新失败',
                icon: 'error'
            });
        }
    }

    /**
      * 绘制底部链接
      */
     drawFooterLinks() {
         const screenWidth = window.innerWidth;
         const screenHeight = window.innerHeight;
         const tabHeight = 100; // 底部tab栏高度
         const linkHeight = 45;
         const linkSpacing = 2;
         const totalLinksHeight = this.footerLinks.length * linkHeight + (this.footerLinks.length - 1) * linkSpacing;
         const startY = screenHeight - tabHeight - totalLinksHeight - 40;
         
         // 绘制底部链接区域背景
         const bgY = startY - 15;
         const bgHeight = totalLinksHeight + 30;
         
         // 背景渐变
         const bgGradient = this.ctx.createLinearGradient(0, bgY, 0, bgY + bgHeight);
         bgGradient.addColorStop(0, '#f8f9fa');
         bgGradient.addColorStop(1, '#ffffff');
         this.ctx.fillStyle = bgGradient;
         this.ctx.fillRect(0, bgY, screenWidth, bgHeight);
         
         // 顶部装饰线
         this.ctx.strokeStyle = '#e9ecef';
         this.ctx.lineWidth = 1;
         this.ctx.beginPath();
         this.ctx.moveTo(0, bgY);
         this.ctx.lineTo(screenWidth, bgY);
         this.ctx.stroke();
         
         // 清空之前的点击区域
         this.footerLinkBounds = [];
         
         // 绘制每个链接
         this.footerLinks.forEach((link, index) => {
             const y = startY + index * (linkHeight + linkSpacing);
             const x = 20;
             const width = screenWidth - 40;
             
             // 存储点击区域
             this.footerLinkBounds.push({
                 x: x,
                 y: y,
                 width: width,
                 height: linkHeight,
                 action: link.action
             });
             
             // 绘制链接卡片背景
             this.ctx.fillStyle = '#ffffff';
             this.ctx.fillRect(x, y, width, linkHeight);
             
             // 绘制卡片阴影
             this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
             this.ctx.fillRect(x + 1, y + 1, width, linkHeight);
             
             // 绘制左侧装饰条
             this.ctx.fillStyle = '#667eea';
             this.ctx.fillRect(x, y, 3, linkHeight);
             
             // 绘制链接图标
             const iconMap = {
                 'userAgreement': '📄',
                 'privacyPolicy': '🔒',
                 'contactUs': '📞',
                 'aboutUs': 'ℹ️'
             };
             
             this.ctx.fillStyle = '#667eea';
             this.ctx.font = '18px Arial';
             this.ctx.textAlign = 'left';
             this.ctx.textBaseline = 'middle';
             this.ctx.fillText(iconMap[link.action] || '📋', x + 15, y + linkHeight/2);
             
             // 绘制链接文字
             this.ctx.fillStyle = '#2c3e50';
             this.ctx.font = '15px Arial';
             this.ctx.fillText(link.name, x + 45, y + linkHeight/2);
             
             // 绘制箭头
             this.ctx.fillStyle = '#bdc3c7';
             this.ctx.font = '18px Arial';
             this.ctx.textAlign = 'right';
             this.ctx.fillText('›', x + width - 15, y + linkHeight/2);
             
             // 绘制分隔线（除了最后一个）
             if (index < this.footerLinks.length - 1) {
                 this.ctx.strokeStyle = '#f1f3f4';
                 this.ctx.lineWidth = 1;
                 this.ctx.beginPath();
                 this.ctx.moveTo(x + 45, y + linkHeight);
                 this.ctx.lineTo(x + width - 15, y + linkHeight);
                 this.ctx.stroke();
             }
         });
     }

    /**
     * 处理底部链接点击
     * @param {string} action - 链接动作
     */
    handleFooterLinkClick(action) {
        switch (action) {
            case 'userAgreement':
                wx.showModal({
                    title: '用户协议',
                    content: '这里是用户协议的内容...',
                    showCancel: false
                });
                break;
            case 'privacyPolicy':
                wx.showModal({
                    title: '隐私政策',
                    content: '这里是隐私政策的内容...',
                    showCancel: false
                });
                break;
            case 'contactUs':
                wx.showModal({
                    title: '联系我们',
                    content: '客服微信：xxx\n客服电话：xxx-xxxx-xxxx\n邮箱：support@example.com',
                    showCancel: false
                });
                break;
            case 'aboutUs':
                wx.showModal({
                    title: '关于我们',
                    content: '这里是关于我们的介绍...',
                    showCancel: false
                });
                break;
            default:
                console.log('未知的链接动作:', action);
        }
    }
}
