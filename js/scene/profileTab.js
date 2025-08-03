import Background from '../runtime/background';
import DataStore from '../base/DataStore';
import QuestionScene from './questionScene';
import { apiRequest, userLogin, startQuiz as startQuizAPI, submitAnswer } from '../utils/api';
import { login, createUserInfoButton } from '../utils/auth';

export default class ProfileTab {
    constructor(ctx) {
        this.ctx = ctx;
        this.userInfo = null;
        this.keyInfo = null;
        this.reports = [];
        this.adList = [];
        this.isLoggedIn = false;
        this.loginButton = null;
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
            // 如果是token失效，清除登录状态
            if (error.message.includes('token') || error.message.includes('登录')) {
                this.logout();
            }
        }
    }

    render() {
        const background = new Background(this.ctx);
        
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
            
            // 调用后端登录接口
            const loginResult = await userLogin(loginRes.code, userInfoRes.userInfo);
            
            if (loginResult.code === '200' || loginResult.code === 200) {
                // 保存用户信息和token
                const userInfo = {
                    ...userInfoRes.userInfo,
                    token: loginResult.data.token,
                    userId: loginResult.data.userId
                };
                
                wx.setStorageSync('userInfo', userInfo);
                DataStore.getInstance().userInfo = userInfo;
                
                this.isLoggedIn = true;
                this.userInfo = userInfo;
                
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
        if (y >= 300 && y <= 340 && x >= 20 && x <= window.innerWidth - 20) {
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
                
                DataStore.getInstance().currentTabScene = DataStore.getInstance().director.tabScene;
                wx.hideLoading();
                DataStore.getInstance().director.toQuestionScene();
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

    showMyReports() {
        // 显示完整的报告列表
        console.log('显示我的报告列表');
    }
}
