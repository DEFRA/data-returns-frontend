
var UserHandler = require('../lib/user-handler');
var Utils = require('../lib/utils');
/*
 * HTTP GET handler for gets for /02-send-your-data/06-check
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
        reply.redirect('/02-send-your-data/05-success');
      } else {
        reply.redirect('/02-send-your-data/03-email');
      }
    })
    .catch(function (err) {
      console.error('<== O2O6Handler error: ' + err);
      reply.redirect('/02-send-your-data/03-email');
    });
};
