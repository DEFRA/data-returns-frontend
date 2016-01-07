
var userHandler = require('../lib/user-handler');
var pinHandler = require('../lib/pin-handler');
var messages = require('../lib/error-messages');

/*
 * HTTP POST handler for /02-send-your-data/04-authenticate
 * @param {type} request
 * @param {type} reply
 * @returns {undefined}
 */
var postHandler = function (request, reply) {

  var sessionID = 'id_' + request.session.id;
  var userPin = request.payload['validation_code'].toString().trim();

  userPin = userPin ? parseInt(userPin) : 0;

  pinHandler.validatePin(sessionID, userPin)
    .then(function (result) {
      if (result.code === messages.PIN.VALID_PIN) {
        userHandler.setIsAuthenticated(sessionID, true);
        reply.redirect('/02-send-your-data/05-success');
      }
    })
    .catch(function (errResult) {
      if (errResult.code === messages.PIN.INVALID_PIN) {
        userHandler.setIsAuthenticated(sessionID, false);
        reply.view('02-send-your-data/04-authenticate', {
          invalidPin: true
        });
      }
    });
};

module.exports.postHandler = postHandler;

