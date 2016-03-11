
var UserHandler = require('../lib/user-handler');
var CompletionHandler = require('../api-handlers/completion-handler');
var Utils = require('../lib/utils.js');
var CacheHandler = require('../lib/cache-handler');

module.exports = {
  /*
   * HTTP GET handler for gets for /02-send-your-data/05-send-your-file
   * @param {type} request
   * @param {type} reply
   * 
   */
  getHandler: function (request, reply) {
    var sessionID = Utils.base64Decode(request.state['data-returns-id']);
    var key = sessionID + '_SourceName';

    CacheHandler.getValue(key)
      .then(function (filename) {
        reply.view('02-send-your-data/05-send-your-file', {
          filename: filename.replace(/"/g, "")
        });

      })
      .catch(function (err) {
        console.error('O2O5GetHandler', err);
      });

  },
  /*
   * HTTP POST handler for gets for /02-send-your-data/05-send-your-file
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
        uploadResult = JSON.parse(result);
        fileKey = uploadResult.uploadResult.fileKey;
        originalFileName = uploadResult.originalFileName;
        permitNo = uploadResult.generalResult.transformationResults.results.Result_EA_ID.value;
      })
      .then(function () {
        UserHandler.getUserMail(sessionID)
          .then(function (userMail) {
            CompletionHandler.confirmFileSubmission(fileKey, userMail, originalFileName, permitNo)
              .then(function () {
                reply.redirect('/02-send-your-data/08-file-sent');
              })
              .then(function (result) {
                CacheHandler.delete(uploadResultsCacheKey);
              })
              .catch(function (errorData) {
                console.error('\t O2O5Handler.postHandler() error' + JSON.stringify(errorData));
                //reply.view('02-send-your-data/07-failure', {'errorMessage': errorData.message});
                reply.view('02-send-your-data/07-failure');
              });
          });
      })
      .catch(function (errorData) {

        request.log(['error', 'file-submit'], Utils.getBestLogMessageFromError(errorData));
        request.session.flash('errorMessage', errorData.message);
        reply.redirect('/02-send-your-data/07-failure');
      });
  }

};


