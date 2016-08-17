var userHandler = require('../lib/user-handler');
var pinHandler = require('../lib/pin-handler');
var messages = require('../lib/error-messages');
var errorHandler = require('../lib/error-handler');

module.exports = {

    /*
     * get handler for /pin route
     * @param {type} request
     * @param {type} reply
     *
     */
    getHandler: function (request, reply) {
        var sessionID = userHandler.getSessionID(request);

        userHandler.getUserMail(sessionID)
            .then(function (emailAddress) {

                reply.view('data-returns/enter-your-code', {
                    errorMessage: null,
                    invalidPin: false,
                    errorcode: null,
                    emailAddress: emailAddress,
                    startAgain: false
                });


            });
    },
    /*
     * HTTP POST handler for /pin
     * @param {type} request
     * @param {type} reply
     * @returns {undefined}
     */
    postHandler: function (request, reply) {
        var sessionID = userHandler.getSessionID(request);
        var userPin = request.payload['validation_code'].toString().trim();
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

                        var metadata = {
                            emailAddress: emailAddress
                        };

                        var errorMessage = errorHandler.render(errResult.code, metadata);

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

