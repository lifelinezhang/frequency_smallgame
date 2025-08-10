// 主Tab场景管理器
import Background from '../runtime/background';
import DataStore from '../base/DataStore';
import Sprite from '../base/Sprite';
import FriendsTab from './friendsTab';
import ProfileTab from './profileTab';
import ShareTab from './shareTab';

const screenWidth = window.innerWidth;
const screenHeight = window.innerHeight;

export default class TabScene {
    constructor(ctx) {
        this.ctx = ctx;
        this.canvas = DataStore.getInstance().canvas;
        this.currentTab = 2; // 默认显示"我的"页面
        this.tabs = [
            null, // 好友tab
            null, // 分享tab
            null  // 我的tab
        ];
        
        // 将TabScene实例保存到DataStore中，供其他组件访问
        DataStore.getInstance().currentTabScene = this;
        
        this.init();
    }

    // 获取或创建tab实例
    getTab(index) {
        if (!this.tabs[index]) {
            switch(index) {
                case 0:
                    console.log('创建FriendsTab实例');
                    this.tabs[index] = new FriendsTab(this.ctx);
                    break;
                case 1:
                    console.log('创建ShareTab实例');
                    this.tabs[index] = new ShareTab(this.ctx);
                    break;
                case 2:
                    this.tabs[index] = new ProfileTab(this.ctx);
                    break;
            }
        }
        return this.tabs[index];
    }

    switchTab(index) {
        console.log('切换到tab:', index);
        
        // 停止之前tab的刷新循环（如果有的话）
        const previousTab = this.getTab(this.currentTab);
        if (previousTab && typeof previousTab.stopRefreshLoop === 'function') {
            console.log('停止之前tab的刷新循环');
            previousTab.stopRefreshLoop();
        }
        
        this.currentTab = index;
        
        // 确保tab已经初始化
        const currentTab = this.getTab(index);
        
        // 先显示当前tab（可能是加载界面）
        this.showCurrentTab();
        
        // 如果是好友tab，每次进入都强制刷新数据
        if (index === 0 && currentTab) {
            console.log('进入好友tab，强制刷新数据');
            // 异步刷新，避免阻塞界面显示
            setTimeout(() => {
                if (typeof currentTab.forceRefresh === 'function') {
                    currentTab.forceRefresh();
                } else if (typeof currentTab.loadFriends === 'function') {
                    currentTab.loadFriends();
                }
            }, 50);
        }
        
        // 如果是分享tab，每次进入都刷新数据
        if (index === 1 && currentTab) {
            console.log('进入分享tab，刷新数据');
            setTimeout(() => {
                if (typeof currentTab.refresh === 'function') {
                    currentTab.refresh();
                }
            }, 50);
        }
    }

    /**
     * 显示当前选中的tab内容
     * 只清除内容区域，保留tab栏
     */
    showCurrentTab() {
        // 只清除内容区域，不清除底部tab栏区域
        this.ctx.clearRect(0, 0, screenWidth, screenHeight - 100);
        
        const currentTab = this.getTab(this.currentTab);
        if (currentTab && currentTab.render) {
            currentTab.render();
        }
        
        // 确保tab栏始终显示
        this.drawTabBar();
    }

    /**
     * 初始化TabScene
     * 确保tab栏在初始化时就能正确显示
     */
    init() {
        console.log('开始初始化TabScene...');
        
        // 清除画布
        this.ctx.clearRect(0, 0, screenWidth, screenHeight);
        
        // 设置画布背景色
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, screenWidth, screenHeight);
        
        // 立即绘制tab栏，确保底部导航始终可见
        this.drawTabBar();
        
        // 使用setTimeout确保tab栏绘制完成后再绘制内容
        setTimeout(() => {
            this.showCurrentTab();
            console.log('TabScene内容绘制完成');
        }, 10);
        
        // 绑定事件
        this.bindTabEvents();
        
