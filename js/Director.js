// 控制游戏逻辑
import HomeScene from './scene/homeScene';
import QuestionScene from './scene/questionScene';
// 移除Question类的导入
// import Question from './player/question';  // 删除这行
import ResultScene from './scene/resultScene';
import DataStore from './base/DataStore';
import TabScene from './scene/tabScene';
import { getAnswerHistory, getFriendsList, getFrequencyReport, getMyReport } from './utils/api';
const screenWidth = window.innerWidth;
const screenHeight = window.innerHeight;
const ratio = wx.getSystemInfoSync().pixelRatio;
export default class Director {
    constructor (ctx) {
        this.currentIndex = 0;
        this.ctx = ctx; // 主屏的ctx
    }
    static getInstance () {
        if (!Director.instance) {
            Director.instance = new Director();
        }
        return Director.instance;
    }

    run(ctx) {
        // 直接显示TabScene，不检查登录状态
        this.showTabScene(ctx);
        // 移除预加载问题图片的代码
        // Question.getInstance();  // 删除这行
    }

    // 注释掉或删除checkUserLogin方法
    // async checkUserLogin() {
    //     const userInfo = wx.getStorageSync('userInfo');
    //     if (!userInfo || !userInfo.token) {
    //         throw new Error('用户未登录');
    //     }
    //     DataStore.getInstance().userInfo = userInfo;
    // }
    
    /**
     * 显示Tab场景
     * 游戏的主界面
     */
    showTabScene(ctx) {
        console.log('创建TabScene');
        this.tabScene = new TabScene(ctx);
        
        // 确保TabScene正确初始化并显示
        if (this.tabScene) {
            console.log('TabScene创建成功，当前tab:', this.tabScene.currentTab);
        }
    }
    // 首页场景
    showHomeScene (ctx) {
        this.homeScene = new HomeScene(ctx);
    }

    /**
     * 显示答题场景
     * 确保Director和quizSession的currentIndex保持同步
     */
    toQuestionScene () {
        let ctx = DataStore.getInstance().ctx;
        this.offScreenCanvas = wx.createCanvas();

        this.offScreenCanvas.width = screenWidth * ratio;
        this.offScreenCanvas.height = screenHeight * ratio;
        let questionCtx = this.offScreenCanvas.getContext('2d');
        questionCtx.scale(ratio, ratio);
        let scales = screenWidth / 750;
        questionCtx.scale(scales, scales);

        DataStore.getInstance().offScreenCanvas = this.offScreenCanvas;
        ctx.clearRect(0, 0, screenWidth * ratio, screenHeight * ratio);
        
        // 只使用从后端获取的题目数据
        const quizSession = DataStore.getInstance().quizSession;
        if (quizSession && quizSession.questions && quizSession.questions.length > 0) {
            // 🔧 确保quizSession.currentIndex与Director.currentIndex同步
            quizSession.currentIndex = this.currentIndex;
            
            console.log('🎯 创建题目场景:', {
                directorIndex: this.currentIndex,
                quizSessionIndex: quizSession.currentIndex,
                questionId: quizSession.questions[this.currentIndex].id,
                totalQuestions: quizSession.questions.length
            });
            
            this.questionScene = new QuestionScene(questionCtx, quizSession.questions[this.currentIndex], this.currentIndex);
        } else {
            console.error('没有找到后端题目数据，无法开始答题');
            wx.showToast({
                title: '题目加载失败',
                icon: 'none'
            });
            return;
        }

        ctx.drawImage(this.offScreenCanvas, 0, 0, screenWidth, screenHeight);
        DataStore.getInstance().currentCanvas = 'questionCanvas';
    }
    // 问题场景
    // 修改 nextQuestionScene 方法
    /**
     * 切换到下一题
     * 确保索引正确更新
     */
    nextQuestionScene () {
        const quizSession = DataStore.getInstance().quizSession;
        const totalQuestions = quizSession ? quizSession.questions.length : 10;
        
        console.log('⏭️ 准备切换到下一题:', {
            currentIndex: this.currentIndex,
            totalQuestions: totalQuestions,
            isLastQuestion: this.currentIndex === totalQuestions - 1
        });
        
        if (this.currentIndex === totalQuestions - 1) {
            console.log('🏁 已是最后一题，等待答题完成处理');
            // 不再直接跳转到结果页面，而是等待prepareQuizCompletion调用handleQuizCompletion
            return;
        }
        
        this.currentIndex++;
        console.log('📈 索引已更新为:', this.currentIndex);
        
        if (this.offScreenCanvas) {
            this.offScreenCanvas = null;
        }
        this.toQuestionScene();
    }
    // 结果场景
    // 结果场景
    showResultScene () {
        // 答题完成，处理用户答案
        this.handleQuizCompletion();
        
        this.resultCanvas = wx.createCanvas();
        let resultCtx = this.resultCanvas.getContext('2d');
        this.resultCanvas.width = screenWidth * ratio;
        this.resultCanvas.height = screenHeight * ratio;
        let scales = screenWidth / 750;
        resultCtx.scale(ratio, ratio);
    
        resultCtx.scale(scales, scales);
    
        DataStore.getInstance().resultCanvas = this.resultCanvas;
        new ResultScene(resultCtx);
    
        DataStore.getInstance().currentCanvas = 'resultCanvas';
    }
    
