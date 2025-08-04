// API请求工具函数
export const apiRequest = async (url, options = {}) => {
    // const baseURL = 'http://101.43.88.252:8098/api/web'; // 你的API域名
    const baseURL = 'http://127.0.0.1:8098/api/web';
    const defaultOptions = {
        method: 'GET',
        header: {
            'Content-Type': 'application/json',
        },
        timeout: 10000
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

// 用户登录
export const userLogin = async (code, userInfo) => {
    return await apiRequest('/api/user/login', {  // 去掉重复的 /api/web
        method: 'POST',
        data: {
            code: code,
            openid: userInfo.openid,
            nickname: userInfo.nickName,
            avatar: userInfo.avatarUrl,
            gender: userInfo.gender
        }
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