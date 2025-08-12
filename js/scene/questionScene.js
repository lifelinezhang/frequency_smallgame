// 移除本地问题文件导入
// import questionList from '../data/questions.js'  // 删除这行
import {drawText} from '../utils/index.js';
import Background from '../runtime/background';
import Sprite from '../base/Sprite';
import DataStore from "../base/DataStore";
import { submitAnswer } from '../utils/api';

// 采用750的设计稿
const screenWidth = window.innerWidth;
const screenHeight = window.innerHeight;
const ratio = 750 / screenWidth;
const scale = 750 / screenWidth;

const CHOICE_WIDTH = 288;
const CHOICE_HEIGHT = 88;

// 创建问题canvas, 离屏canvas
export default class QuestionPage{
    constructor(ctx, question, index) {
        this.question = question;
        this.index = index;
        this.ctx = ctx;
        this.selected = false;
        
        // 绘制现代化背景
        this.drawModernBackground();
        
        this.init(this.question);
        this.drawProgress();
        this.drawPic();
        this.drawTitle();
        this.drawChoice();
        this.addTouch();
    }
    
    /**
     * 绘制现代化的背景
     * 使用渐变色和几何图案
     */
    drawModernBackground() {
        // 清除画布
        this.ctx.clearRect(0, 0, 750, 1334);
        
        // 绘制主背景渐变
        const bgGradient = this.ctx.createLinearGradient(0, 0, 0, 1334);
        bgGradient.addColorStop(0, '#667eea');
        bgGradient.addColorStop(0.5, '#764ba2');
        bgGradient.addColorStop(1, '#f093fb');
        this.ctx.fillStyle = bgGradient;
        this.ctx.fillRect(0, 0, 750, 1334);
        
        // 添加装饰性几何图案
        this.ctx.globalAlpha = 0.1;
        
        // 绘制圆形装饰
        this.ctx.fillStyle = '#ffffff';
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
    
    init(data) {
        console.log('QuestionScene init data:', data); // 添加调试信息
        
        this.img = data.pic || 'images/question-bg.png';
        
        // 确保title是字符串类型 - 优先使用content，其次使用title
        if (data.content) {
            this.title = String(data.content);
        } else if (data.title) {
            this.title = String(data.title);
        } else {
            this.title = ''; // 默认空字符串
        }
        
        console.log('设置的title:', this.title, 'type:', typeof this.title); // 调试信息
        
        // 确保choices是数组，并且每个元素都是字符串
        this.choices = Array.isArray(data.choices) ? data.choices.map(choice => String(choice || '')) : [];
        
        // 保存选项键用于提交答案
        this.optionKeys = data.optionKeys || ['A', 'B', 'C', 'D'];
        
        console.log('设置的choices:', this.choices); // 调试信息
    }
    
    /**
     * 绘制现代化的进度条
     * 使用渐变色和圆角设计
     */
    drawProgress () {
        // 使用动态题目总数
        const quizSession = DataStore.getInstance().quizSession;
        const totalQuestions = quizSession ? quizSession.questions.length : 10;
        let percent = (this.index+1)/totalQuestions;
        
        // 绘制进度条背景
        const progressWidth = 600;
        const progressHeight = 12;
        const progressX = (750 - progressWidth) / 2;
        const progressY = 30;
        
        // 背景圆角矩形
        this.ctx.fillStyle = '#f0f2f5';
        this.drawRoundedRect(progressX, progressY, progressWidth, progressHeight, 6);
        
        // 进度条渐变填充
        const gradient = this.ctx.createLinearGradient(progressX, 0, progressX + progressWidth * percent, 0);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        this.ctx.fillStyle = gradient;
        this.drawRoundedRect(progressX, progressY, progressWidth * percent, progressHeight, 6);
        
        // 进度文字
        this.ctx.fillStyle = '#666';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${this.index + 1} / ${totalQuestions}`, 375, progressY + 35);
        
        // 保存进度条信息
        this.bar = {
            x: progressX,
            y: progressY,
            width: progressWidth,
            height: progressHeight + 40
        };
        
        // 添加返回按钮
        this.drawBackButton();
    }
    
    /**
     * 绘制现代化的返回按钮
     * 使用圆角和阴影效果
     */
    drawBackButton() {
        const buttonX = 30;
        const buttonY = 20;
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
        
        // 保存返回按钮区域用于点击检测
        this.backButtonArea = {
            x: buttonX * (screenWidth / 750),
            y: buttonY * (screenWidth / 750),
            width: buttonWidth * (screenWidth / 750),
            height: buttonHeight * (screenWidth / 750)
        };
    }

    addTouch(){
        let _this = this;
        wx.offTouchStart();
        wx.onTouchStart((e)=>{
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            
            // 检查是否点击了返回按钮
            if (_this.backButtonArea && 
                touchX >= _this.backButtonArea.x - 10 &&
                touchX <= _this.backButtonArea.x + _this.backButtonArea.width + 10 &&
                touchY >= _this.backButtonArea.y - 10 && 
                touchY <= _this.backButtonArea.y + _this.backButtonArea.height + 10) {
            
                console.log('点击了返回按钮');
                DataStore.getInstance().director.backToTabScene();
                return;
            }
            
            // 选择答案的逻辑
            if (!this.selected
                && touchX >= _this.selectArea.x
                && touchX <= _this.selectArea.endX
                && touchY >= _this.selectArea.y
                && touchY <= _this.selectArea.endY){
                this.selected = true;
                _this.handleAnswerSelection(touchX, touchY);
            }
        });
    }
    
    /**
     * 新的答案选择处理方法，支持动态数量选项
     */
    async handleAnswerSelection(x, y) {
        let selectedIndex = -1;
        
        // 检查点击位置是否在某个选项内
        if (this.optionPositions) {
            for (let i = 0; i < this.optionPositions.length; i++) {
                const option = this.optionPositions[i];
                if (x >= option.x && x <= option.x + option.width &&
                    y >= option.y && y <= option.y + option.height) {
                    selectedIndex = i;
                    break;
                }
            }
        }
        
        if (selectedIndex === -1) {
            this.selected = false;
            return;
        }
        
        console.log('选择答案索引: ' + selectedIndex);
        
        // 提交答案到后端
        const submitResult = await this.submitAnswerToBackend(selectedIndex);
        
        // 显示选择效果with动画
        this.showSelectionAnimation(selectedIndex);
        this.drawChoiceItem(selectedIndex, 'select_right', this.reDrawCanvas);
        
        // 检查是否是最后一题
        const quizSession = DataStore.getInstance().quizSession;
        const totalQuestions = quizSession ? quizSession.questions.length : 10;
        const isLastQuestion = quizSession && quizSession.currentIndex === totalQuestions - 1;
        
        if (isLastQuestion) {
            console.log('这是最后一题，不自动跳转，等待答题完成处理');
            // 最后一题不自动跳转，等待prepareQuizCompletion处理
        } else {
            // 延迟跳转到下一题
            setTimeout(() => {
                DataStore.getInstance().director.nextQuestionScene();
            }, 10);
        }
    }
    
    // 提交答案到后端的方法
    async submitAnswerToBackend(selectedIndex) {
        try {
            const quizSession = DataStore.getInstance().quizSession;
            if (!quizSession || !quizSession.questions) {
                console.error('没有找到答题会话数据');
                return;
            }
            
            const currentQuestion = quizSession.questions[quizSession.currentIndex];
            if (!currentQuestion) {
                console.error('没有找到当前题目数据');
                return;
            }
            
            // 使用optionKeys来获取正确的选项键(A/B/C/D)
            const selectedOptionKey = currentQuestion.optionKeys ? 
                currentQuestion.optionKeys[selectedIndex] : 
                ['A', 'B', 'C', 'D'][selectedIndex];
            
            console.log('🚀 提交答案详情:', {
                currentIndex: quizSession.currentIndex,
                questionId: currentQuestion.id,
                questionTitle: currentQuestion.title ? currentQuestion.title.substring(0, 50) + '...' : 'N/A',
                selectedOption: selectedOptionKey,
                selectedIndex: selectedIndex,
                totalQuestions: quizSession.questions.length
            });
            
            // 修正：传递两个独立的参数而不是一个对象
            const result = await submitAnswer(currentQuestion.id, selectedOptionKey);
            
            console.log('答案提交结果:', result);
            
            // 保存用户答案到本地会话
            if (!quizSession.userAnswers) {
                quizSession.userAnswers = [];
            }
            
            // 确保数组长度足够
            while (quizSession.userAnswers.length <= quizSession.currentIndex) {
                quizSession.userAnswers.push(null);
            }
            
            quizSession.userAnswers[quizSession.currentIndex] = {
                questionId: currentQuestion.id,
                selectedOption: selectedOptionKey,
                selectedIndex: selectedIndex,
                timestamp: Date.now()
            };
            
            console.log('当前答案已保存，总答案数:', quizSession.userAnswers.length);
            
            // 如果是最后一题，额外处理
            const totalQuestions = quizSession.questions.length;
            if (quizSession.currentIndex === totalQuestions - 1) {
                console.log('这是最后一题，准备完成答题');
                // 显示提交提示
                wx.showLoading({
                    title: '正在提交答题记录，请稍候...',
                    mask: true
                });
                this.prepareQuizCompletion();
            }
            
        } catch (error) {
            console.error('提交答案失败:', error);
            
            // 如果是最后一题提交失败，隐藏加载提示并显示错误信息
            const quizSession = DataStore.getInstance().quizSession;
            const totalQuestions = quizSession ? quizSession.questions.length : 0;
            if (quizSession && quizSession.currentIndex === totalQuestions - 1) {
                wx.hideLoading();
                wx.showToast({
                    title: '提交答题记录失败，请检查网络后重试',
                    icon: 'none',
                    duration: 3000
                });
            }
        }
    }
    
    /**
     * 准备答题完成的处理
     */
    prepareQuizCompletion() {
        const quizSession = DataStore.getInstance().quizSession;
        if (quizSession && quizSession.userAnswers) {
            console.log('答题即将完成，用户答案:', quizSession.userAnswers);
            
            // 验证答案完整性
            const validAnswers = quizSession.userAnswers.filter(answer => answer !== null);
            console.log('有效答案数:', validAnswers.length, '总题目数:', quizSession.questions.length);
            
            // 标记答题完成状态
            quizSession.isCompleted = true;
            quizSession.completedAt = Date.now();
            
            // 调用Director的答题完成处理方法
            const director = DataStore.getInstance().director;
            if (director && typeof director.handleQuizCompletion === 'function') {
                console.log('调用Director的handleQuizCompletion方法');
                director.handleQuizCompletion();
            } else {
                console.error('Director实例或handleQuizCompletion方法不存在');
            }
        }
    }
    
    /**
     * 绘制现代化的题目背景区域
     * 使用卡片式设计和渐变背景
     */
    drawPic() {
        let _this = this;
        
        // 计算背景卡片位置和尺寸
        const cardWidth = 680;
        const cardHeight = 320;
        const cardX = (750 - cardWidth) / 2;
        const cardY = this.bar.y + this.bar.height + 30;
        
        // 绘制卡片阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.drawRoundedRect(cardX + 5, cardY + 5, cardWidth, cardHeight, 20);
        
        // 绘制卡片背景渐变
        const gradient = this.ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardHeight);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, '#f8f9fa');
        this.ctx.fillStyle = gradient;
        this.drawRoundedRect(cardX, cardY, cardWidth, cardHeight, 20);
        
        // 绘制卡片边框
        this.ctx.strokeStyle = '#e9ecef';
        this.ctx.lineWidth = 1;
        this.drawRoundedRectStroke(cardX, cardY, cardWidth, cardHeight, 20);
        
        // 保存背景信息
        this.bg = {
            x: cardX,
            y: cardY,
            width: cardWidth,
            height: cardHeight
        };
        
        // 如果有图片则加载，否则跳过
        if (this.img && this.img !== 'images/question-bg.png') {
            let pic = new Image();
            pic.src = this.img;
            pic.onload = () => {
                // 在卡片内绘制图片，留出更多边距
                _this.centerImg(pic, cardX + 30, cardY + 30, cardWidth - 60, cardHeight - 160);
                _this.reDrawCanvas();
            }
        }
    }
    
    /**
     * 绘制现代化的题目标题
     * 使用更好的字体和布局
     */
    drawTitle () {
        // 确保title是字符串类型，添加额外的安全检查
        const titleText = (this.title && typeof this.title === 'string') ? this.title : String(this.title || '');
        console.log('drawTitle - titleText:', titleText, 'type:', typeof titleText); // 调试信息
        
        if (titleText) {
            // 绘制题目文字区域（在主卡片内部）
            const textX = this.bg.x + 30;
            const textY = this.bg.y + 200; // 在图片区域下方
            const textWidth = this.bg.width - 60;
            
            // 绘制题目文字
            this.ctx.fillStyle = '#2c3e50';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.textAlign = 'left';
            
            // 使用改进的文字绘制函数
            this.drawMultilineText(titleText, textX, textY, textWidth, 30);
        }
    }
    
    centerImg(pic,x,y,limitW,limitH) {
        let picW = pic.width;
        let picH = pic.height;
        let showW = picW;
        let showH = picH;
        if (picW > limitW) {
            showW = limitW;
            showH = showW * picH / picW;
        }
        if (showH > limitH) {
            showH = limitH;
            showW = showH * picW / picH;
        }
        let cX = x + (limitW - showW) / 2;
        let cY = y + (limitH - showH) / 2;
        this.ctx.drawImage(pic, cX, cY, showW, showH);
    }
    
    /**
     * 绘制现代化的选择题选项
     * 使用卡片式设计和渐变色，支持动态数量的选项
     */
    drawChoiceItem (index, bgsrc, callback) {
        this.ctx.globalCompositeOperation = 'source-over';
        
        const choicesCount = this.choices.length;
        const optionWidth = 320;
        const optionHeight = 70;
        const margin = 20;
        
        // 根据选项数量动态计算布局
        let x, y;
        if (choicesCount <= 2) {
            // 1-2个选项：垂直排列
            x = (750 - optionWidth) / 2;
            this.firstY = this.bg.y + this.bg.height + 30;
            y = this.firstY + index * (optionHeight + 15);
        } else {
            // 3个或更多选项：两列布局
            const startX = (750 - optionWidth * 2 - margin) / 2;
            x = index % 2 === 0 ? startX : startX + optionWidth + margin;
            this.firstY = this.bg.y + this.bg.height + 30;
            y = this.firstY + Math.floor(index / 2) * (optionHeight + 15);
        }
        
        // 根据状态选择颜色
        let bgColor, borderColor, textColor;
        if (bgsrc === 'select_right') {
            bgColor = 'rgba(76, 175, 80, 0.1)';
            borderColor = '#4CAF50';
            textColor = '#2e7d32';
        } else if (bgsrc === 'select_error') {
            bgColor = 'rgba(244, 67, 54, 0.1)';
            borderColor = '#f44336';
            textColor = '#c62828';
        } else {
            bgColor = 'rgba(255, 255, 255, 0.95)';
            borderColor = '#e0e0e0';
            textColor = '#424242';
        }
        
        // 绘制选项阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        this.drawRoundedRect(x + 3, y + 3, optionWidth, optionHeight, 12);
        
        // 绘制选项背景
        this.ctx.fillStyle = bgColor;
        this.drawRoundedRect(x, y, optionWidth, optionHeight, 12);
        
        // 绘制边框
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = 2;
        this.drawRoundedRectStroke(x, y, optionWidth, optionHeight, 12);
        
        // 绘制选项文字（不再显示A、B、C、D标识）
        this.ctx.fillStyle = textColor;
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'left';
        
        // 使用改进的文字绘制，从左边距开始
        const choiceText = this.choices[index] || '';
        this.drawMultilineText(choiceText, x + 25, y + 25, optionWidth - 50, 24);
        
        if (bgsrc != 'select_bg') {
            callback && callback();
            return;
        }
        
        // 动态计算选择区域
        if (!this.selectArea) {
            const totalRows = Math.ceil(choicesCount / 2);
            const totalHeight = totalRows * optionHeight + (totalRows - 1) * 15;
            
            if (choicesCount <= 2) {
                this.selectArea = {
                    x: ((750 - optionWidth) / 2) / ratio,
                    y: this.firstY / ratio,
                    endX: ((750 + optionWidth) / 2) / ratio,
                    endY: (this.firstY + totalHeight) / ratio,
                    width: optionWidth / ratio,
                    height: optionHeight / ratio
                }
            } else {
                const startX = (750 - optionWidth * 2 - margin) / 2;
                this.selectArea = {
                    x: startX / ratio,
                    y: this.firstY / ratio,
                    endX: (startX + optionWidth * 2 + margin) / ratio,
                    endY: (this.firstY + totalHeight) / ratio,
                    width: optionWidth / ratio,
                    height: optionHeight / ratio
                }
            }
        }
        
        // 保存每个选项的具体位置信息
        if (!this.optionPositions) {
            this.optionPositions = [];
        }
        this.optionPositions[index] = {
            x: x / ratio,
            y: y / ratio,
            width: optionWidth / ratio,
            height: optionHeight / ratio
        };
    }
    
    /**
     * 绘制所有选择题选项
     * 支持动态数量的选项
     */
    drawChoice(ctx) {
        this.ctx.font = '24px Arial';
        // 根据实际选项数量进行绘制
        for (let i = 0; i < this.choices.length; i++) {
            this.drawChoiceItem(i, 'select_bg');
        }
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
    
    /**
     * 改进的多行文字绘制函数
     */
    drawMultilineText(text, x, y, maxWidth, lineHeight) {
        const words = text.split('');
        let line = '';
        let currentY = y;
        
        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i];
            const metrics = this.ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && line !== '') {
                this.ctx.fillText(line, x, currentY);
                line = words[i];
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        
        if (line !== '') {
             this.ctx.fillText(line, x, currentY);
         }
     }
     
     /**
       * 显示选择动画效果，支持动态数量选项
       */
      showSelectionAnimation(index) {
          if (!this.optionPositions || !this.optionPositions[index]) {
              return;
          }
          
          const option = this.optionPositions[index];
          const optionWidth = 320;
          const optionHeight = 70;
          
          // 转换回canvas坐标
          const x = option.x * ratio;
          const y = option.y * ratio;
          
          // 绘制选择动画效果
          this.ctx.save();
          this.ctx.globalAlpha = 0.3;
          
          // 创建脉冲效果
          const pulseGradient = this.ctx.createRadialGradient(
              x + optionWidth/2, y + optionHeight/2, 0,
              x + optionWidth/2, y + optionHeight/2, optionWidth/2
          );
          pulseGradient.addColorStop(0, '#4CAF50');
          pulseGradient.addColorStop(1, 'transparent');
          
          this.ctx.fillStyle = pulseGradient;
          this.drawRoundedRect(x - 10, y - 10, optionWidth + 20, optionHeight + 20, 20);
          
          this.ctx.restore();
      }
     
     // 重新绘制canvas 到主屏上
     reDrawCanvas() {
         DataStore.getInstance().ctx.drawImage(DataStore.getInstance().offScreenCanvas, 0, 0, screenWidth, screenHeight);
     }
 }