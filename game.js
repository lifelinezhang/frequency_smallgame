import './js/libs/weapp-adapter'
import './js/libs/symbol'

import Main from './main'
import DataStore from "./js/base/DataStore";
import { handleInvitationEntry } from './js/utils/invitation.js';

// 处理小游戏启动时的邀请逻辑
const handleGameLaunch = async (launchOptions) => {
    console.log('游戏启动参数:', launchOptions);
    
    // 处理分享邀请进入（包括扫码进入）
    await handleInvitationEntry(launchOptions);
    
    // 保存分享票据到数据存储
    if (launchOptions.shareTicket) {
        DataStore.getInstance().shareTicket = launchOptions.shareTicket;
    }
};

// 获取启动参数并处理
const launchOptions = wx.getLaunchOptionsSync();
handleGameLaunch(launchOptions);

new Main();

// 监听小游戏显示事件
wx.onShow(res => {
    console.log('游戏显示参数:', res);
    DataStore.getInstance().shareTicket = res.shareTicket;
    
    // 如果是通过分享或扫码进入，处理邀请逻辑
    if (res.scene === 1044 || res.scene === 1036 || res.scene === 1047) { 
        // 1044: 群聊分享, 1036: 单聊分享, 1047: 扫描小程序码
        console.log('检测到分享/扫码进入，场景值:', res.scene);
        handleInvitationEntry(res);
    }
});