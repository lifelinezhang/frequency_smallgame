import Background from '../runtime/background';
import DataStore from '../base/DataStore';
import Sprite from '../base/Sprite';
import { 
    getFriendsList, 
    getKeyInfo, 
    getUnlockedReports, 
    unlockFriendReport, 
    getFriendReportDetail,
    checkUnlockStatus 
} from '../utils/api';

/**
 * 分享标签页类
 * 负责显示好友列表、报告解锁状态和钥匙消耗解锁功能
 */
export default class ShareTab {
    /**
     * 构造函数
     * @param {CanvasRenderingContext2D} ctx - 画布上下文
     */
    constructor(ctx) {
        this.ctx = ctx;
        this.friendsList = []; // 好友列表
        this.keyInfo = { keyCount: 0 }; // 钥匙信息
        this.unlockedReports = new Set(); // 已解锁的报告ID集合
        this.isLoading = true;
        this.scrollY = 0; // 滚动偏移量
        this.maxScrollY = 0; // 最大滚动距离
        
        // Tab生命周期状态
        this.isActive = false;
        this.isDataLoaded = false;
        
        // 确保当前场景状态正确，防止意外触发答题完成流程
        this.ensureCorrectSceneState();
        
        this.render(); // 先渲染加载界面
        this.loadData(); // 异步加载数据
    }

    /**
     * 确保当前场景状态正确
     * 防止意外触发答题完成流程
     */
    ensureCorrectSceneState() {
        // 设置当前画布状态为tabScene，确保不会被误认为是答题场景
        DataStore.getInstance().currentCanvas = 'tabScene';
        
        // 清理可能存在的答题会话状态，防止意外触发
        const quizSession = DataStore.getInstance().quizSession;
        if (quizSession && quizSession.isCompleted) {
            console.log('检测到已完成的答题会话，清理状态以防止意外跳转');
            // 不完全删除quizSession，只是标记为已处理，避免重复触发
            quizSession.isProcessed = true;
        }
    }

    /**
     * 加载数据
     * 获取好友列表、钥匙信息和已解锁报告
     */
    async loadData() {
        try {
            // 检查tab是否激活，只有激活状态下才执行数据加载
            if (!this.isActive) {
                console.log('ShareTab未激活，跳过数据加载');
                return;
            }
            
            this.isLoading = true;
            this.render();
            
            // 并行请求多个接口
            const [friendsResponse, keyResponse, unlockedResponse] = await Promise.all([
                getFriendsList(),
                getKeyInfo(),
                getUnlockedReports()
            ]);
            
            // 处理好友列表数据，转换为统一格式
            const rawFriendsList = friendsResponse.data || [];
            console.log('原始好友列表数据:', rawFriendsList);
            this.friendsList = this.processFriendsData(rawFriendsList);
            console.log('处理后好友列表数据:', {
                原始数据长度: rawFriendsList.length,
                处理后数据长度: this.friendsList.length,
                friendsList: this.friendsList
            });
            this.keyInfo = keyResponse.data || { keyCount: 0 };
            
            // 将已解锁报告ID存入Set中便于快速查找
            const unlockedList = unlockedResponse.data || [];
            this.unlockedReports = new Set(unlockedList.map(item => item.targetCustId));
            
            this.isLoading = false;
            this.isDataLoaded = true;
            this.calculateMaxScroll();
            this.render();
            
            console.log('分享tab数据加载完成:', {
                friendsCount: this.friendsList.length,
                keyCount: this.keyInfo.keyCount,
                unlockedCount: this.unlockedReports.size
            });
            
        } catch (error) {
            console.error('加载分享数据失败:', error);
            this.isLoading = false;
            this.isDataLoaded = false;
            this.render();
        }
    }

