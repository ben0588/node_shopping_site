// 以 Express 建立 Web 伺服器
var express = require('express')
var router = express.Router()

// 使用環境變數
require('dotenv').config()
const {
    accountLoginCheck,
    accountLogin,
    accountCheck,
    accountRegister,
    accountPutPassword,
    accountDelete,
    accountEditPassword,
    accountEditData,
    accountGetData,
} = require('../models/mysql_model') // 使用 MySQL 資料庫模組 (自訂義)
const { createToken, tokenVerify } = require('../models/jwt_model') // 引用 JWT 模組 (自訂義)
const { passwdCrypto } = require('../models/passwdCrypto') // 使用加密涵式
const { onTime } = require('../models/onTime') // 引用時間產生模組 // 引用時間產生模組
const { default: axios } = require('axios') // 引用 axios
const ForgotPasswordSendMailbox = require('../models/aws_ses_model')

// --- 建立 GET 檢查服務器是否正常 ---
router.get('/check', async (request, response, next) => {
    // 新增swagger REST API 文件說明
    /*  #swagger.tags = ['User']
        #swagger.summary = '檢查服務器運行狀態'
        #swagger.responses[200] = { description: '服務器正常運行中' }
        #swagger.responses[500] = { description: '服務器未啟用' }
    */
    try {
        response.status(200).json({
            success: true,
            message: '服務器正常運行中',
        })
    } catch (error) {
        response.status(500).json({
            success: false,
            message: '服務器未啟用',
        })
    }
})
// --- 建立 POST GitHub 第三方登入 & code 換取 access_token ---
router.post('/githubCode', async (request, response, next) => {
    // 新增swagger REST API 文件說明
    /*
        #swagger.ignore = true;
    */
    try {
        const code = request.body.code // 前端獲取url回傳的code參數
        const api = 'https://github.com/login/oauth/access_token/' // 驗證code
        const headers = {
            Accept: 'application/json', // 特定格式
        }
        const body = {
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code,
        }
        const result = await axios.post(api, body, headers) // 呼叫 api 進行驗證 code
        const resultData = result?.data // 成功取回的 access_token 很長，如下
        // 'access_token=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&scope=user&token_type=bearer'
        const newSearch = resultData.match(/^access_token=(.*?)&/) // 正規化只取access_token到&的內容

        if (newSearch) {
            const accessToken = newSearch[1] // 取索引1的位置(真正要的token)
            const result = await axios({
                method: 'get',
                url: `https://api.github.com/user`, // 取得會員資料
                headers: {
                    accept: 'application/json',
                    Authorization: `Bearer ${accessToken}`, // 使用官方提供的方式加入表頭
                },
            })
            // 因為 github 的關係，email 要額外呼叫指定的 api 進行獲取
            const emailResult = await axios({
                method: 'get',
                url: `https://api.github.com/user/emails`, // 取得會員資料
                headers: {
                    accept: 'application/json',
                    Authorization: `Bearer ${accessToken}`, // 使用官方提供的方式加入表頭
                },
            })

            if (result && emailResult) {
                // 先把取得的資料往外傳，再由外層 body 發送註冊 & 登入請求
                const { id, name } = result.data
                const email = emailResult.data[0].email // 取出email
                const user = {
                    id,
                    name,
                    email,
                }
                response.status(200).json({ user }).end()
            }
        }
    } catch (error) {
        response.status(402).json({ error: error }).end()
    }
})

