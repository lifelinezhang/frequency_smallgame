// 获取共享画布和系统信息
let sharedCanvas = wx.getSharedCanvas();
let context = sharedCanvas.getContext('2d');

const screenWidth = wx.getSystemInfoSync().screenWidth;
const screenHeight = wx.getSystemInfoSync().screenHeight;
const ratio = wx.getSystemInfoSync().pixelRatio;

// 设置画布尺寸
sharedCanvas.width = screenWidth * ratio;
sharedCanvas.height = screenHeight * ratio;
context.scale(ratio, ratio);

// 排行榜数据
let friendsData = [];
let myInfo = {};
let currentUserAnswers = []; // 当前用户的答案
let similarityRanking = []; // 相似度排行榜

/**
 * 初始化开放数据域
 */
function initOpenDataContext() {
    console.log('开放数据域初始化');
    getUserInfo();
    initUI();
}

/**
 * 获取用户信息
 */
function getUserInfo() {
    wx.getUserInfo({
        openIdList: ['selfOpenId'],
        lang: 'zh_CN',
        success: res => {
            if (res.data && res.data.length > 0) {
                myInfo = res.data[0];
                console.log('获取用户信息成功:', myInfo);
            }
        },
        fail: res => {
            console.error('获取用户信息失败:', res);
        }
    });
}

/**
 * 初始化UI界面
 */
function initUI() {
    context.clearRect(0, 0, screenWidth, screenHeight);
    
    // 设置背景
    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    context.fillRect(0, 0, screenWidth, screenHeight);
    
    // 绘制标题
    context.fillStyle = '#ffffff';
    context.font = 'bold 28px Arial';
    context.textAlign = 'center';
    context.fillText('好友相似度排行榜', screenWidth / 2, 60);
    
    // 绘制加载提示
    context.fillStyle = '#cccccc';
    context.font = '16px Arial';
    context.fillText('正在加载排行榜数据...', screenWidth / 2, screenHeight / 2);
}

/**
 * 获取好友答案数据并计算相似度
 * @param {Array} userAnswers - 当前用户的完整答案数据
 */
function getFriendsSimilarityRanking(userAnswers) {
    console.log('开始获取好友答案数据，用户答案:', userAnswers);
    currentUserAnswers = userAnswers;
    
    wx.getFriendCloudStorage({
        keyList: ['completeAnswers', 'answers', 'timestamp', 'totalQuestions'], // 添加completeAnswers字段
        success: res => {
            console.log('🔍 开放域获取好友数据成功:');
            console.log('- 好友总数:', res.data.length);
            console.log('- 原始数据:', res.data);
            
            // 详细检查每个好友的数据
            res.data.forEach((friend, index) => {
                console.log(`好友${index + 1} (${friend.nickname}):`);
                friend.KVDataList.forEach(kv => {
                    console.log(`  - ${kv.key}: ${kv.value ? kv.value.substring(0, 100) + (kv.value.length > 100 ? '...' : '') : 'null'}`);
                });
            });
            
            friendsData = processFriendsAnswers(res.data);
            calculateSimilarity();
            drawSimilarityRankingList();
        },
        fail: res => {
            console.error('获取好友数据失败:', res);
            drawError('获取排行榜数据失败');
        }
    });
}

/**
 * 处理好友答案数据
 * @param {Array} rawData - 原始好友数据
 * @returns {Array} 处理后的好友数据
 */
function processFriendsAnswers(rawData) {
    const processedData = rawData.map(friend => {
        const completeAnswersData = friend.KVDataList.find(kv => kv.key === 'completeAnswers');
        const answersData = friend.KVDataList.find(kv => kv.key === 'answers');
        const timestampData = friend.KVDataList.find(kv => kv.key === 'timestamp');
        const totalQuestionsData = friend.KVDataList.find(kv => kv.key === 'totalQuestions');
        
        let answers = [];
        let completeAnswers = null;
        
        try {
            console.log(`📋 处理好友 ${friend.nickname} 的数据:`);
            console.log('- completeAnswersData存在:', !!completeAnswersData);
            console.log('- answersData存在:', !!answersData);
            
            // 优先使用新的完整答案数据格式
            if (completeAnswersData) {
                console.log('- completeAnswers原始值:', completeAnswersData.value);
                completeAnswers = JSON.parse(completeAnswersData.value);
                answers = completeAnswers.answers || [];
                console.log('✅ 使用完整答案数据，好友:', friend.nickname);
                console.log('- 解析后的answers:', answers);
                console.log('- 答案数:', answers.length);
            } else if (answersData) {
                console.log('- answers原始值:', answersData.value);
                // 回退到旧格式（仅选项）
                const simpleAnswers = JSON.parse(answersData.value);
                answers = simpleAnswers.map((option, index) => ({
                    questionIndex: index,
                    selectedOption: option,
                    questionId: null // 旧数据没有questionId
                }));
                console.log('⚠️ 使用简单答案数据，好友:', friend.nickname, '答案数:', answers.length);
            } else {
                console.log('❌ 没有找到任何答案数据，好友:', friend.nickname);
            }
        } catch (e) {
            console.error('❌ 解析好友答案失败:', friend.nickname, e);
            console.error('- 错误详情:', e.message);
            answers = [];
        }
        
        return {
            openid: friend.openid,
            nickname: friend.nickname,
            avatarUrl: friend.avatarUrl,
            answers: answers,
            completeAnswers: completeAnswers, // 保存完整数据引用
            timestamp: timestampData ? parseInt(timestampData.value) || 0 : 0,
            totalQuestions: totalQuestionsData ? parseInt(totalQuestionsData.value) || 0 : 0
        };
    });
    
    console.log('处理好友数据完成，共', processedData.length, '个好友');
    return processedData;
}

