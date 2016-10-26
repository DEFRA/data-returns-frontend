"use strict";
let userHandler = require('../lib/user-handler');
let pinHandler = require('../lib/pin-handler');
let messages = require('../lib/error-messages');
let errorHandler = require('../lib/error-handler');

module.exports = {

    /*
     * get handler for /pin route
     * @param {type} request
     * @param {type} reply
     *
     */
    getHandler: function (request, reply) {
        let sessionID = userHandler.getSessionID(request);
        userHandler.hasUploads(sessionID).then(function() {
            userHandler.getUserMail(sessionID).then(function (emailAddress) {
                reply.view('data-returns/enter-your-code', {
                    errorMessage: null,
                    invalidPin: false,
                    errorcode: null,
                    emailAddress: emailAddress,
                    startAgain: false
                });
            });
        }).catch(function() {
            // Show file-unavailable page if the user hasn't uploaded any files
            reply.view('data-returns/file-unavailable');
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
        let userPin = request.payload['validation_code'].toString().trim();
        userPin = userPin ? parseInt(userPin) : 0;
        pinHandler.validatePin(sessionID, userPin)
            .then(function (result) {
                if (result.code === messages.PIN.VALID_PIN) {
                    userHandler.setIsAuthenticated(sessionID, true);
                    reply.redirect('/file/send');
                }
            })
            .catch(function (errResult) {

                userHandler.getUserMail(sessionID)
                    .then(function (emailAddress) {

                        let metadata = {
                            emailAddress: emailAddress
                        };

                        let errorMessage = errorHandler.render(errResult.code, metadata);

                        userHandler.setIsAuthenticated(sessionID, false);
                        reply.view('data-returns/enter-your-code', {
                            errorMessage: errorMessage,
                            invalidPin: true,
                            errorCode: errResult.code,
                            emailAddress: emailAddress,
                            startAgain: errResult.code === 2280
                        });
                    });

            });
    }
};

