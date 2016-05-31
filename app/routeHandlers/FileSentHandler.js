
var userHandler = require('../lib/user-handler');
var smtpHandler = require('../lib/smtp-handler');
var utils = require('../lib/utils');
var cacheHandler = require('../lib/cache-handler');
var helpLinks = require('../config/dep-help-links');
var errBit = require('../lib/errbitErrorMessage');

/*
 * HTTP GET Handler for /file/sent
 * 
 */
module.exports.getHandler = function (request, reply) {
  console.log('==> O2O8Handler.getHandler()');
  var sessionID = utils.base64Decode(request.state['data-returns-id']);
  var key = sessionID + '_SourceName';
  var email;
  //Get the users email address from the cache
  userHandler.getUserMail(sessionID)
    .then(function (usermail) {
      //get the original file name the user uploaded from the cache
      email = usermail;
      reply.view('data-returns/file-sent', {
        userEmail: email,
        EnvironmentAgencyHome: helpLinks.links.EnvironmentAgencyHome
      });
    })
    .then(function () {

      cacheHandler.getValue(key)
        .then(function (filename) {
          filename = filename ? filename.replace(/"/g, '') : '';

          //get ea_id's and site names's from the cached upload result
          key = sessionID + '_UploadResult';

          cacheHandler.getValue(key)
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

              smtpHandler.sendConfirmationEmail(metadata)
                .then(function (email) {
                  console.log('\t The confirmation email has been sent to ' + email);
                })
                // Increment the count of uploads using the current pin number
                .then(function () {
                  userHandler.incrementUploadCount(sessionID);
                })
                // delete the file uploaded
                .then(function () {
                  utils.deleteFile(sessionID);
                })
                //delete the upload results
                .then(function () {
                  cacheHandler.delete(key);
                });
            });
        });
    })
    .catch(function (err) {
      var msg = new errBit.errBitMessage(err, __filename, 'getHandler', 70);
      console.error(msg);
    });

};

    