## quickstart

appId:wx15850283d3ec1ee5

appSecret:402a03a1ee85129aceef560be5754e35

## 源码目录介绍
```
./js
├── base                                   // 定义游戏开发基础类
│   ├── DataStore.js                       // 对象临时存储类
│   ├── ResoutceLoader.js                  // 源文件加载类
│   │── Resource.js                        // 需要提前加载到资源文件
│   └── sprite.js                          // 游戏基本元素精灵类
│
├── data
│   └── question.js                        // 题库
│
├── libs
│   ├── symbol.js                          // ES6 Symbol简易兼容
│   └── weapp-adapter.js                   // 小游戏适配器
│
├── player
│   └── question.js                        // 问题类
│
├── runtime
│   ├── background.js                      // 背景类
│   └── logo.js                            // logo 类
│
├── scene
│   ├── homeScene.js                       // 首页场景
│   ├── questionScene.js                   // 问题页场景
│   ├── resultScene.js                     // 结果页场景
│   └── tabScene.js                        // Tab场景
│
└── Director.js                            // 导演类，控制游戏场景逻辑

main.js                                    // 游戏入口
```
## 开发问题小结
1、真机分享后黑屏的问题
  如果页面不是实时绘制的，在分享后会黑屏，因为canvas没有绘制，所以需要监听onShareAppMessage的回调去绘制canvas，或者监听wx.onShow在小游戏回到前台的时候进行处理

2、主域获取用户信息wx.getUserInfo授权报错的问题
  因为小游戏官方近期修改了接口，需要改用wx.createUserInfoButton创建按钮，用户点击获取用户信息

