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
            this.openDataContext = wx.getOpenDataContext();
            if (this.openDataContext) {
                console.log('✅ 成功获取开放数据域');
                
                // 监听开放数据域的消息
                wx.onMessage && wx.onMessage((data) => {
                    if (data.type === 'refresh') {
                        console.log('📨 收到开放数据域刷新请求');
                        this.showOpenDataContext();
                    }
                });
                
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
            console.warn('⚠️ 开放数据域不存在，显示备用界面');
            this.drawTestContent();
            return;
        }

        // 只清空内容区域，保留底部tab栏（高度100px）
        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight - 100);
        
        // 获取开放数据域的共享画布
        const sharedCanvas = this.openDataContext.canvas;
        
        if (sharedCanvas) {
            console.log('📱 开放数据域画布信息:');
            console.log('- 画布宽度:', sharedCanvas.width);
            console.log('- 画布高度:', sharedCanvas.height);
            console.log('- 目标区域:', window.innerWidth, 'x', window.innerHeight - 100);
            
            try {
                // 计算正确的缩放比例
                const targetWidth = window.innerWidth;
                const targetHeight = window.innerHeight - 100;
                
                // 尝试多种绘制方式
                // 方式1：直接绘制整个画布
                this.ctx.drawImage(sharedCanvas, 0, 0);
                console.log('✅ 方式1：直接绘制整个画布');
                
                // 方式2：按比例缩放绘制
                // this.ctx.drawImage(sharedCanvas, 0, 0, sharedCanvas.width, sharedCanvas.height, 0, 0, targetWidth, targetHeight);
                // console.log('✅ 方式2：按比例缩放绘制');
                
            } catch (error) {
                console.error('❌ 绘制开放数据域失败:', error);
                this.drawTestContent();
            }
            
            // 强制刷新画布
            this.ctx.save();
            this.ctx.restore();
            
            // 添加调试边框确认绘制区域
            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(5, 5, window.innerWidth - 10, window.innerHeight - 110);
            console.log('🔴 绘制红色调试边框');
            
        } else {
            console.error('❌ 无法获取开放数据域的共享画布');
            this.drawTestContent();
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
        
        let refreshCount = 0;
        
        // 设置定时刷新，每100ms刷新一次
        this.refreshTimer = setInterval(() => {
            if (this.openDataContext && this.openDataContext.canvas) {
                refreshCount++;
                
                // 每10次刷新输出一次调试信息
                if (refreshCount % 10 === 1) {
                    console.log(`🔄 刷新开放数据域 #${refreshCount}`);
                    console.log('- 画布存在:', !!this.openDataContext.canvas);
                    console.log('- 画布尺寸:', this.openDataContext.canvas.width, 'x', this.openDataContext.canvas.height);
                }
                
                // 只清空内容区域，保留底部tab栏（高度100px）
                this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight - 100);
                
                // 重新绘制开放数据域内容，但不覆盖底部tab栏
                this.ctx.drawImage(this.openDataContext.canvas, 0, 0, window.innerWidth, window.innerHeight - 100, 0, 0, window.innerWidth, window.innerHeight - 100);
                
                // 强制刷新主画布
                this.ctx.save();
                this.ctx.restore();
            } else {
                console.warn('⚠️ 开放数据域或画布不可用');
            }
        }, 100);
        
        console.log('✅ 开放数据域刷新循环已启动');
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
     * 绘制测试内容（用于调试画布显示）
     */
    drawTestContent() {
        console.log('🎨 绘制测试内容到主域画布');
        
        // 清空画布
        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight - 100);
        
        // 绘制背景
        this.ctx.fillStyle = '#000080';
        this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight - 100);
        
        // 绘制测试标题
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🏆 好友排行榜', window.innerWidth / 2, 40);
        
        // 绘制测试好友条目
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('1. canon', 20, 80);
        
        // 绘制测试相似度
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText('100%', window.innerWidth - 20, 80);
        
        // 绘制测试头像占位符
        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.beginPath();
        this.ctx.arc(60, 75, 15, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // 绘制调试信息
        this.ctx.fillStyle = '#ffff00';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('测试内容 - 如果能看到这个说明主域画布正常', window.innerWidth / 2, window.innerHeight - 130);
        
        console.log('✅ 测试内容绘制完成');
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
        
        // 不阻止事件传播，让TabScene处理tab切换
        return false;
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