
var UserHandler = require('../lib/user-handler');
var Utils = require('../lib/utils');
var errBit = require('../lib/errbitErrorMessage');
/*
 * HTTP GET handler for gets for /file/check
 * @param {type} request
 * @param {type} reply
 */
module.exports.getHandler = function (request, reply) {

  //console.log(request);

  var sessionID = Utils.base64Decode(request.state['data-returns-id']);
  console.log('==> O2O6Handler.getHandler() ');
  UserHandler.isAuthenticated(sessionID)
    .then(function (result) {
      if (result === true) {
        reply.redirect('/file/send');
      } else {
        reply.redirect('/email');
      }
    })
    .catch(function (err) {
      var msg = new errBit.errBitMessage(err, __filename, 'getHandler', 24);
      console.error(msg);
      reply.redirect('/email');
    });
};