    /**
     * 处理答题完成后的逻辑
     * 将用户答案传递给好友排行榜
     */
    /**
     * 处理答题完成逻辑
     * 从后端获取用户的完整答题记录
     */
    async handleQuizCompletion() {
        console.log('答题完成，开始获取好友列表和同频度报告');
        
        try {
            wx.showLoading({
                title: '正在处理答题记录，请耐心等待...',
                mask: true
            });
            
            // 获取好友列表
            const friendsResponse = await getFriendsList();
            
            if (friendsResponse && friendsResponse.data && friendsResponse.data.length > 0) {
                console.log('获取到好友列表:', friendsResponse.data);
                
                // 获取第一个好友
                const firstFriend = friendsResponse.data[0];
                console.log('第一个好友信息:', firstFriend);
                
                try {
                    // 检查好友是否有报告
                    if (firstFriend.hasReport && firstFriend.reportId) {
                        // 获取与第一个好友的同频度报告
                        const frequencyResponse = await getFrequencyReport(firstFriend.reportId);
                        
                        if (frequencyResponse && frequencyResponse.data) {
                            console.log('获取到同频度报告:', frequencyResponse.data);
                            wx.hideLoading();
                            
                            // 显示同频度报告
                            this.showFrequencyReport(frequencyResponse.data, firstFriend);
                            return;
                        }
                    } else {
                        console.log('好友没有同频度报告');
                    }
                } catch (frequencyError) {
                    console.log('获取同频度报告失败:', frequencyError);
                }
            }
            
            // 如果没有好友或获取同频度报告失败，跳转到我的报告页面
            console.log('没有好友或获取同频度报告失败，跳转到我的报告页面');
            wx.hideLoading();
            this.showMyReportPage();
            
        } catch (error) {
            console.error('获取好友信息失败:', error);
            wx.hideLoading();
            wx.showToast({
                title: '网络连接超时，正在为您跳转到个人报告',
                icon: 'none',
                duration: 2000
            });
            // 延迟跳转到我的报告页面
            setTimeout(() => {
                this.showMyReportPage();
            }, 2000);
        }
    }
    
    /**
     * 显示同频度报告
     * @param {Object} reportData 同频度报告数据
     * @param {Object} friendInfo 好友信息
     */
    showFrequencyReport(reportData, friendInfo) {
        console.log('显示同频度报告:', reportData, friendInfo);
        
        // 显示同频度报告弹窗
        wx.showModal({
            title: `与${friendInfo.nickname || '好友'}的同频度`,
            content: `同频度: ${reportData.frequency || 0}%\n相同答案数: ${reportData.sameAnswers || 0}\n总题目数: ${reportData.totalQuestions || 0}`,
            showCancel: true,
            cancelText: '返回',
            confirmText: '查看详情',
            success: (res) => {
                if (res.confirm) {
                    // 用户点击查看详情，可以跳转到详细报告页面
                    this.showDetailedFrequencyReport(reportData, friendInfo);
                } else {
                    // 用户点击返回，跳转到我的报告页面
                    this.showMyReportPage();
                }
            }
        });
    }
    
