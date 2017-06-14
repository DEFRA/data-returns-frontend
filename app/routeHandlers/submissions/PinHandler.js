"use strict";
const winston = require("winston");
const userHandler = require('../../lib/user-handler');
const pinHandler = require('../../lib/pin-handler');
const messages = require('../../lib/error-messages');
const errorHandler = require('../../lib/error-handler');

module.exports = {

    /*
     * get handler for /pin route
     * @param {type} request
     * @param {type} reply
     *
     */
    getHandler: function (request, reply) {
        let sessionID = userHandler.getSessionID(request);
        userHandler.hasUploads(sessionID).then(function (hasUploads) {
            if (hasUploads) {
                userHandler.getUserMail(sessionID).then(function (emailAddress) {
                    pinHandler.checkLock(sessionID).then((status) => {
                        let errorCode = null;
                        let errorMessage = null;
                        if (status.locked) {
                            errorCode = messages.PIN.PIN_ATTEMPTS_EXCEEDED;
                            errorMessage = errorHandler.render(errorCode, {emailAddress: emailAddress});
                        }
                        reply.view('data-returns/enter-your-code', {
                            errorMessage: errorMessage,
                            invalidPin: status.locked,
                            errorCode: errorCode,
                            emailAddress: emailAddress,
                            startAgain: status.locked
                        });
                    }).catch(() => reply.redirect('/failure'));
                }).catch(() => {
                    // User email not in session, return to email page
                    reply.redirect('/email');
                });
            } else {
                // Show file-unavailable page if the user hasn't uploaded any files
                reply.view('data-returns/file-unavailable');
            }
        }).catch((e) => {
            winston.error(e);
            reply.redirect("/failure");
        });
    },


    /*
     * HTTP POST handler for /pin
     * @param {type} request
     * @param {type} reply
     * @returns {undefined}
     */
    postHandler: function (request, reply) {
        let sessionID = userHandler.getSessionID(request);
        let userPin = request.payload['validation_code'].trim();
        pinHandler.validatePin(sessionID, userPin).then(function (status) {
            let modifyFn = (user) => user.authenticated = status.valid;
            userHandler.modifyUser(sessionID, modifyFn).then((user) => {
                if (status.valid) {
                    reply.redirect('/file/send');
                } else {
                    let errorCode = messages.PIN.INVALID_PIN;
                    if (status.expired) {
                        errorCode = messages.PIN.PIN_EXPIRED;
                    } else if (status.locked) {
                        errorCode = messages.PIN.PIN_ATTEMPTS_EXCEEDED;
                    }
                    let errorMessage = errorHandler.render(errorCode, {emailAddress: user.email});
                    reply.view('data-returns/enter-your-code', {
                        errorMessage: errorMessage,
                        invalidPin: !status.valid || status.locked,
                        errorCode: errorCode,
                        emailAddress: user.email,
                        startAgain: status.locked
                    });
                }
            });
        }).catch((err) => {
            winston.error(err);
            reply.redirect('/failure');
        });
    }
};