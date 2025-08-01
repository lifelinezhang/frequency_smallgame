/**
 * Created by cooky on 2018/5/10.
 */
import Background from "../runtime/background";
import DataStore from "../base/DataStore";
import {remarks} from '../data/questions';
const screenWidth = window.innerWidth;
const screenHeight = window.innerHeight;
const ratio = 750 / screenWidth;//wx.getSystemInfoSync().pixelRatio;
const scale = 750 / screenWidth;

/**
 * 简洁的结果页面场景
 * 显示用户答题分数和操作按钮
 */
export default class ResultScene {
    constructor (ctx) {
        this.ctx = ctx;
        this.score = DataStore.getInstance().score;
        this.saveUserCloadStorage();
        this.loop();
    }
    loop() {
        this.background = new Background(this.ctx, scale);
        this.drawEle();
        // if (DataStore.getInstance().shareTicket && !this.showGroup){
        //     this.showGroup = true;
        //     this.messageSharecanvas('group', DataStore.getInstance().shareTicket);
        // }
        if (this.ranking) {
            // 子域canvas 放大绘制，这里必须限制子域画到上屏的宽高是screenWidth， screenHeight
            this.background = new Background(this.ctx, scale);
            this.drawEle();
            DataStore.getInstance().ctx.drawImage(DataStore.getInstance().resultCanvas, 0, 0, screenWidth, screenHeight);
            DataStore.getInstance().ctx.drawImage(DataStore.getInstance().sharedCanvas, 0, 0, screenWidth, screenHeight);
        } else {
            DataStore.getInstance().ctx.drawImage(DataStore.getInstance().resultCanvas, 0, 0, screenWidth, screenHeight);
        }
        this.requestId = requestAnimationFrame(this.loop.bind(this));

    }
    /**
     * 绘制结果页面元素
     * 简化设计，使页面更加简洁
     */
    drawEle () {
        // 简洁的标题
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('答题完成', 375, 120);
        
        // 简洁的分数卡片区域
        const cardY = 180;
        const cardHeight = 280;
        
        // 绘制简洁的分数背景卡片
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowColor = 'rgba(0,0,0,0.1)';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowOffsetY = 5;
        this.ctx.fillRect(60, cardY, 630, cardHeight);
        this.ctx.shadowBlur = 0;
        
        // 分数标题
        this.ctx.fillStyle = '#7f8c8d';
        this.ctx.font = '28px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('你的分数', 375, cardY + 60);
        
        // 大分数显示
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.font = 'bold 96px Arial';
        this.ctx.fillText(this.score, 375, cardY + 150);
        
        // 分数单位
        this.ctx.fillStyle = '#7f8c8d';
        this.ctx.font = '32px Arial';
        this.ctx.fillText('分', 375, cardY + 190);
        
        // 简化的评语
        this.ctx.fillStyle = '#95a5a6';
        this.ctx.font = '24px Arial';
        const remark = remarks[this.score] || '继续努力！';
        this.ctx.fillText(remark, 375, cardY + 240);
        
        // 简洁的按钮区域
        const buttonY = cardY + cardHeight + 60;
        const buttonWidth = 200;
        const buttonHeight = 60;
        const buttonSpacing = 25;
        
        // 计算三个按钮的起始位置
        const totalButtonsWidth = buttonWidth * 3 + buttonSpacing * 2;
        const startX = (750 - totalButtonsWidth) / 2;
        
        // 排行榜按钮
        this.drawSimpleButton(startX, buttonY, buttonWidth, buttonHeight, '查看排行榜', '#3498db');
        this.rankSprite = {
            x: startX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
        
        // 分享按钮
        const shareButtonX = startX + buttonWidth + buttonSpacing;
        this.drawSimpleButton(shareButtonX, buttonY, buttonWidth, buttonHeight, '分享成绩', '#2ecc71');
        this.reportSprite = {
            x: shareButtonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
        
        // 重新开始按钮
        const restartButtonX = shareButtonX + buttonWidth + buttonSpacing;
        this.drawSimpleButton(restartButtonX, buttonY, buttonWidth, buttonHeight, '重新开始', '#e67e22');
        this.restartSprite = {
            x: restartButtonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
        
        // 重置文本对齐
        this.ctx.textAlign = 'left';
        
        this.bindEvent();
    }
    
    /**
     * 绘制简洁的按钮
     */
    drawSimpleButton(x, y, width, height, text, color) {
        // 按钮背景
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
        
        // 按钮文字
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '28px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text, x + width/2, y + height/2 + 10);
    }
    messageSharecanvas (type, text) {
        // 排行榜也应该是实时的，所以需要sharedCanvas 绘制新的排行榜
        let openDataContext = wx.getOpenDataContext();
        openDataContext.postMessage({
            type: type || 'friends',
            text: text,
        });
        this.ranking = true;
    }
    bindEvent () {
        let _this = this;
        wx.offTouchStart();
        if (this.ranking) {
            wx.onTouchStart((e) => {
                let x = e.touches[0].clientX,
                    y = e.touches[0].clientY;
                let scale = screenWidth/750;
                if (x >= 80*scale && x <= 180*scale && y >= 1120*scale && y <= 1220*scale) {// 返回按钮
                    _this.ranking = false;
                    setTimeout(()=>{
                        cancelAnimationFrame(_this.requestId);
                    }, 20);
                }
            });
            return;
        }
        wx.onTouchStart((e) => {
            let x = e.touches[0].clientX*ratio,
                y = e.touches[0].clientY*ratio;
            
            // 检查排行榜按钮
            if (x >= _this.rankSprite.x
                && x <= _this.rankSprite.x + _this.rankSprite.width
                && y >= _this.rankSprite.y
                && y <= _this.rankSprite.y + _this.rankSprite.height) {
                // 排行榜也应该是实时的，所以需要sharedCanvas 绘制新的排行榜
                _this.messageSharecanvas();
                _this.loop();
                wx.offTouchStart(); // 在分享canvas还是会响应事件，所以先解除事件绑定
            } 
            // 检查分享按钮
            else if (x >= _this.reportSprite.x
                && x <= _this.reportSprite.x + _this.reportSprite.width
                && y >= _this.reportSprite.y
                && y <= _this.reportSprite.y + _this.reportSprite.height) {
                // 导出成绩单
                _this.report();
            }
            // 检查重新开始按钮
            else if (x >= _this.restartSprite.x
                && x <= _this.restartSprite.x + _this.restartSprite.width
                && y >= _this.restartSprite.y
                && y <= _this.restartSprite.y + _this.restartSprite.height) {
                // 重新开始游戏
                _this.restartGame();
            }
        });
    }
    /**
     * 重新开始游戏
     * 清理当前状态并返回标签页
     */
    restartGame() {
        // 停止当前循环
        if (this.requestId) {
            cancelAnimationFrame(this.requestId);
        }
        
        // 清理数据存储
        const dataStore = DataStore.getInstance();
        dataStore.score = 0;
        dataStore.quizSession = null;
        
        // 解除事件绑定
        wx.offTouchStart();
        
        // 返回标签页（主页）
        const Director = require('../Director').default;
        const director = Director.getInstance();
        director.backToTabScene();
    }
    
    /**
     * 生成简洁的分享报告
     */
    report () {
        let _this = this;
        let reportCanvas = wx.createCanvas();
        let reportCtx = reportCanvas.getContext('2d');
        reportCanvas.width = screenWidth * ratio;
        reportCanvas.height = screenHeight * ratio;
        reportCtx.scale(ratio, ratio);
        reportCtx.scale(screenWidth / 750, screenWidth / 750);
        
        // 简洁的背景
        reportCtx.fillStyle = '#f8f9fa';
        reportCtx.fillRect(0, 0, 750, 1334);
        
        // 简洁的标题
        reportCtx.fillStyle = '#2c3e50';
        reportCtx.font = 'bold 48px Arial';
        reportCtx.textAlign = 'center';
        reportCtx.fillText('我的答题成绩', 375, 120);
        
        // 简洁的分数卡片区域
        const cardY = 200;
        const cardHeight = 300;
        
        // 绘制简洁的分数背景卡片
        reportCtx.fillStyle = '#ffffff';
        reportCtx.shadowColor = 'rgba(0,0,0,0.15)';
        reportCtx.shadowBlur = 25;
        reportCtx.shadowOffsetY = 8;
        reportCtx.fillRect(60, cardY, 630, cardHeight);
        reportCtx.shadowBlur = 0;
        
        // 分数标题
        reportCtx.fillStyle = '#7f8c8d';
        reportCtx.font = '32px Arial';
        reportCtx.textAlign = 'center';
        reportCtx.fillText('最终得分', 375, cardY + 70);
        
        // 大分数显示
        reportCtx.fillStyle = '#e74c3c';
        reportCtx.font = 'bold 120px Arial';
        reportCtx.fillText(this.score, 375, cardY + 180);
        
        // 分数单位
        reportCtx.fillStyle = '#7f8c8d';
        reportCtx.font = '36px Arial';
        reportCtx.fillText('分', 375, cardY + 220);
        
        // 简化的评语
        reportCtx.fillStyle = '#95a5a6';
        reportCtx.font = '28px Arial';
        const remark = remarks[this.score] || '继续努力！';
        reportCtx.fillText(remark, 375, cardY + 270);
        
        // 底部提示
        reportCtx.fillStyle = '#bdc3c7';
        reportCtx.font = '24px Arial';
        reportCtx.fillText('扫码体验更多趣味答题', 375, cardY + cardHeight + 80);
        
        // 重置文本对齐
        reportCtx.textAlign = 'left';

        // DataStore.getInstance().ctx.clearRect(0, 0, screenWidth * ratio, screenHeight*ratio);
        // DataStore.getInstance().ctx.drawImage(reportCanvas, 0, 0, screenWidth, screenHeight);
        // return;
        // wx.saveImageToPhotosAlbum,
        reportCanvas.toTempFilePath({
            x: 0,
            y: 0,
            width: screenWidth * ratio,
            height: screenHeight * ratio,
            destWidth: screenWidth * ratio,
            destHeight: screenHeight * ratio,
            success: (response) => {
                // wx.shareAppMessage({
                //     imageUrl: res.tempFilePath
                // });
                wx.getSetting({
                    success: res => {
                        let authSetting = res.authSetting;
                        if (authSetting['scope.writePhotosAlbum'] === false) {
                            wx.showModal({
                                title: '提示',
                                content: '您拒绝了保存到相册到权限，请手动到设置页面打开授权开关',
                                showCancel: false,
                                confirmText: '知道了',
                                success: res => {
                                }
                            });
                        } else {
                            wx.saveImageToPhotosAlbum({
                                filePath: response.tempFilePath,
                                success: res => {
                                    console.log(res);
                                },
                                fail: res => {
                                    console.log(res.errMsg);
                                    if (res.errMsg.indexOf('deny')) {

                                    }
                                }
                            });
                        }
                    }
                });
            }
        });
    }
    saveUserCloadStorage() {
        let score = '' + this.score;
        wx.setUserCloudStorage({
            KVDataList: [{ key: 'score', value: score }],
            success: res => {
                console.log(res);
                // 让子域更新当前用户的最高分，因为主域无法得到getUserCloadStorage;
                let openDataContext = wx.getOpenDataContext();
                openDataContext.postMessage({
                    type: 'updateMaxScore',
                });
            },
            fail: res => {
                console.log(res);
            }
        });
    }
}