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
        this.bindEvent();
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
     * 绘制现代化的结果页面元素
     * 与分享tab报告页面保持一致的设计风格
     */
    drawEle () {
        // 绘制现代化背景
        this.drawModernBackground();
        
        // 绘制返回按钮
        this.drawBackButton();
        
        // 绘制页面标题
        this.drawPageTitle();
        
        // 绘制分数卡片
        this.drawScoreCard();
        
        // 绘制报告预览卡片
        this.drawReportPreview();
        
        // 绘制操作按钮
        this.drawActionButtons();
    }
    
    /**
     * 绘制现代化背景
     */
    drawModernBackground() {
        // 清除画布
        this.ctx.clearRect(0, 0, 750, 1334);
        
        // 绘制渐变背景
        const gradient = this.ctx.createLinearGradient(0, 0, 0, 1334);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(0.5, '#764ba2');
        gradient.addColorStop(1, '#f093fb');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, 750, 1334);
        
        // 添加装饰性几何图案
        this.ctx.globalAlpha = 0.1;
        this.ctx.fillStyle = '#ffffff';
        
        // 绘制圆形装饰
        this.ctx.beginPath();
        this.ctx.arc(150, 200, 80, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(600, 300, 60, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(100, 800, 40, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(650, 900, 70, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 重置透明度
        this.ctx.globalAlpha = 1.0;
    }
    
    /**
     * 绘制返回按钮
     */
    drawBackButton() {
        const buttonX = 30;
        const buttonY = 30;
        const buttonWidth = 100;
        const buttonHeight = 45;
        
        // 绘制按钮阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.drawRoundedRect(buttonX + 2, buttonY + 2, buttonWidth, buttonHeight, 22);
        
        // 绘制按钮背景
        const gradient = this.ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        this.ctx.fillStyle = gradient;
        this.drawRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 22);
        
        // 绘制按钮文字
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('返回', buttonX + buttonWidth/2, buttonY + buttonHeight/2 + 6);
        
        // 保存返回按钮区域
        this.backButtonArea = {
            x: buttonX * (screenWidth / 750),
            y: buttonY * (screenWidth / 750),
            width: buttonWidth * (screenWidth / 750),
            height: buttonHeight * (screenWidth / 750)
        };
    }
    
    /**
     * 绘制页面标题
     */
    drawPageTitle() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🎉 答题完成', 375, 120);
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.font = '18px Arial';
        this.ctx.fillText('恭喜你完成了所有题目！', 375, 150);
    }
    
    /**
     * 绘制分数卡片
     */
    drawScoreCard() {
        const cardX = 60;
        const cardY = 180;
        const cardWidth = 630;
        const cardHeight = 200;
        
        // 绘制卡片阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.drawRoundedRect(cardX + 5, cardY + 5, cardWidth, cardHeight, 20);
        
        // 绘制卡片背景
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        this.drawRoundedRect(cardX, cardY, cardWidth, cardHeight, 20);
        
        // 绘制卡片边框
        this.ctx.strokeStyle = '#e9ecef';
        this.ctx.lineWidth = 1;
        this.drawRoundedRectStroke(cardX, cardY, cardWidth, cardHeight, 20);
        
        // 分数标题
        this.ctx.fillStyle = '#6c757d';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('你的分数', 375, cardY + 50);
        
        // 大分数显示
        this.ctx.fillStyle = '#007AFF';
        this.ctx.font = 'bold 72px Arial';
        this.ctx.fillText(this.score, 375, cardY + 120);
        
        // 分数单位
        this.ctx.fillStyle = '#6c757d';
        this.ctx.font = '28px Arial';
        this.ctx.fillText('分', 375, cardY + 150);
        
        // 评语
        this.ctx.fillStyle = '#495057';
        this.ctx.font = '20px Arial';
        const remark = remarks[this.score] || '继续努力！';
        this.ctx.fillText(remark, 375, cardY + 180);
    }
    
    /**
     * 绘制报告预览卡片
     */
    drawReportPreview() {
        const cardX = 60;
        const cardY = 420;
        const cardWidth = 630;
        const cardHeight = 150;
        
        // 绘制卡片阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.drawRoundedRect(cardX + 5, cardY + 5, cardWidth, cardHeight, 20);
        
        // 绘制卡片背景
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        this.drawRoundedRect(cardX, cardY, cardWidth, cardHeight, 20);
        
        // 绘制卡片边框
        this.ctx.strokeStyle = '#e9ecef';
        this.ctx.lineWidth = 1;
        this.drawRoundedRectStroke(cardX, cardY, cardWidth, cardHeight, 20);
        
        // 报告标题
        this.ctx.fillStyle = '#495057';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('📊 你的答题报告', 375, cardY + 40);
        
        // 报告描述
        this.ctx.fillStyle = '#6c757d';
        this.ctx.font = '18px Arial';
        this.ctx.fillText('基于你的答题表现生成的个性化分析', 375, cardY + 70);
        
        // 查看按钮
        const btnX = 275;
        const btnY = cardY + 90;
        const btnWidth = 200;
        const btnHeight = 40;
        
        // 按钮渐变背景
        const btnGradient = this.ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnHeight);
        btnGradient.addColorStop(0, '#28a745');
        btnGradient.addColorStop(1, '#20c997');
        this.ctx.fillStyle = btnGradient;
        this.drawRoundedRect(btnX, btnY, btnWidth, btnHeight, 20);
        
        // 按钮文字
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillText('查看完整报告', btnX + btnWidth/2, btnY + btnHeight/2 + 5);
        
        // 保存查看报告按钮区域
        this.viewReportArea = {
            x: btnX * (screenWidth / 750),
            y: btnY * (screenWidth / 750),
            width: btnWidth * (screenWidth / 750),
            height: btnHeight * (screenWidth / 750)
        };
    }
    
    /**
     * 绘制操作按钮
     */
    drawActionButtons() {
        const buttonY = 620;
        const buttonWidth = 180;
        const buttonHeight = 50;
        const buttonSpacing = 30;
        
        // 计算按钮起始位置（只有2个按钮）
        const totalWidth = buttonWidth * 2 + buttonSpacing;
        const startX = (750 - totalWidth) / 2;
        
        // 排行榜按钮
        this.drawModernButton(startX, buttonY, buttonWidth, buttonHeight, '查看排行榜', '#007AFF', '#0056b3');
        this.rankSprite = {
            x: startX * (screenWidth / 750),
            y: buttonY * (screenWidth / 750),
            width: buttonWidth * (screenWidth / 750),
            height: buttonHeight * (screenWidth / 750)
        };
        
        // 重新开始按钮
        const restartX = startX + buttonWidth + buttonSpacing;
        this.drawModernButton(restartX, buttonY, buttonWidth, buttonHeight, '重新开始', '#dc3545', '#c82333');
        this.restartSprite = {
            x: restartX * (screenWidth / 750),
            y: buttonY * (screenWidth / 750),
            width: buttonWidth * (screenWidth / 750),
            height: buttonHeight * (screenWidth / 750)
        };
    }
    
    /**
     * 绘制现代化按钮
     */
    drawModernButton(x, y, width, height, text, color1, color2) {
        // 绘制按钮阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.drawRoundedRect(x + 3, y + 3, width, height, 25);
        
        // 绘制按钮渐变背景
        const gradient = this.ctx.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        this.ctx.fillStyle = gradient;
        this.drawRoundedRect(x, y, width, height, 25);
        
        // 绘制按钮文字
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(text, x + width/2, y + height/2 + 5);
    }
    
    /**
     * 绘制圆角矩形
     */
    drawRoundedRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    /**
     * 绘制圆角矩形边框
     */
    drawRoundedRectStroke(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
        this.ctx.stroke();
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
    /**
     * 绑定触摸事件
     * 支持新的按钮布局和功能
     */
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
            
            // 如果正在显示详细报告，检查详细报告的返回按钮
            if (_this._showingDetailReport && _this._detailBackButtonArea &&
                x >= _this._detailBackButtonArea.x && x <= _this._detailBackButtonArea.x + _this._detailBackButtonArea.width &&
                y >= _this._detailBackButtonArea.y && y <= _this._detailBackButtonArea.y + _this._detailBackButtonArea.height) {
                _this.backToResultPage();
                return;
            }
            // 检查主页面的返回按钮
            else if (!_this._showingDetailReport && _this.backButtonArea && 
                x >= _this.backButtonArea.x && x <= _this.backButtonArea.x + _this.backButtonArea.width &&
                y >= _this.backButtonArea.y && y <= _this.backButtonArea.y + _this.backButtonArea.height) {
                _this.goBack();
            }
            // 检查查看报告按钮
            else if (_this.viewReportArea &&
                x >= _this.viewReportArea.x && x <= _this.viewReportArea.x + _this.viewReportArea.width &&
                y >= _this.viewReportArea.y && y <= _this.viewReportArea.y + _this.viewReportArea.height) {
                _this.showDetailedReport();
            }
            // 检查排行榜按钮
            else if (_this.rankSprite &&
                x >= _this.rankSprite.x && x <= _this.rankSprite.x + _this.rankSprite.width &&
                y >= _this.rankSprite.y && y <= _this.rankSprite.y + _this.rankSprite.height) {
                _this.report();
            }

            // 检查重新开始按钮
            else if (_this.restartSprite &&
                x >= _this.restartSprite.x && x <= _this.restartSprite.x + _this.restartSprite.width &&
                y >= _this.restartSprite.y && y <= _this.restartSprite.y + _this.restartSprite.height) {
                _this.restartGame();
            }
        });
    }
    /**
     * 返回上一页
     */
    goBack() {
        // 停止当前循环
        if (this.requestId) {
            cancelAnimationFrame(this.requestId);
        }
        
        // 解除事件绑定
        wx.offTouchStart();
        
        // 返回标签页（主页）
        const Director = require('../Director').default;
        const director = Director.getInstance();
        director.backToTabScene();
    }
    
    /**
     * 显示详细报告
     * 与分享tab中的报告展示保持一致
     */
    showDetailedReport() {
        // 获取用户答题数据
        const quizSession = DataStore.getInstance().quizSession;
        const userAnswers = quizSession ? quizSession.userAnswers : [];
        const totalQuestions = quizSession ? quizSession.questions.length : 0;
        
        // 计算答题统计
        const correctAnswers = userAnswers.filter(answer => {
            if (!answer || !quizSession.questions) return false;
            const question = quizSession.questions.find(q => q.id === answer.questionId);
            return question && question.correctAnswer === answer.selectedOption;
        }).length;
        
        const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
        
        // 显示报告详情页面
        this.showReportDetailPage({
            score: this.score,
            totalQuestions: totalQuestions,
            correctAnswers: correctAnswers,
            accuracy: accuracy,
            userAnswers: userAnswers
        });
    }
    
    /**
     * 显示报告详情页面
     * @param {Object} reportData - 报告数据
     */
    showReportDetailPage(reportData) {
        // 清除画布
        this.ctx.clearRect(0, 0, 750, 1334);
        
        // 绘制现代化背景
        this.drawModernBackground();
        
        // 绘制返回按钮
        this.drawDetailBackButton();
        
        // 绘制报告标题
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 28px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('📊 详细答题报告', 375, 120);
        
        // 绘制报告内容卡片
        this.drawReportContentCard(reportData);
        
        // 标记为显示详细报告状态
        this._showingDetailReport = true;
    }
    
    /**
     * 绘制详细报告的返回按钮
     */
    drawDetailBackButton() {
        const buttonX = 30;
        const buttonY = 30;
        const buttonWidth = 100;
        const buttonHeight = 45;
        
        // 绘制按钮阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.drawRoundedRect(buttonX + 2, buttonY + 2, buttonWidth, buttonHeight, 22);
        
        // 绘制按钮背景
        const gradient = this.ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        this.ctx.fillStyle = gradient;
        this.drawRoundedRect(buttonX, buttonY, buttonWidth, buttonHeight, 22);
        
        // 绘制按钮文字
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('返回', buttonX + buttonWidth/2, buttonY + buttonHeight/2 + 6);
        
        // 保存返回按钮区域
        this._detailBackButtonArea = {
            x: buttonX * (screenWidth / 750),
            y: buttonY * (screenWidth / 750),
            width: buttonWidth * (screenWidth / 750),
            height: buttonHeight * (screenWidth / 750)
        };
    }
    
    /**
     * 绘制报告内容卡片
     * @param {Object} reportData - 报告数据
     */
    drawReportContentCard(reportData) {
        const cardX = 60;
        const cardY = 160;
        const cardWidth = 630;
        const cardHeight = 500;
        
        // 绘制卡片阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.drawRoundedRect(cardX + 5, cardY + 5, cardWidth, cardHeight, 20);
        
        // 绘制卡片背景
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        this.drawRoundedRect(cardX, cardY, cardWidth, cardHeight, 20);
        
        // 绘制卡片边框
        this.ctx.strokeStyle = '#e9ecef';
        this.ctx.lineWidth = 1;
        this.drawRoundedRectStroke(cardX, cardY, cardWidth, cardHeight, 20);
        
        let currentY = cardY + 40;
        
        // 总分显示
        this.ctx.fillStyle = '#007AFF';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${reportData.score}分`, 375, currentY + 40);
        currentY += 80;
        
        // 准确率显示
        this.ctx.fillStyle = '#28a745';
        this.ctx.font = 'bold 32px Arial';
        this.ctx.fillText(`准确率: ${reportData.accuracy}%`, 375, currentY);
        currentY += 60;
        
        // 答题统计
        this.ctx.fillStyle = '#495057';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'left';
        
        const stats = [
            `总题数: ${reportData.totalQuestions}题`,
            `答对题数: ${reportData.correctAnswers}题`,
            `答错题数: ${reportData.totalQuestions - reportData.correctAnswers}题`
        ];
        
        stats.forEach((stat, index) => {
            this.ctx.fillText(stat, cardX + 40, currentY + index * 35);
        });
        
        currentY += stats.length * 35 + 20;
        
        // 评价
        this.ctx.fillStyle = '#6c757d';
        this.ctx.font = '18px Arial';
        this.ctx.textAlign = 'center';
        
        let evaluation = '';
        if (reportData.accuracy >= 90) {
            evaluation = '🏆 优秀！你的表现非常出色！';
        } else if (reportData.accuracy >= 80) {
            evaluation = '👍 良好！继续保持这个水平！';
        } else if (reportData.accuracy >= 60) {
            evaluation = '📚 还不错，还有提升空间！';
        } else {
            evaluation = '💪 加油！多练习会有进步的！';
        }
        
        this.ctx.fillText(evaluation, 375, currentY);
    }
    
    /**
     * 从详细报告页面返回到结果页面
     */
    backToResultPage() {
        this._showingDetailReport = false;
        this._detailBackButtonArea = null;
        
        // 重新绘制结果页面
        this.drawEle();
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