
var Utils = require('../lib/utils');
var CsvValidator = require('../lib/csv-validator');
var Path = require('path');
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var FileUploadHandler = require('../api-handlers/file-upload-handler');
var CachHandler = require('../lib/cache-handler');
var HelpLinks = require('../config/dep-help-links');
var ErrorHelper = require('../api-handlers/multiple-error-helper');
var UserHandler = require('../lib/user-handler');

module.exports.getHandler = function (request, reply) {

  reply.view('02-send-your-data/01-choose-your-file', {
    HowToFormatEnvironmentAgencyData: HelpLinks.links.HowToFormatEnvironmentAgencyData
  });
};
/*
 *  HTTP POST handler for /02-send-your-data/01-choose-your-file
 *  @Param request
 *  @Param reply
 */
module.exports.postHandler = function (request, reply) {

  request.log(['info', 'file-upload'], 'Processing uploaded file...');
  var contentType = request.payload.fileUpload.headers['content-type'] || null;
  var sourceName = request.payload.fileUpload.filename;
  var oldLocalName = request.payload.fileUpload.path;
  var newLocalName = oldLocalName.concat(Path.extname(sourceName));
  var Utils = require('../lib/utils');
  var sessionID = request.state['data-returns-id'] ? Utils.base64Decode(request.state['data-returns-id']) : UserHandler.getNewUserID();
  var key = sessionID + '_FilePath';
  var oldkey = sessionID + '_SourceName';

  var user = {
    authenticated: false,
    email: '',
    pin: '',
    filekey: '',
    uploadCount: 0
  };

  var cookieOptions = {
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
    .then(function (data) {
      
      reply.redirect('/02-send-your-data/02-confirm-your-file').state('data-returns-id', sessionID, cookieOptions);

    }).catch(function (errorData) {
    //console.log('==> promise catch block ' + JSON.stringify(errorData));
    request.log(['error', 'file-upload'], Utils.getBestLogMessageFromError(errorData));
    request.session.clear('returnMetaData');
    if ((errorData !== null) && ('isUserError' in errorData) && errorData.isUserError) {

      var isLineErrors = errorData.lineErrorCount && errorData.lineErrorCount > 0 ? true : false;
      //var sessionid = 'id_' + request.session.id;
      var cacheKey = sessionID + '_latestErrors';
      CachHandler.setValue(cacheKey, errorData.lineErrors)
        .then(function (result) {
          var filekey = sessionID + '_SourceName';

          CachHandler.getValue(filekey)
            .then(function (fileName) {
              fileName = fileName ? fileName.replace(/"/g, "") : '';
              var links = HelpLinks.links;
              var renderedErrorMessage = ErrorHelper.renderErrorMessage(errorData.message, links);
              var renderedLineErrors = ErrorHelper.renderErrorMessage(errorData.lineErrors, links);
              reply.view((isLineErrors === true) ? '02-send-your-data/09-errors' : '02-send-your-data/01-choose-your-file', {
                uploadError: true,
                errorMessage: renderedErrorMessage,
                fileName: fileName,
                lineErrors: renderedLineErrors,
                isLineErrors: errorData.lineErrors ? true : false,
                HowToFormatEnvironmentAgencyData: HelpLinks.links.HowToFormatEnvironmentAgencyData
              }).state('data-returns-id', sessionID, cookieOptions);
            });
        })
        .catch(function (err) {
          console.error(err);
        });
    } else {
      request.session.flash('errorMessage', errorData.message);
      reply.redirect('/02-send-your-data/07-failure').state('data-returns-id', sessionID, cookieOptions);
    }
  });
};
