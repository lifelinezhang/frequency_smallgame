import ResourceLoader from "./js/base/ResourceLoader";
import Director from './js/Director';
import DataStore from './js/base/DataStore';
import { generateShareConfig } from './js/utils/invitation.js';
const screenWidth = window.innerWidth;
const screenHeight = window.innerHeight;
const ratio = wx.getSystemInfoSync().pixelRatio;

export default class Main {
    constructor () {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        // 解决图片模糊问题
        canvas.width = screenWidth * ratio;
        canvas.height = screenHeight * ratio;
        this.ctx.scale(ratio,ratio);

        let openDataContext = wx.getOpenDataContext();
        let sharedCanvas = openDataContext.canvas;
        sharedCanvas.width = screenWidth * ratio;
        sharedCanvas.height = screenHeight * ratio;
        DataStore.getInstance().sharedCanvas = sharedCanvas;

        this.dataStore = DataStore.getInstance();
        this.director = Director.getInstance(this.ctx);
        const loader = ResourceLoader.create();
        loader.onLoaded(map => this.onResourceFirstLoaded(map));
        this.director = Director.getInstance();
    }
    // 资源首次加载完成，
    onResourceFirstLoaded (map) {
        // console.log('onResourceFirstLoaded');
        this.dataStore.canvas = this.canvas;
        this.dataStore.ctx = this.ctx;
        this.dataStore.res = map;
        this.dataStore.director = this.director;
        this.dataStore.score = 0;
        this.init();
    }

    init () {
        this.director.run(this.ctx);
        this.setShare();
    }
    /**
     * 设置分享功能
     */
    setShare () {
        wx.showShareMenu({
            withShareTicket: true,
        });
        
        wx.onShareAppMessage(() => {
            // 生成带有邀请者信息的分享配置
            const shareConfig = generateShareConfig({
                title: '快来和我一起挑战频率小游戏吧！',
                imageUrl: 'https://mtshop1.meitudata.com/5ad58b143a94621047.jpg'
            });
            
            console.log('分享配置:', shareConfig);
            
            return {
                ...shareConfig,
                success: (res) => {
                    console.log('分享成功:', res);
                    
                    // 问题页面因为没有设置loop 绘制，分享完成后会黑屏，需要重新绘制canvas
                    if (DataStore.getInstance().currentCanvas === 'questionCanvas') {
                        DataStore.getInstance().ctx.drawImage(DataStore.getInstance().offScreenCanvas, 0, 0, screenWidth, screenHeight);
                    }
                    
                    // 保存分享票据
                    if (res.shareTickets) {
                        let shareTicket = res.shareTickets[0];
                        DataStore.getInstance().shareTicket = shareTicket;
                        console.log('获得分享票据:', shareTicket);
                    }
                },
                fail: (res) => {
                    console.error('分享失败:', res);
                }
            };
        });
    }
}