// --- 建立 POST 會員登入 & 確認會員是否已註冊 (第三方登入 facebook、google、line ) ---
router.post('/thirdLogin', async (request, response, next) => {
    // 新增swagger REST API 文件說明
    /*  #swagger.tags = ['User']
        #swagger.summary = '會員登入(第三方登入)'
        #swagger.parameters['obj'] = {
            in: 'body',                 
            description: '會員登入(第三方登入 & 無註冊紀錄會自動註冊)',                 
            schema: { $ref : '#/definitions/thirdLogin' }         
        }
        #swagger.responses[200] = { description: '登入成功' }
        #swagger.responses[404] = { description: '密碼錯誤' }
    */
    // 使用request.body接收，其中的user物件，若使用url接收成使用 request.query.xxx
    const { email, password, name, registerOrigin } = request.body.user
    const newPwd = passwdCrypto(password) // 密碼加密
    // 創建指定會員格式
    const loginData = {
        user: {
            email: email,
            password: newPwd,
            registerOrigin: registerOrigin,
        },
    }
    // 註冊會員格式
    const registerData = {
        user: {
            email: email,
            name: name,
            password: newPwd,
            createDate: onTime(), // 引用時間函式
            registerOrigin: registerOrigin,
        },
    }
    /*
        #1 - 帳號存在 => 比對密碼 => 成功返回 JWT 驗證 v 
        #2 - 帳號不存在 => 第三方登入時 = 直接註冊帳號 v   
        #3 - 帳號不存在 => 非第三方登入時 = 提示帳號不存在，請註冊 (用另一隻會員官網專用api) v
        #4 - 帳號存在 => 密碼錯誤 => 返回密碼錯誤提示 v
    */
    try {
        // 呼叫資料庫_檢查帳號是否存在
        const checkAccount = await accountLoginCheck([email])
        if (checkAccount === null) {
            // 帳號不存在，因為是第三方登入關係，所以直接註冊會員
            const registerAccount = await accountRegister([
                registerData.user.email,
                registerData.user.name,
                newPwd,
                registerData.user.createDate,
                registerData.user.registerOrigin,
            ])
            if (registerAccount === null) {
                const checkPassword = await accountLogin([
                    // 登入會員
                    registerData.user.email,
                    registerData.user.password,
                    registerData.user.registerOrigin,
                ])
                if (checkPassword) {
                    // 帳號密碼及來源核對成功，準備產生 jwt token 並且返回
                    const createJwt = await createToken(checkPassword)
                    if (createJwt) {
                        // 核對密碼成功，返回狀態碼 & jwt token
                        return response.status(200).json(createJwt)
                    }
                }
            }
        } else if (checkAccount[0]) {
            // 帳號存在時，比對帳號密碼來源
            const checkPassword = await accountLogin([
                checkAccount[0].email,
                loginData.user.password,
                loginData.user.registerOrigin,
            ])
            if (checkPassword) {
                // 帳號密碼及來源核對成功，準備產生 jwt token 並且返回
                const createJwt = await createToken(checkPassword)
                if (createJwt) {
                    // 核對密碼成功，返回狀態碼 & jwt token
                    return response.status(200).json(createJwt)
                }
            }
        }
    } catch (error) {
        // 因為帳號存在與不存在時都會執行到註冊會員，只有比對密碼錯誤時才會跳出
        return response.status(404).json({ message: '密碼錯誤' })
    }
})

// --- 建立 POST 會員登入 & 確認會員是否已註冊 (官網) ---
router.post('/login', async (request, response, next) => {
    // 新增swagger REST API 文件說明
    /*  #swagger.tags = ['User']
        #swagger.summary = '會員登入(官網)'
        #swagger.parameters['obj'] = {
            in: 'body',                 
            description: '會員登入',                 
            schema: { $ref : '#/definitions/login' }         
        }
        #swagger.responses[200] = { description: '登入成功' }
        #swagger.responses[400] = { description: '登入失敗(密碼錯誤)' }
        #swagger.responses[401] = { description: '登入失敗(尚未註冊)' }
        #swagger.responses[500] = { description: '伺服器異常' }
    */
    try {
        // 使用request.body接收，其中的user物件，若使用url接收成使用 request.query.xxx
        const { email, password, registerOrigin } = request.body.user // 結構出來內容
        const newPwd = passwdCrypto(password) // 密碼加密
        /*
        #1 - 帳號存在 => 比對密碼 => 成功返回 JWT 驗證 v 
        #2 - 帳號存在 => 密碼錯誤 => 返回密碼錯誤提示 v
    */
        // 檢查帳號是否已存在
        const checkAccountResult = await accountLoginCheck([email])
        // 帳號已存在，呼叫檢查密碼 api 開始檢查密碼
        if (checkAccountResult?.[0]?.email) {
            const loginAccountResult = await accountLogin([checkAccountResult?.[0]?.email, newPwd, registerOrigin])
            // 密碼錯誤時出現提示
            if (loginAccountResult === null) {
                return response
                    .status(400)
                    .json({
                        success: false,
                        message: '登入失敗',
                        error: '會員密碼錯誤',
                    })
                    .end()
            }
            // 密碼核對正確後，返回會員資料 + jwt 給前端
            if (loginAccountResult) {
                // 帳號密碼及來源核對成功，準備產生 jwt token 並且返回
                const createJwt = await createToken(loginAccountResult)
                if (createJwt) {
                    // 核對密碼成功，返回狀態碼 & jwt token
                    return response.status(200).json(createJwt)
                }
            }
        } else {
            // 帳號不存在時，提示前端未註冊
            return response
                .status(401)
                .json({
                    success: false,
                    message: '登入失敗',
                    error: '電子信箱尚未註冊',
                })
                .end()
        }
    } catch (error) {
        return response.status(500).json({ success: false, message: '伺服器異常', error })
    }
})

