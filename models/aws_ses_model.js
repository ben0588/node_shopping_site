// 此版本為 AWS SDK for JavaScript (v3) 版本，2023/4/2 新增
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses') // 引用 aws-ses 郵件功能
const awsConfig = {
    region: 'ap-northeast-1', // 地區
    credentials: {
        accessKeyId: process.env.AWA_SMTP_ACCESS_KEY_ID, // 公鑰
        secretAccessKey: process.env.AWA_SMTP_SECRET_ACCESS_KEY, // 私鑰
    },
}
const ses = new SESClient(awsConfig) // 啟用 SES功能
const ForgotPasswordSendMailbox = async (emailTo, emailFrom, token) => {
    const params = {
        Destination: {
            ToAddresses: [emailTo], // 收件者
        },
        Message: {
            Body: {
                Html: {
                    Charset: 'UTF-8',
                    Data: `<!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta http-equiv="X-UA-Compatible" content="IE=edge">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Document</title>
                    </head>
                    <body>
                        <div class="wrap" 
                                style=" 
                                max-width: 600px;
                                width: 100%;
                                height:500px;
                                margin:0 auto;
                                padding:50px;
                               ">
                               <div class="inner-container"
                               style="width:100%;margin:0 auto;text-align: center;border:2px solid #00b894;padding:30px;">
                                <h1 style="margin:0 auto 20px">忘記密碼?</h1>
                                <hr />
                                <p>要重新設定您的密碼，請點一下以下的連結。</p>
                                <p>您將會連到一個網頁，讓您設定新的密碼。</p>
                                <a href="${process.env.AWA_SMTP_EMAIL_REDIRECT_URL}${token}"
                                    style="
                                    display: block;
                                    text-align: center;
                                    text-decoration: none;
                                    width: 600px;
                                    background-color: #00b894;
                                    border-radius:5px;
                                    color:black;
                                    font-size:1.2rem;
                                    font-weight:bolder;
                                    margin:0 auto;
                                    padding: 5px 0;
                                    ">更變密碼</a>
                                <p>如果您並未嘗試重新設定密碼，請不必擔心，可略過這封電郵。</p>
                                <p>在您點選連結設定密碼前，您的密碼不會改變。</p>
                                <h3>本郵件請勿直接回覆，如本網站使用問題請聯絡<a href="mailto:energy9527z@gmail.com"> energy9527z@gmail.com</a></h3>
                               </div>
                        </div>
                    </body>
                    </html>`,
                },
            },
            // <a href=${process.env.AWA_SMTP_EMAIL_REDIRECT_URL}/reset_password_token=
            Subject: {
                Charset: 'UTF-8',
                Data: '源點。線上購物網站DEMO-忘記密碼功能',
            },
        },
        Source: emailFrom,
    }
    try {
        const data = await ses.send(new SendEmailCommand(params))
        return data
    } catch (error) {
        console.error(error)
    }
}
module.exports = ForgotPasswordSendMailbox

/*

    # WS SDK for JavaScript (v2)版本，2023會進入維護 紀錄為下:

    var AWS = require('aws-sdk') // 啟用 aws 功能 
    const awsConfig = {
        apiVersion: '2010-12-01',
        accessKeyId: process.env.AWA_SMTP_ACCESS_KEY_ID, // 公鑰
        secretAccessKey: process.env.AWA_SMTP_SECRET_ACCESS_KEY, // 私鑰
        region: 'ap-northeast-1', // 地區
        }
    const ses = new AWS.SES(awsConfig) // 使用AWA SES 功能
    const ForgotPasswordSendMailbox = async (emailTo, emailFrom, token) => {
        const params = {
            Destination: {
                ToAddresses: [emailTo], // 收件者
            },
            Message: {
                Body: {
                    Html: {
                        Charset: 'UTF-8',
                        Data: `<!DOCTYPE html>
                        <html lang="en">
                        <head>
                            <meta charset="UTF-8">
                            <meta http-equiv="X-UA-Compatible" content="IE=edge">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Document</title>
                        </head>
                        <body>
                            <div class="wrap" 
                                    style=" 
                                    max-width: 600px;
                                    width: 100%;
                                    height:500px;
                                    margin:0 auto;
                                    padding:50px;
                                ">
                                <div class="inner-container"
                                style="width:100%;margin:0 auto;text-align: center;border:2px solid #00b894;padding:30px;">
                                    <h1 style="margin:0 auto 20px">忘記密碼?</h1>
                                    <hr />
                                    <p>要重新設定您的密碼，請點一下以下的連結。</p>
                                    <p>您將會連到一個網頁，讓您設定新的密碼。</p>
                                    <a href="${process.env.AWA_SMTP_EMAIL_REDIRECT_URL}${token}"
                                        style="
                                        display: block;
                                        text-align: center;
                                        text-decoration: none;
                                        width: 600px;
                                        background-color: #00b894;
                                        border-radius:5px;
                                        color:black;
                                        font-size:1.2rem;
                                        font-weight:bolder;
                                        margin:0 auto;
                                        padding: 5px 0;
                                        ">更變密碼</a>
                                    <p>如果您並未嘗試重新設定密碼，請不必擔心，可略過這封電郵。</p>
                                    <p>在您點選連結設定密碼前，您的密碼不會改變。</p>
                                    <h3>本郵件請勿直接回覆，如本網站使用問題請聯絡<a href="mailto:energy9527z@gmail.com"> energy9527z@gmail.com</a></h3>
                                </div>
                            </div>
                        </body>
                        </html>`,
                    },
                },

                // <a href=${process.env.AWA_SMTP_EMAIL_REDIRECT_URL}/reset_password_token=
                Subject: {
                    Charset: 'UTF-8',
                    Data: '源點。線上購物網站DEMO-忘記密碼功能',
                },
            },
            Source: emailFrom,
        }
        return ses.sendEmail(params).promise() 
*/
