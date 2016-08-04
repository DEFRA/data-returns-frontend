var smtpHandler = require('../lib/smtp-handler');
var pinHandler = require('../lib/pin-handler');
var userHandler = require('../lib/user-handler');
var cacheHandler = require('../lib/cache-handler');
var utils = require('../lib/utils');
var errorHandler = require('../lib/error-handler');
const errbit = require("../lib/errbit-handler");
var redisKeys = require('../lib/redis-keys');

module.exports = {
    /*
     * HTTP GET handler for /email
     * @param {type} request
     * @param {type} reply
     * @returns {undefined}
     */
    getHandler: function (request, reply) {

        var sessionID = utils.base64Decode(request.state['data-returns-id']);

        userHandler.isAuthenticated(sessionID)
            .then(function (result) {
                cacheHandler.getValue(redisKeys.CLIENT_FILENAME.compositeKey(sessionID))
                    .then(function (fileName) {
                        fileName = fileName ? fileName.replace(/"/g, '') : '';

                        if (result === true) {
                            reply.view('data-returns/send-your-file', {
                                fileName: fileName
                            });
                        } else {
                            reply.view('data-returns/confirm-your-email-address', {
                                fileName: fileName,
                                invalidEmailAddress: false,
                                showStartAgainButton: false,
                                showSendMailButton: true,
                                showInput: 'true'
                            });
                        }
                    })
                    .catch(function (err) {
                        errbit.notify(err);
                    });
            })
            .catch(function () {
                reply.view('data-returns/confirm-your-email-address', {
                    returnMetaData: request.session.get('returnMetaData')
                });
            });

    },
    /*
     * HTTP Post Handler for /email
     * @param {type} request
     * @param {type} reply
     * @returns {undefined}
     */
    postHandler: function (request, reply) {
        /* get the users email address */
        var usermail = request.payload['user_email'];
        var sessionID = utils.base64Decode(request.state['data-returns-id']);
        usermail = usermail.trim();
        /* Validate the email address */
        smtpHandler.validateEmailAddress(usermail)
            .then(function (result) {
                if (result === true) {
                    /* Get a new pin code */
                    pinHandler.newPin()
                        .then(function (newpin) {
                            /* Store in REDIS */
                            var datenow = new Date();

                            var user = {
                                authenticated: false,
                                email: usermail,
                                pin: newpin,
                                pinCreationTime: datenow.toUTCString(),
                                uploadCount: 0
                            };

                            userHandler.setUser(sessionID, user)
                                .then(function () {
                                    smtpHandler.sendPinEmail(usermail, newpin);
                                })
                                .then(function () {
                                    reply.redirect('/pin',
                                        {
                                            emailAddress: usermail
                                        });
                                });
                        });
                }

            })
            .catch(function (errResult) {
                reply.view('data-returns/confirm-your-email-address', {
                    invalidEmailAddress: true,
                    showStartAgainButton: errResult.errorCode === 2055 ? true : false,
                    showInput: errResult.errorCode === 2055 ? false : true,
                    showSendMailButton: errResult.errorCode === 2055 ? false : true,
                    invalidEmailAddressErrorMessage: errorHandler.render(errResult.errorCode, null, 'Invalid email address'),
                    errorcode: 'DR' + errResult.errorCode
                });
            });
    }
};