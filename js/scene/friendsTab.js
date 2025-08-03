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
        this.loadingTimer = null; // 加载动画定时器
        
        // 下拉刷新相关属性
        this.pullRefresh = {
            startY: 0,
            currentY: 0,
            isPulling: false,
            isRefreshing: false,
            threshold: 80, // 下拉阈值
            maxPullDistance: 120 // 最大下拉距离
        };
        
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
                
                // 延迟一下再显示开放数据域内容，确保数据已加载
                setTimeout(() => {
                    this.render(); // 重新渲染，这次会显示开放数据域内容
                }, 100);
            } else {
                console.warn('当前环境不支持开放数据域，显示备用界面');
                // 停止加载动画
                this.stopLoadingAnimation();
                // 重新渲染，这次会显示备用界面
                this.render();
            }
        } catch (error) {
            console.error('加载好友相似度排行榜失败:', error);
            // 停止加载动画
            this.stopLoadingAnimation();
            // 显示错误信息
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
                
                // 只在内容区域绘制，不覆盖tab栏
                this.ctx.drawImage(sharedCanvas, 0, 0, sharedCanvas.width, sharedCanvas.height, 0, 0, targetWidth, targetHeight);
                console.log('✅ 按比例缩放绘制到内容区域');
                
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
                
                // 确保tab栏始终显示 - 通知TabScene重新绘制tab栏
                const dataStore = DataStore.getInstance();
                if (dataStore.currentTabScene && typeof dataStore.currentTabScene.drawTabBar === 'function') {
                    dataStore.currentTabScene.drawTabBar();
                }
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
    /**
     * 绘制备用界面
     * 避免覆盖底部tab栏
     */
    drawFallbackUI() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const tabHeight = 100;
        const contentHeight = screenHeight - tabHeight;
        
        // 只清除内容区域，不清除tab栏
        this.ctx.clearRect(0, 0, screenWidth, contentHeight);
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, screenWidth, contentHeight);
        
        this.ctx.fillStyle = '#333333';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('好友相似度排行榜', screenWidth/2, 100);
        
        this.ctx.fillStyle = '#999999';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('当前环境不支持好友排行榜功能', screenWidth/2, contentHeight/2);
    }

    /**
     * 绘制错误状态
     * 避免覆盖底部tab栏
     * @param {string} message - 错误消息
     */
    drawError(message) {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const tabHeight = 100;
        const contentHeight = screenHeight - tabHeight;
        
        // 只清除内容区域，不清除tab栏
        this.ctx.clearRect(0, 0, screenWidth, contentHeight);
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, screenWidth, contentHeight);
        
        this.ctx.fillStyle = '#333333';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('好友相似度排行榜', screenWidth/2, 100);
        
        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(message, window.innerWidth/2, window.innerHeight/2);
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

    /**
     * 处理触摸事件（兼容原有接口）
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
        // 如果还没有加载过数据，显示加载界面
        if (!this.isDataLoaded) {
            this.drawLoadingUI();
            return;
        }
        
        // 如果有开放数据域，显示开放数据域内容
        if (this.openDataContext) {
            this.showOpenDataContext();
        } else {
            // 否则显示备用界面
            this.drawFallbackUI();
        }
    }
    
    /**
     * 绘制加载界面
     */
    drawLoadingUI() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const contentHeight = screenHeight - 100; // 减去底部tab栏高度
        
        // 清空画布（除了底部tab栏）
        this.ctx.clearRect(0, 0, screenWidth, contentHeight);
        
        // 绘制背景
        this.ctx.fillStyle = '#f5f5f5';
        this.ctx.fillRect(0, 0, screenWidth, contentHeight);
        
        // 绘制标题
        this.ctx.fillStyle = '#333333';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('好友排行榜', screenWidth / 2, 60);
        
        // 绘制加载提示
        this.ctx.fillStyle = '#666666';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('正在加载好友数据...', screenWidth / 2, contentHeight / 2);
        
        // 绘制加载动画（简单的点点点）
        const dots = Math.floor(Date.now() / 500) % 4;
        const loadingText = '加载中' + '.'.repeat(dots);
        this.ctx.fillStyle = '#999999';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(loadingText, screenWidth / 2, contentHeight / 2 + 40);
        
        // 启动加载动画定时器（如果还没有启动）
        if (!this.loadingTimer) {
            this.loadingTimer = setInterval(() => {
                // 检查是否应该停止加载动画
                if (this.isDataLoaded && this.openDataContext) {
                    // 数据加载完成，停止动画并重新渲染
                    this.stopLoadingAnimation();
                    this.render();
                } else if (!this.isDataLoaded) {
                    // 还在加载中，继续显示加载动画
                    this.drawLoadingUI();
                }
                // 如果isDataLoaded为true但openDataContext为null，说明加载失败，保持当前状态
            }, 500);
        }
    }
    
    /**
     * 停止加载动画
     */
    stopLoadingAnimation() {
        if (this.loadingTimer) {
            clearInterval(this.loadingTimer);
            this.loadingTimer = null;
        }
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
        if (this.isDataLoaded && this.openDataContext) {
            // 如果有开放数据域，重新绘制
            const sharedCanvas = this.openDataContext.canvas;
            if (sharedCanvas) {
                this.ctx.drawImage(sharedCanvas, 0, 0, screenWidth, contentHeight, 0, 0, screenWidth, contentHeight);
            }
        } else if (this.isDataLoaded) {
            // 绘制备用界面背景
            this.ctx.fillStyle = '#f0f0f0';
            this.ctx.fillRect(0, 0, screenWidth, contentHeight);
            
            this.ctx.fillStyle = '#333333';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('好友相似度排行榜', screenWidth/2, 100);
        } else {
            // 绘制加载界面背景
            this.ctx.fillStyle = '#f5f5f5';
            this.ctx.fillRect(0, 0, screenWidth, contentHeight);
            
            this.ctx.fillStyle = '#333333';
            this.ctx.font = 'bold 20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('好友排行榜', screenWidth / 2, 60);
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
        console.log('🔄 触发好友tab下拉刷新');
        
        try {
            // 显示刷新状态
            this.drawRefreshingIndicator();
            
            // 重新加载数据
            this.isDataLoaded = false;
            await this.loadFriends();
            
            // 如果有用户答案，重新更新
            if (this.userAnswers && this.userAnswers.length > 0) {
                this.updateAnswers(this.userAnswers);
            }
            
            console.log('✅ 好友tab刷新完成');
        } catch (error) {
            console.error('❌ 好友tab刷新失败:', error);
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
     */
    async forceRefresh() {
        console.log('🔄 强制刷新好友tab数据');
        this.isDataLoaded = false;
        await this.loadFriends();
        
        if (this.userAnswers && this.userAnswers.length > 0) {
            this.updateAnswers(this.userAnswers);
        }
    }

    /**
     * 清理资源，停止刷新循环
     */
    destroy() {
        this.stopRefreshLoop();
        this.stopLoadingAnimation();
        console.log('FriendsTab 资源已清理');
    }
}