        console.log('TabScene初始化完成，当前tab:', this.currentTab);
    }

    /**
     * 绘制底部tab栏
     * 确保tab栏始终可见且样式清晰
     */
    drawTabBar() {
        // 绘制底部tab栏（好友、分享、我的）
        const tabHeight = 100;
        const tabWidth = screenWidth / 3; // 3个tab，每个占三分之一宽度
        
        // 绘制tab栏背景
        this.ctx.fillStyle = '#f8f8f8';
        this.ctx.fillRect(0, screenHeight - tabHeight, screenWidth, tabHeight);
        
        // 绘制顶部分隔线
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, screenHeight - tabHeight);
        this.ctx.lineTo(screenWidth, screenHeight - tabHeight);
        this.ctx.stroke();
        
        // 绘制tab按钮
        const tabNames = ['好友', '分享', '我的'];
        for (let i = 0; i < 3; i++) {
            const x = i * tabWidth;
            const y = screenHeight - tabHeight;
            
            // 绘制tab背景（选中状态）
            if (i === this.currentTab) {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(x + 5, y + 10, tabWidth - 10, tabHeight - 20);
                
                // 绘制选中状态的边框
                this.ctx.strokeStyle = '#007AFF';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(x + 5, y + 10, tabWidth - 10, tabHeight - 20);
            }
            
            // 绘制文本
            if (i === this.currentTab) {
                this.ctx.fillStyle = '#007AFF';
            } else {
                this.ctx.fillStyle = '#666666';
            }
            
            this.ctx.font = 'bold 18px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(tabNames[i], x + tabWidth/2, y + tabHeight/2 + 5);
            
            // 绘制tab之间的分隔线
            if (i < 2) {
                this.ctx.strokeStyle = '#e0e0e0';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo((i + 1) * tabWidth, y + 20);
                this.ctx.lineTo((i + 1) * tabWidth, y + tabHeight - 20);
                this.ctx.stroke();
            }
        }
        
    }

    /**
     * 恢复TabScene显示
     * 从其他场景返回时调用
     */
    resume() {
        console.log('TabScene resume 被调用');
        
        // 清除可能存在的微信事件监听
        wx.offTouchStart();
        wx.offTouchMove();
        wx.offTouchEnd();
        
        // 清除整个画布
        this.ctx.clearRect(0, 0, screenWidth, screenHeight);
        
        // 先绘制tab栏，确保底部导航可见
        this.drawTabBar();
        
        // 再绘制当前tab内容
        this.showCurrentTab();
        
        // 重新绑定事件
        this.bindTabEvents();
        
        console.log('TabScene恢复完成，当前tab:', this.currentTab);
    }

    bindTabEvents() {
        console.log('绑定TabScene事件');
        
        // 清除之前的微信事件监听
        wx.offTouchStart();
        wx.offTouchMove();
        wx.offTouchEnd();
        
        // 使用微信的事件系统处理触摸开始事件
        wx.onTouchStart((e) => {
            const touch = e.touches[0];
            const x = touch.clientX;
            const y = touch.clientY;
            
            console.log('TabScene 触摸开始事件:', x, y);
            
            // 检查是否点击了tab栏（3个tab）
            if (y > screenHeight - 100) {
                const tabIndex = Math.floor(x / (screenWidth / 3));
                console.log('点击了tab:', tabIndex);
                if (tabIndex !== this.currentTab && tabIndex >= 0 && tabIndex < 3) {
                    this.switchTab(tabIndex);
                }
            } else {
                // 传递触摸开始事件给当前tab
                const currentTab = this.getTab(this.currentTab);
                if (currentTab && currentTab.handleTouchStart) {
                    currentTab.handleTouchStart(x, y);
                }
                // 同时保持原有的handleTouch兼容性
                if (currentTab && currentTab.handleTouch) {
                    currentTab.handleTouch(x, y);
                }
            }
        });
        
        // 处理触摸移动事件（用于下拉刷新）
        wx.onTouchMove((e) => {
            const touch = e.touches[0];
            const x = touch.clientX;
            const y = touch.clientY;
            
            // 只在内容区域处理触摸移动
            if (y <= screenHeight - 100) {
                const currentTab = this.getTab(this.currentTab);
                if (currentTab && currentTab.handleTouchMove) {
                    currentTab.handleTouchMove(x, y);
                }
            }
        });
        
        // 处理触摸结束事件（用于下拉刷新）
        wx.onTouchEnd((e) => {
            const touch = e.changedTouches[0];
            const x = touch.clientX;
            const y = touch.clientY;
            
            // 只在内容区域处理触摸结束
            if (y <= screenHeight - 100) {
                const currentTab = this.getTab(this.currentTab);
                if (currentTab && currentTab.handleTouchEnd) {
                    currentTab.handleTouchEnd(x, y);
                }
            }
        });
    }
}