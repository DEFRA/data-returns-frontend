
var UserHandler = require('../lib/user-handler');
/*
 * HTTP GET handler for gets for /02-send-your-data/06-failure
 * @param {type} request
 * @param {type} reply
 */
module.exports.getHandler = function (request, reply) {

  var sessionID = 'id_' + request.session.id;
  UserHandler.isAuthenticated(sessionID)
    .then(function (result) {
      if (result === true) {
        reply.redirect('/02-send-your-data/05-success');
      } else {
        reply.redirect('/02-send-your-data/03-email');
      }
    });
};
