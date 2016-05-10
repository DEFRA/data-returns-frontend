
var UserHandler = require('../lib/user-handler');
var SMTPHandler = require('../lib/smtp-handler');
var Utils = require('../lib/utils');
var CacheHandler = require('../lib/cache-handler');
var HelpLinks = require('../config/dep-help-links');

/*
 * HTTP GET Handler for /file/sent
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
      reply.view('data-returns/file-sent', {
        userEmail: email,
        EnvironmentAgencyHome: HelpLinks.links.EnvironmentAgencyHome
      });
    })
    .then(function () {

      CacheHandler.getValue(key)
        .then(function (filename) {
          filename = filename ? filename.replace(/"/g, '') : '';

          //get ea_id's and site names's from the cached upload result
          key = sessionID + '_UploadResult';

          CacheHandler.getValue(key)
            .then(function (data) {

              data = JSON.parse(data);

              var parseResult = data.parseResult;
              //var ea_ids = parseResult.permitNumber;
              //var sitenames = parseResult.siteName ? parseResult.siteName : 'Not given';

              var metadata = {
                email: email,
                filename: filename,
                data: parseResult
              };

              SMTPHandler.sendConfirmationEmail(metadata)
                .then(function (email) {
                  console.log('\t The confirmation email has been sent to ' + email);
                })
                // Increment the count of uploads using the current pin number
                .then(function () {
                  UserHandler.incrementUploadCount(sessionID);
                })
                // delete the file uploaded
                .then(function () {
                  Utils.deleteFile(sessionID);
                })
                //delete the upload results
                .then(function () {
                  CacheHandler.delete(key);
                });
            });
        });
    })
    .catch(function (err) {
      console.error('<== O2O8Handler.getHandler() Unknown error' + err);
    });

};

    