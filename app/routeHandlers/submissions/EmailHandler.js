"use strict";
const winston = require("winston");
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
        let sessionID = userHandler.getSessionID(request);

        let viewConfirmEmail = function () {
            reply.view('data-returns/confirm-your-email-address', {
                invalidEmailAddress: false,
                showStartAgainButton: false,
                showSendMailButton: true,
                showInput: 'true'
            });
        };

        userHandler.hasUploads(sessionID).then(function () {
            userHandler.isAuthenticated(sessionID).then(function (isAuthenticated) {
                if (isAuthenticated === true) {
                    reply.redirect("/file/send").rewritable(true);
                } else {
                    viewConfirmEmail();
                }
            }).catch(function (err) {
                winston.error(err);
                viewConfirmEmail();
            });
        }).catch(function () {
            // Show file-unavailable page if the file uploads array is empty
            reply.view('data-returns/file-unavailable');
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
        let userMail = request.payload['user_email'];
        let sessionID = userHandler.getSessionID(request);
        userMail = userMail.trim();
        /* Validate the email address */
        smtpHandler.validateEmailAddress(userMail).then(pinHandler.newPin).then(function (newpin) {
            /* Store in REDIS */
            let user = {
                authenticated: false,
                email: userMail,
                pin: newpin,
                pinCreationTime: new Date().toUTCString(),
                uploadCount: 0
            };
            return userHandler.setUser(sessionID, user)
                .then(() => smtpHandler.sendPinEmail(userMail, newpin))
                .then(() => reply.redirect('/pin', {emailAddress: userMail}));
        }).catch(function (errResult) {
            if (!errResult.errorCode || errResult.errorCode === 3000) {
                reply.redirect('data-returns/failure');
            } else {
                reply.view('data-returns/confirm-your-email-address', {
                    invalidEmailAddress: true,
                    showStartAgainButton: errResult.errorCode === 2055,
                    showInput: errResult.errorCode !== 2055,
                    showSendMailButton: errResult.errorCode !== 2055,
                    invalidEmailAddressErrorMessage: errorHandler.render(errResult.errorCode, null, 'Invalid email address'),
                    errorcode: 'DR' + errResult.errorCode
                });
            }
        });
    }
};