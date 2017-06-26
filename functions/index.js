const functions = require('firebase-functions');
const admin = require('firebase-admin');
const gcs = require('@google-cloud/storage')();
const vision = require('@google-cloud/vision')();
admin.initializeApp(functions.config().firebase);
const request = require('request-promise');


const ak = 'b4Thk3aeHcHtlcCIChcXdSsb';
const sk = 'q07oNGZPlYxs1cufT0L25SEKv8U2x5HX';
const ocr = require('baidu-ocr-api').create(ak, sk);

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.helloWorld = functions.https.onRequest((request, response) => {
    response.send("Hello from Firebase!");
});

//发送推送消息(移动端)
exports.sendOrderNotification = functions.database.ref('/orders/{userId}/{orderId}').onWrite(event => {
    const orderId = event.params.orderId;
    const userId = event.params.userId;

    // If un-follow we exit the function.
    if (!event.data.val()) {
        return console.log('订单 ', orderId, '没有被创建', userId);
    }
    console.log('有一个新订单:', orderId, 'for user:', userId);


    // Get the list of device notification tokens.
    const getDeviceTokensPromise = admin.database().ref(`/notificationTokens/${userId}`).once('value');

    return Promise.all([getDeviceTokensPromise]).then(reslut => {
        if (!reslut[0].exists()) {
            return;
        }

        if (!reslut[0].hasChildren()) {
            console.error('数据不正常，没有token..');
            return;
        }
        // const  tokens;
        const res = reslut[0];
        let tokens = Object.keys(reslut[0].val());

        console.log('token length:' + tokens.length);
        tokens.forEach((token)=>{console.log(token)});

        tokens.forEach((token) => {
            if (!res.child(token).val()) {
                tokens.pop();
            }
        });

        // const tokens = Object.keys(reslut.val());
        const blance = event.data.child('blance').val();
        const term = event.data.child('term').val();
        const termunit = event.data.child('terUnit').val();

        if (!tokens.length > 0) {
            console.log('没有发现token');
            return;
        }

        let status = '';
        switch (event.data.child('status').val()) {
            case '0':
                status = '待审批';
                break;
            case '1':
                status = '待签约';
                break;
            case '2':
                status = '待放款';
                break;
        }

        // Notification details.
        const payload = {
            notification: {
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
                title: '现金口贷订单!',
                body: `您已申请${blance}元现金贷,期限${term}${termunit}.状态:${status}`,
                sound: 'default',
                icon: 'http://freevector.co/wp-content/uploads/2013/01/50268-dollars-money-bag-on-a-hand-200x200.png',
            },
            data: {
                id: event.data.key,
                status: event.data.child('status').val()
            }
        };


        console.log(`发送的tokens: ${tokens}`);
        return admin.messaging().sendToDevice(tokens, payload).then(response => {
            // For each message check if there was an error.
            const tokensToRemove = [];
            response.results.forEach((result, index) => {
                const error = result.error;
                if (error) {
                    console.error('发送通知失败给', tokens[index], error);
                    // Cleanup the tokens who are not registered anymore.
                    if (error.code === 'messaging/invalid-registration-token' ||
                        error.code === 'messaging/registration-token-not-registered') {
                        // tokensToRemove.push(event.data.child('Token').remove());
                        console.log('');
                    }
                } else {
                    console.log('发送成功...');
                }
            });
            return Promise.all(tokensToRemove);
        });
    });


    // Get the follower profile.
    // const getFollowerProfilePromise = admin.auth().getUser(orderId);

    //原来的先注释掉
    // return Promise.all([getDeviceTokensPromise, getFollowerProfilePromise]).then(results => {
    // return Promise.all([getDeviceTokensPromise]).then(results => {
    //     const tokensSnapshot = results[0];
    //     // const follower = results[1];
    //
    //
    //
    //     // Check if there are any device tokens.
    //     if (!tokensSnapshot.hasChildren()) {
    //         return console.log('没有要通知的token.');
    //     }
    //     console.log('There are', tokensSnapshot.numChildren(), 'tokens to send notifications to.');
    //     console.log('Fetched follower profile', follower);
    //
    //     // Notification details.
    //     const payload = {
    //         notification: {
    //             title: '现金口贷订单!',
    //             body: `${follower.displayName} is now following you.`,
    //             icon: follower.photoURL
    //         }
    //     };
    //
    //     // Listing all tokens.
    //     const tokens = Object.keys(tokensSnapshot.val());
    //
    //     // Send notifications to all tokens.
    //     return admin.messaging().sendToDevice(tokens, payload).then(response => {
    //         // For each message check if there was an error.
    //         const tokensToRemove = [];
    //         response.results.forEach((result, index) => {
    //             const error = result.error;
    //             if (error) {
    //                 console.error('Failure sending notification to', tokens[index], error);
    //                 // Cleanup the tokens who are not registered anymore.
    //                 if (error.code === 'messaging/invalid-registration-token' ||
    //                     error.code === 'messaging/registration-token-not-registered') {
    //                     tokensToRemove.push(tokensSnapshot.ref.child(tokens[index]).remove());
    //                 }
    //             }
    //         });
    //         return Promise.all(tokensToRemove);
    //     });
    // });
});

