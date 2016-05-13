
var UserHandler = require('../lib/user-handler');
var CompletionHandler = require('../api-handlers/completion-handler');
var Utils = require('../lib/utils.js');
var CacheHandler = require('../lib/cache-handler');
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var ErrorHandler = require('../lib/error-handler');
var errBit = require('../lib/errbitErrorMessage');

module.exports = {
  /*
   * HTTP GET handler for gets for /file/send
   * @param {type} request
   * @param {type} reply
   * 
   */
  getHandler: function (request, reply) {
    var sessionID = Utils.base64Decode(request.state['data-returns-id']);
    var key = sessionID + '_SourceName';

    CacheHandler.getValue(key)
      .then(function (filename) {
        reply.view('data-returns/send-your-file', {
          filename: filename.replace(/"/g, '')
        });

      })
      .catch(function (err) {
        var msg = new errBit.errBitMessage(err, __filename, 'getHandler', 28);
        console.error(msg);
      });

  },
  /*
   * HTTP POST handler for gets for /file/send
   * @param {type} request
   * @param {type} reply
   * 
   */
  postHandler: function (request, reply) {

    var sessionID = Utils.base64Decode(request.state['data-returns-id']);
    var uploadResultsCacheKey = sessionID + '_UploadResult';
    var uploadResult, fileKey;
    var originalFileName;
    var permitNo;

    CacheHandler.getValue(uploadResultsCacheKey)
      .then(function (result) {
        console.log('data:', result);
        uploadResult = JSON.parse(result);
        fileKey = uploadResult.uploadResult.fileKey;
        originalFileName = uploadResult.originalFileName;
        permitNo = uploadResult.parseResult.permitNumber;
      })
      .then(function () {
        UserHandler.getUserMail(sessionID)
          .then(function (userMail) {
            CompletionHandler.confirmFileSubmission(fileKey, userMail, originalFileName, permitNo)
              .then(function () {
                reply.redirect('/file/sent');
              })
              .catch(function () {
                var errormessage = ErrorHandler.render(3000, {mailto: config.feedback.mailto});
                reply.view('data-returns/failure', {'errorMessage': errormessage});
              });
          });
      })
      .catch(function (errorData) {

        request.log(['error', 'file-submit'], Utils.getBestLogMessageFromError(errorData));
        request.session.flash('errorMessage', errorData.message);
        reply.redirect('/failure');
      });
  }

};


