
var UserHandler = require('../lib/user-handler');
var SMTPHandler = require('../lib/smtp-handler');
var Utils = require('../lib/utils');
var CacheHandler = require('../lib/cache-handler');

/*
 * HTTP GET Handler for /02-send-your-data/08-done
 */
module.exports.getHandler = function (request, reply) {
  var sessionID = 'id_' + request.session.id;
  UserHandler.getUserMail(sessionID)
    .then(function (usermail) {
      SMTPHandler.sendConfirmationEmail(usermail)
        .then(function (userMail) {
          reply.view('02-send-your-data/08-done', {
            userEmail: userMail
          });
        })
        .then(function () {
          UserHandler.incrementUploadCount(sessionID);
        })
        .then(function () {
          //Clean up the temp file
          Utils.deleteFile(sessionID);
        })
        .then(function () {
          //clean up the cache
          CacheHandler.deleteKeyValuePair(sessionID + '_FilePath');
        });
    });
};

    