// --- 建立 POST 會員註冊 & 確認會員是否已註冊 ---
router.post('/register', async (request, response, next) => {
    // 新增swagger REST API 文件說明
    /*  #swagger.tags = ['User']
        #swagger.summary = '會員註冊'
        #swagger.parameters['obj'] = {
            in: 'body',                 
            description: '會員註冊',                 
            schema: { $ref : '#/definitions/register' }         
        }
        #swagger.responses[200] = { description: '註冊成功' }
        #swagger.responses[400] = { description: '註冊失敗' }
        #swagger.responses[500] = { description: '伺服器異常' }
    */
    // 使用request.body接收，其中的user物件，若使用url接收成使用 request.query.xxx
    // 前台註冊頁面輸入的資料
    const { userEmail, userName, userPassword, registerOrigin } = request.body.user // 結構資料出來
    const newPwd = passwdCrypto(userPassword) // 密碼加密
    const registerData = {
        // 註冊格式
        user: {
            email: userEmail,
            name: userName,
            password: newPwd,
            createDate: onTime(), // 引用時間函式
            registerOrigin: registerOrigin,
        },
    }
    try {
        // 先檢查帳號是否有先註冊過
        const checkAccountResult = await accountCheck([userEmail])
        if (checkAccountResult === null) {
            // 帳號不存在時，呼叫註冊api進行註冊
            const accountRegisterResult = await accountRegister([
                registerData.user.email,
                registerData.user.name,
                registerData.user.password,
                registerData.user.createDate,
                registerData.user.registerOrigin,
            ])
            // 新增會員資料時會返回null
            if (accountRegisterResult === null) {
                // 註冊成功返回給前端會員帳號及姓名
                response
                    .status(200)
                    .json({
                        success: true,
                        message: '註冊成功',
                        email: registerData.user.email,
                        name: registerData.user.name,
                    })
                    .end()
            }
        }
        if (checkAccountResult) {
            // 帳號若已存在則返回錯誤提示
            response
                .status(400)
                .json({
                    success: false,
                    message: '註冊失敗',
                    error: '電子信箱 已被使用',
                })
                .end()
        }
    } catch (error) {
        // 因為第一階段檢查姓名重複時將會直接返回重複註冊，因此catch用來顯示伺服器異常
        return response.status(500).json({ success: false, message: '伺服器異常', error })
    }
})

// --- 建立 GET 取得單一會員資料 ---
router.get('/user', async (request, response, next) => {
    // 新增swagger REST API 文件說明
    /*  #swagger.tags = ['User']
        #swagger.summary = '取得會員資料'
        #swagger.responses[200] = { description: '會員驗證成功' }
        #swagger.responses[401] = { description: '會員驗證失敗' }
        #swagger.parameters['authorization'] = {
            in: 'header',
            description: 'JWT Token',
            required: true,
            type: 'string',
            format: 'Bearer',
        }
    */

    try {
        // 開始驗證 jwt 把請求資訊放入驗證 api
        // console.log('request:', request.headers)
        const checkJwtResult = await tokenVerify(request)
        console.log(checkJwtResult)
        if (checkJwtResult) {
            // 驗證成功回傳所屬會員個人信息
            response.status(200).json(checkJwtResult)
        }
    } catch (error) {
        response.status(401).json({ message: '取得會員信息失敗', error: error }).end()
    }
})

// --- 建立 DELETE 會員登出 ---
// 因為 JWT 是無狀態的認證，只能等待JWT所設定的認證失效，如果要做到完全登出則需要使用 session stor方法

