// API请求工具函数
export const apiRequest = async (url, options = {}) => {
    // const baseURL = 'http://127.0.0.1:8098/api/web'; // 你的API域名
    // const baseURL = 'http://101.43.88.252:8098/api/web'; // 你的API域名
    const baseURL = 'https://samefrequency.cloud/api/web';
    const defaultOptions = {
        method: 'GET',
        header: {
            'Content-Type': 'application/json',
        },
        timeout: 30000  // 增加超时时间为30秒
    };
    
    const config = { ...defaultOptions, ...options };
    
    // 添加用户token
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.token) {
        config.header.token = userInfo.token;
    }
    
    // 处理请求数据
    if (config.data) {
        if (config.method === 'POST' || config.method === 'PUT') {
            config.data = JSON.stringify(config.data);
        }
    }
    
    // 完整的请求URL
    const fullUrl = baseURL + url;
    
    return new Promise((resolve, reject) => {
        console.log('API请求:', fullUrl, config);
        
        wx.request({
            url: fullUrl,
            method: config.method,
            data: config.data,
            header: config.header,
            timeout: config.timeout,
            success: (res) => {
                console.log('API响应:', res);
                
                if (res.statusCode === 200) {
                    const data = res.data;
                    if (data.code === '200' || data.code === 200) {
                        resolve(data);
                    } else {
                        reject(new Error(data.msg || '请求失败'));
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${res.data?.msg || '网络请求失败'}`));
                }
            },
            fail: (error) => {
                console.error('API请求失败:', error);
                reject(new Error(error.errMsg || '网络请求失败'));
            }
        });
    });
};

/**
 * 用户登录
 * @param {string} code 微信登录code
 * @param {object} userInfo 用户信息
 * @param {string} inviterOpenId 邀请者openId（可选）
 * @returns {Promise} 返回登录结果
 */
export const userLogin = async (code, userInfo, inviterOpenId = null) => {
    const loginData = {
        code: code,
        openid: userInfo.openid,
        nickname: userInfo.nickName,
        avatar: userInfo.avatarUrl,
        gender: userInfo.gender
    };
    
    // 如果有邀请者信息，添加到登录数据中
    if (inviterOpenId) {
        loginData.inviterOpenId = inviterOpenId;
    }
    
    return await apiRequest('/api/user/login', {  // 去掉重复的 /api/web
        method: 'POST',
        data: loginData
    });
};

// 开始答题 - 修改接口路径和参数
export const startQuiz = async () => {
    return await apiRequest('/question/getList', {
        method: 'POST',
        data: {} // StartQuizCommand 现在为空对象
    });
};

// 提交单个题目答案 - 保持不变
export const submitAnswer = async (questionId, selectedOption) => {
    return await apiRequest('/question/submit', {
        method: 'POST',
        data: {
            questionId: questionId,
            selectedOption: selectedOption
        }
    });
};

/**
 * 获取用户答题记录
 * @returns {Promise} 返回用户的完整答题记录
 */
export const getAnswerHistory = async () => {
    return await apiRequest('/question/getAnswerHistory', {
        method: 'GET'
    });
};

/**
 * 记录用户通过分享进入游戏的邀请关系
 * @param {string} inviterOpenId 邀请者的openId
 * @returns {Promise} 返回处理结果
 */
export const recordInvitation = async (inviterOpenId) => {
    return await apiRequest('/user/recordInvitation', {
        method: 'POST',
        data: {
            inviterOpenId: inviterOpenId
        }
    });
};

/**
 * 获取用户的邀请统计信息
 * @returns {Promise} 返回邀请统计数据
 */
export const getInvitationStats = async () => {
    return await apiRequest('/user/getInvitationStats', {
        method: 'GET'
    });
};

/**
 * 获取用户的邀请列表
 * @returns {Promise} 返回被邀请用户列表
 */
export const getInvitedUsers = async () => {
    return await apiRequest('/user/getInvitedUsers', {
        method: 'GET'
    });
};

/**
 * 获取好友列表
 * @returns {Promise} 返回好友列表
 */
export const getFriendsList = async () => {
    return await apiRequest('/api/frequency/friends', {
        method: 'GET'
    });
};

/**
 * 获取与指定好友的同频度报告
 * @param {number} reportId 同频度关系ID
 * @returns {Promise} 返回同频度报告
 */
export const getFrequencyReport = async (reportId) => {
    return await apiRequest(`/api/frequency/relation/${reportId}`, {
        method: 'GET'
    });
};

/**
 * 获取我的报告
 * @returns {Promise} 返回我的报告
 */
export const getMyReport = async () => {
    return await apiRequest('/report/my', {
        method: 'GET'
    });
};

/**
 * 获取用户钥匙信息
 * @returns {Promise} 返回钥匙信息
 */
export const getKeyInfo = async () => {
    return await apiRequest('/api/key/info', {
        method: 'GET'
    });
};

/**
 * 获取已解锁的报告列表
 * @returns {Promise} 返回已解锁报告列表
 */
export const getUnlockedReports = async () => {
    return await apiRequest('/api/key/unlock-records', {
        method: 'GET'
    });
};

/**
 * 解锁好友报告
 * @param {number} reportId - 报告ID
 * @returns {Promise} 返回解锁结果
 */
export const unlockFriendReport = async (reportId) => {
    return await apiRequest('/api/key/unlock', {
        method: 'POST',
        data: {
            reportId: reportId,
            keyCost: 1
        }
    });
};

/**
 * 检查报告解锁状态
 * @param {number} reportId - 报告ID
 * @returns {Promise} 返回解锁状态
 */
export const checkUnlockStatus = async (reportId) => {
    return await apiRequest(`/api/key/check-unlock/${reportId}`, {
        method: 'GET'
    });
};

/**
 * 获取好友报告详情
 * @param {number} reportId - 报告ID
 * @returns {Promise} 返回报告详情
 */
export const getFriendReportDetail = async (reportId) => {
    return await apiRequest(`/api/frequency/relation/${reportId}`, {
        method: 'GET'
    });
};

/**
 * 获取微信小程序AccessToken
 * @returns {Promise<string|null>} AccessToken或null
 */
export const getWechatAccessToken = async () => {
    try {
        const response = await apiRequest('/api/share/wechat/access-token', {
            method: 'GET'
        });
        
        if (response && response.data) {
            return response.data;
        } else {
            console.error('获取AccessToken失败: 响应数据为空');
            return null;
        }
    } catch (error) {
        console.error('请求AccessToken接口失败:', error);
        return null;
    }
};

/**
 * 从后端生成小程序二维码
 * @param {number} size - 二维码尺寸
 * @returns {Promise<string|null>} base64编码的图片数据或null
 */
export const generateQRCodeFromBackend = async (size = 280) => {
    try {
        // 获取用户场景值
        const userInfo = wx.getStorageSync('userInfo');
        let scene = '';
        if (userInfo && userInfo.openid) {
            scene = encodeURIComponent(userInfo.openid);
        }
        
        // 构建请求参数
        const requestData = {
            scene: scene,
            page: 'pages/index/index', // 小程序页面路径
            width: size,
            autoColor: false,
            lineColor: { r: 0, g: 0, b: 0 },
            isHyaline: false,
            checkPath: false, // 小游戏设置为false
            envVersion: 'release' // 正式版
        };
        
        const response = await apiRequest('/api/share/wechat/qrcode-json', {
            method: 'POST',
            data: requestData
        });

        if (response && response.data) {
            return response.data; // 返回base64编码的图片数据
        } else {
            throw new Error('后台返回的二维码数据为空');
        }
        
    } catch (error) {
        console.error('调用后台生成小程序码接口失败:', error);
        return null;
    }
};