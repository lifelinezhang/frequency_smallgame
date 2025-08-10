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
        
        this.render(); // 先渲染加载界面
        this.loadData(); // 异步加载数据
    }

    /**
     * 加载数据
     * 获取好友列表、钥匙信息和已解锁报告
     */
    async loadData() {
        try {
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
            this.friendsList = this.processFriendsData(rawFriendsList);
            this.keyInfo = keyResponse.data || { keyCount: 0 };
            
            // 将已解锁报告ID存入Set中便于快速查找
            const unlockedList = unlockedResponse.data || [];
            this.unlockedReports = new Set(unlockedList.map(item => item.targetCustId));
            
            this.isLoading = false;
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
        
        return rawFriendsList.map(relation => {
            // 判断当前用户是firstCust还是secondCust，获取对方信息
            const isFriend = relation.firstCustId === currentUserId;
            const friendId = isFriend ? relation.secondCustId : relation.firstCustId;
            const friendNickname = isFriend ? relation.secondCustNickname : relation.firstCustNickname;
            const friendAvatar = isFriend ? relation.secondCustAvatar : relation.firstCustAvatar;
            
            return {
                id: friendId,
                openId: friendId, // 使用用户ID作为openId
                nickName: friendNickname || '好友',
                avatar: friendAvatar || '',
                hasReport: relation.hasReport || false, // 是否有报告
                reportId: relation.reportId || null, // 报告ID
                relationId: relation.id,
                isFriend: relation.isFriend || false
            };
        });
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
        // 清除内容区域
        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight - 100);
        
        // 绘制背景
        const background = new Background(this.ctx);
        
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
        
        // 绘制标题
        this.ctx.fillStyle = '#333333';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('好友分享', centerX, 40);
        
        // 绘制钥匙数量
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`🔑 钥匙: ${this.keyInfo.keyCount}`, window.innerWidth - 20, 30);
        
        // 绘制说明文字
        this.ctx.fillStyle = '#666666';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('查看好友的同频报告，消耗钥匙解锁', centerX, 70);
    }

    /**
     * 绘制好友列表
     */
    drawFriendsList() {
        if (this.friendsList.length === 0) {
            this.ctx.fillStyle = '#999999';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('暂无好友数据', window.innerWidth/2, 150);
            return;
        }
        
        const itemHeight = 120;
        const startY = 100;
        
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
        const itemWidth = window.innerWidth - 40;
        const itemX = 20;
        const isUnlocked = this.unlockedReports.has(friend.id);
        
        // 绘制背景卡片
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(itemX, y, itemWidth, 100);
        
        // 绘制边框
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(itemX, y, itemWidth, 100);
        
        // 绘制头像占位符
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(itemX + 15, y + 15, 50, 50);
        this.ctx.strokeStyle = '#d0d0d0';
        this.ctx.strokeRect(itemX + 15, y + 15, 50, 50);
        
        // 绘制好友昵称
        this.ctx.fillStyle = '#333333';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(friend.nickName || '好友', itemX + 80, y + 30);
        
        // 绘制报告状态信息
        this.ctx.fillStyle = '#666666';
        this.ctx.font = '14px Arial';
        const statusText = friend.hasReport ? '已生成同频报告' : '暂无同频报告';
        this.ctx.fillText(statusText, itemX + 80, y + 50);
        
        // 只有当好友有报告时才绘制按钮
        if (friend.hasReport) {
            const buttonWidth = 80;
            const buttonHeight = 30;
            const buttonX = itemX + itemWidth - buttonWidth - 15;
            const buttonY = y + 35;
            
            if (isUnlocked) {
                // 已解锁 - 绘制查看按钮
                this.ctx.fillStyle = '#007AFF';
                this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
                
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = '14px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('查看报告', buttonX + buttonWidth/2, buttonY + buttonHeight/2 + 5);
            } else {
                // 未解锁 - 绘制解锁按钮
                this.ctx.fillStyle = '#FF6B35';
                this.ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
                
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = '14px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('🔑 解锁', buttonX + buttonWidth/2, buttonY + buttonHeight/2 + 5);
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
        // 如果正在显示报告详情，检查返回按钮
        if (this._showingReport && this.checkBackButton(x, y)) {
            this.handleBack();
            return;
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
        
        // 存储返回按钮区域
        this._backButtonArea = {
            x: 20,
            y: 20,
            width: 60,
            height: 30
        };
        
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
     * 刷新数据
     */
    async refresh() {
        await this.loadData();
    }

    /**
     * 销毁组件
     */
    destroy() {
        // 清理资源
        this.friendsList = [];
        this.unlockedReports.clear();
    }
}