    /**
     * 处理好友数据，转换为统一格式
     * @param {Array} rawFriendsList - 原始好友列表数据
     * @returns {Array} 处理后的好友列表
     */
    processFriendsData(rawFriendsList) {
        // 获取当前用户信息
        const userInfo = wx.getStorageSync('userInfo') || {};
        const currentUserId = userInfo.id;
        console.log('当前用户信息:', userInfo);
        console.log('当前用户ID:', currentUserId);
        
        // 使用Map去重，以好友ID为key
        const friendsMap = new Map();
        
        rawFriendsList.forEach(relation => {
             
            // 判断当前用户是firstCust还是secondCust，获取好友（对方）信息
            const isCurrentUserFirst = relation.firstCustId === currentUserId;
            const friendId = isCurrentUserFirst ? relation.secondCustId : relation.firstCustId;
            const friendNickname = isCurrentUserFirst ? relation.secondCustNickname : relation.firstCustNickname;
            const friendAvatar = isCurrentUserFirst ? relation.secondCustAvatar : relation.firstCustAvatar;
            
            // 如果该好友ID还没有记录，或者当前关系的报告信息更完整，则更新
            if (!friendsMap.has(friendId) || (relation.hasReport && !friendsMap.get(friendId).hasReport)) {
                friendsMap.set(friendId, {
                    id: friendId,
                    openId: friendId, // 使用用户ID作为openId
                    nickName: friendNickname || '好友',
                    avatar: friendAvatar || '',
                    hasReport: relation.hasReport || false, // 是否有报告
                    reportId: relation.reportId || null, // 报告ID
                    relationId: relation.id,
                    isFriend: relation.isFriend || false
                });
            }
        });
        
        // 将Map转换为数组并返回
        const uniqueFriends = Array.from(friendsMap.values());
        console.log('去重前好友数量:', rawFriendsList.length, '去重后好友数量:', uniqueFriends.length);
        return uniqueFriends;
    }

    /**
     * 计算最大滚动距离
     */
    calculateMaxScroll() {
        const itemHeight = 120;
        const headerHeight = 100;
        const contentHeight = this.friendsList.length * itemHeight + headerHeight;
        const viewHeight = window.innerHeight - 100; // 减去底部tab栏高度
        
        this.maxScrollY = Math.max(0, contentHeight - viewHeight);
    }

    /**
     * 渲染界面
     */
    render() {
        // 清除内容区域，保留底部tab栏
        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight - 100);
        
