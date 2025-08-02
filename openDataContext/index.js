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
let currentUserAnswers = []; // 当前用户的答案（从微信云存储获取）
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
 * 获取当前用户的云存储答案数据
 */
function getCurrentUserAnswers() {
    return new Promise((resolve, reject) => {
        console.log('🔍 开始获取当前用户云存储数据');
        console.log('- wx.getUserCloudStorage 是否存在:', typeof wx.getUserCloudStorage);
        
        // 检查是否在开放数据域中支持getUserCloudStorage
        if (typeof wx.getUserCloudStorage !== 'function') {
            console.warn('⚠️ 开放数据域不支持wx.getUserCloudStorage，尝试其他方法');
            // 在开放数据域中，可能需要通过getFriendCloudStorage获取自己的数据
            getCurrentUserAnswersFromFriends().then(resolve).catch(() => resolve([]));
            return;
        }
        
        wx.getUserCloudStorage({
            keyList: ['completeAnswers', 'answers'],
            success: res => {
                console.log('🔍 获取当前用户云存储数据成功:');
                console.log('- 响应对象:', res);
                console.log('- KVDataList类型:', typeof res.KVDataList);
                console.log('- KVDataList是否为数组:', Array.isArray(res.KVDataList));
                console.log('- KVDataList长度:', res.KVDataList ? res.KVDataList.length : 'undefined');
                console.log('- KVDataList内容:', res.KVDataList);
                
                let userAnswers = [];
                
                try {
                    if (!res.KVDataList || !Array.isArray(res.KVDataList)) {
                        console.warn('⚠️ KVDataList无效，返回空数组');
                        resolve([]);
                        return;
                    }
                    
                    // 优先使用completeAnswers
                    const completeAnswersData = res.KVDataList.find(kv => kv.key === 'completeAnswers');
                    if (completeAnswersData && completeAnswersData.value) {
                        console.log('✅ 找到completeAnswers数据:', completeAnswersData.value.substring(0, 200) + '...');
                        const completeData = JSON.parse(completeAnswersData.value);
                        
                        // 检查数据格式并提取答案数组
                        if (Array.isArray(completeData)) {
                            userAnswers = completeData;
                        } else if (completeData.answers && Array.isArray(completeData.answers)) {
                            userAnswers = completeData.answers;
                            console.log('📦 从completeAnswers对象中提取answers数组');
                        } else {
                            console.warn('⚠️ completeAnswers数据格式不正确');
                            userAnswers = [];
                        }
                        
                        console.log('✅ 解析completeAnswers成功，数量:', userAnswers.length);
                    } else {
                        console.log('⚠️ 未找到completeAnswers，尝试answers');
                        // 回退到answers
                        const answersData = res.KVDataList.find(kv => kv.key === 'answers');
                        if (answersData && answersData.value) {
                            console.log('✅ 找到answers数据:', answersData.value.substring(0, 200) + '...');
                            const simpleAnswers = JSON.parse(answersData.value);
                            userAnswers = simpleAnswers.map((answer, index) => ({
                                questionId: index + 1,
                                selectedOption: answer
                            }));
                            console.log('✅ 解析answers成功，数量:', userAnswers.length);
                        } else {
                            console.warn('⚠️ 未找到任何答案数据');
                        }
                    }
                    
                    console.log('📊 最终用户答案数据:', userAnswers);
                    resolve(userAnswers);
                } catch (error) {
                    console.error('❌ 解析当前用户答案数据失败:', error);
                    resolve([]);
                }
            },
            fail: res => {
                console.error('❌ 获取当前用户云存储数据失败:', res);
                // 尝试备用方法
                getCurrentUserAnswersFromFriends().then(resolve).catch(() => resolve([]));
            }
        });
    });
}

/**
 * 从好友数据中获取当前用户的答案（备用方法）
 */
