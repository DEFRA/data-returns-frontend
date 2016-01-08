
var UserHandler = require('../lib/user-handler');
var SMTPHandler = require('../lib/smtp-handler');
var Utils = require('../lib/utils');
var CacheHandler = require('../lib/cache-handler');

/*
 * HTTP GET Handler for /02-send-your-data/08-done
 * 
 */
module.exports.getHandler = function (request, reply) {

  var sessionID = 'id_' + request.session.id;
  var key = sessionID + '_SourceName';

  //Get the users email address from the cache
  UserHandler.getUserMail(sessionID)
    .then(function (usermail) {
      //get the original file name the user uploaded from the cache
      CacheHandler.getValue(key)
        .then(function (filename) {
          // Send the confirmation email to the user
          SMTPHandler.sendConfirmationEmail(usermail, filename.replace(/"/g, ""))
            .then(function (userMail) {
              reply.view('02-send-your-data/08-done', {
                userEmail: userMail
              });
            })
            // Increment the count of uploads using the current pin number
            .then(function () {
              UserHandler.incrementUploadCount(sessionID);
            })
            // delete the file uploaded
            .then(function () {
              Utils.deleteFile(sessionID);
            })
            //Clean up cached items for this upload
            .then(function () {
              CacheHandler.deleteKeyValuePair(sessionID + '_SourceName');
            })
            .then(function () {
              CacheHandler.deleteKeyValuePair(sessionID + '_FilePath');
            });
        });
    });
};

    