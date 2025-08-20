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
     * 使用状态标记机制替代直接调用刷新方法
     */
    async handleQuizCompletion() {
        console.log('答题完成，开始处理用户答案');
        
        // 检查当前是否真的在答题场景中，避免误触发
        const currentCanvas = DataStore.getInstance().currentCanvas;
        const quizSession = DataStore.getInstance().quizSession;
        
        // 只有在答题场景中且确实完成了答题才执行跳转逻辑
        if (currentCanvas !== 'questionCanvas' || !quizSession || !quizSession.isCompleted || quizSession.isProcessed) {
            console.log('非答题场景或未完成答题或已处理过，跳过自动跳转逻辑');
            return;
        }
        
        // 标记为已处理，防止重复触发
        quizSession.isProcessed = true;
        
        // 获取DataStore实例
        const dataStore = DataStore.getInstance();
        
        // 设置答题完成状态标记，触发各Tab的刷新
        dataStore.setQuizCompleted();
        
        // 首先保存用户答案到云存储
        if (quizSession && quizSession.userAnswers) {
            console.log('✅ 获取到用户答案，准备保存到云存储:', quizSession.userAnswers.length, '个答案');
            this.updateFriendsTabWithAnswers(quizSession.userAnswers);
        } else {
            console.warn('⚠️ 未找到用户答案数据，无法保存到云存储');
        }
        
        // 隐藏之前的加载提示
        wx.hideLoading();
        
        // 显示简单的完成提示，然后直接跳转
        wx.showToast({
            title: '🎉 答题完成！正在跳转到我的报告...',
            icon: 'success',
            duration: 2000
        });
        
        // 延迟跳转，让用户看到完成提示
        setTimeout(() => {
            this.goToMyTab(); // 直接跳转，不再手动触发刷新
        }, 2000);
    }

    /**
     * 显示答题完成提示弹框
     * 点击后跳转到我的tab
     */
    showWaitingDialog() {
        wx.showModal({
            title: '🎉 答题完成',
            content: `恭喜您完成了所有题目！\n\n您的个性化答题报告正在生成中...\n\n💡 点击确定查看您的答题记录和报告`,
            showCancel: false,
            confirmText: '查看我的报告',
            confirmColor: '#007AFF',
            success: (res) => {
                if (res.confirm) {
                    // 点击后跳转到我的tab（profileTab）
                    this.goToMyTab();
                }
            }
        });
    }
    
    /**
     * 跳转到我的tab
     */
    goToMyTab() {
        console.log('跳转到我的tab');
        
        // 清理当前画布
        let ctx = DataStore.getInstance().ctx;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        
        // 跳转到tab场景并切换到我的tab（索引为2）
        if (this.tabScene) {
            this.tabScene.switchTab(2); // 我的tab通常是索引2
            this.tabScene.resume();
        } else {
            this.showTabScene(ctx);
            if (this.tabScene) {
                this.tabScene.switchTab(2);
            }
        }
        
        // 设置当前画布
        DataStore.getInstance().currentCanvas = 'tabScene';
        
        console.log('已跳转到我的tab');
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
                
                // 延迟调用showMyReports，确保TabScene已经完全初始化
                setTimeout(() => {
                    if (this.tabScene) {
                        const profileTab = this.tabScene.getTab(2);
                        if (profileTab && typeof profileTab.showMyReports === 'function') {
                            profileTab.showMyReports();
                        }
                    }
                }, 100);
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
            // 首先直接保存答案到云存储
            this.saveAnswersDirectlyToCloud(userAnswers);
            
            // 然后尝试更新好友标签页（如果已初始化）
            if (this.tabScene) {
                // 确保好友标签页被创建
                const friendsTab = this.tabScene.getTab(0);
                if (friendsTab && typeof friendsTab.setUserAnswers === 'function') {
                    console.log('✅ 更新好友标签页答案数据');
                    friendsTab.setUserAnswers(userAnswers);
                } else {
                    console.warn('好友标签页未初始化或缺少setUserAnswers方法，但答案已直接保存到云存储');
                }
            } else {
                console.warn('TabScene未初始化，但答案已直接保存到云存储');
            }
        } catch (error) {
            console.error('更新好友标签页答案失败:', error);
        }
    }
    
    /**
     * 直接保存答案到云存储
     * @param {Array} userAnswers - 用户答案数组
     */
    saveAnswersDirectlyToCloud(userAnswers) {
        if (userAnswers && userAnswers.length > 0) {
            // 确保保存完整的答案数据结构
            const completeAnswersData = {
                answers: userAnswers, // 保存完整的答案对象数组
                timestamp: Date.now(),
                totalQuestions: userAnswers.length,
                version: '1.0' // 添加版本号以便后续兼容性处理
            };
            
            console.log('🚀 Director直接保存到云存储的答案数据:');
            console.log('- 答案总数:', userAnswers.length);
            console.log('- 完整数据结构:', completeAnswersData);
            console.log('- 第一个答案示例:', userAnswers[0]);
            console.log('- 最后一个答案示例:', userAnswers[userAnswers.length - 1]);
            
            // 通过开放数据域保存云存储数据
            const openDataContext = wx.getOpenDataContext();
            if (openDataContext) {
                console.log('📤 Director通过开放数据域保存云存储数据');
                openDataContext.postMessage({
                    type: 'saveUserAnswers',
                    data: {
                        completeAnswers: JSON.stringify(completeAnswersData),
                        answers: JSON.stringify(userAnswers.map(a => a.selectedOption)),
                        timestamp: Date.now().toString(),
                        totalQuestions: userAnswers.length.toString()
                    }
                });
            } else {
                console.warn('⚠️ Director无法获取开放数据域实例');
            }
        } else {
            console.warn('Director无法保存答案到云存储：', {
                hasAnswers: !!(userAnswers && userAnswers.length > 0),
                answersLength: userAnswers ? userAnswers.length : 0
            });
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
            // 设置当前tab为"我的"页面（ProfileTab的正确索引为2）
            this.tabScene.currentTab = 2;
            this.tabScene.resume();
        } else {
            this.showTabScene(ctx);
            // 设置默认显示"我的"页面（ProfileTab的正确索引为2）
            if (this.tabScene) {
                this.tabScene.currentTab = 2;
            }
        }
        
        // 更新当前画布状态
        DataStore.getInstance().currentCanvas = 'tabScene';
        
        console.log('返回到TabScene完成，当前tab:', this.tabScene?.currentTab);
    }
}
