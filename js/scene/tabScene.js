// 主Tab场景管理器
import Background from '../runtime/background';
import DataStore from '../base/DataStore';
import Sprite from '../base/Sprite';
import RecommendTab from './recommendTab';
import FriendsTab from './friendsTab';
import ProfileTab from './profileTab';

const screenWidth = window.innerWidth;
const screenHeight = window.innerHeight;

export default class TabScene {
    constructor(ctx) {
        this.ctx = ctx;
        this.canvas = DataStore.getInstance().canvas;
        this.currentTab = 0; // 0:推荐 1:好友 2:我的
        this.tabs = [
            new RecommendTab(ctx),
            new FriendsTab(ctx),
            new ProfileTab(ctx)
        ];
        this.init();
    }

    init() {
        // 先绘制基本界面，再异步加载数据
        this.showCurrentTab();
        this.drawTabBar();
        this.bindTabEvents();
    }

    drawTabBar() {
        // 绘制底部tab栏
        const tabHeight = 100;
        const tabWidth = screenWidth / 3;
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, screenHeight - tabHeight, screenWidth, tabHeight);
        
        // 绘制tab按钮
        const tabNames = ['推荐', '好友', '我的'];
        for (let i = 0; i < 3; i++) {
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

    switchTab(index) {
        this.currentTab = index;
        this.showCurrentTab();
    }

    showCurrentTab() {
        this.ctx.clearRect(0, 0, screenWidth, screenHeight - 100);
        this.tabs[this.currentTab].render();
        this.drawTabBar();
    }

    // 添加恢复显示的方法
    resume() {
        // 重新绘制当前tab
        this.showCurrentTab();
        this.drawTabBar();
    }

    bindTabEvents() {
        this.canvas.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            const x = touch.clientX;
            const y = touch.clientY;
            
            // 检查是否点击了tab栏
            if (y > screenHeight - 100) {
                const tabIndex = Math.floor(x / (screenWidth / 3));
                if (tabIndex !== this.currentTab) {
                    this.switchTab(tabIndex);
                }
            } else {
                // 传递事件给当前tab
                this.tabs[this.currentTab].handleTouch(x, y);
            }
        });
    }
}