/**
 * 计算答案相似度
 */
function calculateSimilarity() {
    console.log('开始计算相似度，当前用户答案:', currentUserAnswers);
    
    similarityRanking = friendsData.map(friend => {
        const similarity = calculateAnswerSimilarity(currentUserAnswers, friend.answers);
        
        return {
            ...friend,
            similarity: similarity,
            similarityPercentage: Math.round(similarity * 100)
        };
    });
    
    // 按相似度排序，相似度相同时按时间排序
    similarityRanking.sort((a, b) => {
        if (b.similarity !== a.similarity) {
            return b.similarity - a.similarity;
        }
        return a.timestamp - b.timestamp;
    });
    
    console.log('相似度计算完成:', similarityRanking);
}

/**
 * 计算两个答案数组的相似度
 * @param {Array} answers1 - 第一个答案数组（用户答案）
 * @param {Array} answers2 - 第二个答案数组（好友答案）
 * @returns {number} 相似度 (0-1之间)
 */
function calculateAnswerSimilarity(answers1, answers2) {
    if (!answers1 || !answers2 || answers1.length === 0 || answers2.length === 0) {
        console.log('答案数组为空，相似度为0');
        return 0;
    }
    
    const maxLength = Math.max(answers1.length, answers2.length);
    const minLength = Math.min(answers1.length, answers2.length);
    
    let sameCount = 0;
    
    // 比较相同位置的答案
    for (let i = 0; i < minLength; i++) {
        const answer1 = getAnswerOption(answers1[i]);
        const answer2 = getAnswerOption(answers2[i]);
        
        if (answer1 && answer2 && answer1 === answer2) {
            sameCount++;
        }
    }
    
    // 计算相似度：相同答案数 / 总题目数
    const similarity = sameCount / maxLength;
    
    console.log('相似度计算:', {
        sameCount,
        maxLength,
        similarity,
        answers1Length: answers1.length,
        answers2Length: answers2.length
    });
    
    return similarity;
}

/**
 * 从答案对象中提取选项
 * @param {*} answer - 答案对象或字符串
 * @returns {string|null} 选项字符串
 */
function getAnswerOption(answer) {
    if (!answer) {
        return null;
    }
    
    // 如果是对象，提取selectedOption字段
    if (typeof answer === 'object' && answer.selectedOption) {
        return answer.selectedOption;
    }
    
    // 如果是字符串，直接返回
    if (typeof answer === 'string') {
        return answer;
    }
    
    return null;
}

/**
 * 绘制相似度排行榜列表
 */
function drawSimilarityRankingList() {
    // 清空画布
    context.clearRect(0, 0, screenWidth, screenHeight);
    
    // 绘制背景
    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    context.fillRect(0, 0, screenWidth, screenHeight);
    
    // 绘制标题
    context.fillStyle = '#ffffff';
    context.font = 'bold 28px Arial';
    context.textAlign = 'center';
    context.fillText('好友相似度排行榜', screenWidth / 2, 60);
    
    // 绘制说明文字
    context.fillStyle = '#cccccc';
    context.font = '14px Arial';
    context.fillText('根据答题相似度排序', screenWidth / 2, 85);
    
    // 绘制排行榜条目
    const startY = 120;
    const itemHeight = 80;
    const maxItems = Math.min(similarityRanking.length, 8);
    
    for (let i = 0; i < maxItems; i++) {
        const friend = similarityRanking[i];
        const y = startY + i * itemHeight;
        
        drawSimilarityRankingItem(friend, i + 1, y, itemHeight);
    }
    
    // 如果没有好友数据
    if (similarityRanking.length === 0) {
        context.fillStyle = '#999999';
        context.font = '16px Arial';
        context.textAlign = 'center';
        context.fillText('暂无好友答题数据', screenWidth / 2, screenHeight / 2);
    }
}

