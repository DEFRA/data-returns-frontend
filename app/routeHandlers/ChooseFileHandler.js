
var csvValidator = require('../lib/csv-validator');
var path = require('path');
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var fileUploadHandler = require('../api-handlers/file-upload-handler');
var cachHandler = require('../lib/cache-handler');
var helpLinks = require('../config/dep-help-links');
var userHandler = require('../lib/user-handler');
var errorHandler = require('../lib/error-handler');
var utils = require('../lib/utils');
var metricsHandler = require('../lib/MetricsHandler');
var errBit = require('../lib/errbitErrorMessage');

/*
 *  HTTP POST handler for /file/choose
 *  @Param request
 *  @Param reply
 */

module.exports.getHandler = function (request, reply) {
  reply.view('data-returns/choose-your-file', {
    uploadError: false,
    emptyfilemessage: errorHandler.render(500, helpLinks.links, 'Your File is empty.'),
    notcsvmessage: errorHandler.render(400, helpLinks.links, 'Your file is not a CSV.')
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
  var newLocalName = oldLocalName.concat(path.extname(sourceName));
  var sessionID = request.state['data-returns-id'] ? utils.base64Decode(request.state['data-returns-id']) : userHandler.getNewUserID();
  var key = sessionID + '_FilePath';
  var oldkey = sessionID + '_SourceName';

  var filesize = request.payload ? request.payload.fileUpload.bytes : 0;

  metricsHandler.setFileSizeHighWaterMark(filesize);

  var cookieOptions = {
    path: '/',
    ttl: null,
    isSecure: false,
    isHttpOnly: true,
    encoding: 'none', //base64json',
    clearInvalid: false,
    strictHeader: true
  };

  utils.renameFile(oldLocalName, newLocalName)
    .then(function () {
      //cache the filenames
      cachHandler.setValue(oldkey, sourceName);
    })
    .then(function () {
      if (config.CSV.validate === true) {
        return csvValidator.validateFile(newLocalName, contentType);
      } else {
        return true;
      }
    })
    .then(function () {
      userHandler.getUser(sessionID)
        .then(function (user) {
          if (user === null) {
            userHandler.setUser(sessionID, user);
          }
        });
    })
    .then(function () {
      cachHandler.setValue(key, newLocalName);
    })
    .then(function () {
      return fileUploadHandler.uploadFileToService(newLocalName, sessionID, sourceName);
    })
    .then(function () {

      reply.redirect('/file/confirm').state('data-returns-id', sessionID, cookieOptions);

    }).catch(function (errorData) {
    if ((errorData !== null) && ('isUserError' in errorData) && errorData.isUserError) {

      var isLineErrors = errorData.lineErrorCount && errorData.lineErrorCount > 0 ? true : false;
      var cacheKey = sessionID + '_latestErrors';
      cachHandler.setValue(cacheKey, errorData.lineErrors)
        .then(function () {
          var filekey = sessionID + '_SourceName';
          cachHandler.getValue(filekey)
            .then(function (fileName) {
              fileName = fileName ? fileName.replace(/"/g, '') : '';
              var links = helpLinks.links;
              var errorCode = errorData.errorCode;

              if (isLineErrors !== true) {
                links.errorCode = 'DR' + utils.pad(errorCode, 4);
              }

              links.mailto = config.feedback.mailto;

              var metadata = {
                uploadError: true,
                errorsummary: (isLineErrors === true) ? errorData.errorsummary : errorHandler.render(errorCode, links, errorData.defaultErrorMessage),
                fileName: fileName,
                lineErrors: errorData.lineErrors,
                isLineErrors: errorData.lineErrors ? true : false,
                HowToFormatEnvironmentAgencyData: helpLinks.links.HowToFormatEnvironmentAgencyData,
                emptyfilemessage: errorHandler.render(500, links, 'Your file is empty'),
                notcsvmessage: errorHandler.render(400, links, 'Your file is not a CSV.'),
                errorCode: 'DR' + utils.pad(errorCode, 4),
                mailto: config.feedback.mailto
              };


              if (isLineErrors) {
                var key = sessionID + '-error-page-metadata';
                cachHandler.setValue(key, metadata)
                  .then(function () {
                    reply.redirect('/correction/table').state('data-returns-id', sessionID, cookieOptions);
                  });
              } else {

                reply.view('data-returns/choose-your-file', {
                  uploadError: true,
                  
                  errorsummary: (isLineErrors === true) ? errorData.errorsummary : errorHandler.render(errorCode, links, errorData.defaultErrorMessage),
                  fileName: fileName,
                  lineErrors: errorData.lineErrors,
                  isLineErrors: errorData.lineErrors ? true : false,
                  HowToFormatEnvironmentAgencyData: helpLinks.links.HowToFormatEnvironmentAgencyData,
                  emptyfilemessage: errorHandler.render(500, links, 'Your file is empty'),
                  notcsvmessage: errorHandler.render(400, links, 'Your file is not a CSV.'),
                  errorCode: 'DR' + utils.pad(errorCode, 4),
                  mailto: config.feedback.mailto
                }).state('data-returns-id', sessionID, cookieOptions);

              }


            });
        })
        .catch(function (err) {
          var msg = new errBit.errBitMessage(err, __filename, 'postHandler', 148);
          console.error(msg);
        });
    } else {
      request.session.flash('errorMessage', errorData.message);
      reply.redirect('/failure').state('data-returns-id', sessionID, cookieOptions);
    }
  });
};
