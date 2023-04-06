const connection = require('../config/mysqlDB') //連接資料庫
var jwt = require('jsonwebtoken') // JWT 簽名和驗證
require('dotenv').config() // 使用環境變數
var base64url = require('base64url') // base64url加密
var crypto = require('crypto') // 引用 crypto 加密 sha256

module.exports = {
    // 產生 JWT 的 JSON 格式令牌 Token
    createToken: (req) => {
        // console.log('createToken-req', req[0].email)
        return new Promise((resolve, reject) => {
            if (!req || req.length < 1) {
                reject('登入狀態失敗，請重新登入')
            } else {
                // 產生負載
                let payload = {
                    iss: req[0].mid, // 會員ID
                    name: req[0].name, // 會員名字
                    email: req[0].email, // 會員信箱
                    createDate: req[0].createDate, // 會員創建日期
                    registerOrigin: req[0].registerOrigin, // 會員註冊來源
                    birthday: req[0].birthday, // 會員生日
                    tel: req[0].tel, // 會員信箱
                    address: req[0].address, // 會員地址
                    sub: 'User Login Api', // 主題
                }
                // 產生 JWT (payload + 私鑰 + async非異步方式 )
                jwt.sign(
                    payload,
                    process.env.SECRET, // 私鑰
                    {
                        algorithm: 'HS256', // 加密方法
                        // expiresIn 設置JWT有效時間，預設是ms(毫秒)，要帶上時間單位
                        expiresIn: '1 day', // 一天
                    },
                    (err, asyncToken) => {
                        // 沒錯誤就返回token值
                        if (err) {
                            throw err
                        }
                        resolve({
                            success: true, // 成功
                            message: '登入成功',
                            token_type: 'bearer', // 告知 token 格式
                            token: asyncToken, // 傳送 JWT 格式 token
                            expires_in: '1 day', // 告知 token 有效時間
                            info: {
                                // 要返回給前端的會員資訊
                                name: req[0].name,
                                mid: req[0].mid,
                                // createDate: req[0].createDate,
                                // email: req[0].email,
                                // tel: req[0].tel,
                                // birthday: req[0].birthday,
                                // registerOrigin: req[0].registerOrigin,
                            },
                        })
                    }
                )
            }
        })
    },
    // 驗證 JWT
    tokenVerify: (req, res, next) => {
        // console.log('req', req.headers.authorization)
        return new Promise((resolve, reject) => {
            // token 不存在
            if (!req.headers.authorization) {
                reject({ error: 'invalid_client', error_description: '沒有 token！' })
            }
            // request header 必須滿足 JWT 標準發送格式才處理
            if (req.headers.authorization && req.headers.authorization.split(' ')[0] == 'Bearer') {
                let token = req.headers.authorization.split(' ')[1] // 把 header中的 token取出來
                //  驗證JWT，jwt.verify(token,私鑰,)
                jwt.verify(token, process.env.SECRET, (err, decodedToken) => {
                    if (err) {
                        reject({
                            success: false,
                            message: 'Failed to authenticate token',
                            error_description: '無法驗證令牌，請重新登入',
                        })
                    } else {
                        resolve({ success: true, message: '驗證通過', decodedToken: decodedToken })
                        next() // 繼續執行
                    }
                })
            }
        })
    },
    // Web API 存取控制 (未來改寫成檢測專屬管理者方法，或者使用session stor + cookie 方式驗證DB模式)
    // accessControl: function (req, res, next) {
    //     console.log(req.user)

    //     // 如不是 admin，則無權限
    //     switch (req.user.role) {
    //         case null:
    //         case 'user':
    //         case 'guest':
    //             res.customStatus = 400
    //             res.customError = { error: 'unauthorized_client', error_description: '無權限！' }
    //             break
    //     }

    //     next()
    // },
}
