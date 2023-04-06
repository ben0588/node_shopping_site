// 用來自動產生 swagger 文件 // npm run swagger-autogen
const swaggerAutogen = require('swagger-autogen')

// 註解撰寫
const doc = {
    info: {
        version: '1.0.0', // by default: "1.0.0"
        title: 'ben0588 REST JWT API', // by default: "REST API"
        description: '測試REST JWT API', // by default: ""
    },
    host: 'localhost:8000', // by default: "localhost:3000"
    // basePath: '', // by default: "/"
    schemes: ['http'], // by default: ['http']
    consumes: ['application/json'], // by default: ['application/json']
    produces: ['application/json'], // by default: ['application/json']
    tags: [
        // by default: empty Array
        {
            name: 'User', // Tag name
            description: '會員系統', // Tag description
        },
    ],
    // securityDefinitions: {}, // by default: empty object
    definitions: {
        thirdLogin: {
            user: {
                email: 'thirdName_String',
                password: 'String',
                name: 'String',
                registerOrigin: 'String',
            },
        },
        login: {
            user: {
                email: 'String',
                password: 'String',
            },
        },
        register: {
            user: {
                email: 'String',
                name: 'String',
                password: 'String',
                registerOrigin: 'String',
            },
        },
        putPassword: {
            user: {
                putPassword: 'String',
            },
        },
        deleteAccount: {
            user: {
                checkPassword: 'String',
            },
        },
        admin: {
            adminName: 'String',
            adminPassword: 'String',
        },
        forget: {
            user: {
                email: 'String',
            },
        },
        putNewPwd: {
            user: {
                newPassword: 'String',
            },
        },
        editPassword: {
            user: {
                oldPassword: 'String',
                newPassword: 'String',
            },
        },
        putUserData: {
            user: {
                name: 'String',
                email: 'String',
                birthday: 'yyyy-mm-dd',
                tel: 'String',
                strAddress: 'String,String,String',
            },
        },
    }, // by default: empty object
}
const outputFile = './swagger_output.json' // 輸出的文件名稱
// const endpointsFiles = ['./app(建立會員系統).js'] // 要指向的 API，通常使用 Express 直接指向到 app.js 就可以
const endpointsFiles = ['./routes/api.js'] // 要指向的 API，通常使用 Express 直接指向到 app.js 就可以
swaggerAutogen(outputFile, endpointsFiles, doc, options) // swaggerAutogen 的方法

// 註解撰寫範本
// const doc = {
//     info: {
//         "version": "",                // by default: "1.0.0"
//         "title": "",                  // by default: "REST API"
//         "description": ""             // by default: ""
//     },
//     host: "",                         // by default: "localhost:3000"
//     basePath: "",                     // by default: "/"
//     schemes: [],                      // by default: ['http']
//     consumes: [],                     // by default: ['application/json']
//     produces: [],                     // by default: ['application/json']
//     tags: [                           // by default: empty Array
//         {
//             "name": "",               // Tag name
//             "description": ""         // Tag description
//         },
//         // { ... }
//     ],
//     securityDefinitions: { },         // by default: empty object
//     definitions: { }                  // by default: empty object
// }
