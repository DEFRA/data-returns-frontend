var FileSystem = require('fs');
var Request = require('request');
var ErrorMessages = require('../lib/error-messages.js');
var config = require('../config/configuration_' + (process.env.NODE_ENV || 'local'));
var cacheHandler = require('../lib/cache-handler');
var Utils = require('../lib/utils');
var validationErrorHelper = require('./multiple-error-helper');
var ErrorHandler = require('../lib/error-handler');
/**
 * Helper that handles response from the Data Exchange service API.  It is
 * intended to be called from the callback of a 'Request' library call.
 * @param err The 'err' parameter from the Request callback.  This captures
 *   JavaScript / usage errors.
 * @param response The 'response' parameter from the Request callback.  This
 *   contains header-like information from the HTTP response.
 * @param body The 'body' parameter from the Request callback.  This captures
 *   the body of the HTTP response.
 * @param reject A promise rejection function that will be called directly
 *   if this method detects that the request was unsuccessful.  The rejection
 *   will contain some / all of the following fields:
 *     isUserError  - A Boolean;
 *     message      - A string message suitable for displaying to the user;
 *     err          - A JavaScript error, not intended for display to the user;
 *     apiErrors    - Object capturing detail of errors returned by the Data
 *                    Exchange service API call;
 *     rawResponse  - A copy of the 'response' parameter, only included when
 *                    this handler could not parse response or body itself.
 * @param successCallback A function that will be called if the response from
 *   the Data Exchange service indicates success.  The method will be called
 *   with an object containing the parsed body of the API reply.
 */
function processResponse(err, response, body, reject, successCallback) {

  var statusCode = (!err && response && response.statusCode) ? response.statusCode : 3000;
  var errMessage, apiErrors = '';

  switch (statusCode) {

    case 200: //File sent, received and processed successfully
      var parsedBody = JSON.parse(body);
      successCallback(parsedBody);
      return;
      break;
    case 400: //There is a problem
      console.error('file-upload-handler.processResponse()', body);
      var parsedBody = JSON.parse(body);
      var appStatusCode = (parsedBody && parsedBody.appStatusCode) ? parsedBody.appStatusCode : 3000;

      switch (appStatusCode) {

        case 900://Line errors

          errMessage = ErrorHandler.render(900);
          apiErrors = parsedBody.validationResult.schemaErrors;

          var lineErrorData = [];
          var lineErrors = apiErrors.lineErrors;
          var temp;

          for (var lineErrorName in lineErrors) {
            var lineError = {};

            temp = lineErrors[lineErrorName];
            lineError.outputLineNo = parseInt(temp.outputLineNo, 10);
            lineError.columnName = temp.columnName;
            lineError.errorValue = temp.errorValue;
            lineError.outputMessage = temp.errorDetail.outputMessage;
            lineErrorData.push(lineError);
          }

          var sortedLineErrorData = lineErrorData.sort(Utils.sortByProperty('columnName'));
          sortedLineErrorData = validationErrorHelper.groupErrorData(sortedLineErrorData);
          break;
        default:
          //other errors
          errMessage = ErrorHandler.render(appStatusCode);
          break;
      }

      break;
  }

  reject({
    isUserError: true,
    message: errMessage,
    lineErrors: sortedLineErrorData,
    lineErrorCount: (apiErrors && apiErrors.errorCount) ? apiErrors.errorCount : 0
  });

}

/**
 * Uploads a file to the Data Exchange service.
 * @param filePath Full path to the file to upload.
 * @param sessionID the users sessionID
 * @returns {Promise} A promise that is fulfilled when the upload completes
 *   successfully, or is rejected if an error occurs.  If successful, the
 *   promise is resolved with an object containing the fields 'fileKey',
 *   'eaId', 'siteName' and 'returnType' as returned from the API.  For
 *   rejection details see processApiResponse().
 */
module.exports.uploadFileToService = function (filePath, sessionID, originalFileName) {
  console.log('==> uploadFileToService() url: ' + config.API.endpoints.FILEUPLOAD);
  return new Promise(function (resolve, reject) {
    // Define data to send to the Data Exchange service.
    var apiData = {
      url: config.API.endpoints.FILEUPLOAD,
      formData: {
        fileUpload: FileSystem.createReadStream(filePath)
      }
    };
    // Define a function for handling a successful response.
    var successHandler = function (jsonResponse) {
      console.log('==> uploadFileToService successHandler()');
      var key = sessionID + '_UploadResult';

      if (jsonResponse) {
        jsonResponse.originalFileName = originalFileName;
        cacheHandler.setValue(key, jsonResponse)
          .then(function (result) {
            console.log('\n');
            console.log('<== successHandler() resolve(true) ');
            console.log('\n');
            resolve(jsonResponse);
          })
          .catch(function (result) {
            console.error('<== successHandler() error: ' + result, jsonResponse);
            reject();
          });
      }
    };
    // Make REST call into the Data Exchange service, and handle the result.
    Request.post(apiData, function (err, response, body) {
      console.log('<== uploadFileToService() response received');
      processResponse(err, response, body, reject, successHandler);
    });
  });
};
