import QuestionPage from './questionScene'
import Background from '../runtime/background'
import DataStore from '../base/DataStore';
import Sprite from '../base/Sprite';
// import {getAuthSettings, createUserInfoButton} from '../utils/auth.js';
const screenWidth = window.innerWidth;
const screenHeight = window.innerHeight;

export default class HomeScene {
  constructor(ctx) {
      this.ctx = ctx;
      this.canvas = DataStore.getInstance().canvas;
      this.loop();
  }
  drawHomeEle () {
      this.homeEle = Sprite.getImage('homepage');
      this.logoImg = Sprite.getImage('logo');
      this.homeImg = new Sprite(this.homeEle, 0, this.logoImg.height - 60, this.homeEle.width / 2, this.homeEle.height / 2);
      this.homeImg.draw(this.ctx);
  }
  drawButton () {
      this.btnImg = Sprite.getImage('start_btn');
      this.startSprite = new Sprite(this.btnImg, (screenWidth - this.btnImg.width / 2) / 2, this.homeImg.height + 60,
                                    this.btnImg.width / 2, this.btnImg.height / 2);
      this.startSprite.draw(this.ctx);

      this.rankImg = Sprite.getImage('rank_btn');
      this.rankSprite = new Sprite(this.rankImg, (screenWidth - this.rankImg.width / 2) / 2, this.startSprite.y + this.startSprite.height + 20,
          this.rankImg.width / 2, this.rankImg.height / 2);
      this.rankSprite.draw(this.ctx);

      this.bindEvent();
  }
  loop () {
        this.ctx.clearRect(0, 0, screenWidth, screenHeight);
        this.background = new Background(this.ctx);
        this.drawHomeEle();
        this.drawButton();
        // console.log(DataStore.getInstance().userInfo);
        // if (!DataStore.getInstance().userInfo) {
        //     createUserInfoButton();
        // }
        if (DataStore.getInstance().shareTicket && !this.showGroup){
            this.showGroup = true;
        }
        this.requestId = requestAnimationFrame(this.loop.bind(this));
    }

  bindEvent () {
      let _this = this;
      wx.offTouchStart();
      wx.onTouchStart((e) => {
          let x = e.touches[0].clientX,
              y = e.touches[0].clientY;
          if (x >= _this.startSprite.x
            && x <= _this.startSprite.x + _this.startSprite.width
            && y >= _this.startSprite.y
            && y <= _this.startSprite.y + _this.startSprite.height) {
                cancelAnimationFrame(_this.requestId);
                DataStore.getInstance().director.toQuestionScene(_this.ctx);   
          }
      });
  }
}