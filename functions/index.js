const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.helloWorld = functions.https.onRequest((request, response) => {
    response.send("Hello from Firebase!");
});

exports.sendOrderNotification = functions.database.ref('/orders/{userId}/{orderId}').onWrite(event => {
    const orderId = event.params.orderId;
    const userId = event.params.userId;

    // If un-follow we exit the function.
    if (!event.data.val()) {
        return console.log('订单 ', orderId, '没有被创建', userId);
    }
    console.log('有一个新订单:', orderId, 'for user:', orderId);


    // Get the list of device notification tokens.
    // const getDeviceTokensPromise = admin.database().ref(`/orders/${userId}/${orderId}/Tokens`).once('value');

    const tokens = event.data.child('Token').val();
    const blance = event.data.child('blance').val();
    const term = event.data.child('term').val();
    const termunit = event.data.child('terUnit').val();

    if (!tokens){
        console.log('没有发现token');
        return;
    }

    let status = '';
    switch (event.data.child('status')){
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
            click_action:'FLUTTER_NOTIFICATION_CLICK',
            title: '现金口贷订单!',
            body: `您已申请${blance}元现金贷，期限为${term}${termunit}.状态为：${status}`,
            // icon: 'http://freevector.co/wp-content/uploads/2013/01/50268-dollars-money-bag-on-a-hand-200x200.png',
        },
        data:{
            id: event.data.key,
            status: event.data.child('status').val()
        }
    };

    return admin.messaging().sendToDevice([tokens], payload).then(response => {
        // For each message check if there was an error.
        const tokensToRemove = [];
        response.results.forEach((result, index) => {
            const error = result.error;
            if (error) {
                console.error('发送通知失败给', tokens[index], error);
                // Cleanup the tokens who are not registered anymore.
                if (error.code === 'messaging/invalid-registration-token' ||
                    error.code === 'messaging/registration-token-not-registered') {
                    tokensToRemove.push(event.data.child('Token').remove());
                }
            }
        });
        return Promise.all(tokensToRemove);
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