// --- 建立 POST 驗證會員帳號是否存在，存在才發 Email 驗證信件 ---
router.post('/forgetPassword', async (request, response, next) => {
    // 新增swagger REST API 文件說明
    /*  #swagger.tags = ['User']
        #swagger.summary = '忘記密碼'
        #swagger.responses[200] = { description: '成功發送驗證信件' }
        #swagger.responses[403] = { description: '信箱尚未註冊' }
        #swagger.responses[500] = { description: '伺服器異常' }
        #swagger.parameters['obj'] = {
            in: 'body',                 
            description: '忘記密碼',                 
            schema: { $ref : '#/definitions/forget' }         
        }
    */
    const { email } = request.body.user
    // #1 忘記密碼
    //     #1-1 -> 需要輸入email，檢查郵件不存在 -> 提示請進行註冊 v
    //     #1-2 -> 需要輸入email，檢查郵件已存在 -> 發送email驗證信箱且提示 v
    //     #1-3 -> 點擊收到的驗證信箱鏈結，跳轉到指定頁面輸入新密碼 v
    //     #1-4 -> 發送到email的url要帶上驗證帳號存在的 token，當點擊時返回到指定頁面，用此token發送修改密碼請求 v
    // #2 修改密碼 ( 第三方登入則無此功能 )
    //     #2-1 -> 需發送 token -> 發送驗證信箱 -> 完成之後填寫新密碼 -> 導回登入頁面 (?)
    //     #2-2 -> 需發送 token -> 輸入舊密碼 & 新密碼 -> 核對舊密碼正確 -> 設定新密碼通知前端 v
    try {
        // 呼叫檢查資料庫此 Email 是否已存在
        const result = await accountLoginCheck([email])
        if (result === null) {
            response.status(403).json({
                success: false,
                message: '發送失敗',
                error: '電子信箱尚未註冊，請進行註冊',
            })
        }
        if (result) {
            // 資料庫此 email 存在，才開始產生 JWT + 發送 email
            const email = result[0].email
            // 設定產生格式
            const newData = [
                {
                    email,
                },
            ]
            if (email) {
                // 把此 email 發送產生新的 JWT 夾帶在 信件中的 URL
                const newJwtResult = await createToken(newData)
                const { token } = newJwtResult
                if (token) {
                    // 把 jwt 夾帶至 驗證信的 url 使用 AWS SES 功能發送
                    const forgetResult = await ForgotPasswordSendMailbox(email, 'energy9527z@gmail.com', token)
                    if (forgetResult) {
                        // 發送完成通知使用者檢查郵件
                        response.status(200).json({
                            success: true,
                            message: '您將在幾分鐘後收到一封電子郵件，內有重新設定密碼的步驟說明',
                        })
                    }
                }
            }
        }
    } catch (error) {
        return response.status(500).json({ success: false, message: '伺服器異常', error })
    }
})

// --- 建立 PUT 會員修改密碼 (直接設定新密碼版) ---
router.put('/putNewPassword', async (request, response, next) => {
    // 新增swagger REST API 文件說明
    /*  #swagger.tags = ['User']
        #swagger.summary = '設定新密碼'
        #swagger.responses[200] = { description: '修改密碼成功' }
        #swagger.responses[401] = { description: '修改密碼失敗' }
        #swagger.parameters['authorization'] = {
            in: 'header',
            description: 'JWT Token',
            required: true,
            type: 'string',
            format: 'bearer'
        }
        #swagger.summary = '會員登入(官網)'
        #swagger.parameters['obj'] = {
            in: 'body',                 
            description: '設定新密碼',                 
            schema: { $ref : '#/definitions/putNewPwd' }         
        }
    */
    const { newPassword } = request.body.user
    const newPwd = passwdCrypto(newPassword) // 密碼加密
    // ...解碼JWT，符合後把新密碼進行 MYSQL 更新
    try {
        const result = await tokenVerify(request)
        // 完成 jwt 驗證後把 email 提取出來，呼叫資料庫近來更改新密碼
        if (result) {
            const { email } = result.decodedToken
            // 呼叫資料庫處理修改密碼
            const putPasswordResult = await accountPutPassword([newPwd, email])
            // 因為直接更改會跳 null
            if (putPasswordResult === null) {
                response.status(200).json({
                    success: true,
                    message: '成功更改新密碼，請使用新密碼登入',
                })
            }
        }
    } catch (error) {
        response.status(401).json({ success: false, message: '設定新密碼失敗', error: error })
    }
})
// --- 建立 PUT 會員編輯密碼 ( 使用舊密碼核對更新 ) ---
router.put('/editPassword', async (request, response, next) => {
    // 新增swagger REST API 文件說明
    /*  #swagger.tags = ['User']
        #swagger.summary = '會員編輯密碼'
        #swagger.responses[200] = { description: '修改密碼成功' }
        #swagger.responses[401] = { description: '修改密碼失敗' }
        #swagger.responses[500] = { description: '伺服器異常' }
        #swagger.parameters['authorization'] = {
            in: 'header',
            description: 'JWT Token',
            required: true,
            type: 'string',
            format: 'bearer'
        }
        #swagger.summary = '會員登入(官網)'
        #swagger.parameters['obj'] = {
            in: 'body',                 
            description: '會員編輯密碼',                 
            schema: { $ref : '#/definitions/editPassword' }         
        }
    */
    const { oldPassword, newPassword } = request.body.user
    const oldPasswordCrypto = passwdCrypto(oldPassword) // 密碼加密
    const newPasswordCrypto = passwdCrypto(newPassword) // 密碼加密
    try {
        // JWT Token 驗證
        const result = await tokenVerify(request)
        // 提取出會員 email 核對對應的舊密碼
        const { email } = result.decodedToken
        if (email) {
            const checkPasswordResult = await accountEditPassword([email, oldPasswordCrypto])
            if (checkPasswordResult) {
                // 檢查舊密碼正確
                const putNewPasswordResult = await accountPutPassword([newPasswordCrypto, email])
                if (putNewPasswordResult === null) {
                    response.status(200).json({
                        success: true,
                        message: '成功更改新密碼，請使用新密碼登入',
                    })
                }
            }
            if (checkPasswordResult === null) {
                // 檢查舊密碼失敗，返回提示
                response.status(401).json({
                    success: false,
                    message: '更改密碼失敗',
                    error: '舊密碼核對錯誤，請檢查舊密碼正確性',
                })
            }
        }
    } catch (error) {
        return response.status(500).json({ success: false, message: '伺服器異常', error })
    }
})

