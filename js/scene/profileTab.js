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
            
            // 绘制功能按钮
            this.drawActionButtons();
            
            // 绘制我的报告
            this.drawMyReports();
        }
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
        
        // 绘制标题和退出按钮
        this.ctx.fillStyle = '#333333';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('我的', window.innerWidth/2, 50);
        
        // 绘制退出登录按钮
        this.ctx.fillStyle = '#ff4444';
        this.ctx.fillRect(window.innerWidth - 80, 20, 60, 30);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('退出', window.innerWidth - 50, 38);
        
        // 绘制用户头像区域
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(20, 70, window.innerWidth - 40, 80);
        
        // 绘制头像占位符
        this.ctx.fillStyle = '#cccccc';
        this.ctx.fillRect(40, 85, 50, 50);
        
        // 绘制用户信息
        this.ctx.fillStyle = '#333333';
        this.ctx.font = '18px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(this.userInfo.nickName || '用户', 110, 105);
        
        this.ctx.fillStyle = '#666666';
        this.ctx.font = '14px Arial';
        this.ctx.fillText('已登录', 110, 125);
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

    /**
     * 绘制我的报告按钮
     * 显示一个可点击的按钮，点击后展示报告详情
     */
    drawMyReports() {
        const startY = 320;
        const buttonHeight = 50;
        
        // 绘制我的报告按钮
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(20, startY, window.innerWidth - 40, buttonHeight);
        
        // 绘制按钮边框
        this.ctx.strokeStyle = '#45a049';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(20, startY, window.innerWidth - 40, buttonHeight);
        
        // 绘制按钮文字
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('我的报告', window.innerWidth/2, startY + buttonHeight/2);
        
        // 如果有报告数据，显示提示信息
        if (this.myReport) {
            this.ctx.fillStyle = '#666666';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText('点击查看您的最新报告', window.innerWidth/2, startY + buttonHeight + 10);
        } else {
            this.ctx.fillStyle = '#999999';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText('暂无报告，快去答题吧！', window.innerWidth/2, startY + buttonHeight + 10);
        }
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
        
        // 检查是否点击了观看广告按钮
        if (y >= 170 && y <= 210 && x >= window.innerWidth - 120) {
            this.showAdVideo();
            return true; // 表示事件已处理
        }
        
        // 检查是否点击了开始答题按钮
        if (y >= 240 && y <= 280 && x >= 20 && x <= window.innerWidth - 20) {
            this.startQuiz();
            return true; // 表示事件已处理
        }
        
        // 检查是否点击了我的报告按钮
        if (y >= 320 && y <= 370 && x >= 20 && x <= window.innerWidth - 20) {
            this.showMyReports();
            return true; // 表示事件已处理
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
    async showMyReports() {
        try {
            if (!this.myReport) {
                wx.showToast({
                    title: '暂无报告数据',
                    icon: 'none'
                });
                return;
            }
            
            // 显示报告详情弹窗
            const reportContent = this.formatReportContent(this.myReport);
            
            wx.showModal({
                title: this.myReport.title || '我的报告',
                content: reportContent,
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
}
