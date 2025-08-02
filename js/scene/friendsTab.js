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
        this.refreshTimer = null; // 刷新定时器
        console.log('FriendsTab 构造函数被调用');
    }

    /**
     * 设置用户答案数据（从答题完成后调用）
     * @param {Array} answers - 用户的完整答案数组
     */
    setUserAnswers(answers) {
        this.userAnswers = answers || [];
        console.log('FriendsTab: 接收到用户答案数据:');
        console.log('- 答案总数:', this.userAnswers.length);
        console.log('- 答案详情:', this.userAnswers);
        
        // 验证答案数据结构
        if (this.userAnswers.length > 0) {
            const firstAnswer = this.userAnswers[0];
            console.log('- 第一个答案结构:', firstAnswer);
            console.log('- 是否包含questionId:', !!firstAnswer.questionId);
            console.log('- 是否包含selectedOption:', !!firstAnswer.selectedOption);
        }
        
        // 保存答案到微信云存储
        this.saveAnswersToCloud(answers);
        
        // 如果好友排行榜已经加载，立即更新
        if (this.isDataLoaded && this.openDataContext) {
            this.updateAnswers(answers);
        }
    }

    /**
     * 保存答案到微信云存储
     * @param {Array} answers - 完整的答案数组，包含题目ID和选择信息
     */
    saveAnswersToCloud(answers) {
        if (typeof wx.setUserCloudStorage === 'function' && answers && answers.length > 0) {
            // 确保保存完整的答案数据结构
            const completeAnswersData = {
                answers: answers, // 保存完整的答案对象数组
                timestamp: Date.now(),
                totalQuestions: answers.length,
                version: '1.0' // 添加版本号以便后续兼容性处理
            };
            
            const answersString = JSON.stringify(completeAnswersData);
            const timestamp = Date.now();
            
            console.log('🚀 准备保存到云存储的答案数据:');
             console.log('- 答案总数:', answers.length);
             console.log('- 完整数据结构:', completeAnswersData);
             console.log('- 第一个答案示例:', answers[0]);
             console.log('- 最后一个答案示例:', answers[answers.length - 1]);
             
             wx.setUserCloudStorage({
                 KVDataList: [
                     { key: 'completeAnswers', value: answersString }, // 使用新的key保存完整数据
                     { key: 'answers', value: JSON.stringify(answers.map(a => a.selectedOption)) }, // 保持兼容性
                     { key: 'timestamp', value: timestamp.toString() },
                     { key: 'totalQuestions', value: answers.length.toString() }
                 ],
                 success: () => {
                     console.log('✅ 完整答题记录保存到云存储成功！');
                     console.log('📊 答题记录详情: 共', answers.length, '道题目');
                     console.log('🔍 数据来源: 后端接口getAnswerHistory');
                 },
                fail: (error) => {
                    console.error('答案保存到云存储失败:', error);
                }
            });
        } else {
            console.warn('无法保存答案到云存储：', {
                hasWxFunction: typeof wx.setUserCloudStorage === 'function',
                hasAnswers: !!(answers && answers.length > 0),
                answersLength: answers ? answers.length : 0
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
        
        // 通知开放数据域更新排行榜（不再传递userAnswers，开放域会自己从云存储获取）
        if (this.openDataContext) {
            this.openDataContext.postMessage({
                type: 'similarity',
                action: 'updateSimilarityRanking'
            });
            
            // 延迟一段时间后强制刷新，确保排行榜能及时显示
            setTimeout(() => {
                this.openDataContext.postMessage({
                    type: 'similarity',
                    action: 'forceRefresh'
                });
                console.log('已发送强制刷新消息');
            }, 1000);
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
                
                // 向开放数据域发送显示排行榜的消息（不再传递userAnswers，开放域会自己从云存储获取）
                this.openDataContext.postMessage({
                    type: 'similarity',
                    action: 'showSimilarityRanking'
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
        
        // 启动持续刷新机制，确保开放数据域内容能及时显示
        this.startRefreshLoop();
    }
    
    /**
     * 启动刷新循环，持续更新开放数据域内容
     */
    startRefreshLoop() {
        // 清除之前的刷新循环
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        // 设置定时刷新，每100ms刷新一次
        this.refreshTimer = setInterval(() => {
            if (this.openDataContext && this.openDataContext.canvas) {
                // 清空主域画布
                this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
                
                // 重新绘制开放数据域内容
                this.ctx.drawImage(this.openDataContext.canvas, 0, 0, window.innerWidth, window.innerHeight);
            }
        }, 100);
        
        console.log('开放数据域刷新循环已启动');
    }
    
    /**
     * 停止刷新循环
     */
    stopRefreshLoop() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
            console.log('开放数据域刷新循环已停止');
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
    
    /**
     * 清理资源，停止刷新循环
     */
    destroy() {
        this.stopRefreshLoop();
        console.log('FriendsTab 资源已清理');
    }
}