        // 绘制背景渐变（只绘制内容区域，不覆盖底部tab栏）
        const bgGradient = this.ctx.createLinearGradient(0, 0, 0, window.innerHeight - 100);
        bgGradient.addColorStop(0, '#f8f9fa');
        bgGradient.addColorStop(1, '#e9ecef');
        this.ctx.fillStyle = bgGradient;
        this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight - 100);
        
        if (this.isLoading) {
            this.drawLoadingUI();
            return;
        }
        
        // 保存当前状态
        this.ctx.save();
        
        // 应用滚动偏移
        this.ctx.translate(0, -this.scrollY);
        
        // 绘制标题和钥匙信息
        this.drawHeader();
        
        // 绘制好友列表
        this.drawFriendsList();
        
        // 恢复状态
        this.ctx.restore();
    }

    /**
     * 绘制加载界面
     */
    drawLoadingUI() {
        this.ctx.fillStyle = '#333333';
        this.ctx.font = '18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('加载中...', window.innerWidth/2, window.innerHeight/2);
    }

    /**
     * 绘制头部信息
     */
    drawHeader() {
        const centerX = window.innerWidth / 2;
        
        // 绘制渐变背景
        const gradient = this.ctx.createLinearGradient(0, 0, 0, 90);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, window.innerWidth, 90);
        
        // 绘制标题
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 26px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('好友分享', centerX, 35);
        
        // 绘制钥匙信息卡片
        const keyCardWidth = 120;
        const keyCardHeight = 30;
        const keyCardX = window.innerWidth - keyCardWidth - 15;
        const keyCardY = 10;
        
        // 钥匙卡片背景
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.fillRect(keyCardX, keyCardY, keyCardWidth, keyCardHeight);
        
        // 钥匙卡片边框
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(keyCardX, keyCardY, keyCardWidth, keyCardHeight);
        
        // 钥匙图标和数量
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('🔑', keyCardX + 8, keyCardY + 20);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillText(`${this.keyInfo.keyCount}`, keyCardX + 30, keyCardY + 20);
        
        // 绘制说明文字
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('查看好友的同频报告，消耗钥匙解锁', centerX, 65);
    }

    /**
     * 绘制好友列表
     */
    drawFriendsList() {
        if (this.friendsList.length === 0) {
            // 绘制空状态
            const emptyStateY = 250;
            const screenWidth = window.innerWidth;
            
            // 绘制空状态背景卡片
            const cardWidth = screenWidth - 60;
            const cardHeight = 200;
            const cardX = 30;
            const cardY = emptyStateY - 50;
            
            // 卡片阴影
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            this.ctx.fillRect(cardX + 3, cardY + 3, cardWidth, cardHeight);
            
            // 卡片背景
            const cardGradient = this.ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardHeight);
            cardGradient.addColorStop(0, '#ffffff');
            cardGradient.addColorStop(1, '#f8f9fa');
            this.ctx.fillStyle = cardGradient;
            this.ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
            
            // 卡片边框
            this.ctx.strokeStyle = '#e9ecef';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);
            
            // 绘制图标背景圆圈
            const iconSize = 60;
            const iconX = screenWidth/2;
            const iconY = emptyStateY;
            
            const iconGradient = this.ctx.createRadialGradient(iconX, iconY, 0, iconX, iconY, iconSize/2);
            iconGradient.addColorStop(0, '#667eea');
            iconGradient.addColorStop(1, '#764ba2');
            this.ctx.fillStyle = iconGradient;
            this.ctx.beginPath();
            this.ctx.arc(iconX, iconY, iconSize/2, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // 绘制图标
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '32px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('👥', iconX, iconY);
            
            // 绘制主标题
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.font = 'bold 18px Arial';
            this.ctx.fillText('暂无好友', screenWidth/2, emptyStateY + 50);
            
            // 绘制副标题
            this.ctx.fillStyle = '#7f8c8d';
            this.ctx.font = '14px Arial';
            this.ctx.fillText('邀请朋友一起测试，查看彼此的性格报告', screenWidth/2, emptyStateY + 75);
            
            // 绘制提示文字
            this.ctx.fillStyle = '#95a5a6';
            this.ctx.font = '12px Arial';
            this.ctx.fillText('分享给朋友，让他们也来测试吧！', screenWidth/2, emptyStateY + 100);
            
            return;
        }
        
        const itemHeight = 130;
        const startY = 110;
        
        this.friendsList.forEach((friend, index) => {
            const y = startY + index * itemHeight;
            this.drawFriendItem(friend, y);
        });
    }

    /**
     * 绘制单个好友项
     * @param {Object} friend - 好友信息
     * @param {number} y - Y坐标
     */
    drawFriendItem(friend, y) {
        const itemWidth = window.innerWidth - 30;
        const itemX = 15;
        const itemHeight = 110;
        const isUnlocked = this.unlockedReports.has(friend.id);
        
        // 绘制卡片阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(itemX + 2, y + 2, itemWidth, itemHeight);
        
        // 绘制背景卡片
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(itemX, y, itemWidth, itemHeight);
        
        // 绘制左侧彩色条
        const statusColor = friend.hasReport ? (isUnlocked ? '#28a745' : '#ffc107') : '#6c757d';
        this.ctx.fillStyle = statusColor;
        this.ctx.fillRect(itemX, y, 4, itemHeight);
        
        // 绘制好友头像
        this.drawFriendAvatar(friend.avatar, itemX + 20, y + 20, 60, 60);
        
        // 绘制好友昵称
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(friend.nickName || '好友', itemX + 95, y + 35);
        
        // 绘制报告状态信息
        this.ctx.fillStyle = '#7f8c8d';
        this.ctx.font = '14px Arial';
        const statusText = friend.hasReport ? '已生成同频报告' : '暂无同频报告';
        this.ctx.fillText(statusText, itemX + 95, y + 55);
        
        // 绘制状态标签
        const tagWidth = 60;
        const tagHeight = 20;
        const tagX = itemX + 95;
        const tagY = y + 65;
        
        this.ctx.fillStyle = statusColor;
        this.ctx.fillRect(tagX, tagY, tagWidth, tagHeight);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        const tagText = friend.hasReport ? (isUnlocked ? '已解锁' : '未解锁') : '无报告';
        this.ctx.fillText(tagText, tagX + tagWidth/2, tagY + 14);
        
        // 只有当好友有报告时才绘制按钮
        if (friend.hasReport) {
            const buttonWidth = 90;
            const buttonHeight = 35;
            const buttonX = itemX + itemWidth - buttonWidth - 15;
            const buttonY = y + 38;
            
            if (isUnlocked) {
                // 已解锁 - 绘制查看按钮
                // 按钮阴影
                this.ctx.fillStyle = 'rgba(78, 205, 196, 0.3)';
                this.ctx.fillRect(buttonX + 2, buttonY + 2, buttonWidth, buttonHeight);
                
                const gradient = this.ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
                gradient.addColorStop(0, '#4ecdc4');
                gradient.addColorStop(0.5, '#26d0ce');
                gradient.addColorStop(1, '#44a08d');
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
                
                // 按钮高光
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight/3);
                
                // 按钮图标
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = '14px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('📊', buttonX + buttonWidth/2 - 20, buttonY + buttonHeight/2);
                
                this.ctx.font = 'bold 12px Arial';
                this.ctx.fillText('查看报告', buttonX + buttonWidth/2 + 8, buttonY + buttonHeight/2);
            } else {
                // 未解锁 - 绘制解锁按钮
                // 按钮阴影
                this.ctx.fillStyle = 'rgba(255, 107, 107, 0.3)';
                this.ctx.fillRect(buttonX + 2, buttonY + 2, buttonWidth, buttonHeight);
                
                const gradient = this.ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
                gradient.addColorStop(0, '#ff6b6b');
                gradient.addColorStop(0.5, '#ff5252');
                gradient.addColorStop(1, '#ee5a52');
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
                
                // 按钮高光
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight/3);
                
                // 按钮图标
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = '14px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('🔓', buttonX + buttonWidth/2 - 15, buttonY + buttonHeight/2);
                
                this.ctx.font = 'bold 12px Arial';
                this.ctx.fillText('解锁', buttonX + buttonWidth/2 + 5, buttonY + buttonHeight/2);
            }
            
            // 存储按钮位置信息，用于点击检测
            friend._buttonArea = {
                x: buttonX,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight,
                isUnlocked: isUnlocked
            };
        } else {
            // 没有报告时不设置按钮区域
            friend._buttonArea = null;
        }
    }

    /**
     * 处理触摸开始事件
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     */
    handleTouchStart(x, y) {
        this.touchStartY = y;
        this.lastTouchY = y;
    }

    /**
     * 处理触摸移动事件
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     */
    handleTouchMove(x, y) {
        if (this.lastTouchY !== undefined) {
            const deltaY = this.lastTouchY - y;
            this.handleScroll(deltaY);
            this.lastTouchY = y;
        }
    }

    /**
     * 处理触摸结束事件
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     */
    async handleTouchEnd(x, y) {
        // 如果移动距离很小，认为是点击
        if (this.touchStartY !== undefined && Math.abs(y - this.touchStartY) < 10) {
            await this.handleTouch(x, y);
        }
        
        this.touchStartY = undefined;
        this.lastTouchY = undefined;
    }

    /**
     * 处理触摸事件
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     */
    async handleTouch(x, y) {
        // 如果正在显示报告详情
        if (this._showingReport) {
            // 检查返回按钮
            if (this.checkBackButton(x, y)) {
                this.handleBack();
                return;
            }
            
            // 检查分享按钮
            if (this.checkShareButtons(x, y)) {
                return;
            }
        }
        
        // 调整Y坐标考虑滚动偏移
        const adjustedY = y + this.scrollY;
        
        // 检查是否点击了好友项的按钮
        for (let i = 0; i < this.friendsList.length; i++) {
            const friend = this.friendsList[i];
            // 只有当好友有报告且按钮区域存在时才处理点击
            if (friend.hasReport && friend._buttonArea) {
                const btn = friend._buttonArea;
                if (x >= btn.x && x <= btn.x + btn.width && 
                    adjustedY >= btn.y && adjustedY <= btn.y + btn.height) {
                    
                    if (btn.isUnlocked) {
                        // 查看报告
                        await this.viewFriendReport(friend);
                    } else {
                        // 解锁报告
                        await this.unlockFriendReport(friend);
                    }
                    break;
                }
            }
        }
    }

    /**
     * 处理滚动事件
     * @param {number} deltaY - 滚动偏移量
     */
    handleScroll(deltaY) {
        this.scrollY = Math.max(0, Math.min(this.maxScrollY, this.scrollY + deltaY));
        this.render();
    }

    /**
     * 解锁好友报告
     * @param {Object} friend - 好友信息
     */
    async unlockFriendReport(friend) {
        try {
            // 检查钥匙数量
            if (this.keyInfo.keyCount <= 0) {
                this.showMessage('钥匙不足，无法解锁报告');
                return;
            }
            
            // 显示确认对话框
            const confirmed = await this.showConfirmDialog(
                `确定要消耗1把钥匙解锁${friend.nickName}的同频报告吗？`
            );
            
            if (!confirmed) {
                return;
            }
            
            // 检查是否有reportId
            if (!friend.reportId) {
                this.showMessage('报告ID不存在，无法解锁');
                return;
            }
            
            // 使用reportId解锁报告
            const response = await unlockFriendReport(friend.reportId);
            
            if (response.code === '200' || response.code === 200) {
                // 解锁成功，将targetCustId添加到已解锁列表中
                this.unlockedReports.add(friend.id);
                this.keyInfo.keyCount -= 1;
                this.showMessage('解锁成功！');
                
                // 重新渲染界面
                this.render();
                
                // 可以立即查看报告
                await this.viewFriendReport(friend);
            } else {
                this.showMessage(response.msg || '解锁失败');
            }
            
        } catch (error) {
            console.error('解锁报告失败:', error);
            this.showMessage('解锁失败，请重试');
        }
    }

    /**
     * 查看好友报告
     * @param {Object} friend - 好友信息
     */
    async viewFriendReport(friend) {
        try {
            // 检查是否有reportId
            if (!friend.reportId) {
                this.showMessage('报告ID不存在，无法查看');
                return;
            }
            
            // 获取好友报告详情
            const response = await getFriendReportDetail(friend.reportId);
            
            if (response.code === '200' || response.code === 200) {
                this.showReportDetail(response.data, friend);
            } else {
                this.showMessage(response.msg || '获取报告失败');
            }
            
        } catch (error) {
            console.error('获取好友报告失败:', error);
            this.showMessage('获取报告失败，请重试');
        }
    }

    /**
     * 显示报告详情
     * @param {Object} reportData - 报告数据
     * @param {Object} friend - 好友信息
     */
    showReportDetail(reportData, friend) {
        // 清除画布
        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight - 100);
        
        // 绘制报告背景
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight - 100);
        
        // 绘制返回按钮
        this.ctx.fillStyle = '#007AFF';
        this.ctx.fillRect(20, 20, 60, 30);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('返回', 50, 40);
        
        // 绘制报告标题
        this.ctx.fillStyle = '#333333';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${friend.nickName}的同频报告`, window.innerWidth/2, 80);
        
        // 绘制同频度
        if (reportData.frequency !== undefined) {
            this.ctx.fillStyle = '#007AFF';
            this.ctx.font = 'bold 36px Arial';
            this.ctx.fillText(`${reportData.frequency}%`, window.innerWidth/2, 150);
            
            this.ctx.fillStyle = '#666666';
            this.ctx.font = '16px Arial';
            this.ctx.fillText('同频度', window.innerWidth/2, 180);
        }
        
        // 绘制报告详情
        if (reportData.report) {
            this.ctx.fillStyle = '#333333';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'left';
            
            const lines = this.wrapText(reportData.report, window.innerWidth - 40);
            lines.forEach((line, index) => {
                this.ctx.fillText(line, 20, 220 + index * 20);
            });
        }
        
        // 绘制分享按钮区域
        this.drawShareButtons();
        
        // 存储返回按钮区域
        this._backButtonArea = {
            x: 20,
            y: 20,
            width: 60,
            height: 30
        };
        
        // 存储当前报告数据用于分享
        this._currentReportData = reportData;
        this._currentFriend = friend;
        
        this._showingReport = true;
    }

    /**
     * 文本换行处理
     * @param {string} text - 文本内容
     * @param {number} maxWidth - 最大宽度
     * @returns {Array} 换行后的文本数组
     */
    wrapText(text, maxWidth) {
        const words = text.split('');
        const lines = [];
        let currentLine = '';
        
        for (let word of words) {
            const testLine = currentLine + word;
            const metrics = this.ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine !== '') {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }

    /**
     * 显示确认对话框
     * @param {string} message - 确认消息
     * @returns {Promise<boolean>} 用户选择结果
     */
    showConfirmDialog(message) {
        return new Promise((resolve) => {
            wx.showModal({
                title: '确认',
                content: message,
                success: (res) => {
                    resolve(res.confirm);
                },
                fail: () => {
                    resolve(false);
                }
            });
        });
    }

    /**
     * 显示提示消息
     * @param {string} message - 提示消息
     */
    showMessage(message) {
        wx.showToast({
            title: message,
            icon: 'none',
            duration: 2000
        });
    }

    /**
     * 处理返回操作
     */
    handleBack() {
        if (this._showingReport) {
            this._showingReport = false;
            this._backButtonArea = null;
            this.render();
            return true;
        }
        return false;
    }

    /**
     * 检查是否点击了返回按钮
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @returns {boolean} 是否点击了返回按钮
     */
    checkBackButton(x, y) {
        if (this._backButtonArea) {
            const btn = this._backButtonArea;
            return x >= btn.x && x <= btn.x + btn.width && 
                   y >= btn.y && y <= btn.y + btn.height;
        }
        return false;
    }

    /**
     * Tab激活生命周期方法
     * 当Tab被激活时调用
     */
    onTabActivated() {
        console.log('ShareTab 被激活');
        this.isActive = true;
        
        // 统一使用智能刷新机制
        if (!this.isDataLoaded) {
            // 首次加载
            this.loadData();
        } else {
            // 已加载过数据，启动智能刷新
            this.refresh();
        }
    }
    
    /**
     * Tab停用生命周期方法
     * 当Tab被停用时调用
     */
    onTabDeactivated() {
        console.log('ShareTab 被停用');
        this.isActive = false;
    }
    

    
    /**
     * 刷新数据
     */
    async refresh() {
        await this.loadData();
    }

    /**
     * 绘制好友头像
     * @param {string} avatarUrl - 头像URL
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {number} width - 宽度
     * @param {number} height - 高度
     */
    drawFriendAvatar(avatarUrl, x, y, width, height) {
        if (avatarUrl && avatarUrl.trim() !== '') {
            // 如果有头像URL，尝试加载并绘制头像
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                // 保存当前状态
                this.ctx.save();
                
                // 创建圆形裁剪路径
                this.ctx.beginPath();
                this.ctx.arc(x + width/2, y + height/2, width/2, 0, 2 * Math.PI);
                this.ctx.clip();
                
                // 绘制头像
                this.ctx.drawImage(img, x, y, width, height);
                
                // 恢复状态
                this.ctx.restore();
                
                // 绘制圆形边框
                this.ctx.strokeStyle = '#d0d0d0';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.arc(x + width/2, y + height/2, width/2, 0, 2 * Math.PI);
                this.ctx.stroke();
            };
            img.onerror = () => {
                // 头像加载失败时绘制默认头像
                this.drawDefaultAvatar(x, y, width, height);
            };
            img.src = avatarUrl;
        } else {
            // 没有头像URL时绘制默认头像
            this.drawDefaultAvatar(x, y, width, height);
        }
    }

    /**
     * 绘制默认头像
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {number} width - 宽度
     * @param {number} height - 高度
     */
    drawDefaultAvatar(x, y, width, height) {
        // 绘制圆形背景
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.beginPath();
        this.ctx.arc(x + width/2, y + height/2, width/2, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // 绘制用户图标
        this.ctx.fillStyle = '#999999';
        this.ctx.font = `${width * 0.4}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('👤', x + width/2, y + height/2);
        
        // 绘制圆形边框
        this.ctx.strokeStyle = '#d0d0d0';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(x + width/2, y + height/2, width/2, 0, 2 * Math.PI);
        this.ctx.stroke();
    }

    /**
     * 绘制分享按钮
     */
    drawShareButtons() {
        const buttonWidth = 80;
        const buttonHeight = 35;
        const buttonSpacing = 20;
        const startY = window.innerHeight - 200;
        const centerX = window.innerWidth / 2;
        
        // 计算三个按钮的起始X坐标
        const totalWidth = buttonWidth * 3 + buttonSpacing * 2;
        const startX = centerX - totalWidth / 2;
        
        // 分享到朋友圈按钮
        this.ctx.fillStyle = '#1AAD19';
        this.ctx.fillRect(startX, startY, buttonWidth, buttonHeight);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('朋友圈', startX + buttonWidth/2, startY + 22);
        
        // 转发给好友按钮
        this.ctx.fillStyle = '#007AFF';
        this.ctx.fillRect(startX + buttonWidth + buttonSpacing, startY, buttonWidth, buttonHeight);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText('转发好友', startX + buttonWidth + buttonSpacing + buttonWidth/2, startY + 22);
        
        // 保存图片按钮
        this.ctx.fillStyle = '#FF9500';
        this.ctx.fillRect(startX + (buttonWidth + buttonSpacing) * 2, startY, buttonWidth, buttonHeight);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText('保存图片', startX + (buttonWidth + buttonSpacing) * 2 + buttonWidth/2, startY + 22);
        
        // 存储按钮区域信息
        this._shareButtonAreas = {
            timeline: {
                x: startX,
                y: startY,
                width: buttonWidth,
                height: buttonHeight
            },
            friend: {
                x: startX + buttonWidth + buttonSpacing,
                y: startY,
                width: buttonWidth,
                height: buttonHeight
            },
            save: {
                x: startX + (buttonWidth + buttonSpacing) * 2,
                y: startY,
                width: buttonWidth,
                height: buttonHeight
            }
        };
    }
    
    /**
     * 检查分享按钮点击
     * @param {number} x - 点击的X坐标
     * @param {number} y - 点击的Y坐标
     * @returns {boolean} 是否点击了分享按钮
     */
    checkShareButtons(x, y) {
        if (!this._shareButtonAreas) return false;
        
        // 检查朋友圈按钮
        const timelineBtn = this._shareButtonAreas.timeline;
        if (x >= timelineBtn.x && x <= timelineBtn.x + timelineBtn.width &&
            y >= timelineBtn.y && y <= timelineBtn.y + timelineBtn.height) {
            this.shareToTimeline();
            return true;
        }
        
        // 检查转发好友按钮
        const friendBtn = this._shareButtonAreas.friend;
        if (x >= friendBtn.x && x <= friendBtn.x + friendBtn.width &&
            y >= friendBtn.y && y <= friendBtn.y + friendBtn.height) {
            this.shareToFriend();
            return true;
        }
        
        // 检查保存图片按钮
        const saveBtn = this._shareButtonAreas.save;
        if (x >= saveBtn.x && x <= saveBtn.x + saveBtn.width &&
            y >= saveBtn.y && y <= saveBtn.y + saveBtn.height) {
            this.saveImage();
            return true;
        }
        
        return false;
    }

    /**
      * 分享到朋友圈
      */
     async shareToTimeline() {
         try {
             // 首先设置分享菜单
             await wx.showShareMenu({
                 withShareTicket: false,
                 menus: ['shareTimeline']
             });
             
             // 生成分享图片
             const imageUrl = await this.generateShareImage();
             
             // 设置朋友圈分享内容
             wx.onShareTimeline(() => {
                 return {
                     title: `我和${this._currentFriend.nickName}的同频度是${this._currentReportData.frequency}%！`,
                     imageUrl: imageUrl,
                     query: 'from=timeline'
                 };
             });
             
             this.showMessage('已设置朋友圈分享，请点击右上角菜单分享');
         } catch (error) {
             console.error('分享到朋友圈失败:', error);
             this.showMessage('分享功能暂不可用');
         }
     }
     
     /**
      * 转发给好友
      */
     async shareToFriend() {
         try {
             // 生成分享图片
             const imageUrl = await this.generateShareImage();
             
             // 调用分享接口
             await wx.shareAppMessage({
                 title: `我和${this._currentFriend.nickName}的同频度是${this._currentReportData.frequency}%！`,
                 desc: '快来测试你们的同频度吧！',
                 imageUrl: imageUrl,
                 query: 'from=friend'
             });
         } catch (error) {
             console.error('转发给好友失败:', error);
             this.showMessage('分享功能暂不可用');
         }
     }
     
     /**
      * 保存图片到本地
      */
     async saveImage() {
         try {
             // 生成分享图片
             const imageUrl = await this.generateShareImage();
             
             // 调用海报分享接口
             await wx.showShareImageMenu({
                 path: imageUrl
             });
         } catch (error) {
             console.error('保存图片失败:', error);
             this.showMessage('保存功能暂不可用');
         }
     }
     
     /**
      * 生成分享图片
      * @returns {Promise<string>} 图片临时路径
      */
     async generateShareImage() {
         try {
             // 创建离屏Canvas用于生成分享图片
             const canvas = wx.createCanvas();
             const ctx = canvas.getContext('2d');
             
             // 设置Canvas尺寸（5:4比例，适合分享）
             canvas.width = 400;
             canvas.height = 320;
             
             // 绘制背景
             ctx.fillStyle = '#f8f9fa';
             ctx.fillRect(0, 0, canvas.width, canvas.height);
             
             // 绘制标题
             ctx.fillStyle = '#333333';
             ctx.font = 'bold 18px Arial';
             ctx.textAlign = 'center';
             ctx.fillText('同频报告', canvas.width/2, 40);
             
             // 绘制好友信息
             ctx.font = '16px Arial';
             ctx.fillText(`与${this._currentFriend.nickName}的同频度`, canvas.width/2, 80);
             
             // 绘制同频度
             ctx.fillStyle = '#007AFF';
             ctx.font = 'bold 48px Arial';
             ctx.fillText(`${this._currentReportData.frequency}%`, canvas.width/2, 150);
             
             // 绘制报告摘要（截取前100字符）
             if (this._currentReportData.report) {
                 ctx.fillStyle = '#666666';
                 ctx.font = '12px Arial';
                 ctx.textAlign = 'left';
                 
                 const summary = this._currentReportData.report.substring(0, 100) + '...';
                 const lines = this.wrapText(summary, canvas.width - 40);
                 lines.forEach((line, index) => {
                     if (index < 4) { // 最多显示4行
                         ctx.fillText(line, 20, 190 + index * 16);
                     }
                 });
             }
             
             // 绘制底部信息
             ctx.fillStyle = '#999999';
             ctx.font = '10px Arial';
             ctx.textAlign = 'center';
             ctx.fillText('来自同频小游戏', canvas.width/2, canvas.height - 20);
             
             // 转换为临时文件
             return await new Promise((resolve, reject) => {
                 canvas.toTempFilePath({
                     success: (res) => resolve(res.tempFilePath),
                     fail: reject
                 });
             });
         } catch (error) {
             console.error('生成分享图片失败:', error);
             throw error;
         }
     }

     /**
      * 销毁组件
      */
     destroy() {
         // 清理资源
         this.friendsList = [];
         this.unlockedReports.clear();
         this._shareButtonAreas = null;
         this._currentReportData = null;
         this._currentFriend = null;
     }
 }