"use strict";
var smtpHandler = require('../lib/smtp-handler');
var pinHandler = require('../lib/pin-handler');
var userHandler = require('../lib/user-handler');
var errorHandler = require('../lib/error-handler');
const winston = require("winston");

module.exports = {
    /*
     * HTTP GET handler for /email
     * @param {type} request
     * @param {type} reply
     * @returns {undefined}
     */
    getHandler: function (request, reply) {
        var sessionID = userHandler.getSessionID(request);
        let viewConfirmEmail = function () {
            reply.view('data-returns/confirm-your-email-address', {
                invalidEmailAddress: false,
                showStartAgainButton: false,
                showSendMailButton: true,
                showInput: 'true'
            });
        };

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
        var sessionID = userHandler.getSessionID(request);
        usermail = usermail.trim();
        /* Validate the email address */
        smtpHandler.validateEmailAddress(usermail).then(function (isValid) {
            if (isValid === true) {
                /* Get a new pin code */
                pinHandler.newPin().then(function (newpin) {
                    /* Store in REDIS */
                    var datenow = new Date();

                    var user = {
                        authenticated: false,
                        email: usermail,
                        pin: newpin,
                        pinCreationTime: datenow.toUTCString(),
                        uploadCount: 0
                    };

                    userHandler.setUser(sessionID, user).then(function () {
                        smtpHandler.sendPinEmail(usermail, newpin);
                    }).then(function () {
                        reply.redirect('/pin', {emailAddress: usermail});
                    });
                });
            }

        }).catch(function (errResult) {
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