//发送推送消息(Web管理端)
exports.sendAdminNotification = functions.database.ref('/orders/{userId}/{orderId}').onWrite(event => {
    const orderId = event.params.orderId;
    const userId = event.params.userId;

    // If un-follow we exit the function.
    if (!event.data.val()) {
        return console.log('订单 ', orderId, '没有被创建', userId);
    }
    console.log('有一个新订单:', orderId, 'for user:', userId);

    // Get the list of device notification tokens.
    const getTokensPromise = admin.database().ref(`/admin`).once('value');

    return Promise.all([getTokensPromise]).then(reslut => {
        if (!reslut[0].exists()) {
            return;
        }

        if (!reslut[0].hasChildren()) {
            console.error('数据不正常，没有token..');
            return;
        }
        // const  tokens;
        const res = reslut[0];
        let tokens = Object.keys(reslut[0].val());

        console.log('token length:' + tokens.length);
        tokens.forEach((token)=>{console.log(token)});

        tokens.forEach((token) => {
            if (!res.child(token).val()) {
                tokens.pop();
            }
        });

        // const tokens = Object.keys(reslut.val());
        const blance = event.data.child('blance').val();
        const term = event.data.child('term').val();
        const termunit = event.data.child('terUnit').val();

        if (!tokens.length > 0) {
            console.log('没有发现token');
            return;
        }

        let status = '';
        switch (event.data.child('status').val()) {
            case '0':
                status = '待审批';
                break;
            case '1':
                status = '待签约';
                break;
            case '2':
                status = '待放款';
                break;
        }

        // Notification details.
        const payload = {
            notification: {
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
                title: '现金口贷订单!',
                body: `用户申请的${blance}元现金贷,期限${term}${termunit}.状态:${status}，请处理！`,
                sound: 'default',
                icon: 'http://freevector.co/wp-content/uploads/2013/01/50268-dollars-money-bag-on-a-hand-200x200.png',
            },
            data: {
                id: event.data.key,
                status: event.data.child('status').val(),
                URL: 'http://localhost:3000/#/dashboard'
            }
        };


        console.log(`发送的tokens: ${tokens}`);
        return admin.messaging().sendToDevice(tokens, payload).then(response => {
            // For each message check if there was an error.
            const tokensToRemove = [];
            response.results.forEach((result, index) => {
                const error = result.error;
                if (error) {
                    console.error('发送通知失败给', tokens[index], error);
                    // Cleanup the tokens who are not registered anymore.
                    if (error.code === 'messaging/invalid-registration-token' ||
                        error.code === 'messaging/registration-token-not-registered') {
                        // tokensToRemove.push(event.data.child('Token').remove());
                        console.log('');
                    }
                } else {
                    console.log('发送成功...');
                }
            });
            return Promise.all(tokensToRemove);
        });
    });


    // Get the follower profile.
    // const getFollowerProfilePromise = admin.auth().getUser(orderId);

    //原来的先注释掉
    // return Promise.all([getDeviceTokensPromise, getFollowerProfilePromise]).then(results => {
    // return Promise.all([getDeviceTokensPromise]).then(results => {
    //     const tokensSnapshot = results[0];
    //     // const follower = results[1];
    //
    //
    //
    //     // Check if there are any device tokens.
    //     if (!tokensSnapshot.hasChildren()) {
    //         return console.log('没有要通知的token.');
    //     }
    //     console.log('There are', tokensSnapshot.numChildren(), 'tokens to send notifications to.');
    //     console.log('Fetched follower profile', follower);
    //
    //     // Notification details.
    //     const payload = {
    //         notification: {
    //             title: '现金口贷订单!',
    //             body: `${follower.displayName} is now following you.`,
    //             icon: follower.photoURL
    //         }
    //     };
    //
    //     // Listing all tokens.
    //     const tokens = Object.keys(tokensSnapshot.val());
    //
    //     // Send notifications to all tokens.
    //     return admin.messaging().sendToDevice(tokens, payload).then(response => {
    //         // For each message check if there was an error.
    //         const tokensToRemove = [];
    //         response.results.forEach((result, index) => {
    //             const error = result.error;
    //             if (error) {
    //                 console.error('Failure sending notification to', tokens[index], error);
    //                 // Cleanup the tokens who are not registered anymore.
    //                 if (error.code === 'messaging/invalid-registration-token' ||
    //                     error.code === 'messaging/registration-token-not-registered') {
    //                     tokensToRemove.push(tokensSnapshot.ref.child(tokens[index]).remove());
    //                 }
    //             }
    //         });
    //         return Promise.all(tokensToRemove);
    //     });
    // });
});

