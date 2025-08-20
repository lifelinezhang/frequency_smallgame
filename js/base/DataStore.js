export default class DataStore {
    constructor () {
        this.map = new Map();
        // 页面刷新状态标记
        this.refreshFlags = {
            quizCompleted: false,        // 答题完成标记
            needRefreshFriends: false,   // 好友Tab需要刷新
            needRefreshProfile: false,   // 我的报告Tab需要刷新
            needRefreshShare: false,     // 分享Tab需要刷新
            lastQuizCompletedTime: 0     // 最后一次答题完成时间
        };
    }
    put (key, value) {
        if (typeof value === 'function') {
            value = new value();
        }
        this.map.set(key, value);
        return this;
    }
    get (key) {
        return this.map.get(key);
    }
    /**
     * 设置答题完成状态
     */
    setQuizCompleted() {
        this.refreshFlags.quizCompleted = true;
        this.refreshFlags.needRefreshFriends = true;
        this.refreshFlags.needRefreshProfile = true;
        this.refreshFlags.needRefreshShare = true;
        this.refreshFlags.lastQuizCompletedTime = Date.now();
    }

    /**
     * 清除特定页面的刷新标记
     * @param {string} tabName - 页面名称 ('friends', 'profile', 'share')
     */
    clearRefreshFlag(tabName) {
        switch(tabName) {
            case 'friends':
                this.refreshFlags.needRefreshFriends = false;
                break;
            case 'profile':
                this.refreshFlags.needRefreshProfile = false;
                break;
            case 'share':
                this.refreshFlags.needRefreshShare = false;
                break;
        }
    }

    /**
     * 检查是否需要刷新特定页面
     * @param {string} tabName - 页面名称 ('friends', 'profile', 'share')
     * @returns {boolean}
     */
    needsRefresh(tabName) {
        switch(tabName) {
            case 'friends':
                return this.refreshFlags.needRefreshFriends;
            case 'profile':
                return this.refreshFlags.needRefreshProfile;
            case 'share':
                return this.refreshFlags.needRefreshShare;
            default:
                return false;
        }
    }

    /**
     * 重置所有刷新标记
     */
    resetRefreshFlags() {
        this.refreshFlags.quizCompleted = false;
        this.refreshFlags.needRefreshFriends = false;
        this.refreshFlags.needRefreshProfile = false;
        this.refreshFlags.needRefreshShare = false;
    }

    destroy () {
        for (let value of this.map.values()) {
            value = null;
        }
        // 重置刷新标记
        this.resetRefreshFlags();
    }
    static getInstance () {
        if (!DataStore.instance) {
            DataStore.instance = new DataStore();
        }
        return DataStore.instance;
    }
}