// --- 建立 PUT 會員修改資料 ---
router.put('/putUserData', async (request, response, next) => {
    // 新增swagger REST API 文件說明
    /*  #swagger.tags = ['User']
        #swagger.summary = '會員修改資料'
        #swagger.parameters['authorization'] = {
            in: 'header',
            description: 'JWT Token',
            required: true,
            type: 'string',
            format: 'bearer'
        }
        #swagger.parameters['obj'] = {
            in: 'body',                 
            description: '會員修改資料',                 
            schema: { $ref : '#/definitions/putUserData' }         
        }
        #swagger.responses[200] = { description: '修改資料成功' }
        #swagger.responses[401] = { description: 'Token驗證失敗' }
    */
    const { email, name, birthday, tel, strAddress } = request.body.user
    try {
        const result = await tokenVerify(request) // 核對 JWT 是否確認
        if (result.decodedToken.email === email) {
            const editDataResult = await accountEditData([name, birthday, tel, strAddress, result.decodedToken.email])
            if (editDataResult === null) {
                // 更新成功之後，取得已更新完畢的資料，包裝成JWT & 最新資料 往前端發
                const newDataResult = await accountGetData([result.decodedToken.email])
                if (newDataResult) {
                    // 包裝成最新的 JWT 往前端丟
                    const newJwtData = await createToken(newDataResult)
                    // response.setHeader('Access-Control-Allow-Credentials', true)
                    response.status(200).json({
                        success: true,
                        message: '資料變更成功',
                        data: newJwtData, // 新 JWT
                    })
                }
            }
        }
    } catch (error) {
        return response.status(401).json({ success: false, error })
    }
})

// --- 建立 DELETE 會員資料刪除/註銷 ---
router.delete('/deleteUser', async (request, response, next) => {
    // 新增swagger REST API 文件說明
    /*  #swagger.tags = ['User']
        #swagger.summary = '會員刪除帳號'
        #swagger.parameters['authorization'] = {
            in: 'header',
            description: 'JWT Token',
            required: true,
            type: 'string',
            format: 'bearer'
        }
        #swagger.responses[200] = { description: '會員刪除成功' }
        #swagger.responses[401] = { description: '會員刪除失敗' }
    */
    // 模擬前台同意兩次刪除帳號確認按鈕後執行。(或許未來可以改成禁用狀態就好，但法規似乎要刪)
    try {
        const checkJwt = await tokenVerify(request) // 驗證 jwt
        if (checkJwt) {
            // jwt 驗證通過，開始清除資料庫會員資料
            const { email } = checkJwt.decodedToken
            const deleteUserResult = await accountDelete([email]) // 刪除會員資料
            if (deleteUserResult === null) {
                response.json({ success: true, message: '會員刪除成功' })
            }
        }
    } catch (error) {
        return response.status(401).json({ success: false, message: '會員刪除失敗', error })
    }
})

module.exports = router
