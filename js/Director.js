// 控制游戏逻辑
import HomeScene from './scene/homeScene';
import QuestionScene from './scene/questionScene';
// 移除Question类的导入
// import Question from './player/question';  // 删除这行
import ResultScene from './scene/resultScene';
import DataStore from './base/DataStore';
import TabScene from './scene/tabScene';
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
    nextQuestionScene () {
        const quizSession = DataStore.getInstance().quizSession;
        const totalQuestions = quizSession ? quizSession.questions.length : 10;
        
        if (this.currentIndex === totalQuestions - 1) {
            this.showResultScene();
            return;
        }
        this.currentIndex++;
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
    handleQuizCompletion() {
        console.log('答题完成，开始处理用户答案');
        
        const quizSession = DataStore.getInstance().quizSession;
        if (!quizSession || !quizSession.userAnswers) {
            console.warn('没有找到用户答案数据');
            return;
        }
        
        // 提取用户的答案数组（只保留选择的选项）
        const userAnswers = quizSession.userAnswers.map(answer => {
            return answer ? answer.selectedOption : null;
        }).filter(answer => answer !== null);
        
        console.log('用户完整答案:', userAnswers);
        
        // 将答案传递给好友排行榜
        this.updateFriendsTabWithAnswers(userAnswers);
        
        // 保存答案到本地存储（可选）
        try {
            wx.setStorageSync('lastQuizAnswers', {
                answers: userAnswers,
                timestamp: Date.now(),
                totalQuestions: userAnswers.length
            });
            console.log('答案已保存到本地存储');
        } catch (error) {
            console.error('保存答案到本地存储失败:', error);
        }
    }
    
    /**
     * 更新好友标签页的答案数据
     * @param {Array} userAnswers - 用户答案数组
     */
    updateFriendsTabWithAnswers(userAnswers) {
        try {
            // 获取TabScene实例
            if (this.tabScene && this.tabScene.tabs && this.tabScene.tabs[1]) {
                const friendsTab = this.tabScene.tabs[1];
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
            // 设置当前tab为"我的"页面
            this.tabScene.currentTab = 2;
            this.tabScene.resume();
        } else {
            this.showTabScene(ctx);
            // 设置默认显示"我的"页面
            if (this.tabScene) {
                this.tabScene.currentTab = 2;
            }
        }
        
        // 更新当前画布状态
        DataStore.getInstance().currentCanvas = 'tabScene';
        
        console.log('返回到TabScene完成，当前tab:', this.tabScene?.currentTab);
    }
}
