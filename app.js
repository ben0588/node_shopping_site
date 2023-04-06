// 以 Express 建立 Web 伺服器
var express = require('express')
var app = express()

// 引用 env 套件，啟用環境變數
require('dotenv').config()

// 允許跨域使用本服務
var cors = require('cors')
app.use(
    cors({
        credentials: true, // 支持使用axios攜帶set-cookie
        // origin: [
        //     process.env.DEV_LOCALHOST_HTTP_5500,
        //     process.env.DEV_LOCALHOST_HTTP_3000,
        //     process.env.DEV_LOCALHOST_HTTP_8000,
        //     process.env.DEV_LOCALHOST_HTTPS_3000,
        //     process.env.DEV_LOCALHOST_HTTPS_3001,
        //     'http://127.0.0.1:5501',
        // ],
        allowedHeaders: 'Content-Type,Authorization',
        // credentials: true,
        origin: true, // 支持所有來源的請求 // 上線時改成只支持單一網站請求
    })
)

/*
    cors 套件預設:
    {
        "origin": "*", 
            // 設置可存取的網域，同為 Access-Control-Allow-Origin，接受的資料型別為 Boolean、String、RegExp、Array<String|RegExp>、Function
        "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",  
            // methods 設置可存取的方法，也就是設置 Access-Control-Allow-Methods，也接受 Array<String> 的格式，如：['GET', 'POST']  
        "preflightContinue": false,
            // 將 CORS 預檢響應傳遞給下一個處理程序
        "optionsSuccessStatus": 204
            // 設置當 OPTION 請求成功時，回傳的 HTTP Code
    }
    #其他選項:
        "allowedHeaders":"Content-Type,Authorization" 
            // 設置可存取的Header，也就是設置 Access-Control-Allow-Headers，也接受 ['Content-Type', 'Authorization']
        "exposedHeaders":"Content-Range,X-Content-Range"
            // 設置瀏覽器可檢視(JS存取)的其他 Header 項目，也就是設置 Access-Control-Expose-Headers 參數到 Header 中。可以接受的參數格式：Content-Range,X-Content-Range 這種用逗號隔開的，也接受 Array<String> 的格式，如：['Content-Range', 'X-Content-Range']
        "credentials":true
            // 設置是否傳送 cookie，也就是設置 Access-Control-Allow-Credentials 參數到 Header 中。資料型別：Boolean
        "maxAge":300
            // 置合法期間，使瀏覽器在這段期間內不必發送 OPTION 請求，也就是設置 Access-Control-Max-Age 參數到 Header 中。資料型別：Number 且需整數
*/

// 以 body-parser 模組協助 Express 解析表單與JSON資料
// 將 HTTP 請求方法 POST、DELETE、PUT 和 PATCH，放在 HTTP 主體(body) 發送的參數存放在 req.body
var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// 引用cookie解析，且啟用
var cookieParser = require('cookie-parser')
app.use(cookieParser())

// 使用 express-session 套件管理 session
const session = require('express-session')
// 使用 express-mysql-session 套件用來自動驗證 mysql DB
var MySQLStore = require('express-mysql-session')(session)
// express-mysql-session 錯誤時除錯範本: https://www.zendei.com/article/74354.html

// 連接 MySQL 資料庫
require('./config/mysqlDB')
// 取出已存在的 MySQL 模組
const connection = require('./config/mysqlDB')
// 創建新的 MySQL 表格設定
var sessionStore = new MySQLStore(
    {
        // expiration: 60 * 60 * 24 * 1000, // 設置 session id 有效時間(毫秒) (5 * 60 * 1000)=5分鐘，86400000=24小時
        expiration: 5 * 60 * 1000, // 設置 session id 有效時間(毫秒) (5 * 60 * 1000)=5分鐘，86400000=24小時
        clearExpired: true, // 設置是否自動檢查清除過期 session id
        // checkExpirationInterval: 60 * 60 * 24 * 1000, // 設置多久檢查，並且清除DB過期的 session id
        checkExpirationInterval: 5 * 60 * 1000, // 設置多久檢查，並且清除DB過期的 session id
        connectionLimit: 10, // 設置同時訪問多少人
        endConnectionOnClose: true, // 不使用此連線時中斷連線
        createDatabaseTable: true, //是否創建表
        charset: 'utf8mb4_bin', // 創建表格格式
        schema: {
            tableName: 'sessions_tab', // 表格名稱
            columnNames: {
                // 表格選項
                session_id: 'session_id',
                expires: 'expires',
                data: 'data',
            },
        },
    },
    connection
) // 使用同一個資料庫中(connection)，設定要新增的表格名稱 sessions_tab)

// 啟用 session
app.use(
    session({
        key: 'benKey', // request set-cookie 的名稱
        secret: process.env.SECRET, // 私鑰
        store: sessionStore, // 設置每次存取session ID的庫，使用的是mySql
        resave: false, // 強制保留原本session在session store，若DB中有設置定期清除則設置false
        saveUninitialized: true, // false只有session被修改才會存入cookie
        // 避免重複保存和未初始化的會話
        cookie: {
            // maxAge: 60 * 60 * 24 * 1000, // cookie 存活時間(毫秒) (5 * 60 * 1000)=5分鐘，86400000=24小時
            maxAge: 5 * 60 * 1000, // cookie 存活時間(毫秒) (5 * 60 * 1000)=5分鐘，86400000=24小時
            // domain:www.xxx.com 設置那些網域才會自動帶cookie
            path: '/', // 限制特定路徑才帶cookie
            httpOnly: false, // 限制瀏覽器無法使用js獲取cookie，只有server能取
            // sameSite:Strict 設址只有網域相同才傳送cookie
            sameSite: 'none', // 只有 secure=true 才可以設置 sameSite
            secure: false, // true 限制只有https才可以獲取，本地測試所以改成false
        },
    }) // cookie: 預設是 { path: ‘/’, httpOnly: true, secure: false, maxAge: null }
)

// 引用路由
var usersRouter = require('./routes/api') // 會員系統 api

// 啟用路由
app.use('/api', usersRouter) // 會員系統api

// 使用 Swagger 建立互動 REST API文件
// 產生文件方式:npm run swagger-autogen
const swaggerUi = require('swagger-ui-express')
const swaggerFile = require('./swagger_output.json') // 剛剛輸出的 JSON
// 啟用 Swagger 網頁路由
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile, false, { defaultModelsExpandDepth: -1 }))
//  false, { defaultModelsExpandDepth: -1 } 將產出的UI頁面中的Model模組不顯示
// http://localhost:8000/api-docs/

// 一切就緒，開始接受用戶端連線
const port = process.env.PORT || 8080
app.listen(port, (err) => {
    if (err) {
        console.error('伺服器連接錯誤')
    }
    console.log(`Web伺服器就緒，開始接受用戶端連線，http://${process.env.SERVER_HOST}:${port}/`)
    console.log('「Ctrl + C」可結束伺服器程式.')
})