    /**
     * 显示详细的同频度报告
     * @param {Object} reportData 同频度报告数据
     * @param {Object} friendInfo 好友信息
     */
    showDetailedFrequencyReport(reportData, friendInfo) {
        // 这里可以实现详细报告页面的显示逻辑
        console.log('显示详细同频度报告');
        // 暂时跳转到我的报告页面
        this.showMyReportPage();
    }
    
    /**
     * 显示我的报告页面
     */
    async showMyReportPage() {
        try {
            wx.showLoading({
                title: '正在加载个人报告，请稍候...',
                mask: true
            });
            
            const myReportResponse = await getMyReport();
            
            if (myReportResponse && myReportResponse.data) {
                console.log('获取到我的报告:', myReportResponse.data);
                wx.hideLoading();
                
                // 跳转到我的报告页面（ProfileTab）
                this.backToTabScene();
                
                // 设置当前tab为我的页面并显示报告
                if (this.tabScene) {
                    this.tabScene.currentTab = 1; // 我的页面
                    const profileTab = this.tabScene.getTab(1);
                    if (profileTab && typeof profileTab.showMyReports === 'function') {
                        profileTab.showMyReports();
                    }
                }
            } else {
                wx.hideLoading();
                wx.showToast({
                    title: '暂无报告数据',
                    icon: 'none'
                });
                this.backToTabScene();
            }
        } catch (error) {
            console.error('获取我的报告失败:', error);
            wx.hideLoading();
            wx.showToast({
                title: '网络连接超时，获取个人报告失败，请稍后重试',
                icon: 'none',
                duration: 3000
            });
            this.backToTabScene();
        }
    }
    
    /**
     * 更新好友标签页的答案数据
     * @param {Array} userAnswers - 用户答案数组
     */
    updateFriendsTabWithAnswers(userAnswers) {
        try {
            // 获取TabScene实例（隐藏推荐tab后，好友tab索引变为0）
            if (this.tabScene) {
                // 确保好友标签页被创建
                const friendsTab = this.tabScene.getTab(0);
                if (friendsTab && typeof friendsTab.setUserAnswers === 'function') {
                    console.log('✅ 更新好友标签页答案数据');
                    friendsTab.setUserAnswers(userAnswers);
                } else {
                    console.warn('好友标签页未初始化或缺少setUserAnswers方法');
                }
            } else {
                console.warn('TabScene未初始化');
            }
        } catch (error) {
            console.error('更新好友标签页答案失败:', error);
        }
    }

    // 添加返回TabScene的方法
    backToTabScene() {
        // 清理当前场景
        if (this.offScreenCanvas) {
            this.offScreenCanvas = null;
        }
        
        // 重置答题索引
        this.currentIndex = 0;
        
        // 清除微信的触摸事件监听
        wx.offTouchStart();
        
        // 清除画布
        let ctx = DataStore.getInstance().ctx;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        
        // 恢复TabScene
        if (this.tabScene) {
            // 设置当前tab为"我的"页面（隐藏推荐tab后，索引变为1）
            this.tabScene.currentTab = 1;
            this.tabScene.resume();
        } else {
            this.showTabScene(ctx);
            // 设置默认显示"我的"页面（隐藏推荐tab后，索引变为1）
            if (this.tabScene) {
                this.tabScene.currentTab = 1;
            }
        }
        
        // 更新当前画布状态
        DataStore.getInstance().currentCanvas = 'tabScene';
        
        console.log('返回到TabScene完成，当前tab:', this.tabScene?.currentTab);
    }
}
