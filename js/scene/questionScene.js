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
        this.background = new Background(ctx, scale);

        this.question = question;
        this.index = index;
        this.ctx = ctx;
        this.selected = false;
        this.init(this.question);
        this.drawProgress();
        this.drawPic();
        this.drawTitle();
        this.drawChoice();
        this.addTouch();
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
    
    drawProgress () {
        let barImg = Sprite.getImage('progress_bar');
        let bar = new Sprite(barImg, (750 - barImg.width)/2, 20, barImg.width, barImg.height);
        bar.draw(this.ctx);
        
        // 使用动态题目总数
        const quizSession = DataStore.getInstance().quizSession;
        const totalQuestions = quizSession ? quizSession.questions.length : 10;
        let percent = (this.index+1)/totalQuestions;
        
        this.ctx.fillStyle = '#fed443';
        this.ctx.fillRect(bar.x+4, bar.y+82, (bar.width-8)*percent, 16);
        this.bar = bar;
        
        // 添加返回按钮
        this.drawBackButton();
    }
    
    // 新增返回按钮绘制方法
    drawBackButton() {
        // 绘制更大的返回按钮
        this.ctx.fillStyle = '#007AFF';
        this.ctx.fillRect(20, 20, 120, 60);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('返回', 80, 55);
        
        // 保存返回按钮区域用于点击检测
        this.backButtonArea = {
            x: 20 * (screenWidth / 750),
            y: 20 * (screenWidth / 750),
            width: 120 * (screenWidth / 750),
            height: 60 * (screenWidth / 750)
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
    
    // 新的答案选择处理方法，替代judgeAnswer
    async handleAnswerSelection(x, y) {
        let index;
        if (x <= this.selectArea.x + this.selectArea.width) {
            index = y < (this.selectArea.y + this.selectArea.height) ? 0 : 2;
        } else if (x > this.selectArea.rightX) {
            index = y < (this.selectArea.y + this.selectArea.height) ? 1 : 3;
        } else {
            this.selected = false;
            return;
        }
        
        console.log('选择答案索引: ' + index);
        
        // 提交答案到后端
        const submitResult = await this.submitAnswerToBackend(index);
        
        // 显示选择效果
        this.drawChoiceItem(index, 'select_right', this.reDrawCanvas);
        
        // 延迟跳转到下一题
        setTimeout(() => {
            DataStore.getInstance().director.nextQuestionScene();
        }, 1000);
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
            
            console.log('提交答案:', {
                questionId: currentQuestion.id,
                selectedOption: selectedOptionKey,
                selectedIndex: selectedIndex
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
                this.prepareQuizCompletion();
            }
            
        } catch (error) {
            console.error('提交答案失败:', error);
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
        }
    }
    
    drawPic() {
        let _this = this;
        let bgImg = Sprite.getImage('question_bg');
        this.offset = (750 - bgImg.width)/2;
        let bg = new Sprite(bgImg, this.offset, 20 + this.bar.height + 20, bgImg.width, bgImg.height);
        bg.draw(this.ctx);
        this.bg = bg;
        
        // 如果有图片则加载，否则跳过
        if (this.img && this.img !== 'images/question-bg.png') {
            let pic = new Image();
            pic.src = this.img;
            pic.onload = () => {
                _this.centerImg(pic, bg.x + 20, bg.y + 20, bg.width-40, bg.height-40);
                _this.reDrawCanvas();
            }
        }
    }
    
    drawTitle () {
        // 确保title是字符串类型，添加额外的安全检查
        const titleText = (this.title && typeof this.title === 'string') ? this.title : String(this.title || '');
        console.log('drawTitle - titleText:', titleText, 'type:', typeof titleText); // 调试信息
        
        if (titleText) {
            // 修正参数顺序：drawText(text, x, y, width, context, scale)
            drawText(titleText, this.bg.x + 20, this.bg.y + this.bg.height - 60, this.bg.width - 40, this.ctx, 1);
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
    
    drawChoiceItem (index, bgsrc, callback) {
        this.ctx.globalCompositeOperation = 'source-over';
        let chart = ['A', 'B', 'C', 'D'];
        let choiceBgImg = Sprite.getImage(bgsrc);

        let x = index%2 === 0 ? this.offset : ((750-CHOICE_WIDTH)-this.offset);
        this.firstY = this.bg.y + this.bg.height+20*ratio+90;
        this.secondY = this.firstY + 20*ratio;
        let y = index < 2 ? this.firstY : (this.secondY + CHOICE_HEIGHT);
        let choiceSprite = new Sprite(choiceBgImg, x , y, CHOICE_WIDTH, CHOICE_HEIGHT);
        choiceSprite.draw(this.ctx);
        this.drawCircle(this.ctx, x + 40, y + 50, chart[index]);
        this.ctx.fillStyle = '#654e01';
        this.ctx.fillText(this.choices[index], x + 80, y + 50);

        if (bgsrc != 'select_bg') {
            callback && callback();
            return;
        }
        
        // 选项的选择区域
        if (!this.selectArea) {
            this.selectArea = {
                x: choiceSprite.x/ratio,
                y: choiceSprite.y/ratio,
                endX: screenWidth - this.offset/ratio,
                endY: this.firstY/ratio + (choiceSprite.height/ratio)*2+20,
                width: choiceSprite.width/ratio,
                height: choiceSprite.height/ratio
            }
        }
        if (index === 1) {
            this.selectArea.rightX = (screenWidth-choiceSprite.width/ratio)-this.offset/ratio;
        }
        if (index === 2) {
            this.selectArea.bottomY = this.secondY + choiceSprite.height/ratio;
        }
    }
    
    drawChoice(ctx) {
        this.ctx.font = '24px Arial';
        for (let i = 0; i < 4; i++) {
            this.drawChoiceItem(i, 'select_bg');
        }
    }
    
    drawCircle(ctx,x,y,text,isGray){
        ctx.fillStyle = '#ecb020';
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();
        ctx.save();
        ctx.fillStyle = "#654e01";
        ctx.font = '24px Arial';
        ctx.fillText(text, x-8, y);
    }
    
    // 重新绘制canvas 到主屏上
    reDrawCanvas() {
        DataStore.getInstance().ctx.drawImage(DataStore.getInstance().offScreenCanvas, 0, 0, screenWidth, screenHeight);
    }
}