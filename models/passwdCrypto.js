var crypto = require('crypto') // 引用 crypto 加密 sha256

module.exports = {
    // 將明文密碼加密
    passwdCrypto: function (request, res, next) {
        // 如果有輸入密碼 true 就進行加密
        if (request) {
            request = crypto
                .createHash('sha256') // 使用sha256加密
                .update(request) // 更新資料
                .digest('hex') // hex=十六進制編碼，還有base64
            return request
        }
    },
}
