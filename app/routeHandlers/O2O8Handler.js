
var UserHandler = require('../lib/user-handler');
var SMTPHandler = require('../lib/smtp-handler');
var Utils = require('../lib/utils');
var CacheHandler = require('../lib/cache-handler');
var HelpLinks = require('../config/dep-help-links');

/*
 * HTTP GET Handler for /02-send-your-data/08-done
 * 
 */
module.exports.getHandler = function (request, reply) {
  console.log('==> O2O8Handler.getHandler()');
  var sessionID = Utils.base64Decode(request.state['data-returns-id']);
  var key = sessionID + '_SourceName';
  var email;
  //Get the users email address from the cache
  UserHandler.getUserMail(sessionID)
    .then(function (usermail) {
      //get the original file name the user uploaded from the cache
      email = usermail;
      reply.view('02-send-your-data/08-done', {
        userEmail: email,
        EnvironmentAgencyHome: HelpLinks.links.EnvironmentAgencyHome
      });
    })
    .then(function () {

      CacheHandler.getValue(key)
        .then(function (filename) {
          filename = filename ? filename.replace(/"/g, "") : '';
          SMTPHandler.sendConfirmationEmail(email, filename)
            .then(function (email) {
              console.log('\t The confirmation email has been sent');
            })
            // Increment the count of uploads using the current pin number
            .then(function () {
              UserHandler.incrementUploadCount(sessionID);
            })
            // delete the file uploaded
            .then(function () {
              Utils.deleteFile(sessionID);
            });
        });
    })
    .catch(function (err) {
      console.error('<== O2O8Handler.getHandler() Unknown error' + err);
    });

};

    