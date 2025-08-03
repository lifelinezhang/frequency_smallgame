// 主Tab场景管理器
import Background from '../runtime/background';
import DataStore from '../base/DataStore';
import Sprite from '../base/Sprite';
import FriendsTab from './friendsTab';
import ProfileTab from './profileTab';

const screenWidth = window.innerWidth;
const screenHeight = window.innerHeight;

export default class TabScene {
    constructor(ctx) {
        this.ctx = ctx;
        this.canvas = DataStore.getInstance().canvas;
        this.currentTab = 1; // 默认显示"我的"页面（索引1，隐藏推荐tab后）
        this.tabs = [
            null, // 好友tab
            null  // 我的tab
        ];
        this.init();
    }

    // 获取或创建tab实例（隐藏推荐tab后的索引映射）
    getTab(index) {
        if (!this.tabs[index]) {
            switch(index) {
                case 0:
                    console.log('创建FriendsTab实例');
                    this.tabs[index] = new FriendsTab(this.ctx);
                    break;
                case 1:
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
        
        // 如果是好友tab，异步加载数据（隐藏推荐tab后，好友tab索引变为0）
        if (index === 0 && currentTab && typeof currentTab.loadFriends === 'function') {
            console.log('触发好友tab数据加载');
            // 异步加载，避免阻塞界面显示
            setTimeout(() => {
                currentTab.loadFriends();
            }, 50);
        }
    }

    showCurrentTab() {
        this.ctx.clearRect(0, 0, screenWidth, screenHeight - 100);
        const currentTab = this.getTab(this.currentTab);
        if (currentTab && currentTab.render) {
            currentTab.render();
        }
        this.drawTabBar();
    }

    init() {
        // 先绘制基本界面，再异步加载数据
        this.showCurrentTab();
        this.drawTabBar();
        this.bindTabEvents();
    }

    drawTabBar() {
        // 绘制底部tab栏（隐藏推荐tab，只显示好友和我的）
        const tabHeight = 100;
        const tabWidth = screenWidth / 2; // 改为2个tab，每个占一半宽度
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, screenHeight - tabHeight, screenWidth, tabHeight);
        
        // 绘制tab按钮（隐藏推荐tab）
        const tabNames = ['好友', '我的'];
        for (let i = 0; i < 2; i++) {
            const x = i * tabWidth;
            const y = screenHeight - tabHeight;
            
            if (i === this.currentTab) {
                this.ctx.fillStyle = '#007AFF';
            } else {
                this.ctx.fillStyle = '#999999';
            }
            
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(tabNames[i], x + tabWidth/2, y + tabHeight/2);
        }
    }

    // 添加恢复显示的方法
    resume() {
        console.log('TabScene resume 被调用');
        
        // 清除可能存在的微信事件监听
        wx.offTouchStart();
        
        // 重新绘制当前tab
        this.showCurrentTab();
        this.drawTabBar();
        
        // 重新绑定事件
        this.bindTabEvents();
    }

    bindTabEvents() {
        console.log('绑定TabScene事件');
        
        // 清除之前的微信事件监听
        wx.offTouchStart();
        
        // 使用微信的事件系统而不是canvas的addEventListener
        wx.onTouchStart((e) => {
            const touch = e.touches[0];
            const x = touch.clientX;
            const y = touch.clientY;
            
            console.log('TabScene 触摸事件:', x, y);
            
            // 检查是否点击了tab栏（隐藏推荐tab后，只有2个tab）
            if (y > screenHeight - 100) {
                const tabIndex = Math.floor(x / (screenWidth / 2));
                console.log('点击了tab:', tabIndex);
                if (tabIndex !== this.currentTab && tabIndex >= 0 && tabIndex < 2) {
                    this.switchTab(tabIndex);
                }
            } else {
                // 传递事件给当前tab
                console.log('传递事件给当前tab:', this.currentTab);
                const currentTab = this.getTab(this.currentTab);
                if (currentTab && currentTab.handleTouch) {
                    const handled = currentTab.handleTouch(x, y);
                    // 如果当前tab没有处理事件（返回false），则不做任何操作
                    // 这样可以确保事件能够正常传播
                }
            }
        });
    }
}