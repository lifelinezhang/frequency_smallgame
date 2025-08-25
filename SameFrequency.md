---
title: SameFrequency
language_tabs:
  - shell: Shell
  - http: HTTP
  - javascript: JavaScript
  - ruby: Ruby
  - python: Python
  - php: PHP
  - java: Java
  - go: Go
toc_footers: []
includes: []
search: true
code_clipboard: true
highlight_theme: darkula
headingLevel: 2
generator: "@tarslib/widdershins v4.0.30"

---

# SameFrequency

Base URLs:

# Authentication

# 广告管理

## GET 获取广告列表

GET /api/ad/list

获取可用的广告列表
获取广告列表
获取用户可观看的广告列表

> 返回示例

> 200 Response

```json
{
  "code": "",
  "msg": "",
  "data": [
    {
      "id": 0,
      "title": "",
      "description": "",
      "adUrl": "",
      "adType": 0,
      "rewardKeys": 0,
      "duration": 0,
      "dailyLimit": 0,
      "todayWatchCount": 0,
      "canWatch": false
    }
  ]
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[ResponseDataListAdVO](#schemaresponsedatalistadvo)|

## POST 观看广告

POST /api/ad/watch

观看广告
观看广告
用户观看广告并获得钥匙奖励

> Body 请求参数

```json
{
  "adId": 0,
  "watchDuration": 0
}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|body|body|[WatchAdCommand](#schemawatchadcommand)| 否 |none|

> 返回示例

> 200 Response

```json
{
  "code": "",
  "msg": "",
  "data": {
    "id": 0,
    "adId": 0,
    "adTitle": "",
    "watchDuration": 0,
    "isCompleted": false,
    "rewardKeys": 0,
    "watchTime": ""
  }
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[ResponseDataAdWatchRecordVO](#schemaresponsedataadwatchrecordvo)|

## GET 获取观看记录

GET /api/ad/watch-records

获取用户观看广告记录
获取观看记录
获取用户的广告观看历史记录

> 返回示例

> 200 Response

```json
{
  "code": "",
  "msg": "",
  "data": [
    {
      "id": 0,
      "adId": 0,
      "adTitle": "",
      "watchDuration": 0,
      "isCompleted": false,
      "rewardKeys": 0,
      "watchTime": ""
    }
  ]
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[ResponseDataListAdWatchRecordVO](#schemaresponsedatalistadwatchrecordvo)|

# 钥匙管理

## GET 获取钥匙信息

GET /api/key/info

获取用户钥匙信息
获取钥匙信息
获取用户的钥匙数量和使用统计

> 返回示例

> 200 Response

```json
{
  "code": "",
  "msg": "",
  "data": {
    "custId": 0,
    "nickname": "",
    "keyCount": 0,
    "todayUnlockCount": 0,
    "totalUnlockCount": 0
  }
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[ResponseDataUserKeyInfoVO](#schemaresponsedatauserkeyinfovo)|

## POST 解锁同频度报告

POST /api/key/unlock

解锁同频度报告
解锁同频度报告
使用钥匙解锁其他用户的同频度报告

> Body 请求参数

```json
{
  "reportId": 0,
  "keyCost": 1
}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|body|body|[UnlockFrequencyReportCommand](#schemaunlockfrequencyreportcommand)| 否 |none|

> 返回示例

> 200 Response

```json
{
  "code": "UNLOCK_FREQUENCY_REPORT_ERROR",
  "msg": "解锁同频度报告失败：",
  "data": {}
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[ResponseData](#schemaresponsedata)|

## GET 获取解锁记录

GET /api/key/unlock-records

获取解锁记录
获取解锁记录
获取用户的报告解锁历史记录

> 返回示例

> 200 Response

```json
{
  "code": "",
  "msg": "",
  "data": [
    {
      "id": 0,
      "custId": 0,
      "targetCustId": 0,
      "reportId": 0,
      "reportTitle": "",
      "targetUserNickname": "",
      "keyCost": 0,
      "unlockTime": ""
    }
  ]
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[ResponseDataListKeyUnlockRecordVO](#schemaresponsedatalistkeyunlockrecordvo)|

## GET 检查解锁状态

GET /api/key/check-unlock/{reportId}

检查报告解锁状态
检查解锁状态
检查用户是否已解锁指定报告

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|reportId|path|integer| 是 |报告ID|

> 返回示例

> 200 Response

```json
{
  "code": "",
  "msg": "",
  "data": false
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[ResponseDataBoolean](#schemaresponsedataboolean)|

## POST 增加钥匙

POST /api/key/add

增加钥匙数量（管理员接口或奖励接口）
增加钥匙
增加用户的钥匙数量

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|keyCount|query|integer| 是 |增加的钥匙数量|

> 返回示例

> 200 Response

```json
{
  "code": "",
  "msg": "",
  "data": ""
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[ResponseDataString](#schemaresponsedatastring)|

# 报告管理

## GET 获取我的最新报告

GET /report/my

获取用户最新的报告
获取我的最新报告
获取当前用户的最新报告

> 返回示例

> 200 Response

```json
{
  "code": "",
  "msg": "",
  "data": {
    "id": 0,
    "custId": 0,
    "title": "",
    "content": "",
    "totalCount": 0,
    "completionTime": "",
    "isPublic": false,
    "viewCount": 0,
    "createTime": "",
    "isGenerator": false
  }
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[ResponseDataReportVO](#schemaresponsedatareportvo)|

## GET 获取报告详情

GET /report/{reportId}

获取报告详情
获取报告详情
根据ID获取报告详细内容

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|reportId|path|integer| 是 |报告ID|

> 返回示例

> 200 Response

```json
{
  "code": "",
  "msg": "",
  "data": {
    "id": 0,
    "custId": 0,
    "title": "",
    "content": "",
    "totalCount": 0,
    "completionTime": "",
    "isPublic": false,
    "viewCount": 0,
    "createTime": "",
    "isGenerator": false
  }
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[ResponseDataReportVO](#schemaresponsedatareportvo)|

# 用户管理

## POST 用户登录

POST /api/user/login

用户登录
微信小程序用户登录

> Body 请求参数

```json
{
  "code": "string",
  "openid": "string",
  "inviterOpenId": "string",
  "nickname": "string",
  "avatar": "string",
  "gender": 0
}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|body|body|[UserLoginCommand](#schemauserlogincommand)| 否 |none|

> 返回示例

> 200 Response

```json
{
  "code": "",
  "msg": "",
  "data": {
    "id": 0,
    "openid": "",
    "unionid": "",
    "nickname": "",
    "avatar": "",
    "gender": 0,
    "phone": "",
    "token": ""
  }
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[ResponseDataUserInfoVO](#schemaresponsedatauserinfovo)|

## GET 获取用户信息

GET /api/user/info/{id}

获取用户信息
根据用户ID获取用户信息

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|id|path|integer| 是 |none|

> 返回示例

> 200 Response

```json
{
  "code": "",
  "msg": "",
  "data": {
    "id": 0,
    "openid": "",
    "unionid": "",
    "nickname": "",
    "avatar": "",
    "gender": 0,
    "phone": "",
    "token": ""
  }
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[ResponseDataUserInfoVO](#schemaresponsedatauserinfovo)|

## GET 根据OpenID获取用户

GET /api/user/openid/{openid}

根据OpenID获取用户
根据微信OpenID获取用户信息

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|openid|path|string| 是 |none|

> 返回示例

> 200 Response

```json
{
  "code": "",
  "msg": "",
  "data": {
    "id": 0,
    "openid": "",
    "unionid": "",
    "nickname": "",
    "avatar": "",
    "gender": 0,
    "phone": "",
    "token": ""
  }
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[ResponseDataUserInfoVO](#schemaresponsedatauserinfovo)|

## PUT 更新用户信息

PUT /api/user/update

更新用户信息
更新用户基本信息

> Body 请求参数

```json
{
  "openid": "string",
  "unionid": "string",
  "nickname": "string",
  "avatar": "string",
  "gender": -127,
  "phone": "string",
  "id": 0
}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|body|body|[UserRegisterCommand](#schemauserregistercommand)| 否 |none|

> 返回示例

> 200 Response

```json
{
  "code": "",
  "msg": "",
  "data": {
    "id": 0,
    "openid": "",
    "unionid": "",
    "nickname": "",
    "avatar": "",
    "gender": 0,
    "phone": "",
    "token": ""
  }
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[ResponseDataUserInfoVO](#schemaresponsedatauserinfovo)|

## POST 增加用户钥匙

POST /api/user/add-keys/{userId}

增加用户钥匙
为用户增加指定数量的钥匙

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|userId|path|integer| 是 |none|
|keyCount|query|integer| 是 |none|

> 返回示例

> 200 Response

```json
{
  "code": "",
  "msg": "",
  "data": false
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[ResponseDataBoolean](#schemaresponsedataboolean)|

## POST 消耗用户钥匙

POST /api/user/consume-keys/{userId}

消耗用户钥匙
消耗用户指定数量的钥匙

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|userId|path|integer| 是 |none|
|keyCount|query|integer| 是 |none|

> 返回示例

> 200 Response

```json
{
  "code": "",
  "msg": "",
  "data": false
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[ResponseDataBoolean](#schemaresponsedataboolean)|

# 题目管理

## POST 获取题目列表

POST /question/getList

开始答题
获取题目列表
获取题目列表，开始答题会话

> Body 请求参数

```json
{}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|body|body|[StartQuizCommand](#schemastartquizcommand)| 否 |none|

> 返回示例

> 200 Response

```json
{
  "code": "",
  "msg": "",
  "data": {
    "questions": [
      {
        "id": 0,
        "title": "",
        "content": "",
        "options": {
          "": ""
        },
        "category": "",
        "sortOrder": 0
      }
    ],
    "totalCount": 0,
    "category": ""
  }
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[ResponseDataQuizSessionVO](#schemaresponsedataquizsessionvo)|

## POST 提交单个题目答案

POST /question/submit

提交单个题目答案
提交单个题目答案
提交用户的答题结果

> Body 请求参数

```json
{
  "questionId": 0,
  "selectedOption": "string"
}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|body|body|[SubmitAnswerCommand](#schemasubmitanswercommand)| 否 |none|

> 返回示例

> 200 Response

```json
{
  "code": "",
  "msg": "",
  "data": ""
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[ResponseDataString](#schemaresponsedatastring)|

## GET 获取答题记录

GET /question/getAnswerHistory

获取用户答题记录
获取答题记录
获取用户的答题记录

> 返回示例

> 200 Response

```json
{
  "code": "",
  "msg": "",
  "data": [
    {
      "id": 0,
      "custId": 0,
      "questionId": 0,
      "answerContent": "",
      "answerTime": "",
      "createTime": "",
      "updateTime": ""
    }
  ]
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[ResponseDataListFreqUserAnswer](#schemaresponsedatalistfrequseranswer)|

# 同频度管理

## POST 添加好友

POST /api/frequency/add-friend

添加好友
添加好友关系，支持传入用户ID或OpenID

> Body 请求参数

```json
{
  "friendId": 0,
  "friendOpenId": "string"
}
```

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|body|body|[AddFriendCommand](#schemaaddfriendcommand)| 否 |none|

> 返回示例

> 200 Response

```json
{
  "code": "",
  "msg": "",
  "data": false
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[ResponseDataBoolean](#schemaresponsedataboolean)|

## DELETE 删除好友

DELETE /api/frequency/remove-friend/{friendId}

删除好友
删除好友关系

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|friendId|path|integer| 是 |好友ID|

> 返回示例

> 200 Response

```json
{
  "code": "",
  "msg": "",
  "data": false
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[ResponseDataBoolean](#schemaresponsedataboolean)|

## GET 获取好友列表

GET /api/frequency/friends

获取好友列表
获取当前用户的好友列表

> 返回示例

> 200 Response

```json
{
  "code": "",
  "msg": "",
  "data": [
    {
      "reportId": 0,
      "firstCustId": 0,
      "firstCustNickname": "",
      "firstCustAvatar": "",
      "secondCustId": 0,
      "secondCustNickname": "",
      "secondCustAvatar": "",
      "isFriend": false,
      "hasReport": false,
      "createTime": ""
    }
  ]
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[ResponseDataListFrequencyRelationVO](#schemaresponsedatalistfrequencyrelationvo)|

## GET 获取同频度关系

GET /api/frequency/relation/{reportId}

获取同频度关系
根据同频度关系ID获取同频度信息

### 请求参数

|名称|位置|类型|必选|说明|
|---|---|---|---|---|
|reportId|path|integer| 是 |同频度关系ID|

> 返回示例

> 200 Response

```json
{
  "code": "",
  "msg": "",
  "data": {
    "frequency": "",
    "report": "",
    "isGenerator": false
  }
}
```

### 返回结果

|状态码|状态码含义|说明|数据模型|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|[ResponseDataFrequencyVO](#schemaresponsedatafrequencyvo)|

# 数据模型

<h2 id="tocS_AdVO">AdVO</h2>

<a id="schemaadvo"></a>
<a id="schema_AdVO"></a>
<a id="tocSadvo"></a>
<a id="tocsadvo"></a>

```json
{
  "id": 0,
  "title": "string",
  "description": "string",
  "adUrl": "string",
  "adType": 0,
  "rewardKeys": 0,
  "duration": 0,
  "dailyLimit": 0,
  "todayWatchCount": 0,
  "canWatch": true
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|id|integer(int64)|false|none||广告ID|
|title|string|false|none||广告标题|
|description|string|false|none||广告描述|
|adUrl|string|false|none||广告链接|
|adType|integer|false|none||广告类型 1-视频广告 2-图片广告 3-文字广告|
|rewardKeys|integer|false|none||观看后奖励的钥匙数量|
|duration|integer|false|none||广告时长(秒)|
|dailyLimit|integer|false|none||每日观看次数限制|
|todayWatchCount|integer|false|none||今日已观看次数|
|canWatch|boolean|false|none||是否可以观看|

<h2 id="tocS_ResponseDataListAdVO">ResponseDataListAdVO</h2>

<a id="schemaresponsedatalistadvo"></a>
<a id="schema_ResponseDataListAdVO"></a>
<a id="tocSresponsedatalistadvo"></a>
<a id="tocsresponsedatalistadvo"></a>

```json
{
  "code": "string",
  "msg": "string",
  "data": [
    {
      "id": 0,
      "title": "string",
      "description": "string",
      "adUrl": "string",
      "adType": 0,
      "rewardKeys": 0,
      "duration": 0,
      "dailyLimit": 0,
      "todayWatchCount": 0,
      "canWatch": true
    }
  ]
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|code|string|false|none||返回码|
|msg|string|false|none||返回描述|
|data|[[AdVO](#schemaadvo)]|false|none||none|

<h2 id="tocS_AdWatchRecordVO">AdWatchRecordVO</h2>

<a id="schemaadwatchrecordvo"></a>
<a id="schema_AdWatchRecordVO"></a>
<a id="tocSadwatchrecordvo"></a>
<a id="tocsadwatchrecordvo"></a>

```json
{
  "id": 0,
  "adId": 0,
  "adTitle": "string",
  "watchDuration": 0,
  "isCompleted": true,
  "rewardKeys": 0,
  "watchTime": "string"
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|id|integer(int64)|false|none||记录ID|
|adId|integer(int64)|false|none||广告ID|
|adTitle|string|false|none||广告标题|
|watchDuration|integer|false|none||观看时长(秒)|
|isCompleted|boolean|false|none||是否完整观看|
|rewardKeys|integer|false|none||获得的钥匙数量|
|watchTime|string|false|none||观看时间|

<h2 id="tocS_ResponseDataAdWatchRecordVO">ResponseDataAdWatchRecordVO</h2>

<a id="schemaresponsedataadwatchrecordvo"></a>
<a id="schema_ResponseDataAdWatchRecordVO"></a>
<a id="tocSresponsedataadwatchrecordvo"></a>
<a id="tocsresponsedataadwatchrecordvo"></a>

```json
{
  "code": "string",
  "msg": "string",
  "data": {
    "id": 0,
    "adId": 0,
    "adTitle": "string",
    "watchDuration": 0,
    "isCompleted": true,
    "rewardKeys": 0,
    "watchTime": "string"
  }
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|code|string|false|none||返回码|
|msg|string|false|none||返回描述|
|data|[AdWatchRecordVO](#schemaadwatchrecordvo)|false|none||none|

<h2 id="tocS_WatchAdCommand">WatchAdCommand</h2>

<a id="schemawatchadcommand"></a>
<a id="schema_WatchAdCommand"></a>
<a id="tocSwatchadcommand"></a>
<a id="tocswatchadcommand"></a>

```json
{
  "adId": 0,
  "watchDuration": 0
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|adId|integer(int64)|true|none||广告ID|
|watchDuration|integer|true|none||观看时长(秒)|

<h2 id="tocS_ResponseDataListAdWatchRecordVO">ResponseDataListAdWatchRecordVO</h2>

<a id="schemaresponsedatalistadwatchrecordvo"></a>
<a id="schema_ResponseDataListAdWatchRecordVO"></a>
<a id="tocSresponsedatalistadwatchrecordvo"></a>
<a id="tocsresponsedatalistadwatchrecordvo"></a>

```json
{
  "code": "string",
  "msg": "string",
  "data": [
    {
      "id": 0,
      "adId": 0,
      "adTitle": "string",
      "watchDuration": 0,
      "isCompleted": true,
      "rewardKeys": 0,
      "watchTime": "string"
    }
  ]
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|code|string|false|none||返回码|
|msg|string|false|none||返回描述|
|data|[[AdWatchRecordVO](#schemaadwatchrecordvo)]|false|none||none|

<h2 id="tocS_UserKeyInfoVO">UserKeyInfoVO</h2>

<a id="schemauserkeyinfovo"></a>
<a id="schema_UserKeyInfoVO"></a>
<a id="tocSuserkeyinfovo"></a>
<a id="tocsuserkeyinfovo"></a>

```json
{
  "custId": 0,
  "nickname": "string",
  "keyCount": 0,
  "todayUnlockCount": 0,
  "totalUnlockCount": 0
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|custId|integer(int64)|false|none||用户ID|
|nickname|string|false|none||用户昵称|
|keyCount|integer|false|none||钥匙数量|
|todayUnlockCount|integer|false|none||今日已解锁次数|
|totalUnlockCount|integer|false|none||总解锁次数|

<h2 id="tocS_ResponseDataUserKeyInfoVO">ResponseDataUserKeyInfoVO</h2>

<a id="schemaresponsedatauserkeyinfovo"></a>
<a id="schema_ResponseDataUserKeyInfoVO"></a>
<a id="tocSresponsedatauserkeyinfovo"></a>
<a id="tocsresponsedatauserkeyinfovo"></a>

```json
{
  "code": "string",
  "msg": "string",
  "data": {
    "custId": 0,
    "nickname": "string",
    "keyCount": 0,
    "todayUnlockCount": 0,
    "totalUnlockCount": 0
  }
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|code|string|false|none||返回码|
|msg|string|false|none||返回描述|
|data|[UserKeyInfoVO](#schemauserkeyinfovo)|false|none||none|

<h2 id="tocS_ReportVO">ReportVO</h2>

<a id="schemareportvo"></a>
<a id="schema_ReportVO"></a>
<a id="tocSreportvo"></a>
<a id="tocsreportvo"></a>

```json
{
  "id": 0,
  "custId": 0,
  "title": "string",
  "content": "string",
  "totalCount": 0,
  "completionTime": "string",
  "isPublic": true,
  "viewCount": 0,
  "createTime": "string",
  "isGenerator": true
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|id|integer(int64)|false|none||报告ID|
|custId|integer(int64)|false|none||客户ID|
|title|string|false|none||报告标题|
|content|string|false|none||报告内容|
|totalCount|integer|false|none||总题目数|
|completionTime|string|false|none||完成时间|
|isPublic|boolean|false|none||是否公开 0-私有 1-公开|
|viewCount|integer|false|none||查看次数|
|createTime|string|false|none||创建时间|
|isGenerator|boolean|false|none||是否正在生成|

<h2 id="tocS_ResponseData">ResponseData</h2>

<a id="schemaresponsedata"></a>
<a id="schema_ResponseData"></a>
<a id="tocSresponsedata"></a>
<a id="tocsresponsedata"></a>

```json
{
  "code": "string",
  "msg": "string",
  "data": {}
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|code|string|false|none||返回码|
|msg|string|false|none||返回描述|
|data|object|false|none||none|

<h2 id="tocS_ResponseDataReportVO">ResponseDataReportVO</h2>

<a id="schemaresponsedatareportvo"></a>
<a id="schema_ResponseDataReportVO"></a>
<a id="tocSresponsedatareportvo"></a>
<a id="tocsresponsedatareportvo"></a>

```json
{
  "code": "string",
  "msg": "string",
  "data": {
    "id": 0,
    "custId": 0,
    "title": "string",
    "content": "string",
    "totalCount": 0,
    "completionTime": "string",
    "isPublic": true,
    "viewCount": 0,
    "createTime": "string",
    "isGenerator": true
  }
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|code|string|false|none||返回码|
|msg|string|false|none||返回描述|
|data|[ReportVO](#schemareportvo)|false|none||none|

<h2 id="tocS_UnlockFrequencyReportCommand">UnlockFrequencyReportCommand</h2>

<a id="schemaunlockfrequencyreportcommand"></a>
<a id="schema_UnlockFrequencyReportCommand"></a>
<a id="tocSunlockfrequencyreportcommand"></a>
<a id="tocsunlockfrequencyreportcommand"></a>

```json
{
  "reportId": 0,
  "keyCost": 1
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|reportId|integer(int64)|true|none||要解锁的同频度关系ID|
|keyCost|integer|false|none||消耗钥匙数量|

<h2 id="tocS_UnlockReportCommand">UnlockReportCommand</h2>

<a id="schemaunlockreportcommand"></a>
<a id="schema_UnlockReportCommand"></a>
<a id="tocSunlockreportcommand"></a>
<a id="tocsunlockreportcommand"></a>

```json
{
  "reportId": 0,
  "keyCost": 1
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|reportId|integer(int64)|true|none||要解锁的报告ID|
|keyCost|integer|false|none||消耗钥匙数量|

<h2 id="tocS_KeyUnlockRecordVO">KeyUnlockRecordVO</h2>

<a id="schemakeyunlockrecordvo"></a>
<a id="schema_KeyUnlockRecordVO"></a>
<a id="tocSkeyunlockrecordvo"></a>
<a id="tocskeyunlockrecordvo"></a>

```json
{
  "id": 0,
  "custId": 0,
  "targetCustId": 0,
  "reportId": 0,
  "reportTitle": "string",
  "targetUserNickname": "string",
  "keyCost": 0,
  "unlockTime": "string"
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|id|integer(int64)|false|none||解锁记录ID|
|custId|integer(int64)|false|none||解锁客户ID|
|targetCustId|integer(int64)|false|none||被解锁客户ID|
|reportId|integer(int64)|false|none||被解锁的报告ID|
|reportTitle|string|false|none||被解锁的报告标题|
|targetUserNickname|string|false|none||被解锁用户昵称|
|keyCost|integer|false|none||消耗钥匙数量|
|unlockTime|string|false|none||解锁时间|

<h2 id="tocS_ResponseDataListKeyUnlockRecordVO">ResponseDataListKeyUnlockRecordVO</h2>

<a id="schemaresponsedatalistkeyunlockrecordvo"></a>
<a id="schema_ResponseDataListKeyUnlockRecordVO"></a>
<a id="tocSresponsedatalistkeyunlockrecordvo"></a>
<a id="tocsresponsedatalistkeyunlockrecordvo"></a>

```json
{
  "code": "string",
  "msg": "string",
  "data": [
    {
      "id": 0,
      "custId": 0,
      "targetCustId": 0,
      "reportId": 0,
      "reportTitle": "string",
      "targetUserNickname": "string",
      "keyCost": 0,
      "unlockTime": "string"
    }
  ]
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|code|string|false|none||返回码|
|msg|string|false|none||返回描述|
|data|[[KeyUnlockRecordVO](#schemakeyunlockrecordvo)]|false|none||none|

<h2 id="tocS_ResponseDataBoolean">ResponseDataBoolean</h2>

<a id="schemaresponsedataboolean"></a>
<a id="schema_ResponseDataBoolean"></a>
<a id="tocSresponsedataboolean"></a>
<a id="tocsresponsedataboolean"></a>

```json
{
  "code": "string",
  "msg": "string",
  "data": true
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|code|string|false|none||返回码|
|msg|string|false|none||返回描述|
|data|boolean|false|none||none|

<h2 id="tocS_ResponseDataString">ResponseDataString</h2>

<a id="schemaresponsedatastring"></a>
<a id="schema_ResponseDataString"></a>
<a id="tocSresponsedatastring"></a>
<a id="tocsresponsedatastring"></a>

```json
{
  "code": "string",
  "msg": "string",
  "data": "string"
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|code|string|false|none||返回码|
|msg|string|false|none||返回描述|
|data|string|false|none||none|

<h2 id="tocS_ResponseDataListReportVO">ResponseDataListReportVO</h2>

<a id="schemaresponsedatalistreportvo"></a>
<a id="schema_ResponseDataListReportVO"></a>
<a id="tocSresponsedatalistreportvo"></a>
<a id="tocsresponsedatalistreportvo"></a>

```json
{
  "code": "string",
  "msg": "string",
  "data": [
    {
      "id": 0,
      "custId": 0,
      "title": "string",
      "content": "string",
      "totalCount": 0,
      "completionTime": "string",
      "isPublic": true,
      "viewCount": 0,
      "createTime": "string",
      "isGenerator": true
    }
  ]
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|code|string|false|none||返回码|
|msg|string|false|none||返回描述|
|data|[[ReportVO](#schemareportvo)]|false|none||none|

<h2 id="tocS_UserInfoVO">UserInfoVO</h2>

<a id="schemauserinfovo"></a>
<a id="schema_UserInfoVO"></a>
<a id="tocSuserinfovo"></a>
<a id="tocsuserinfovo"></a>

```json
{
  "id": 0,
  "openid": "string",
  "unionid": "string",
  "nickname": "string",
  "avatar": "string",
  "gender": 0,
  "phone": "string",
  "token": "string"
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|id|integer(int64)|false|none||用户ID|
|openid|string|false|none||微信OpenID|
|unionid|string|false|none||微信UnionID|
|nickname|string|false|none||用户昵称|
|avatar|string|false|none||用户头像URL|
|gender|integer|false|none||性别 0-未知 1-男 2-女|
|phone|string|false|none||手机号|
|token|string|false|none||JWT令牌|

<h2 id="tocS_ResponseDataUserInfoVO">ResponseDataUserInfoVO</h2>

<a id="schemaresponsedatauserinfovo"></a>
<a id="schema_ResponseDataUserInfoVO"></a>
<a id="tocSresponsedatauserinfovo"></a>
<a id="tocsresponsedatauserinfovo"></a>

```json
{
  "code": "string",
  "msg": "string",
  "data": {
    "id": 0,
    "openid": "string",
    "unionid": "string",
    "nickname": "string",
    "avatar": "string",
    "gender": 0,
    "phone": "string",
    "token": "string"
  }
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|code|string|false|none||返回码|
|msg|string|false|none||返回描述|
|data|[UserInfoVO](#schemauserinfovo)|false|none||none|

<h2 id="tocS_UserRegisterCommand">UserRegisterCommand</h2>

<a id="schemauserregistercommand"></a>
<a id="schema_UserRegisterCommand"></a>
<a id="tocSuserregistercommand"></a>
<a id="tocsuserregistercommand"></a>

```json
{
  "openid": "string",
  "unionid": "string",
  "nickname": "string",
  "avatar": "string",
  "gender": -127,
  "phone": "string",
  "id": 0
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|openid|string|true|none||微信OpenID|
|unionid|string|false|none||微信UnionID|
|nickname|string|false|none||用户昵称|
|avatar|string|false|none||用户头像URL|
|gender|integer|false|none||性别 0-未知 1-男 2-女|
|phone|string|false|none||手机号|
|id|integer(int64)|false|none||用户ID（更新时使用）|

<h2 id="tocS_UserLoginCommand">UserLoginCommand</h2>

<a id="schemauserlogincommand"></a>
<a id="schema_UserLoginCommand"></a>
<a id="tocSuserlogincommand"></a>
<a id="tocsuserlogincommand"></a>

```json
{
  "code": "string",
  "openid": "string",
  "inviterOpenId": "string",
  "nickname": "string",
  "avatar": "string",
  "gender": 0
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|code|string|true|none||微信授权码|
|openid|string|false|none||微信OpenID|
|inviterOpenId|string|false|none||邀请者微信OpenID|
|nickname|string|false|none||用户昵称|
|avatar|string|false|none||用户头像URL|
|gender|integer|false|none||性别 0-未知 1-男 2-女|

<h2 id="tocS_QuestionVO">QuestionVO</h2>

<a id="schemaquestionvo"></a>
<a id="schema_QuestionVO"></a>
<a id="tocSquestionvo"></a>
<a id="tocsquestionvo"></a>

```json
{
  "id": 0,
  "title": "string",
  "content": "string",
  "options": {
    "key": "string"
  },
  "category": "string",
  "sortOrder": 0
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|id|integer(int64)|false|none||题目ID|
|title|string|false|none||题目标题|
|content|string|false|none||题目内容描述|
|options|[LinkedHashMapString](#schemalinkedhashmapstring)|false|none||选项列表|
|category|string|false|none||题目分类|
|sortOrder|integer|false|none||排序序号|

<h2 id="tocS_LinkedHashMapString">LinkedHashMapString</h2>

<a id="schemalinkedhashmapstring"></a>
<a id="schema_LinkedHashMapString"></a>
<a id="tocSlinkedhashmapstring"></a>
<a id="tocslinkedhashmapstring"></a>

```json
{
  "key": "string"
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|key|string|false|none||none|

<h2 id="tocS_QuizSessionVO">QuizSessionVO</h2>

<a id="schemaquizsessionvo"></a>
<a id="schema_QuizSessionVO"></a>
<a id="tocSquizsessionvo"></a>
<a id="tocsquizsessionvo"></a>

```json
{
  "questions": [
    {
      "id": 0,
      "title": "string",
      "content": "string",
      "options": {
        "key": "string"
      },
      "category": "string",
      "sortOrder": 0
    }
  ],
  "totalCount": 0,
  "category": "string"
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|questions|[[QuestionVO](#schemaquestionvo)]|false|none||题目列表|
|totalCount|integer|false|none||总题目数|
|category|string|false|none||题目分类|

<h2 id="tocS_ResponseDataQuizSessionVO">ResponseDataQuizSessionVO</h2>

<a id="schemaresponsedataquizsessionvo"></a>
<a id="schema_ResponseDataQuizSessionVO"></a>
<a id="tocSresponsedataquizsessionvo"></a>
<a id="tocsresponsedataquizsessionvo"></a>

```json
{
  "code": "string",
  "msg": "string",
  "data": {
    "questions": [
      {
        "id": 0,
        "title": "string",
        "content": "string",
        "options": {
          "key": "string"
        },
        "category": "string",
        "sortOrder": 0
      }
    ],
    "totalCount": 0,
    "category": "string"
  }
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|code|string|false|none||返回码|
|msg|string|false|none||返回描述|
|data|[QuizSessionVO](#schemaquizsessionvo)|false|none||none|

<h2 id="tocS_StartQuizCommand">StartQuizCommand</h2>

<a id="schemastartquizcommand"></a>
<a id="schema_StartQuizCommand"></a>
<a id="tocSstartquizcommand"></a>
<a id="tocsstartquizcommand"></a>

```json
{}

```

### 属性

*None*

<h2 id="tocS_SubmitAnswerCommand">SubmitAnswerCommand</h2>

<a id="schemasubmitanswercommand"></a>
<a id="schema_SubmitAnswerCommand"></a>
<a id="tocSsubmitanswercommand"></a>
<a id="tocssubmitanswercommand"></a>

```json
{
  "questionId": 0,
  "selectedOption": "string"
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|questionId|integer(int64)|true|none||题目ID|
|selectedOption|string|true|none||选择的选项索引（如：A、B、C、D 或 0、1、2、3）|

<h2 id="tocS_FreqUserAnswer">FreqUserAnswer</h2>

<a id="schemafrequseranswer"></a>
<a id="schema_FreqUserAnswer"></a>
<a id="tocSfrequseranswer"></a>
<a id="tocsfrequseranswer"></a>

```json
{
  "id": 0,
  "custId": 0,
  "questionId": 0,
  "answerContent": "string",
  "answerTime": "string",
  "createTime": "string",
  "updateTime": "string"
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|id|integer(int64)|false|none||答案记录ID|
|custId|integer(int64)|false|none||客户ID|
|questionId|integer(int64)|false|none||题目ID|
|answerContent|string|false|none||用户答案内容|
|answerTime|string|false|none||答题时间|
|createTime|string|false|none||创建时间|
|updateTime|string|false|none||更新时间|

<h2 id="tocS_ResponseDataListFreqUserAnswer">ResponseDataListFreqUserAnswer</h2>

<a id="schemaresponsedatalistfrequseranswer"></a>
<a id="schema_ResponseDataListFreqUserAnswer"></a>
<a id="tocSresponsedatalistfrequseranswer"></a>
<a id="tocsresponsedatalistfrequseranswer"></a>

```json
{
  "code": "string",
  "msg": "string",
  "data": [
    {
      "id": 0,
      "custId": 0,
      "questionId": 0,
      "answerContent": "string",
      "answerTime": "string",
      "createTime": "string",
      "updateTime": "string"
    }
  ]
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|code|string|false|none||返回码|
|msg|string|false|none||返回描述|
|data|[[FreqUserAnswer](#schemafrequseranswer)]|false|none||none|

<h2 id="tocS_AddFriendCommand">AddFriendCommand</h2>

<a id="schemaaddfriendcommand"></a>
<a id="schema_AddFriendCommand"></a>
<a id="tocSaddfriendcommand"></a>
<a id="tocsaddfriendcommand"></a>

```json
{
  "friendId": 0,
  "friendOpenId": "string"
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|friendId|integer(int64)|false|none||要添加的好友ID（与friendOpenId二选一）|
|friendOpenId|string|false|none||要添加的好友OpenID（与friendId二选一）|

<h2 id="tocS_FrequencyRelationVO">FrequencyRelationVO</h2>

<a id="schemafrequencyrelationvo"></a>
<a id="schema_FrequencyRelationVO"></a>
<a id="tocSfrequencyrelationvo"></a>
<a id="tocsfrequencyrelationvo"></a>

```json
{
  "reportId": 0,
  "firstCustId": 0,
  "firstCustNickname": "string",
  "firstCustAvatar": "string",
  "secondCustId": 0,
  "secondCustNickname": "string",
  "secondCustAvatar": "string",
  "isFriend": true,
  "hasReport": true,
  "createTime": "string"
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|reportId|integer(int64)|false|none||同频度报告id|
|firstCustId|integer(int64)|false|none||第一个客户ID|
|firstCustNickname|string|false|none||第一个客户昵称|
|firstCustAvatar|string|false|none||第一个客户头像|
|secondCustId|integer(int64)|false|none||第二个客户ID|
|secondCustNickname|string|false|none||第二个客户昵称|
|secondCustAvatar|string|false|none||第二个客户头像|
|isFriend|boolean|false|none||是否是好友 0-不是 1-是|
|hasReport|boolean|false|none||是否有报告|
|createTime|string|false|none||建立关系时间|

<h2 id="tocS_ResponseDataFrequencyRelationVO">ResponseDataFrequencyRelationVO</h2>

<a id="schemaresponsedatafrequencyrelationvo"></a>
<a id="schema_ResponseDataFrequencyRelationVO"></a>
<a id="tocSresponsedatafrequencyrelationvo"></a>
<a id="tocsresponsedatafrequencyrelationvo"></a>

```json
{
  "code": "string",
  "msg": "string",
  "data": {
    "reportId": 0,
    "firstCustId": 0,
    "firstCustNickname": "string",
    "firstCustAvatar": "string",
    "secondCustId": 0,
    "secondCustNickname": "string",
    "secondCustAvatar": "string",
    "isFriend": true,
    "hasReport": true,
    "createTime": "string"
  }
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|code|string|false|none||返回码|
|msg|string|false|none||返回描述|
|data|[FrequencyRelationVO](#schemafrequencyrelationvo)|false|none||none|

<h2 id="tocS_CalculateFrequencyCommand">CalculateFrequencyCommand</h2>

<a id="schemacalculatefrequencycommand"></a>
<a id="schema_CalculateFrequencyCommand"></a>
<a id="tocScalculatefrequencycommand"></a>
<a id="tocscalculatefrequencycommand"></a>

```json
{
  "targetUserId": 0
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|targetUserId|integer(int64)|true|none||要计算同频度的目标用户ID|

<h2 id="tocS_FrequencyVO">FrequencyVO</h2>

<a id="schemafrequencyvo"></a>
<a id="schema_FrequencyVO"></a>
<a id="tocSfrequencyvo"></a>
<a id="tocsfrequencyvo"></a>

```json
{
  "frequency": "string",
  "report": "string",
  "isGenerator": true
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|frequency|string|false|none||同频度|
|report|string|false|none||报告详情|
|isGenerator|boolean|false|none||none|

<h2 id="tocS_ResponseDataListFrequencyRelationVO">ResponseDataListFrequencyRelationVO</h2>

<a id="schemaresponsedatalistfrequencyrelationvo"></a>
<a id="schema_ResponseDataListFrequencyRelationVO"></a>
<a id="tocSresponsedatalistfrequencyrelationvo"></a>
<a id="tocsresponsedatalistfrequencyrelationvo"></a>

```json
{
  "code": "string",
  "msg": "string",
  "data": [
    {
      "reportId": 0,
      "firstCustId": 0,
      "firstCustNickname": "string",
      "firstCustAvatar": "string",
      "secondCustId": 0,
      "secondCustNickname": "string",
      "secondCustAvatar": "string",
      "isFriend": true,
      "hasReport": true,
      "createTime": "string"
    }
  ]
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|code|string|false|none||返回码|
|msg|string|false|none||返回描述|
|data|[[FrequencyRelationVO](#schemafrequencyrelationvo)]|false|none||none|

<h2 id="tocS_ResponseDataFrequencyVO">ResponseDataFrequencyVO</h2>

<a id="schemaresponsedatafrequencyvo"></a>
<a id="schema_ResponseDataFrequencyVO"></a>
<a id="tocSresponsedatafrequencyvo"></a>
<a id="tocsresponsedatafrequencyvo"></a>

```json
{
  "code": "string",
  "msg": "string",
  "data": {
    "frequency": "string",
    "report": "string",
    "isGenerator": true
  }
}

```

### 属性

|名称|类型|必选|约束|中文名|说明|
|---|---|---|---|---|---|
|code|string|false|none||返回码|
|msg|string|false|none||返回描述|
|data|[FrequencyVO](#schemafrequencyvo)|false|none||none|

