const connection = require('../config/mysqlDB') //連接資料庫
require('dotenv').config() // 使用環境變數

// SQL 模組語法範本 (Promise版本)
var mysqlModel = async (reqData, sql) => {
    return new Promise((resolve, reject) => {
        connection.query(sql, reqData, (err, result) => {
            if (err || !result.length) {
                return reject(err) // sql語法執行失敗時，返回錯誤資訊
            } else {
                return resolve(result) // sql語法執行成功，返回執行結果
            }
        })
    })
}

// ------ 資料表管理 ------
const userTable = 'users' // 會員

module.exports = {
    // 會員登入( 檢查帳號是否已存在 )
    accountLoginCheck: async (req) => {
        try {
            const result = await mysqlModel(req, `select (email) from ${userTable} where email= (?) `)
            return result
        } catch (error) {
            return error
        }
    },
    // 會員登入
    accountLogin: async (req) => {
        try {
            const result = await mysqlModel(
                req,
                `select * from ${userTable} where email=? and password=? and registerOrigin=? `
            )
            return result
        } catch (error) {
            return error
        }
    },
    // 會員註冊 [帳號重複確認]
    accountCheck: async (req) => {
        try {
            const result = await mysqlModel(req, `select email from ${userTable} where email = (?)`)
            return result
        } catch (error) {
            return error
        }
    },
    // 會員註冊 [判斷無帳號重複後直接新增會員]
    accountRegister: async (req) => {
        try {
            const result = await mysqlModel(
                req,
                `insert into ${userTable} (email,name,password,createDate,registerOrigin) values (?,?,?,?,?)`
            )
            return result
        } catch (error) {
            return error
        }
    },
    // 會員設定新密碼 (確認jwt驗證成功返回的會員直接修改密碼 v )
    accountPutPassword: async (req) => {
        try {
            const result = await mysqlModel(req, `update ${userTable} set password=(?) where email =(?)`)
            return result
        } catch (error) {
            return error
        }
    },
    // 會員編輯密碼 (確認jwt驗證成功+原密碼核對正確，才修改新密碼 )
    accountEditPassword: async (req) => {
        try {
            const result = await mysqlModel(req, `select * from ${userTable} where email= (?) and password =(?) `)
            return result
        } catch (error) {
            return error
        }
    },
    // 會員編輯個人資料 ( 確認jwt驗證成功+email核對正確，才開始更新個人資料 )
    accountEditData: async (req) => {
        try {
            const result = await mysqlModel(
                req,
                `update ${userTable} set name=(?) , birthday=(?) , tel=(?) , address=(?) where email =(?)`
            )
            return result
        } catch (error) {
            return error
        }
    },
    // 取得會員最新資料
    accountGetData: async (req) => {
        try {
            const result = await mysqlModel(
                req,
                `select mid,email,name,createDate,registerOrigin,birthday,tel,address from ${userTable} where email = (?)`
            )
            return result
        } catch (error) {
            return error
        }
    },
    // 會員註銷 ( 直接刪除帳號/或改成停用/凍結 )
    accountDelete: async (req) => {
        try {
            const result = await mysqlModel(req, `delete from ${userTable} where email=(?)`)
            return result
        } catch (error) {
            return error
        }
    },

    // ---- 未來要使用 cookie & session stor 模式下才需要新增一個DB 存放 session ID 用 http only cookie 傳送給前端
    // // 第一次會員登入驗證成功後，mid 無存過的條件下 新增一筆 token
    // cookieAddMid: (req) => {
    //     return mysqlModel(req, `insert into ${cookieTable} (mid,token) values (?,?) `)
    // },
    // // 第一次會員登入後，儲存 mid=token 前先檢查 mid 是否已存過
    // cookieCheckMid: () => {},
    // // 第一次會員登入後，如果 Mid 已存在 token 則使用  update 方式修改
    // cookieUptMid: () => {},

    // Google 第三方登入 (OAuth 2.0)
    // Facebook 第三方登入 (OAuth 2.0)
}
