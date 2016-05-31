
var userHandler = require('../lib/user-handler');
var completionHandler = require('../api-handlers/completion-handler');
var utils = require('../lib/utils.js');
var cacheHandler = require('../lib/cache-handler');
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var errorHandler = require('../lib/error-handler');
var errBit = require('../lib/errbitErrorMessage');

module.exports = {
  /*
   * HTTP GET handler for gets for /file/send
   * @param {type} request
   * @param {type} reply
   * 
   */
  getHandler: function (request, reply) {
    var sessionID = utils.base64Decode(request.state['data-returns-id']);
    var key = sessionID + '_SourceName';

    cacheHandler.getValue(key)
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

    var sessionID = utils.base64Decode(request.state['data-returns-id']);
    var uploadResultsCacheKey = sessionID + '_UploadResult';
    var uploadResult, fileKey;
    var originalFileName;
    

    cacheHandler.getValue(uploadResultsCacheKey)
      .then(function (result) {
        console.log('data:', result);
        uploadResult = JSON.parse(result);
        fileKey = uploadResult.uploadResult.fileKey;
        originalFileName = uploadResult.originalFileName;
      })
      .then(function () {
        userHandler.getUserMail(sessionID)
          .then(function (userMail) {
            completionHandler.confirmFileSubmission(fileKey, userMail, originalFileName)
              .then(function () {
                reply.redirect('/file/sent');
              })
              .catch(function () {
                var errormessage = errorHandler.render(3000, {mailto: config.feedback.mailto});
                reply.view('data-returns/failure', {'errorMessage': errormessage});
              });
          });
      })
      .catch(function (errorData) {

        request.log(['error', 'file-submit'], utils.getBestLogMessageFromError(errorData));
        request.session.flash('errorMessage', errorData.message);
        reply.redirect('/failure');
      });
  }

};


