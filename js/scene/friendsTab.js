import Background from '../runtime/background';
import DataStore from '../base/DataStore';
import { apiRequest } from '../utils/api';

/**
 * 好友排行榜标签页类
 * 负责显示微信好友排行榜和频率相关功能
 */
export default class FriendsTab {
    /**
     * 构造函数
     * @param {CanvasRenderingContext2D} ctx - 画布上下文
     */
    constructor(ctx) {
        this.ctx = ctx;
        this.isDataLoaded = false;
        this.openDataContext = null;
        this.userAnswers = []; // 存储用户答案
        console.log('FriendsTab 构造函数被调用');
    }

    /**
     * 设置用户答案数据（从答题完成后调用）
     * @param {Array} answers - 用户的答案数组
     */
    setUserAnswers(answers) {
        this.userAnswers = answers || [];
        console.log('FriendsTab: 接收到用户答案:', this.userAnswers);
        
        // 保存答案到微信云存储
        this.saveAnswersToCloud(answers);
        
        // 如果好友排行榜已经加载，立即更新
        if (this.isDataLoaded && this.openDataContext) {
            this.updateAnswers(answers);
        }
    }

    /**
     * 保存答案到微信云存储
     * @param {Array} answers - 答案数组
     */
    saveAnswersToCloud(answers) {
        if (typeof wx.setUserCloudStorage === 'function' && answers && answers.length > 0) {
            const answersString = JSON.stringify(answers);
            const timestamp = Date.now();
            
            wx.setUserCloudStorage({
                KVDataList: [
                    { key: 'answers', value: answersString },
                    { key: 'timestamp', value: timestamp.toString() },
                    { key: 'totalQuestions', value: answers.length.toString() }
                ],
                success: () => {
                    console.log('答案保存到云存储成功');
                },
                fail: (error) => {
                    console.error('答案保存到云存储失败:', error);
                }
            });
        }
    }

    /**
     * 更新答案并刷新排行榜
     * @param {Array} answers - 新的答案数组
     */
    updateAnswers(answers) {
        console.log('更新用户答案并刷新排行榜:', answers);
        this.userAnswers = answers;
        
        // 通知开放数据域更新排行榜
        if (this.openDataContext) {
            this.openDataContext.postMessage({
                type: 'similarity',
                action: 'updateSimilarityRanking',
                userAnswers: answers
            });
        }
    }

    /**
     * 加载好友相似度排行榜
     */
    async loadFriends() {
        if (this.isDataLoaded) {
            return;
        }
        console.log('FriendsTab: 开始加载好友相似度排行榜');
        this.isDataLoaded = true;

        try {
            // 获取开放数据域
            if (typeof wx.getOpenDataContext === 'function') {
                this.openDataContext = wx.getOpenDataContext();
                console.log('获取开放数据域成功');
                
                // 向开放数据域发送用户答案和显示排行榜的消息
                this.openDataContext.postMessage({
                    type: 'similarity',
                    action: 'showSimilarityRanking',
                    userAnswers: this.userAnswers
                });
                
                // 显示开放数据域的内容
                this.showOpenDataContext();
            } else {
                console.warn('当前环境不支持开放数据域，显示备用界面');
                this.drawFallbackUI();
            }
        } catch (error) {
            console.error('加载好友相似度排行榜失败:', error);
            this.drawError('加载排行榜失败: ' + error.message);
        }
    }

    /**
     * 显示开放数据域内容
     */
    showOpenDataContext() {
        if (!this.openDataContext) {
            return;
        }

        // 清空主域画布
        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        
        // 获取开放数据域的共享画布
        const sharedCanvas = this.openDataContext.canvas;
        
        if (sharedCanvas) {
            // 将开放数据域的内容绘制到主域
            this.ctx.drawImage(sharedCanvas, 0, 0, window.innerWidth, window.innerHeight);
            console.log('开放数据域内容已绘制到主域');
        }
    }

    /**
     * 绘制备用界面
     */
    drawFallbackUI() {
        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
        
        this.ctx.fillStyle = '#333333';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('好友相似度排行榜', window.innerWidth/2, 100);
        
        this.ctx.fillStyle = '#999999';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('当前环境不支持好友排行榜功能', window.innerWidth/2, window.innerHeight/2);
    }

    /**
     * 绘制错误状态
     * @param {string} message - 错误消息
     */
    drawError(message) {
        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
        
        this.ctx.fillStyle = '#333333';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('好友相似度排行榜', window.innerWidth/2, 100);
        
        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(message, window.innerWidth/2, window.innerHeight/2);
    }

    /**
     * 处理触摸事件
     * @param {number} x - 触摸点 x 坐标
     * @param {number} y - 触摸点 y 坐标
     */
    async handleTouch(x, y) {
        console.log('FriendsTab 触摸事件:', x, y);
        
        // 如果是错误状态，点击重试
        if (!this.isDataLoaded) {
            this.isDataLoaded = false;
            this.loadFriends();
            return;
        }
    }

    /**
     * 渲染方法
     */
    render() {
        if (this.openDataContext) {
            this.showOpenDataContext();
        }
    }
}