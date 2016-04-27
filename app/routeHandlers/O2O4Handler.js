
var userHandler = require('../lib/user-handler');
var pinHandler = require('../lib/pin-handler');
var messages = require('../lib/error-messages');
var Utils = require('../lib/utils');
var ErrorHandler = require('../lib/error-handler');
/*
 * HTTP POST handler for /02-send-your-data/04-enter-your-code
 * @param {type} request
 * @param {type} reply
 * @returns {undefined}
 */
var postHandler = function (request, reply) {

  var sessionID = Utils.base64Decode(request.state['data-returns-id']);
  var userPin = request.payload['validation_code'].toString().trim();
  userPin = userPin ? parseInt(userPin) : 0;
  pinHandler.validatePin(sessionID, userPin)
    .then(function (result) {
      if (result.code === messages.PIN.VALID_PIN) {
        userHandler.setIsAuthenticated(sessionID, true);
        reply.redirect('/02-send-your-data/05-send-your-file');
      }
    })
    .catch(function (errResult) {

      userHandler.getUserMail(sessionID)
        .then(function (emailAddress) {

          var metadata = {
            emailAddress: emailAddress
          };

          var errorMessage = ErrorHandler.render(errResult.code, metadata);

          userHandler.setIsAuthenticated(sessionID, false);
          reply.view('02-send-your-data/04-enter-your-code', {
            errorMessage: errorMessage,
            invalidPin: true,
            errorcode: 'DR' + Utils.pad(errResult.code, 4),
            emailAddress: emailAddress,
            startAgain: errResult.code === 2280 ? true : false
          });
        });

    });
};
module.exports.postHandler = postHandler;

