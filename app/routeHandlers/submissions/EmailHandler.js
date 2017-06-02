'use strict';
const winston = require('winston');
const smtpHandler = require('../../lib/smtp-handler');
const pinHandler = require('../../lib/pin-handler');
const userHandler = require('../../lib/user-handler');
const errorHandler = require('../../lib/error-handler');

module.exports = {
    /*
     * HTTP GET handler for /email
     * @param {type} request
     * @param {type} reply
     * @returns {undefined}
     */
    getHandler: function (request, reply) {
        const sessionID = userHandler.getSessionID(request);

        const viewConfirmEmail = function () {
            reply.view('data-returns/confirm-your-email-address', {
                invalidEmailAddress: false,
                showStartAgainButton: false,
                showSendMailButton: true,
                showInput: 'true'
            });
        };

        userHandler.hasUploads(sessionID).then(function (hasUploads) {
            if (hasUploads) {
                userHandler.isAuthenticated(sessionID).then(function (isAuthenticated) {
                    if (isAuthenticated === true) {
                        reply.redirect('/file/send').rewritable(true);
                    } else {
                        viewConfirmEmail();
                    }
                }).catch(function (err) {
                    winston.error(err);
                    viewConfirmEmail();
                });
            } else {
                // Show file-unavailable page if the file uploads array is empty
                reply.view('data-returns/file-unavailable');
            }
        }).catch(function () {
            reply.redirect('/failure');
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
        const userMail = request.payload['user_email'] ? request.payload['user_email'].trim() : '';
        const sessionID = userHandler.getSessionID(request);

        /* Validate the email address */
        smtpHandler.validateEmailAddress(userMail)
            .then(pinHandler.newPin)
            .then((newPin) => {
                return {
                    authenticated: false,
                    email: userMail,
                    pin: newPin,
                    pinCreationTime: new Date().toUTCString(),
                    uploadCount: 0
                };
            })
            .then((metadata) => {
                return userHandler.setUser(sessionID, metadata)
                    .then(smtpHandler.sendPinEmail(userMail, metadata.pin));
            })
            .then(() => reply.redirect('/pin', {emailAddress: userMail}))
            .catch(function (errResult) {
                if (!errResult.errorCode || errResult.errorCode === 3000) {
                    reply.redirect('/failure');
                } else {
                    reply.view('data-returns/confirm-your-email-address', {
                        invalidEmailAddress: true,
                        showStartAgainButton: errResult.errorCode === 2055,
                        showInput: errResult.errorCode !== 2055,
                        showSendMailButton: errResult.errorCode !== 2055,
                        invalidEmailAddressErrorMessage: errorHandler.render(errResult.errorCode, null, 'Invalid email address'),
                        errorCode: 'DR' + errResult.errorCode
                    });
                }
            });
    }
};