function getCurrentUserAnswersFromFriends() {
    return new Promise((resolve, reject) => {
        console.log('🔄 尝试从好友数据中获取当前用户答案');
        
        wx.getFriendCloudStorage({
            keyList: ['completeAnswers', 'answers'],
            success: res => {
                console.log('📥 获取好友数据成功，查找当前用户');
                
                // 查找当前用户的数据（通常是第一个或者有特殊标识）
                const currentUserData = res.data.find(friend => {
                    // 可能需要根据实际情况调整判断逻辑
                    return friend.openid === wx.getStorageSync('openid') || 
                           friend.nickname === wx.getStorageSync('nickname');
                });
                
                if (currentUserData) {
                     console.log('✅ 找到当前用户数据:', currentUserData);
                     // 解析当前用户的答案数据
                     const completeAnswersData = currentUserData.KVDataList.find(kv => kv.key === 'completeAnswers');
                     if (completeAnswersData && completeAnswersData.value) {
                         const completeData = JSON.parse(completeAnswersData.value);
                         
                         // 检查数据格式并提取答案数组
                         let userAnswers = [];
                         if (Array.isArray(completeData)) {
                             userAnswers = completeData;
                         } else if (completeData.answers && Array.isArray(completeData.answers)) {
                             userAnswers = completeData.answers;
                             console.log('📦 从好友数据的completeAnswers对象中提取answers数组');
                         }
                         
                         resolve(userAnswers);
                     } else {
                         const answersData = currentUserData.KVDataList.find(kv => kv.key === 'answers');
                         if (answersData && answersData.value) {
                             const simpleAnswers = JSON.parse(answersData.value);
                             const userAnswers = simpleAnswers.map((answer, index) => ({
                                 questionId: index + 1,
                                 selectedOption: answer
                             }));
                             resolve(userAnswers);
                         } else {
                             resolve([]);
                         }
                     }
                } else {
                    console.warn('⚠️ 在好友数据中未找到当前用户');
                    resolve([]);
                }
            },
            fail: res => {
                console.error('❌ 获取好友数据失败:', res);
                reject(res);
            }
        });
    });
}

/**
 * 获取好友答案数据并计算相似度
 */
