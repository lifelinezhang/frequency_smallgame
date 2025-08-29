/**
 * 分享邀请相关工具函数
 */
import DataStore from '../base/DataStore.js';
import {recordInvitation} from './api.js';

/**
 * 生成带有邀请者信息的分享参数
 * @param {string} inviterOpenId 邀请者的openId
 * @param {object} extraParams 额外的分享参数
 * @returns {string} 分享查询参数字符串
 */
export const generateShareQuery = (inviterOpenId, extraParams = {}) => {
    const params = {
        inviter: inviterOpenId,
        timestamp: Date.now(),
        ...extraParams
    };

    return Object.keys(params)
        .map(key => `${key}=${encodeURIComponent(params[key])}`)
        .join('&');
};

/**
 * 从启动参数中解析邀请者信息
 * @param {object} launchOptions 小游戏启动参数
 * @returns {string|null} 邀请者openId，如果没有则返回null
 */
export const parseInviterFromLaunch = (launchOptions) => {
    if (!launchOptions || !launchOptions.query) {
        return null;
    }

    const query = launchOptions.query;
    return query.inviter || null;
};

/**
 * 从扫码场景值中解析邀请者信息
 * @param {object} launchOptions 启动参数
 * @returns {string|null} 邀请者openId
 */
export const parseInviterFromScene = (launchOptions) => {
    try {
        // 检查是否是扫码进入场景
        // 1047: 扫描小程序码
        // 1048: 长按图片识别小程序码
        // 1049: 扫描手机相册中选取的小程序码
        if (launchOptions && [1047, 1048, 1049].includes(launchOptions.scene)) {
            // 从scene参数中获取openid
            const scene = launchOptions.query && launchOptions.query.scene;
            if (scene) {
                // scene参数就是之前保存的用户openid，需要解码
                const decodedOpenId = decodeURIComponent(scene);
                console.log('从扫码场景值中解析到邀请者openId:', decodedOpenId, '场景值:', launchOptions.scene);
                return decodedOpenId;
            }
        }
        return null;
    } catch (error) {
        console.error('解析扫码场景值失败:', error);
        return null;
    }
};

/**
 * 从分享票据中解析邀请者信息
 * @param {string} shareTicket 分享票据
 * @returns {Promise<string|null>} 邀请者openId
 */
export const parseInviterFromShareTicket = async (shareTicket) => {
    return new Promise((resolve) => {
        if (!shareTicket) {
            resolve(null);
            return;
        }

        wx.getShareInfo({
            shareTicket: shareTicket,
            success: (res) => {
                try {
                    // 这里需要根据实际的分享信息结构来解析
                    // 微信小游戏的分享信息可能需要服务端解密
                    console.log('分享信息:', res);
                    resolve(null); // 暂时返回null，需要服务端配合解析
                } catch (error) {
                    console.error('解析分享信息失败:', error);
                    resolve(null);
                }
            },
            fail: (error) => {
                console.error('获取分享信息失败:', error);
                resolve(null);
            }
        });
    });
};

/**
 * 处理用户通过分享进入的逻辑
 * @param {object} launchOptions 启动参数
 * @returns {Promise<boolean>} 是否成功处理邀请关系
 */
export const handleInvitationEntry = async (launchOptions) => {
    try {
        console.log('处理邀请进入逻辑，启动参数:', launchOptions);

        // 首先从启动参数中获取邀请者信息
        let inviterOpenId = parseInviterFromLaunch(launchOptions);

        // 如果启动参数中没有，尝试从扫码场景值中获取
        if (!inviterOpenId) {
            inviterOpenId = parseInviterFromScene(launchOptions);
        }

        // 如果还是没有，尝试从分享票据中获取
        if (!inviterOpenId && launchOptions.shareTicket) {
            inviterOpenId = await parseInviterFromShareTicket(launchOptions.shareTicket);
        }

        if (inviterOpenId) {
            // 保存邀请者信息到本地存储
            wx.setStorageSync('inviterOpenId', inviterOpenId);

            console.log('检测到邀请者:', inviterOpenId);
            return true;
        }

        return false;
    } catch (error) {
        console.error('处理邀请进入逻辑失败:', error);
        return false;
    }
};

/**
 * 在用户登录成功后记录邀请关系
 * @returns {Promise<boolean>} 是否成功记录邀请关系
 */
export const recordInvitationAfterLogin = async () => {
    try {
        const inviterOpenId = wx.getStorageSync('inviterOpenId');

        if (inviterOpenId) {
            // 调用API记录邀请关系
            await recordInvitation(inviterOpenId);

            // 记录成功后清除本地存储的邀请者信息
            wx.removeStorageSync('inviterOpenId');

            console.log('邀请关系记录成功');
            return true;
        }

        return false;
    } catch (error) {
        console.error('记录邀请关系失败:', error);
        return false;
    }
};

/**
 * 获取当前用户的openId用于分享
 * @returns {string|null} 当前用户的openId
 */
export const getCurrentUserOpenId = () => {
    const userInfo = wx.getStorageSync('userInfo');
    return userInfo && userInfo.openid ? userInfo.openid : null;
};

/**
 * 生成分享配置对象
 * @param {object} options 分享配置选项
 * @returns {object} 微信分享配置对象
 */
export const generateShareConfig = (options = {}) => {
    const currentUserOpenId = getCurrentUserOpenId();

    const defaultConfig = {
        title: '快来和我一起答题吧！',
        imageUrl: '', // 可以设置默认的分享图片
        query: currentUserOpenId ? generateShareQuery(currentUserOpenId) : ''
    };

    return {
        ...defaultConfig,
        ...options,
        // 确保query中包含邀请者信息
        query: options.query || defaultConfig.query
    };
};