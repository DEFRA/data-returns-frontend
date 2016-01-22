

var cacheHandler = require('../lib/cache-handler');
var userHandler = require('../lib/user-handler');
//path: '/01-start/01-start',

/*
 *  HTTP POST handler for '/01-start/01-start' route
 *  @Param request
 *  @Param reply
 */
var postHandler = function (request, reply) {

  var sessionID = 'id_' + request.session.id;
  // clear session data
  request.session.reset();
  // seed user data
  var user = {
    authenticated: false,
    email: '',
    pin: '',
    filekey: '',
    uploadCount: 0
  };

  //session id will have changed after the reset
  sessionID = 'id_' + request.session.id;

  userHandler.setUser(sessionID, user)
    .then(function () {
      reply.redirect('/02-send-your-data/01-upload-your-data');
    });

};

module.exports.postHandler = postHandler;