//图像文字识别（可用于身份证/银行卡识别）
exports.ocrImages = functions.storage.object().onChange(event => {
    const object = event.data;
    const file = gcs.bucket(object.bucket).file(object.name);

    console.log(`图片路径${object.bucket} : ${object.name}`);

    console.log(`图片地址：${object.selfLink}`);

    // Exit if this is a move or deletion event.
    if (object.resourceState === 'not_exists') {
        return console.log('这是删除图片...');
    } else {
        // return console.log('暂时不能使用，需要续费开通');
        return ocr.scan({
            url: 'https://lh6.googleusercontent.com/-uDSzGigVtMw/S1H1TsQCSyI/AAAAAAAAF1Y/TWHfup4e1RE/s450/2010011702.jpg', // 支持本地路径
            type: 'text',
        }).then(function (result) {
            return console.log(result)
        }).catch(function (err) {
            console.log('出错了:', err);
        });
    }

    // Check the image content using the Cloud Vision API.
    // return vision.detectSafeSearch(file).then(data => {
    //     const safeSearch = data[0];
    //     console.log('SafeSearch results on image', safeSearch);
    //
    //     if (safeSearch.adult || safeSearch.violence) {
    //         // return blurImage(object.name, object.bucket, object.metadata);
    //         console.log('图片不合法');
    //     }
    // });
});


//翻译api
exports.transAction = functions.https.onRequest((req, res) => {
    const handleError = (message, error) => {
        console.error({
            Message: message
        }, error);
        return res.sendStatus(500);
    };

    const handleResponse = (message, status, body) => {
        console.log({
            Message: message
        }, {
            Response: {
                Status: status,
                Body: body
            }
        });
        if (body) {
            return res.status(200).json(body);
        }
        return res.sendStatus(status);
    };

    let orgin = '';
    try {
        // 要求请求方式必须为post，其他的拒绝
        if (req.method !== 'POST') {
            return handleResponse('请求方式必须使用post', 403);
        }
        console.log(req.body);
        orgin = req.body.original;
        if (!orgin) {
            return handleResponse(orgin, 400);
        }
        const source = req.body.source;
        if (!source) {
            return handleResponse(orgin, 400);
        }
        const target = req.body.target;
        if (!target) {
            return handleResponse(orgin, 400);
        }

        return createTranslationPromise(source, target, orgin, res);


    } catch (error) {
        return handleError('出错了', error);
    }

});


// URL to the Google Translate API.
function createTranslateUrl(source, target, payload) {
    return `https://www.googleapis.com/language/translate/v2?key=${functions.config().firebase.apiKey}&source=${source}&target=${target}&q=${payload}`;
}

function createTranslationPromise(source, target, message, res) {
    // const key = snapshot.key;
    // const message = snapshot.val().message;
    return request(createTranslateUrl(source, target, message), {resolveWithFullResponse: true}).then(
        response => {
            if (response.statusCode === 200) {
                const data = JSON.parse(response.body).data;
                return res.status(200).json(data);
            }
            throw response.body;
        });
}