function getFriendsSimilarityRanking() {
    console.log('🚀 开始获取好友答案数据');
    
    // 先获取当前用户的答案数据
    getCurrentUserAnswers().then(userAnswers => {
        console.log('📥 getCurrentUserAnswers Promise resolved');
        console.log('- 返回的userAnswers类型:', typeof userAnswers);
        console.log('- 返回的userAnswers是否为数组:', Array.isArray(userAnswers));
        console.log('- 返回的userAnswers长度:', userAnswers ? userAnswers.length : 'undefined');
        console.log('- 返回的userAnswers内容:', userAnswers);
        
        currentUserAnswers = userAnswers;
        console.log('✅ 当前用户答案已设置到全局变量');
        console.log('- currentUserAnswers类型:', typeof currentUserAnswers);
        console.log('- currentUserAnswers是否为数组:', Array.isArray(currentUserAnswers));
        console.log('- currentUserAnswers长度:', currentUserAnswers ? currentUserAnswers.length : 'undefined');
        
        // 然后获取好友数据
        wx.getFriendCloudStorage({
            keyList: ['completeAnswers', 'answers', 'timestamp', 'totalQuestions'],
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
                // drawSimilarityRankingList() 已在 calculateSimilarity() 内部调用
            },
            fail: res => {
                console.error('获取好友数据失败:', res);
                drawError('获取排行榜数据失败');
            }
        });
    }).catch(error => {
        console.error('❌ getCurrentUserAnswers Promise rejected:', error);
        drawError('获取用户答案数据失败');
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
    console.log('🎯 开始计算相似度');
    console.log('- 当前用户答案类型:', typeof currentUserAnswers);
    console.log('- 当前用户答案是否为数组:', Array.isArray(currentUserAnswers));
    console.log('- 当前用户答案长度:', currentUserAnswers ? currentUserAnswers.length : 'undefined');
    console.log('- 当前用户答案内容:', currentUserAnswers);
    console.log('- 好友数据数量:', friendsData.length);
    
    // 处理当前用户答案数据格式
    let userAnswersArray = [];
    if (currentUserAnswers) {
        if (Array.isArray(currentUserAnswers)) {
            // 如果已经是数组格式
            userAnswersArray = currentUserAnswers;
        } else if (currentUserAnswers.answers && Array.isArray(currentUserAnswers.answers)) {
            // 如果是包含answers字段的对象格式
            userAnswersArray = currentUserAnswers.answers;
            console.log('✅ 从对象中提取answers数组，长度:', userAnswersArray.length);
        } else {
            console.error('❌ 无法识别的用户答案数据格式');
            return;
        }
    }
    
    // 验证处理后的用户答案数据
    if (!userAnswersArray || userAnswersArray.length === 0) {
        console.error('❌ 当前用户答案数据无效，无法计算相似度');
        return;
    }
    
    console.log('📊 处理后的用户答案数组:', userAnswersArray);
    
    similarityRanking = friendsData.map((friend, index) => {
        console.log(`\n🔄 计算与好友 ${friend.nickname} 的相似度 (${index + 1}/${friendsData.length})`);
        const similarity = calculateAnswerSimilarity(userAnswersArray, friend.answers);
        
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
    
    console.log('✅ 相似度计算完成，排行榜:', similarityRanking);
    
    // 计算完成后立即绘制排行榜，确保界面及时更新
    drawSimilarityRankingList();
}

/**
 * 计算两个答案数组的相似度
 * @param {Array} answers1 - 第一个答案数组（用户答案）
 * @param {Array} answers2 - 第二个答案数组（好友答案）
 * @returns {number} 相似度 (0-1之间)
 */
function calculateAnswerSimilarity(answers1, answers2) {
    // 详细的调试信息
    console.log('🔍 相似度计算输入参数:');
    console.log('- answers1 类型:', typeof answers1, '值:', answers1);
    console.log('- answers2 类型:', typeof answers2, '值:', answers2);
    console.log('- answers1 是否为数组:', Array.isArray(answers1));
    console.log('- answers2 是否为数组:', Array.isArray(answers2));
    
    // 检查输入参数的有效性
    if (!answers1 || !Array.isArray(answers1)) {
        console.warn('⚠️ answers1 无效:', answers1);
        return 0;
    }
    
    if (!answers2 || !Array.isArray(answers2)) {
        console.warn('⚠️ answers2 无效:', answers2);
        return 0;
    }
    
    if (answers1.length === 0 || answers2.length === 0) {
        console.log('📝 答案数组为空，相似度为0');
        return 0;
    }
    
    const maxLength = Math.max(answers1.length, answers2.length);
    const minLength = Math.min(answers1.length, answers2.length);
    
    let sameCount = 0;
    
    // 比较相同位置的答案
    for (let i = 0; i < minLength; i++) {
        const answer1 = getAnswerOption(answers1[i]);
        const answer2 = getAnswerOption(answers2[i]);
        
        console.log(`比较第${i+1}题: "${answer1}" vs "${answer2}"`);
        
        if (answer1 && answer2 && answer1 === answer2) {
            sameCount++;
            console.log(`✅ 第${i+1}题答案相同`);
        } else {
            console.log(`❌ 第${i+1}题答案不同`);
        }
    }
    
    // 计算相似度：相同答案数 / 总题目数
    const similarity = maxLength > 0 ? sameCount / maxLength : 0;
    
    console.log('📊 相似度计算结果:', {
        sameCount,
        maxLength,
        minLength,
        similarity,
        similarityPercentage: Math.round(similarity * 100) + '%',
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
    console.log('🎨 开始绘制相似度排行榜，数据量:', similarityRanking.length);
    
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
    
    console.log('✅ 排行榜绘制完成');
    
    // 强制刷新画布显示，确保内容立即可见
    try {
        // 使用微信小游戏的画布刷新机制
        if (typeof wx !== 'undefined' && wx.triggerGC) {
            wx.triggerGC();
        }
        
        // 触发重绘事件，确保画布内容更新
        setTimeout(() => {
            console.log('🔄 延迟刷新画布');
            // 再次确保画布内容可见
            context.save();
            context.restore();
        }, 50);
    } catch (error) {
        console.warn('⚠️ 画布刷新操作失败:', error);
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
                console.log('📱 接收到显示排行榜消息，开始处理...');
                getFriendsSimilarityRanking();
            } else if (data.action === 'updateSimilarityRanking') {
                console.log('🔄 接收到更新排行榜消息，开始处理...');
                getFriendsSimilarityRanking();
            } else if (data.action === 'forceRefresh') {
                // 强制刷新排行榜显示
                console.log('🔄 强制刷新排行榜显示');
                if (similarityRanking.length > 0) {
                    drawSimilarityRankingList();
                } else {
                    getFriendsSimilarityRanking();
                }
            }
            break;
        default:
            console.log('未知消息类型:', data.type);
    }
});

// 初始化
initOpenDataContext();