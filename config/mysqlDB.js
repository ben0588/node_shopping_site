// 建立 MySQL 連接參數，引用環境變數並且創建
const mysql = require('mysql')
var connection = mysql.createConnection({
    user: process.env.DB_USER, // 使用者帳號
    password: process.env.DB_PWD, // 使用者密碼
    host: process.env.DB_HOST, // 連接端
    port: process.env.DB_PORT, // Mysql埠號
    database: process.env.DB_DATABASE, // 資料庫名稱
})

// 啟用資料庫
connection.connect(function (error, connection) {
    if (error) {
        console.log('連接出現問題，請檢查錯誤訊息', error)
    } else {
        console.log('已成功連接資料庫')
    }
})

module.exports = connection
