
var userHandler = require('../lib/user-handler');
var pinHandler = require('../lib/pin-handler');
var messages = require('../lib/error-messages');
var Hogan = require('hogan.js');
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
      if (errResult.code === messages.PIN.INVALID_PIN_CODE) {

        var template = messages.PIN.INVALID_PIN;
        var compiledTemplate = Hogan.compile(template);

        userHandler.getUserMail(sessionID)
          .then(function (emailAddress) {

            var data = {
              emailAddress: emailAddress
            };

            var errorMessage = compiledTemplate.render(data);

            userHandler.setIsAuthenticated(sessionID, false);
            reply.view('02-send-your-data/04-authenticate', {
              errorMessage: errorMessage,
              invalidPin: true
            });
          });
      }
    });
};
module.exports.postHandler = postHandler;

