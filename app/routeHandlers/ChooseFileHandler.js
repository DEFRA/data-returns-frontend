
var CsvValidator = require('../lib/csv-validator');
var Path = require('path');
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var FileUploadHandler = require('../api-handlers/file-upload-handler');
var CachHandler = require('../lib/cache-handler');
var HelpLinks = require('../config/dep-help-links');
var ErrorHelper = require('../api-handlers/multiple-error-helper');
var UserHandler = require('../lib/user-handler');
var ErrorHandler = require('../lib/error-handler');
var Utils = require('../lib/utils');
var MetricsHandler = require('../lib/MetricsHandler');

/*
 *  HTTP POST handler for /file/choose
 *  @Param request
 *  @Param reply
 */

module.exports.getHandler = function (request, reply) {
  reply.view('data-returns/choose-your-file', {
    emptyfilemessage: ErrorHandler.render(500, HelpLinks.links, 'Your File is empty.'),
    notcsvmessage: ErrorHandler.render(400, HelpLinks.links, 'Your file is not a CSV.')
  });
};
/*
 *  HTTP POST handler for /file/choose
 *  @Param request
 *  @Param reply
 */
module.exports.postHandler = function (request, reply) {

  request.log(['info', 'file-upload'], 'Processing uploaded file...');
  var contentType = request.payload.fileUpload.headers['content-type'] || null;
  var sourceName = request.payload.fileUpload.filename;
  var oldLocalName = request.payload.fileUpload.path;
  var newLocalName = oldLocalName.concat(Path.extname(sourceName));
  var sessionID = request.state['data-returns-id'] ? Utils.base64Decode(request.state['data-returns-id']) : UserHandler.getNewUserID();
  var key = sessionID + '_FilePath';
  var oldkey = sessionID + '_SourceName';

  var filesize = request.payload ? request.payload.fileUpload.bytes : 0;

  MetricsHandler.setFileSizeHighWaterMark(filesize);

  var cookieOptions = {
    path: '/',
    ttl: null,
    isSecure: false,
    isHttpOnly: true,
    encoding: 'none', //base64json',
    clearInvalid: false,
    strictHeader: true
  };

  Utils.renameFile(oldLocalName, newLocalName)
    .then(function () {
      //cache the filenames
      CachHandler.setValue(oldkey, sourceName);
    })
    .then(function () {
      if (config.CSV.validate === true) {
        return CsvValidator.validateFile(newLocalName, contentType);
      } else {
        return true;
      }
    })
    .then(function () {
      UserHandler.getUser(sessionID)
        .then(function (user) {
          if (user === null) {
            UserHandler.setUser(sessionID, user);
          }
        });
    })
    .then(function () {
      CachHandler.setValue(key, newLocalName);
    })
    .then(function () {
      return FileUploadHandler.uploadFileToService(newLocalName, sessionID, sourceName);
    })
    .then(function () {

      reply.redirect('/file/confirm').state('data-returns-id', sessionID, cookieOptions);

    }).catch(function (errorData) {
    if ((errorData !== null) && ('isUserError' in errorData) && errorData.isUserError) {

      var isLineErrors = errorData.lineErrorCount && errorData.lineErrorCount > 0 ? true : false;
      var cacheKey = sessionID + '_latestErrors';
      CachHandler.setValue(cacheKey, errorData.lineErrors)
        .then(function () {
          var filekey = sessionID + '_SourceName';
          CachHandler.getValue(filekey)
            .then(function (fileName) {
              fileName = fileName ? fileName.replace(/"/g, '') : '';
              var links = HelpLinks.links;
              var errorCode = errorData.errorCode;

              if (isLineErrors !== true) {
                links.errorCode = 'DR' + Utils.pad(errorCode, 4);
              }

              links.mailto = config.feedback.mailto;

              var metadata = {
                uploadError: true,
                errorsummary: (isLineErrors === true) ? errorData.errorsummary : ErrorHandler.render(errorCode, links, errorData.defaultErrorMessage),
                fileName: fileName,
                lineErrors: errorData.lineErrors,
                isLineErrors: errorData.lineErrors ? true : false,
                HowToFormatEnvironmentAgencyData: HelpLinks.links.HowToFormatEnvironmentAgencyData,
                emptyfilemessage: ErrorHandler.render(500, links, 'Your file is empty'),
                notcsvmessage: ErrorHandler.render(400, links, 'Your file is not a CSV.'),
                errorCode: 'DR' + Utils.pad(errorCode, 4),
                mailto: config.feedback.mailto
              };


              if (isLineErrors) {
                var key = sessionID + '-error-page-metadata';
                CachHandler.setValue(key, metadata)
                  .then(function () {
                    reply.redirect('/correction/table').state('data-returns-id', sessionID, cookieOptions);
                  });
              } else {

                reply.view('data-returns/choose-your-file', {
                  uploadError: true,
                  errorsummary: (isLineErrors === true) ? errorData.errorsummary : ErrorHandler.render(errorCode, links, errorData.defaultErrorMessage),
                  fileName: fileName,
                  lineErrors: errorData.lineErrors,
                  isLineErrors: errorData.lineErrors ? true : false,
                  HowToFormatEnvironmentAgencyData: HelpLinks.links.HowToFormatEnvironmentAgencyData,
                  emptyfilemessage: ErrorHandler.render(500, links, 'Your file is empty'),
                  notcsvmessage: ErrorHandler.render(400, links, 'Your file is not a CSV.'),
                  errorCode: 'DR' + Utils.pad(errorCode, 4),
                  mailto: config.feedback.mailto
                }).state('data-returns-id', sessionID, cookieOptions);

              }


            });
        })
        .catch(function (err) {
          console.error(err);
        });
    } else {
      request.session.flash('errorMessage', errorData.message);
      reply.redirect('/failure').state('data-returns-id', sessionID, cookieOptions);
    }
  });
};