/**
 * 绘制单个相似度排行榜条目
 * @param {Object} friend - 好友数据
 * @param {number} rank - 排名
 * @param {number} y - Y坐标
 * @param {number} height - 条目高度
 */
function drawSimilarityRankingItem(friend, rank, y, height) {
    const padding = 20;
    const avatarSize = 50;
    
    // 绘制背景
    if (rank <= 3) {
        context.fillStyle = 'rgba(255, 215, 0, 0.2)'; // 前三名金色背景
    } else {
        context.fillStyle = 'rgba(255, 255, 255, 0.05)';
    }
    context.fillRect(padding, y, screenWidth - padding * 2, height);
    
    // 绘制排名
    context.fillStyle = getRankColor(rank);
    context.font = 'bold 24px Arial';
    context.textAlign = 'center';
    context.fillText(rank.toString(), padding + 30, y + height / 2 + 8);
    
    // 绘制头像占位符
    context.fillStyle = '#666666';
    context.fillRect(padding + 70, y + (height - avatarSize) / 2, avatarSize, avatarSize);
    
    // 绘制昵称
    context.fillStyle = '#ffffff';
    context.font = '18px Arial';
    context.textAlign = 'left';
    const maxNicknameWidth = screenWidth - padding * 2 - 200;
    const displayName = truncateText(friend.nickname, maxNicknameWidth, context);
    context.fillText(displayName, padding + 130, y + height / 2 - 5);
    
    // 绘制相似度
    context.fillStyle = getSimilarityColor(friend.similarity);
    context.font = 'bold 20px Arial';
    context.textAlign = 'right';
    context.fillText(friend.similarityPercentage + '%', screenWidth - padding - 20, y + height / 2 - 5);
    
    // 绘制相似度说明
    context.fillStyle = '#cccccc';
    context.font = '12px Arial';
    context.fillText('相似度', screenWidth - padding - 20, y + height / 2 + 15);
}

/**
 * 获取排名颜色
 * @param {number} rank - 排名
 * @returns {string} 颜色值
 */
function getRankColor(rank) {
    switch (rank) {
        case 1: return '#FFD700'; // 金色
        case 2: return '#C0C0C0'; // 银色
        case 3: return '#CD7F32'; // 铜色
        default: return '#ffffff'; // 白色
    }
}

/**
 * 获取相似度颜色
 * @param {number} similarity - 相似度 (0-1)
 * @returns {string} 颜色值
 */
function getSimilarityColor(similarity) {
    if (similarity >= 0.8) return '#00ff00'; // 绿色 - 非常相似
    if (similarity >= 0.6) return '#ffff00'; // 黄色 - 比较相似
    if (similarity >= 0.4) return '#ffa500'; // 橙色 - 一般相似
    return '#ff6b6b'; // 红色 - 不太相似
}

/**
 * 截断文本以适应指定宽度
 * @param {string} text - 原始文本
 * @param {number} maxWidth - 最大宽度
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @returns {string} 截断后的文本
 */
function truncateText(text, maxWidth, ctx) {
    if (ctx.measureText(text).width <= maxWidth) {
        return text;
    }
    
    let truncated = text;
    while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
        truncated = truncated.slice(0, -1);
    }
    return truncated + '...';
}

/**
 * 绘制错误信息
 * @param {string} message - 错误消息
 */
function drawError(message) {
    context.clearRect(0, 0, screenWidth, screenHeight);
    
    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    context.fillRect(0, 0, screenWidth, screenHeight);
    
    context.fillStyle = '#ffffff';
    context.font = 'bold 28px Arial';
    context.textAlign = 'center';
    context.fillText('好友相似度排行榜', screenWidth / 2, 60);
    
    context.fillStyle = '#ff6b6b';
    context.font = '16px Arial';
    context.fillText(message, screenWidth / 2, screenHeight / 2);
}

// 监听主域消息
wx.onMessage(data => {
    console.log('开放数据域接收到消息:', data);
    
    switch (data.type) {
        case 'similarity':
            if (data.action === 'showSimilarityRanking') {
                getFriendsSimilarityRanking(data.userAnswers || []);
            } else if (data.action === 'updateSimilarityRanking') {
                getFriendsSimilarityRanking(data.userAnswers || []);
            }
            break;
        default:
            console.log('未知消息类型:', data.type);
    }
});

// 初始化
initOpenDataContext();