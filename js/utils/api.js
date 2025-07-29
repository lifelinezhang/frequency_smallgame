// API请求工具函数
export const apiRequest = async (url, options = {}) => {
    const baseURL = 'http://127.0.0.1'; // 替换为你的API域名
    
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    const config = { ...defaultOptions, ...options };
    
    // 添加用户token
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.token) {
        config.headers.Authorization = `Bearer ${userInfo.token}`;
    }
    
    try {
        const response = await fetch(baseURL + url, config);
        const data = await response.json();
        
        if (data.code === '200' || data.code === 200) {
            return data;
        } else {
            throw new Error(data.msg || '请求失败');
        }
    } catch (error) {
        console.error('API请求失败:', error);
        throw error;
    }
};

// 用户登录
export const userLogin = async (code, userInfo) => {
    return await apiRequest('/api/user/login', {
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