// 控制游戏逻辑
import HomeScene from './scene/homeScene';
import QuestionScene from './scene/questionScene';
// 移除Question类的导入
// import Question from './player/question';  // 删除这行
import ResultScene from './scene/resultScene';
import DataStore from './base/DataStore';
import TabScene from './scene/tabScene';
import { getAnswerHistory } from './utils/api';
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
    
    showTabScene(ctx) {
        this.tabScene = new TabScene(ctx);
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
            console.log('🏁 已是最后一题，显示结果页面');
            this.showResultScene();
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
        console.log('答题完成，开始获取用户答题记录');
        
        try {
            // 调用后端接口获取用户的完整答题记录
            const response = await getAnswerHistory();
            
            if (response && response.data) {
                 const answerHistory = response.data;
                 console.log('🎯 从后端获取到用户答题记录:');
                 console.log('- 答题记录总数:', answerHistory.length);
                 console.log('- 完整记录数据:', answerHistory);
                 console.log('- 第一条记录:', answerHistory[0]);
                 console.log('- 最后一条记录:', answerHistory[answerHistory.length - 1]);
                
                // 转换答题记录格式以适配好友排行榜
                const userAnswers = answerHistory.map((record, index) => ({
                    questionId: record.questionId,
                    selectedOption: record.answerContent,
                    questionIndex: index,
                    answerTime: record.answerTime,
                    createTime: record.createTime
                }));
                
                console.log('转换后的答案数据:', userAnswers);
                
                // 将完整答案数据传递给好友排行榜
                this.updateFriendsTabWithAnswers(userAnswers);
                
                // 保存答案到本地存储（可选）
                try {
                    wx.setStorageSync('lastQuizAnswers', {
                        answers: userAnswers,
                        timestamp: Date.now(),
                        totalQuestions: userAnswers.length
                    });
                    console.log('完整答案已保存到本地存储');
                } catch (error) {
                    console.error('保存答案到本地存储失败:', error);
                }
            } else {
                console.warn('获取答题记录失败，响应数据为空');
                // 如果接口调用失败，回退到本地数据
                this.handleQuizCompletionFallback();
            }
        } catch (error) {
            console.error('获取答题记录失败:', error);
            // 如果接口调用失败，回退到本地数据
            this.handleQuizCompletionFallback();
        }
    }
    
    /**
     * 答题完成的回退处理（当接口调用失败时使用本地数据）
     */
    handleQuizCompletionFallback() {
        console.log('使用本地数据作为回退方案');
        
        const quizSession = DataStore.getInstance().quizSession;
        if (!quizSession || !quizSession.userAnswers) {
            console.warn('没有找到本地用户答案数据');
            return;
        }
        
        // 提取用户的完整答案数组（包含题目ID和选择的选项）
        const userAnswers = quizSession.userAnswers.map((answer, index) => {
            if (answer && answer.questionId && answer.selectedOption) {
                return {
                    questionId: answer.questionId,
                    selectedOption: answer.selectedOption,
                    selectedIndex: answer.selectedIndex,
                    questionIndex: index
                };
            }
            return null;
        }).filter(answer => answer !== null);
        
        console.log('本地答案数据:', userAnswers);
        console.log('答案总数:', userAnswers.length);
        
        // 将完整答案数据传递给好友排行榜
        this.updateFriendsTabWithAnswers(userAnswers);
    }
    
    /**
     * 更新好友标签页的答案数据
     * @param {Array} userAnswers - 用户答案数组
     */
    updateFriendsTabWithAnswers(userAnswers) {
        try {
            // 获取TabScene实例（隐藏推荐tab后，好友tab索引变为0）
            if (this.tabScene && this.tabScene.tabs && this.tabScene.tabs[0]) {
                const friendsTab = this.tabScene.tabs[0];
                if (friendsTab && typeof friendsTab.setUserAnswers === 'function') {
                    console.log('更新好友标签页答案数据');
                    friendsTab.setUserAnswers(userAnswers);
                } else {
                    console.warn('好友标签页未初始化或缺少setUserAnswers方法');
                }
            } else {
                console.warn('TabScene或好友标签页未初始化');
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
